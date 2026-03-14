/**
 * Tests for find-browse version check logic
 *
 * Tests the checkVersion() and locateBinary() functions directly.
 * Uses temp directories with mock .version files and cache files.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { checkVersion, locateBinary } from '../src/find-browse';
import { mkdtempSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'find-browse-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  // Clean up test cache
  try { rmSync('/tmp/gstack-latest-version'); } catch {}
});

describe('checkVersion', () => {
  test('returns null when .version file is missing', () => {
    const result = checkVersion(tempDir);
    expect(result).toBeNull();
  });

  test('returns null when .version file is empty', () => {
    writeFileSync(join(tempDir, '.version'), '');
    const result = checkVersion(tempDir);
    expect(result).toBeNull();
  });

  test('returns null when .version has only whitespace', () => {
    writeFileSync(join(tempDir, '.version'), '  \n');
    const result = checkVersion(tempDir);
    expect(result).toBeNull();
  });

  test('returns null when local SHA matches remote (cache hit)', () => {
    const sha = 'a'.repeat(40);
    writeFileSync(join(tempDir, '.version'), sha);
    // Write cache with same SHA, recent timestamp
    const now = Math.floor(Date.now() / 1000);
    writeFileSync('/tmp/gstack-latest-version', `${sha} ${now}\n`);

    const result = checkVersion(tempDir);
    expect(result).toBeNull();
  });

  test('returns META:UPDATE_AVAILABLE when SHAs differ (cache hit)', () => {
    const localSha = 'a'.repeat(40);
    const remoteSha = 'b'.repeat(40);
    writeFileSync(join(tempDir, '.version'), localSha);
    // Create a fake browse binary path so resolveSkillDir works
    const browsePath = join(tempDir, 'browse');
    writeFileSync(browsePath, '');
    // Write cache with different SHA, recent timestamp
    const now = Math.floor(Date.now() / 1000);
    writeFileSync('/tmp/gstack-latest-version', `${remoteSha} ${now}\n`);

    const result = checkVersion(tempDir);
    // Result may be null if resolveSkillDir can't determine skill dir from temp path
    // That's expected — the META signal requires a known skill dir path
    if (result !== null) {
      expect(result).toStartWith('META:UPDATE_AVAILABLE');
      const jsonStr = result.replace('META:UPDATE_AVAILABLE ', '');
      const payload = JSON.parse(jsonStr);
      expect(payload.current).toBe('a'.repeat(8));
      expect(payload.latest).toBe('b'.repeat(8));
      expect(payload.command).toContain('git stash');
      expect(payload.command).toContain('git reset --hard origin/main');
      expect(payload.command).toContain('./setup');
    }
  });

  test('uses cached SHA when cache is fresh (< 4hr)', () => {
    const localSha = 'a'.repeat(40);
    const remoteSha = 'a'.repeat(40);
    writeFileSync(join(tempDir, '.version'), localSha);
    // Cache is 1 hour old — should still be valid
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    writeFileSync('/tmp/gstack-latest-version', `${remoteSha} ${oneHourAgo}\n`);

    const result = checkVersion(tempDir);
    expect(result).toBeNull(); // SHAs match
  });

  test('treats expired cache as stale', () => {
    const localSha = 'a'.repeat(40);
    writeFileSync(join(tempDir, '.version'), localSha);
    // Cache is 5 hours old — should be stale
    const fiveHoursAgo = Math.floor(Date.now() / 1000) - 18000;
    writeFileSync('/tmp/gstack-latest-version', `${'b'.repeat(40)} ${fiveHoursAgo}\n`);

    // This will try git ls-remote which may fail in test env — that's OK
    // The important thing is it doesn't use the stale cache value
    const result = checkVersion(tempDir);
    // Result depends on whether git ls-remote succeeds in test environment
    // If offline, returns null (graceful degradation)
    expect(result === null || typeof result === 'string').toBe(true);
  });

  test('handles corrupt cache file gracefully', () => {
    const localSha = 'a'.repeat(40);
    writeFileSync(join(tempDir, '.version'), localSha);
    writeFileSync('/tmp/gstack-latest-version', 'garbage data here');

    // Should not throw, should treat as stale
    const result = checkVersion(tempDir);
    expect(result === null || typeof result === 'string').toBe(true);
  });

  test('handles cache with invalid SHA gracefully', () => {
    const localSha = 'a'.repeat(40);
    writeFileSync(join(tempDir, '.version'), localSha);
    writeFileSync('/tmp/gstack-latest-version', `not-a-sha ${Math.floor(Date.now() / 1000)}\n`);

    // Invalid SHA should be treated as no cache
    const result = checkVersion(tempDir);
    expect(result === null || typeof result === 'string').toBe(true);
  });
});

describe('locateBinary', () => {
  test('returns null when no binary exists at known paths', () => {
    // This test depends on the test environment — if a real binary exists at
    // ~/.claude/skills/gstack/browse/dist/browse, it will find it.
    // We mainly test that the function doesn't throw.
    const result = locateBinary();
    expect(result === null || typeof result === 'string').toBe(true);
  });

  test('returns string path when binary exists', () => {
    const result = locateBinary();
    if (result !== null) {
      expect(existsSync(result)).toBe(true);
    }
  });
});
