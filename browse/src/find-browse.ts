/**
 * find-browse — locate the gstack browse binary + check for updates.
 *
 * Compiled to browse/dist/find-browse (standalone binary, no bun runtime needed).
 *
 * Output protocol:
 *   Line 1: /path/to/binary              (always present)
 *   Line 2+: META:<TYPE> <json-payload>   (optional, 0 or more)
 *
 * META types:
 *   META:UPDATE_AVAILABLE — local binary is behind origin/main
 *
 * All version checks are best-effort: network failures, missing files, and
 * cache errors degrade gracefully to outputting only the binary path.
 */

import { existsSync } from 'fs';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const REPO_URL = 'https://github.com/garrytan/gstack.git';
const CACHE_PATH = '/tmp/gstack-latest-version';
const CACHE_TTL = 14400; // 4 hours in seconds

// ─── Binary Discovery ───────────────────────────────────────────

function getGitRoot(): string | null {
  try {
    const proc = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (proc.exitCode !== 0) return null;
    return proc.stdout.toString().trim();
  } catch {
    return null;
  }
}

export function locateBinary(): string | null {
  const root = getGitRoot();
  const home = homedir();

  // Workspace-local takes priority (for development)
  if (root) {
    const local = join(root, '.claude', 'skills', 'gstack', 'browse', 'dist', 'browse');
    if (existsSync(local)) return local;
  }

  // Global fallback
  const global = join(home, '.claude', 'skills', 'gstack', 'browse', 'dist', 'browse');
  if (existsSync(global)) return global;

  return null;
}

// ─── Version Check ──────────────────────────────────────────────

interface CacheEntry {
  sha: string;
  timestamp: number;
}

function readCache(): CacheEntry | null {
  try {
    const content = readFileSync(CACHE_PATH, 'utf-8').trim();
    const parts = content.split(/\s+/);
    if (parts.length < 2) return null;
    const sha = parts[0];
    const timestamp = parseInt(parts[1], 10);
    if (!sha || isNaN(timestamp)) return null;
    // Validate SHA is hex
    if (!/^[0-9a-f]{40}$/i.test(sha)) return null;
    return { sha, timestamp };
  } catch {
    return null;
  }
}

function writeCache(sha: string, timestamp: number): void {
  try {
    writeFileSync(CACHE_PATH, `${sha} ${timestamp}\n`);
  } catch {
    // Cache write failure is non-fatal
  }
}

function fetchRemoteSHA(): string | null {
  try {
    const proc = Bun.spawnSync(['git', 'ls-remote', REPO_URL, 'refs/heads/main'], {
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 10_000, // 10s timeout
    });
    if (proc.exitCode !== 0) return null;
    const output = proc.stdout.toString().trim();
    const sha = output.split(/\s+/)[0];
    if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) return null;
    return sha;
  } catch {
    return null;
  }
}

function resolveSkillDir(binaryPath: string): string | null {
  const home = homedir();
  const globalPrefix = join(home, '.claude', 'skills', 'gstack');
  if (binaryPath.startsWith(globalPrefix)) return globalPrefix;

  // Workspace-local: binary is at $ROOT/.claude/skills/gstack/browse/dist/browse
  // Skill dir is $ROOT/.claude/skills/gstack
  const parts = binaryPath.split('/.claude/skills/gstack/');
  if (parts.length === 2) return parts[0] + '/.claude/skills/gstack';

  return null;
}

export function checkVersion(binaryDir: string): string | null {
  // Read local version
  const versionFile = join(binaryDir, '.version');
  let localSHA: string;
  try {
    localSHA = readFileSync(versionFile, 'utf-8').trim();
  } catch {
    return null; // No .version file → skip check
  }
  if (!localSHA) return null;

  const now = Math.floor(Date.now() / 1000);

  // Check cache
  let remoteSHA: string | null = null;
  const cache = readCache();
  if (cache && (now - cache.timestamp) < CACHE_TTL) {
    remoteSHA = cache.sha;
  }

  // Fetch from remote if cache miss
  if (!remoteSHA) {
    remoteSHA = fetchRemoteSHA();
    if (remoteSHA) {
      writeCache(remoteSHA, now);
    }
  }

  if (!remoteSHA) return null; // Offline or error → skip check

  // Compare
  if (localSHA === remoteSHA) return null; // Up to date

  // Determine skill directory for update command
  const binaryPath = join(binaryDir, 'browse');
  const skillDir = resolveSkillDir(binaryPath);
  if (!skillDir) return null;

  const payload = JSON.stringify({
    current: localSHA.slice(0, 8),
    latest: remoteSHA.slice(0, 8),
    command: `cd ${skillDir} && git stash && git fetch origin && git reset --hard origin/main && ./setup`,
  });

  return `META:UPDATE_AVAILABLE ${payload}`;
}

// ─── Main ───────────────────────────────────────────────────────

function main() {
  const bin = locateBinary();
  if (!bin) {
    process.stderr.write('ERROR: browse binary not found. Run: cd <skill-dir> && ./setup\n');
    process.exit(1);
  }

  console.log(bin);

  const meta = checkVersion(dirname(bin));
  if (meta) console.log(meta);
}

main();
