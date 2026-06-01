import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const WRAPPER = path.join(
  import.meta.dir,
  '..',
  '.agents',
  'skills',
  'claude-review',
  'scripts',
  'claude_review.sh'
);
const TEST_TIMEOUT_MS = 15000;

function setupRepo(): {
  cleanupDir: string;
  dir: string;
  argsFile: string;
  callsFile: string;
  env: Record<string, string>;
} {
  const cleanupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-review-wrapper-'));
  const dir = path.join(cleanupDir, 'repo');
  const binDir = path.join(cleanupDir, 'bin');
  fs.mkdirSync(dir);
  fs.mkdirSync(binDir);
  const argsFile = path.join(cleanupDir, 'claude-args.txt');
  const callsFile = path.join(cleanupDir, 'claude-calls.txt');
  const claude = path.join(binDir, 'claude');
  const python = path.join(binDir, 'python3');
  fs.writeFileSync(claude, `#!/usr/bin/env bash
printf 'call\\n' >> "$CLAUDE_CALLS_FILE"
printf '%s\\n' "$@" > "$CLAUDE_ARGS_FILE"
cat >/dev/null
printf '{"result":"ok"}\\n'
`);
  fs.chmodSync(claude, 0o755);
  fs.writeFileSync(python, `#!/usr/bin/env bash
printf 'ok\\n'
`);
  fs.chmodSync(python, 0o755);

  Bun.spawnSync(['git', 'init', '-q'], { cwd: dir });
  Bun.spawnSync(['git', 'config', 'user.email', 'a@example.com'], { cwd: dir });
  Bun.spawnSync(['git', 'config', 'user.name', 'A'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'a.txt'), 'base\n');
  Bun.spawnSync(['git', 'add', 'a.txt'], { cwd: dir });
  Bun.spawnSync(['git', 'commit', '-qm', 'init'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'a.txt'), 'changed\n');

  return {
    cleanupDir,
    dir,
    argsFile,
    callsFile,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      CLAUDE_ARGS_FILE: argsFile,
      CLAUDE_CALLS_FILE: callsFile,
    },
  };
}

function runWrapper(args: string[], env: Record<string, string>, cwd: string) {
  return Bun.spawnSync([WRAPPER, '--base', 'HEAD', ...args], { cwd, env });
}

describe('claude-review wrapper', () => {
  test('defaults to diff-only mode with no Claude repo tools', () => {
    const repo = setupRepo();
    try {
      const result = runWrapper([], repo.env, repo.dir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('ok');
      const args = fs.readFileSync(repo.argsFile, 'utf8').split('\n');
      const toolsIndex = args.indexOf('--tools');
      expect(toolsIndex).toBeGreaterThan(-1);
      expect(args[toolsIndex + 1]).toBe('');
      expect(args).not.toContain('Read,Bash');
    } finally {
      fs.rmSync(repo.cleanupDir, { recursive: true, force: true });
    }
  }, TEST_TIMEOUT_MS);

  test('--with-tools opts into read-only repo tools', () => {
    const repo = setupRepo();
    try {
      const result = runWrapper(['--with-tools'], repo.env, repo.dir);
      expect(result.exitCode).toBe(0);
      const args = fs.readFileSync(repo.argsFile, 'utf8').split('\n');
      expect(args).toContain('Read,Bash');
      expect(args).toContain('--allowedTools');
    } finally {
      fs.rmSync(repo.cleanupDir, { recursive: true, force: true });
    }
  }, TEST_TIMEOUT_MS);

  test('oversized diff exits before invoking Claude', () => {
    const repo = setupRepo();
    try {
      const result = runWrapper(['--max-diff-bytes', '10'], repo.env, repo.dir);
      expect(result.exitCode).toBe(2);
      expect(result.stderr.toString()).toContain('diff is too large');
      expect(fs.existsSync(repo.callsFile)).toBe(false);
    } finally {
      fs.rmSync(repo.cleanupDir, { recursive: true, force: true });
    }
  }, TEST_TIMEOUT_MS);
});
