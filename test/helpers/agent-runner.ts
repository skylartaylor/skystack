/**
 * Provider-neutral subprocess runner for paid skill E2E tests.
 *
 * Every invocation gets a scratch HOME and SKYSTACK_HOME. Only provider auth
 * and the explicitly selected skill root cross that boundary.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import { buildClaudeCommand, parseClaudeOutput } from './claude-runner';
import { buildCodexCommand, parseCodexOutput } from './codex-runner';
import { CLAUDE_SKILLS } from '../../scripts/skill-catalog';

const REAL_HOME = os.homedir();
const SKYSTACK_DEV_DIR = path.join(REAL_HOME, '.skystack-dev');
const HEARTBEAT_PATH = path.join(SKYSTACK_DEV_DIR, 'e2e-live.json');
const DEFAULT_SKILL_ROOT = path.resolve(import.meta.dir, '..', '..');
const RUNTIME_ENV_KEYS = [
  'PATH',
  'TMPDIR',
  'TMP',
  'TEMP',
  'SHELL',
  'USER',
  'LOGNAME',
  'LANG',
  'LC_ALL',
  'TERM',
  'COLORTERM',
  'NO_COLOR',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
  'NODE_EXTRA_CA_CERTS',
] as const;

export type AgentProvider = 'claude' | 'codex';
export type AgentEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'ultra';

export interface ToolCall {
  tool: string;
  input: any;
  output: string;
}

/** Return the shell command represented by either provider's native tool shape. */
export function getToolCommand(call: ToolCall): string | null {
  if (call.tool !== 'Bash' && call.tool !== 'exec_command') return null;
  if (typeof call.input === 'string') return call.input;
  if (typeof call.input?.command === 'string') return call.input.command;
  return null;
}

export interface CostEstimate {
  inputChars: number;
  outputChars: number;
  estimatedTokens: number;
  estimatedCost: number;
  turnsUsed: number;
}

export interface AgentRunIdentity {
  provider: AgentProvider;
  model: string;
  effort: AgentEffort | 'default';
  cli_version: string;
  prompt_sha256: string;
  working_directory: string;
  skill_root: string;
  skill_sha256: string;
  skill_git_sha?: string;
}

export interface AgentTestResult {
  toolCalls: ToolCall[];
  browseErrors: string[];
  exitReason: string;
  duration: number;
  output: string;
  costEstimate: CostEstimate;
  transcript: any[];
  identity: AgentRunIdentity;
}

export interface AgentRunOptions {
  provider: AgentProvider;
  prompt: string;
  workingDirectory: string;
  skillRoot: string;
  model?: string;
  effort?: AgentEffort;
  maxTurns?: number;
  allowedTools?: string[];
  timeout?: number;
  testName?: string;
  runId?: string;
  preserveScratchHome?: boolean;
}

export interface ParsedAgentOutput {
  transcript: any[];
  resultLine: any | null;
  turnCount: number;
  toolCalls: ToolCall[];
  output: string;
  estimatedTokens: number;
  estimatedCost: number;
  isError: boolean;
  subtype?: string;
}

export interface IsolatedEnvironment {
  homeDir: string;
  skystackHome: string;
  skillSnapshot: string;
  env: Record<string, string>;
  skillLinks: string[];
}

const BROWSE_ERROR_PATTERNS = [
  /Unknown command: \w+/,
  /Unknown snapshot flag: .+/,
  /ERROR: browse binary not found/,
  /Server failed to start/,
  /no such file or directory.*browse/i,
];

export function sanitizeTestName(name: string): string {
  return name.replace(/^\/+/, '').replace(/\//g, '-');
}

function atomicWriteSync(filePath: string, data: string): void {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, filePath);
}

function linkDirectory(target: string, linkPath: string): void {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(target, linkPath, 'dir');
}

function linkSkillCatalog(catalog: string, destination: string, links: string[]): void {
  if (!fs.existsSync(catalog)) return;
  for (const entry of fs.readdirSync(catalog, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const target = path.join(catalog, entry.name);
    if (!fs.existsSync(path.join(target, 'SKILL.md'))) continue;
    const linkPath = path.join(destination, entry.name);
    linkDirectory(target, linkPath);
    links.push(linkPath);
  }
}

function copyEntry(source: string, destination: string): void {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) {
    copyEntry(fs.realpathSync(source), destination);
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true, mode: stat.mode });
    for (const entry of fs.readdirSync(source)) {
      copyEntry(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_FICLONE);
  fs.chmodSync(destination, stat.mode);
}

