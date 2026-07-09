import path from 'path';
import { fileURLToPath } from 'url';

import { describe, test, expect } from 'vitest';

import findActionFileName from '../src/lib/find-action-file-name';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('find-action-file-name', () => {
  test('returns action.yml when present', () => {
    const baseDir = path.join(__dirname, 'fixtures', 'workspace');
    expect(findActionFileName(baseDir)).toBe('action.yml');
  });

  test('returns action.yaml when only that file exists', () => {
    const baseDir = path.join(__dirname, 'fixtures', 'workspace-yaml');
    expect(findActionFileName(baseDir)).toBe('action.yaml');
  });

  test('throws when no action file exists', () => {
    const baseDir = path.join(__dirname, 'fixtures');
    expect(() => findActionFileName(baseDir)).toThrow('No action file found');
  });
});
