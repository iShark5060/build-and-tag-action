import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { describe, test, expect } from 'vitest';

import readFileBase64 from '../src/lib/read-file';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('read-file', () => {
  const baseDir = path.join(__dirname, 'fixtures');

  test('reads the file and returns base64 contents', async () => {
    const filePath = path.join(baseDir, 'file.md');
    const expected = (await fs.promises.readFile(filePath)).toString('base64');
    const result = await readFileBase64(baseDir, 'file.md');
    expect(result).toBe(expected);
  });

  test('throws if the file does not exist', async () => {
    await expect(readFileBase64(baseDir, 'nope')).rejects.toThrow('nope does not exist.');
  });
});
