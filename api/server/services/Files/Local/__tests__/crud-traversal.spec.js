jest.mock('@librechat/api', () => ({ deleteRagFile: jest.fn() }));
jest.mock('@librechat/data-schemas', () => ({
  logger: { warn: jest.fn(), error: jest.fn() },
}));

const mockTmpBase = require('fs').mkdtempSync(
  require('path').join(require('os').tmpdir(), 'crud-traversal-'),
);

jest.mock('~/config/paths', () => {
  const path = require('path');
  return {
    publicPath: path.join(mockTmpBase, 'public'),
    uploads: path.join(mockTmpBase, 'uploads'),
  };
});

const fs = require('fs');
const path = require('path');
const { saveLocalBuffer, getLocalFileStream } = require('../crud');

describe('saveLocalBuffer path containment', () => {
  beforeAll(() => {
    fs.mkdirSync(path.join(mockTmpBase, 'public', 'images'), { recursive: true });
    fs.mkdirSync(path.join(mockTmpBase, 'uploads'), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(mockTmpBase, { recursive: true, force: true });
  });

  test('rejects filenames with path traversal sequences', async () => {
    await expect(
      saveLocalBuffer({
        userId: 'user1',
        buffer: Buffer.from('malicious'),
        fileName: '../../../etc/passwd',
        basePath: 'uploads',
      }),
    ).rejects.toThrow('Path traversal detected in filename');
  });

  test('rejects prefix-collision traversal (startsWith bypass)', async () => {
    fs.mkdirSync(path.join(mockTmpBase, 'uploads', 'user10'), { recursive: true });
    await expect(
      saveLocalBuffer({
        userId: 'user1',
        buffer: Buffer.from('malicious'),
        fileName: '../user10/evil',
        basePath: 'uploads',
      }),
    ).rejects.toThrow('Path traversal detected in filename');
  });

  test('allows normal filenames', async () => {
    const result = await saveLocalBuffer({
      userId: 'user1',
      buffer: Buffer.from('safe content'),
      fileName: 'file-id__output.csv',
      basePath: 'uploads',
    });

    expect(result).toBe('/uploads/user1/file-id__output.csv');

    const filePath = path.join(mockTmpBase, 'uploads', 'user1', 'file-id__output.csv');
    expect(fs.existsSync(filePath)).toBe(true);
    fs.unlinkSync(filePath);
  });

  test('reads upload stream without req.config by falling back to shared paths config', async () => {
    const saved = await saveLocalBuffer({
      userId: 'user1',
      buffer: Buffer.from('safe content'),
      fileName: 'file-id__source.xlsx',
      basePath: 'uploads',
    });

    const stream = await getLocalFileStream({ user: { id: 'user1' } }, saved);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    expect(Buffer.concat(chunks).toString()).toBe('safe content');
  });
});
