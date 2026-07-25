import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  createIsolatedEnvironment,
  digestSkillRoot,
  getToolCommand,
} from './agent-runner';
import { buildClaudeCommand } from './claude-runner';
import { buildCodexCommand, parseCodexOutput } from './codex-runner';

const scratchHomes: string[] = [];
const fixtureDirs: string[] = [];

function makeSkillRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-runner-skill-'));
  fixtureDirs.push(root);
  fs.writeFileSync(path.join(root, 'SKILL.md'), '# skystack\n');
  const browseSource = path.join(root, 'browse', 'src');
  fs.mkdirSync(browseSource, { recursive: true });
  fs.writeFileSync(path.join(root, 'browse', 'SKILL.md'), '# browse\n');
  fs.writeFileSync(path.join(browseSource, 'server.ts'), '// runtime server\n');
  fs.mkdirSync(path.join(root, 'node_modules'));
  const qa = path.join(root, 'qa');
  fs.mkdirSync(qa);
  fs.writeFileSync(path.join(qa, 'SKILL.md'), '# qa\n');
  const codexQa = path.join(root, '.agents', 'skills', 'qa');
  fs.mkdirSync(codexQa, { recursive: true });
  fs.writeFileSync(path.join(codexQa, 'SKILL.md'), '# codex qa\n');
  return root;
}