/**
 * Copy only runtime skill artifacts into the scratch home. This avoids exposing
 * the live checkout through writable symlinks while keeping compiled browser
 * and mobile helpers available to E2E scenarios.
 */
function createSkillSnapshot(sourceRoot: string, homeDir: string): string {
  const snapshotRoot = path.join(homeDir, 'skill-snapshot');
  fs.mkdirSync(snapshotRoot, { recursive: true });

  for (const relativePath of [
    'SKILL.md',
    'VERSION',
    'setup',
    'setup-codex',
    'bin',
    'mobile/dist',
    '.agents/skills',
  ]) {
    const source = path.join(sourceRoot, relativePath);
    if (fs.existsSync(source)) copyEntry(source, path.join(snapshotRoot, relativePath));
  }

  const excludedSkillEntries = new Set(['SKILL.md.tmpl', 'src', 'test', 'dist', 'node_modules']);
  for (const skill of CLAUDE_SKILLS) {
    const skillDir = path.dirname(skill.claudeOutput);
    if (skillDir === '.') continue;
    const sourceDir = path.join(sourceRoot, skillDir);
    if (!fs.existsSync(sourceDir)) continue;
    for (const entry of fs.readdirSync(sourceDir)) {
      if (excludedSkillEntries.has(entry)) continue;
      copyEntry(
        path.join(sourceDir, entry),
        path.join(snapshotRoot, skillDir, entry),
      );
    }
    if (skillDir === 'browse') {
      for (const runtimeDir of ['bin', 'dist', 'src']) {
        const source = path.join(sourceDir, runtimeDir);
        if (fs.existsSync(source)) {
          copyEntry(source, path.join(snapshotRoot, skillDir, runtimeDir));
        }
      }
    }
  }

  return snapshotRoot;
}

function loadClaudeOAuthToken(): string | undefined {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return process.env.CLAUDE_CODE_OAUTH_TOKEN;

  const credentialsFile = path.join(REAL_HOME, '.claude', '.credentials.json');
  if (fs.existsSync(credentialsFile)) {
    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
      const token = credentials?.claudeAiOauth?.accessToken;
      if (typeof token === 'string' && token.length > 0) return token;
    } catch { /* try the platform credential store */ }
  }

  if (process.platform === 'darwin') {
    const result = spawnSync(
      'security',
      ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
      { encoding: 'utf8', timeout: 5000 },
    );
    if (result.status === 0) {
      try {
        const credentials = JSON.parse(result.stdout);
        const token = credentials?.claudeAiOauth?.accessToken;
        if (typeof token === 'string' && token.length > 0) return token;
      } catch { /* unavailable or unsupported credential shape */ }
    }
  }

  return undefined;
}

/**
 * Build an isolated provider home without copying user settings, history, MCP
 * configuration, or live ~/.skystack state.
 */
export function createIsolatedEnvironment(
  provider: AgentProvider,
  skillRoot: string,
): IsolatedEnvironment {
  const resolvedSkillRoot = fs.realpathSync(skillRoot);
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), `skystack-${provider}-eval-`));
  const skystackHome = path.join(homeDir, '.skystack');
  fs.mkdirSync(skystackHome, { recursive: true });
  const skillSnapshot = createSkillSnapshot(resolvedSkillRoot, homeDir);

  const env: Record<string, string> = {};
  for (const key of RUNTIME_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  env.HOME = homeDir;
  env.SKYSTACK_HOME = skystackHome;
  const runtimeModules = path.join(resolvedSkillRoot, 'node_modules');
  if (fs.existsSync(runtimeModules)) env.NODE_PATH = runtimeModules;
  const playwrightBrowsers = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(REAL_HOME, 'Library', 'Caches', 'ms-playwright'),
    path.join(REAL_HOME, '.cache', 'ms-playwright'),
  ].find((candidate): candidate is string => !!candidate && fs.existsSync(candidate));
  if (playwrightBrowsers) env.PLAYWRIGHT_BROWSERS_PATH = playwrightBrowsers;

  const skillLinks: string[] = [];
  if (provider === 'claude') {
    const oauthToken = loadClaudeOAuthToken();
    if (oauthToken) env.CLAUDE_CODE_OAUTH_TOKEN = oauthToken;
    if (!oauthToken && process.env.ANTHROPIC_API_KEY) {
      env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    }

    const destination = path.join(homeDir, '.claude', 'skills');
    fs.mkdirSync(destination, { recursive: true });
    if (fs.existsSync(path.join(skillSnapshot, 'SKILL.md'))) {
      const rootLink = path.join(destination, 'skystack');
      linkDirectory(skillSnapshot, rootLink);
      skillLinks.push(rootLink);
    }
    linkSkillCatalog(skillSnapshot, destination, skillLinks);
  } else {
    const codexHome = path.join(homeDir, '.codex');
    const destination = path.join(codexHome, 'skills');
    fs.mkdirSync(destination, { recursive: true });
    env.CODEX_HOME = codexHome;
    if (process.env.OPENAI_API_KEY) env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // Codex keeps auth beside config. Copy auth only; --ignore-user-config
    // prevents the eval from inheriting the user's model, MCP, or prompt setup.
    const sourceCodexHome = process.env.CODEX_HOME || path.join(REAL_HOME, '.codex');
    const sourceAuth = path.join(sourceCodexHome, 'auth.json');
    if (fs.existsSync(sourceAuth)) fs.copyFileSync(sourceAuth, path.join(codexHome, 'auth.json'));

    const generatedCatalog = path.join(skillSnapshot, '.agents', 'skills');
    linkSkillCatalog(
      fs.existsSync(generatedCatalog) ? generatedCatalog : skillSnapshot,
      destination,
      skillLinks,
    );
  }

  return { homeDir, skystackHome, skillSnapshot, env, skillLinks };
}

