# 內部開發版控流程（AI Portal Fork）

> 本檔為 **AI Portal 內部專用**，上游 `danny-avila/LibreChat` 不存在此路徑，永遠不會與上游衝突。

## 背景

本 repo 是 LibreChat 的**客製化 fork**：

| Remote | 指向 | 用途 |
|---|---|---|
| `origin` | `arcadyan-karen-huang/LibreChat` | 我們的 fork，所有開發成果 |
| `upstream` | `danny-avila/LibreChat` | 官方 LibreChat，定期吸收其更新 |

核心目標：**一邊維護內部客製，一邊定期吃上游更新**，且同步過程不痛。

---

## 三個降衝突紀律（最重要）

### 紀律 1：能新增就不要改上游檔案

衝突只發生在「我們和上游都改同一行」。

- **新增檔案** → 上游永遠不碰 → 零衝突。
- 非改上游檔案不可時，改動越小越好（薄包裝，邏輯放進自己的新檔案）。
- 對應 `CLAUDE.md` 既有規範：新後端碼進 `packages/api`、共用型別進 `packages/data-provider`、DB 邏輯進 `packages/data-schemas`。

這是 fork 維護降低衝突**最有效的一招**，勝過任何分支策略。

### 紀律 2：開發走 feature branch，合併用 squash

```bash
git checkout main && git pull origin main
git checkout -b feat/portal-xxx
# ... 開發 ...
git push origin feat/portal-xxx
# GitHub 開 PR → 自審 diff → Squash and merge
```

- 單人開發不強制 review，但 **feature branch + squash merge** 讓每個客製功能在 `main` 上是一顆乾淨、可 revert、可辨識的 commit。
- 開發到一半要先同步上游時，`main` 不會卡在半成品。

### 紀律 3：客製 commit 統一加 `(portal)` scope

沿用上游的 emoji + conventional 格式，但客製化 commit 固定標記 scope：

```
📜 feat(portal): Add MCP response file
🎨 fix(portal): Correct primary color value
```

任何時候用 `git log --grep="(portal)"` 就能撈出全部客製改動，同步上游解衝突時一眼分得出哪邊該留。

---

## 上游同步儀式

建議**每次上游發 release** 做一次。已封裝成腳本：

```powershell
pwsh ./scripts/sync-upstream.ps1
```

腳本流程（手動等價步驟）：

```bash
git fetch upstream
git checkout main && git pull origin main
git checkout -b sync/upstream-YYYYMMDD   # 在分支上做，不直接動 main
git merge upstream/main                   # 固定 merge，不對已 push 的 main 用 rebase
# 解衝突（衝突點幾乎都落在「改過的上游檔案」上）
npm run build                             # 驗證 build
# 跑相關測試 / 起服務驗證
git push origin sync/upstream-YYYYMMDD
# 開 PR 合回 main，build/測試綠燈再合
```

**鐵則**

- 永遠在 `sync/*` 分支上 merge，驗證過再合回 `main` → 同步出包時 `main` 永遠是好的。
- 固定用 `merge`（不要對 `main` 用 rebase）：衝突一次解完、保留可追溯歷史。
- 同步前先清理過期的 feature 分支，別讓它們越漂越遠。

---

## 分支命名

| 前綴 | 用途 | 範例 |
|---|---|---|
| `feat/portal-*` | 客製新功能 | `feat/portal-sso` |
| `fix/portal-*` | 客製修正 | `fix/portal-locale` |
| `sync/upstream-YYYYMMDD` | 上游同步 | `sync/upstream-20260618` |

---

## 快速檢查指令

```bash
# 我有哪些客製改動
git log --grep="(portal)" --oneline

# 某分支相對 main 還有什麼沒進去（patch-id 等效檢查）
git cherry main <branch>

# 某分支落後 main 多少 / 領先多少
git rev-list --left-right --count main...<branch>
```
