import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

describe('BrowserManager source invariants', () => {
  test('requestfinished handler does not materialize response bodies for sizing', () => {
    const source = fs.readFileSync(path.join(import.meta.dir, '..', 'src', 'browser-manager.ts'), 'utf-8');
    expect(source).toContain('req.sizes()');
    expect(source).not.toContain('.body().catch');
  });
});