function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function collectSkillFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (dir: string, depth: number) => {
    if (depth > 4) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(fullPath, depth + 1);
      else if (entry.isFile()) files.push(fullPath);
    }
  };
  visit(root, 0);
  return files.sort();
}

export function digestSkillRoot(skillRoot: string): string {
  const root = fs.realpathSync(skillRoot);
  const digest = createHash('sha256');
  for (const file of collectSkillFiles(root)) {
    digest.update(path.relative(root, file));
    digest.update('\0');
    digest.update(fs.readFileSync(file));
    digest.update('\0');
  }
  return digest.digest('hex');
}

function getSkillGitSha(skillRoot: string): string | undefined {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: skillRoot,
    encoding: 'utf8',
    timeout: 3000,
  });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

export function getCliVersion(provider: AgentProvider): string {
  const executable = provider === 'claude' ? 'claude' : 'codex';
  const result = spawnSync(executable, ['--version'], {
    encoding: 'utf8',
    timeout: 5000,
  });
  if (result.status !== 0) {
    throw new Error(`${executable} CLI unavailable: ${(result.stderr || '').trim()}`);
  }
  return result.stdout.trim();
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) + '…' : value;
}

function describeToolCall(call: ToolCall): string {
  return `${call.tool}(${truncate(JSON.stringify(call.input || {}), 80)})`;
}

