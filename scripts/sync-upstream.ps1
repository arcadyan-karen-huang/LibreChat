<#
.SYNOPSIS
    將上游 danny-avila/LibreChat 的更新安全地同步到本 fork。

.DESCRIPTION
    在獨立的 sync/upstream-YYYYMMDD 分支上 merge upstream/main，
    絕不直接動 main。驗證通過後再由你開 PR 合回 main。

    流程：
      1. 確認工作目錄乾淨（有未提交變更則中止）
      2. fetch upstream + 更新本地 main
      3. 建立 sync/upstream-<日期> 分支
      4. merge upstream/main
      5. 無衝突 → 視需要跑 build；有衝突 → 停下，交給你手動解

.PARAMETER Build
    merge 成功後自動跑 `npm run build` 驗證。

.PARAMETER Push
    merge 成功（且有 -Build 時 build 通過）後，自動 push sync 分支到 origin。

.EXAMPLE
    pwsh ./scripts/sync-upstream.ps1
    pwsh ./scripts/sync-upstream.ps1 -Build
    pwsh ./scripts/sync-upstream.ps1 -Build -Push
#>

[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$Push
)

$ErrorActionPreference = 'Stop'

function Fail($msg) {
    Write-Host "✖ $msg" -ForegroundColor Red
    exit 1
}

function Info($msg) { Write-Host "→ $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "✔ $msg" -ForegroundColor Green }

# --- 0. 必須在 git repo 根目錄、且 upstream remote 存在 ---
$insideRepo = git rev-parse --is-inside-work-tree 2>$null
if ($insideRepo -ne 'true') { Fail "目前不在 git repository 內。" }

$remotes = git remote
if ($remotes -notcontains 'upstream') {
    Fail "找不到 'upstream' remote。請先執行：git remote add upstream https://github.com/danny-avila/LibreChat.git"
}

# --- 1. 工作目錄必須乾淨 ---
$dirty = git status --porcelain
if ($dirty) {
    Fail "工作目錄有未提交的變更，請先 commit 或 stash 後再同步。"
}

# --- 2. fetch upstream + 更新本地 main ---
Info "fetch upstream ..."
git fetch upstream

Info "切換到 main 並更新 ..."
git checkout main
git pull origin main

# --- 3. 建立 sync 分支 ---
$date = Get-Date -Format 'yyyyMMdd'
$branch = "sync/upstream-$date"

$existing = git branch --list $branch
if ($existing) {
    Fail "分支 $branch 已存在。請先處理或刪除它：git branch -D $branch"
}

Info "建立同步分支 $branch ..."
git checkout -b $branch

# --- 4. merge upstream/main ---
Info "merge upstream/main ..."
$mergeOk = $true
git merge --no-edit upstream/main
if ($LASTEXITCODE -ne 0) { $mergeOk = $false }

if (-not $mergeOk) {
    Write-Host ""
    Write-Host "⚠ Merge 發生衝突，已停在分支 $branch。" -ForegroundColor Yellow
    Write-Host "  衝突檔案：" -ForegroundColor Yellow
    git diff --name-only --diff-filter=U | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "  下一步：手動解衝突 → git add → git commit，再跑 build/測試驗證。" -ForegroundColor Yellow
    Write-Host "  放棄這次同步：git merge --abort; git checkout main; git branch -D $branch" -ForegroundColor DarkGray
    exit 2
}

Ok "Merge 成功，無衝突。"

# --- 5. 視需要 build ---
if ($Build) {
    Info "執行 npm run build ..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Fail "build 失敗。請修正後再 push（分支 $branch 已保留你的 merge 結果）。"
    }
    Ok "build 通過。"
}

# --- 6. 視需要 push ---
if ($Push) {
    Info "push $branch 到 origin ..."
    git push -u origin $branch
    Ok "已 push。請到 GitHub 開 PR 合回 main。"
} else {
    Write-Host ""
    Ok "完成。分支 $branch 已就緒。"
    Write-Host "  驗證無誤後：git push -u origin $branch，再開 PR 合回 main。" -ForegroundColor DarkGray
}
