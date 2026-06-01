import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const BIN = path.resolve(import.meta.dir, '..', 'bin', 'skystack-redact');

function run(args: string[], stdin: string): { code: number; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(['bun', BIN, ...args], {
    stdin: Buffer.from(stdin),
  });
  return {
    code: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

describe('skystack-redact CLI', () => {
  test('uses clean, medium, and high exit codes', () => {
    expect(run([], 'plain prose').code).toBe(0);
    expect(run([], 'mail bob@corp.io').code).toBe(2);
    expect(run([], 'key AKIA1234567890ABCDEF').code).toBe(3);
  });

  test('--json emits structured findings', () => {
    const result = run(['--json'], 'key AKIA1234567890ABCDEF');
    expect(result.code).toBe(3);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.findings[0].id).toBe('aws.access_key');
    expect(parsed.counts.HIGH).toBe(1);
    expect(parsed.repoVisibility).toBe('unknown');
  });

  test('--auto-redact prints redacted body', () => {
    const result = run(['--auto-redact', 'pii.email'], 'ping bob@corp.io please');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('<REDACTED-EMAIL>');
    expect(result.stdout).not.toContain('bob@corp.io');
  });

  test('--allowlist suppresses exact spans', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skystack-redact-'));
    const allow = path.join(dir, 'allow.txt');
    fs.writeFileSync(allow, 'AKIA1234567890ABCDEF\n');
    try {
      expect(run(['--allowlist', allow], 'key AKIA1234567890ABCDEF').code).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--from-file reads input from a file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skystack-redact-file-'));
    const file = path.join(dir, 'notes.md');
    fs.writeFileSync(file, `leaked ghp_${'a'.repeat(36)}`);
    try {
      const proc = Bun.spawnSync(['bun', BIN, '--from-file', file, '--json']);
      const parsed = JSON.parse(proc.stdout.toString());
      expect(proc.exitCode).toBe(3);
      expect(parsed.findings[0].id).toBe('github.pat');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('--max-bytes blocks oversized input', () => {
    const result = run(['--max-bytes', '100'], 'a'.repeat(500));
    expect(result.code).toBe(3);
    expect(result.stdout).toContain('too large');
  });
});