export async function runAgentTest(options: AgentRunOptions): Promise<AgentTestResult> {
  const {
    provider,
    prompt,
    workingDirectory,
    skillRoot,
    timeout = 120_000,
    testName,
    runId,
    preserveScratchHome = false,
  } = options;
  const resolvedSkillRoot = fs.realpathSync(skillRoot);
  const cliVersion = getCliVersion(provider);
  const isolated = createIsolatedEnvironment(provider, resolvedSkillRoot);
  const identity: AgentRunIdentity = {
    provider,
    model: options.model || 'default',
    effort: options.effort || 'default',
    cli_version: cliVersion,
    prompt_sha256: hash(prompt),
    working_directory: path.resolve(workingDirectory),
    skill_root: resolvedSkillRoot,
    skill_sha256: digestSkillRoot(isolated.skillSnapshot),
    skill_git_sha: getSkillGitSha(resolvedSkillRoot),
  };
  const command = provider === 'claude'
    ? buildClaudeCommand(options)
    : buildCodexCommand(options);
  const parseOutput = provider === 'claude' ? parseClaudeOutput : parseCodexOutput;

  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  const safeName = testName ? sanitizeTestName(testName) : null;
  let runDir: string | null = null;
  if (runId) {
    try {
      runDir = path.join(SKYSTACK_DEV_DIR, 'e2e-runs', runId);
      fs.mkdirSync(runDir, { recursive: true });
      if (safeName) {
        fs.writeFileSync(path.join(runDir, `${safeName}-metadata.json`), JSON.stringify({
          ...identity,
          working_directory: path.resolve(workingDirectory),
          scratch_home: isolated.homeDir,
          command: command.map((part, index) => index === command.length - 1 && part === '-' ? '<stdin>' : part),
          started_at: startedAt,
        }, null, 2) + '\n');
      }
    } catch { /* non-fatal */ }
  }

  const proc = Bun.spawn(command, {
    cwd: workingDirectory,
    env: isolated.env,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  proc.stdin.write(prompt);
  proc.stdin.end();

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeout);

  const collectedLines: string[] = [];
  const stderrPromise = new Response(proc.stderr).text();
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let liveTurnCount = 0;
  let liveToolCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        collectedLines.push(line);
        const parsedLine = parseOutput([line]);
        liveTurnCount += parsedLine.turnCount;
        for (const toolCall of parsedLine.toolCalls) {
          liveToolCount++;
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const progressLine = `  [${elapsed}s] turn ${liveTurnCount} tool #${liveToolCount}: ${describeToolCall(toolCall)}\n`;
          process.stderr.write(progressLine);
          if (runDir) {
            try { fs.appendFileSync(path.join(runDir, 'progress.log'), progressLine); } catch { /* non-fatal */ }
          }
          if (runId && testName) {
            try {
              atomicWriteSync(HEARTBEAT_PATH, JSON.stringify({
                runId,
                pid: proc.pid,
                startedAt,
                currentTest: testName,
                status: 'running',
                turn: liveTurnCount,
                toolCount: liveToolCount,
                lastTool: describeToolCall(toolCall),
                lastToolAt: new Date().toISOString(),
                elapsedSec: elapsed,
              }, null, 2) + '\n');
            } catch { /* non-fatal */ }
          }
        }
        if (runDir && safeName) {
          try { fs.appendFileSync(path.join(runDir, `${safeName}.ndjson`), line + '\n'); } catch { /* non-fatal */ }
        }
      }
    }
  } catch {
    // Stream failure is reflected by process status and stderr.
  }

  if (buffer.trim()) collectedLines.push(buffer);
  const stderr = await stderrPromise;
  const exitCode = await proc.exited;
  clearTimeout(timeoutId);

  const parsed = parseOutput(collectedLines);
  let exitReason = timedOut ? 'timeout' : exitCode === 0 ? 'success' : `exit_code_${exitCode}`;
  if (!timedOut && parsed.isError) exitReason = parsed.subtype || 'error_api';
  else if (!timedOut && provider === 'claude' && parsed.subtype) exitReason = parsed.subtype;

  const duration = Date.now() - startTime;
  const allText = parsed.transcript.map(event => JSON.stringify(event)).join('\n') + '\n' + stderr;
  const browseErrors: string[] = [];
  for (const pattern of BROWSE_ERROR_PATTERNS) {
    const match = allText.match(pattern);
    if (match) browseErrors.push(match[0].slice(0, 200));
  }

  if (browseErrors.length > 0 || exitReason !== 'success') {
    try {
      const failureDir = runDir || path.join(workingDirectory, '.skystack', 'test-transcripts');
      fs.mkdirSync(failureDir, { recursive: true });
      const failureName = safeName
        ? `${safeName}-failure.json`
        : `e2e-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      fs.writeFileSync(path.join(failureDir, failureName), JSON.stringify({
        identity,
        prompt: prompt.slice(0, 500),
        testName: testName || 'unknown',
        exitReason,
        browseErrors,
        duration,
        turnAtTimeout: timedOut ? liveTurnCount : undefined,
        lastToolCall: parsed.toolCalls.at(-1) ? describeToolCall(parsed.toolCalls.at(-1)!) : undefined,
        stderr: stderr.slice(0, 2000),
        result: parsed.resultLine,
      }, null, 2));
    } catch { /* non-fatal */ }
  }

  if (!preserveScratchHome) {
    try { fs.rmSync(isolated.homeDir, { recursive: true, force: true }); } catch { /* non-fatal */ }
  }

  return {
    toolCalls: parsed.toolCalls,
    browseErrors,
    exitReason,
    duration,
    output: parsed.output,
    costEstimate: {
      inputChars: prompt.length,
      outputChars: parsed.output.length,
      estimatedTokens: parsed.estimatedTokens,
      estimatedCost: Math.round(parsed.estimatedCost * 100) / 100,
      turnsUsed: parsed.turnCount,
    },
    transcript: parsed.transcript,
    identity,
  };
}

export function defaultSkillRoot(): string {
  return DEFAULT_SKILL_ROOT;
}