afterEach(() => {
  for (const dir of scratchHomes.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  for (const dir of fixtureDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('provider commands', () => {
  const base = {
    prompt: 'test',
    workingDirectory: '/tmp',
    skillRoot: '/tmp/skills',
    model: 'example-model',
    effort: 'high' as const,
  };

  test('Claude uses noninteractive stream JSON with explicit model and effort', () => {
    const command = buildClaudeCommand({ ...base, provider: 'claude' });
    expect(command.slice(0, 2)).toEqual(['claude', '-p']);
    expect(command).toContain('stream-json');
    expect(command).toContain('--no-session-persistence');
    expect(command).toContain('example-model');
    expect(command).toContain('high');
  });

  test('Codex uses isolated noninteractive JSON mode with explicit model and effort', () => {
    const command = buildCodexCommand({ ...base, provider: 'codex' });
    expect(command.slice(0, 2)).toEqual(['codex', 'exec']);
    expect(command).toContain('--json');
    expect(command).toContain('--ephemeral');
    expect(command).toContain('--ignore-user-config');
    expect(command).toContain('example-model');
    expect(command).toContain('model_reasoning_effort="high"');
    expect(command.at(-1)).toBe('-');
  });

  test('normalizes shell commands from Claude and Codex tool shapes', () => {
    expect(getToolCommand({
      tool: 'Bash',
      input: { command: 'git diff main' },
      output: '',
    })).toBe('git diff main');
    expect(getToolCommand({
      tool: 'exec_command',
      input: { command: 'git push origin main' },
      output: '',
    })).toBe('git push origin main');
    expect(getToolCommand({
      tool: 'Read',
      input: { file_path: 'README.md' },
      output: '',
    })).toBeNull();
  });
});

describe('isolated provider homes', () => {
  test('Claude sees only the selected skill root and scratch state', () => {
    const previousToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    const previousUnrelatedSecret = process.env.UNRELATED_EVAL_SECRET;
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'test-oauth-token';
    process.env.UNRELATED_EVAL_SECRET = 'must-not-cross-boundary';
    const root = makeSkillRoot();
    const isolated = createIsolatedEnvironment('claude', root);
    scratchHomes.push(isolated.homeDir);
    if (previousToken === undefined) delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    else process.env.CLAUDE_CODE_OAUTH_TOKEN = previousToken;
    if (previousUnrelatedSecret === undefined) delete process.env.UNRELATED_EVAL_SECRET;
    else process.env.UNRELATED_EVAL_SECRET = previousUnrelatedSecret;

    expect(isolated.homeDir).not.toBe(os.homedir());
    expect(isolated.env.HOME).toBe(isolated.homeDir);
    expect(isolated.env.SKYSTACK_HOME).toBe(path.join(isolated.homeDir, '.skystack'));
    expect(isolated.env.CLAUDE_CODE_OAUTH_TOKEN).toBe('test-oauth-token');
    expect(isolated.env.PATH).toBe(process.env.PATH);
    expect(isolated.env.UNRELATED_EVAL_SECRET).toBeUndefined();
    expect(fs.realpathSync(path.join(isolated.homeDir, '.claude', 'skills', 'skystack')))
      .toBe(fs.realpathSync(isolated.skillSnapshot));
    expect(fs.realpathSync(path.join(isolated.homeDir, '.claude', 'skills', 'qa')))
      .toBe(fs.realpathSync(path.join(isolated.skillSnapshot, 'qa')));
    expect(fs.existsSync(path.join(isolated.skillSnapshot, 'browse', 'src', 'server.ts'))).toBe(true);
    expect(isolated.env.NODE_PATH).toBe(path.join(fs.realpathSync(root), 'node_modules'));
    fs.writeFileSync(
      path.join(isolated.homeDir, '.claude', 'skills', 'qa', 'SKILL.md'),
      '# changed only in scratch\n',
    );
    expect(fs.readFileSync(path.join(root, 'qa', 'SKILL.md'), 'utf8')).toBe('# qa\n');
    expect(fs.existsSync(path.join(isolated.homeDir, '.claude', 'settings.json'))).toBe(false);
  });

  test('Codex installs the generated catalog without copying user config', () => {
    const root = makeSkillRoot();
    const isolated = createIsolatedEnvironment('codex', root);
    scratchHomes.push(isolated.homeDir);

    expect(isolated.env.CODEX_HOME).toBe(path.join(isolated.homeDir, '.codex'));
    expect(fs.realpathSync(path.join(isolated.env.CODEX_HOME, 'skills', 'qa')))
      .toBe(fs.realpathSync(path.join(isolated.skillSnapshot, '.agents', 'skills', 'qa')));
    expect(fs.existsSync(path.join(isolated.env.CODEX_HOME, 'config.toml'))).toBe(false);
  });

  test('skill digest covers generated prompts and runtime references', () => {
    const root = makeSkillRoot();
    const before = digestSkillRoot(root);
    fs.writeFileSync(path.join(root, 'qa', 'SKILL.md'), '# qa changed\n');
    expect(digestSkillRoot(root)).not.toBe(before);
    const afterPrompt = digestSkillRoot(root);
    fs.writeFileSync(path.join(root, 'qa', 'checklist.md'), '# runtime checklist\n');
    expect(digestSkillRoot(root)).not.toBe(afterPrompt);
  });
});

describe('Codex JSONL parsing', () => {
  test('extracts the final answer, usage, turns, and tool calls', () => {
    const parsed = parseCodexOutput([
      '{"type":"thread.started","thread_id":"abc"}',
      '{"type":"turn.started"}',
      '{"type":"item.completed","item":{"id":"1","type":"command_execution","command":"git status","aggregated_output":"clean","exit_code":0,"status":"completed"}}',
      '{"type":"item.completed","item":{"id":"2","type":"agent_message","text":"Done."}}',
      '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":20,"output_tokens":30}}',
    ]);

    expect(parsed.turnCount).toBe(1);
    expect(parsed.toolCalls).toEqual([{
      tool: 'exec_command',
      input: { command: 'git status' },
      output: 'clean',
    }]);
    expect(parsed.output).toBe('Done.');
    expect(parsed.estimatedTokens).toBe(130);
    expect(parsed.isError).toBe(false);
  });

  test('marks failed turns as errors', () => {
    const parsed = parseCodexOutput([
      '{"type":"turn.started"}',
      '{"type":"turn.failed","error":{"message":"bad request"}}',
    ]);
    expect(parsed.isError).toBe(true);
    expect(parsed.subtype).toBe('turn.failed');
  });
});
