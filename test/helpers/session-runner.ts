/**
 * Claude CLI subprocess runner for skill E2E testing.
 *
 * Spawns `claude -p` as a completely independent process (not via Agent SDK),
 * so it works inside Claude Code sessions. Pipes prompt via stdin, collects
 * JSON output, scans for browse errors.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CostEstimate {
  inputChars: number;
  outputChars: number;
  estimatedTokens: number;
  estimatedCost: number;  // USD
  turnsUsed: number;
}

export interface SkillTestResult {
  messages: any[];
  toolCalls: Array<{ tool: string; input: any; output: string }>;
  browseErrors: string[];
  exitReason: string;
  duration: number;
  output: string;
  costEstimate: CostEstimate;
}

const BROWSE_ERROR_PATTERNS = [
  /Unknown command: \w+/,
  /Unknown snapshot flag: .+/,
  /Exit code 1/,
  /ERROR: browse binary not found/,
  /Server failed to start/,
  /no such file or directory.*browse/i,
];

export async function runSkillTest(options: {
  prompt: string;
  workingDirectory: string;
  maxTurns?: number;
  allowedTools?: string[];
  timeout?: number;
}): Promise<SkillTestResult> {
  const {
    prompt,
    workingDirectory,
    maxTurns = 15,
    allowedTools = ['Bash', 'Read', 'Write'],
    timeout = 120_000,
  } = options;

  const startTime = Date.now();

  // Spawn claude -p with JSON output. Prompt piped via stdin to avoid
  // shell escaping issues. Env is passed through (child claude strips
  // its own parent-detection vars internally).
  const args = [
    '-p',
    '--output-format', 'json',
    '--dangerously-skip-permissions',
    '--max-turns', String(maxTurns),
    '--allowed-tools', ...allowedTools,
  ];

  // Write prompt to a temp file and pipe it via shell to avoid stdin buffering issues
  const promptFile = path.join(workingDirectory, '.prompt-tmp');
  fs.writeFileSync(promptFile, prompt);

  const proc = Bun.spawn(['sh', '-c', `cat "${promptFile}" | claude ${args.map(a => `"${a}"`).join(' ')}`], {
    cwd: workingDirectory,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Race against timeout
  let stdout = '';
  let stderr = '';
  let exitReason = 'unknown';
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeout);

  try {
    const [outBuf, errBuf] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    stdout = outBuf;
    stderr = errBuf;

    const exitCode = await proc.exited;
    clearTimeout(timeoutId);

    if (timedOut) {
      exitReason = 'timeout';
    } else if (exitCode === 0) {
      exitReason = 'success';
    } else {
      exitReason = `exit_code_${exitCode}`;
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    exitReason = timedOut ? 'timeout' : `error: ${err.message}`;
  } finally {
    try { fs.unlinkSync(promptFile); } catch { /* non-fatal */ }
  }

  const duration = Date.now() - startTime;

  // Parse JSON output
  let messages: any[] = [];
  let toolCalls: SkillTestResult['toolCalls'] = [];
  const browseErrors: string[] = [];
  let result: any = null;

  try {
    // stdout may have stderr warnings prefixed (e.g., "[WARN] Fast mode...")
    // Find the JSON object in the output
    const jsonStart = stdout.indexOf('{');
    if (jsonStart >= 0) {
      result = JSON.parse(stdout.slice(jsonStart));
    }
  } catch { /* non-JSON output */ }

  // Scan all output for browse errors
  const allText = stdout + '\n' + stderr;
  for (const pattern of BROWSE_ERROR_PATTERNS) {
    const match = allText.match(pattern);
    if (match) {
      browseErrors.push(match[0].slice(0, 200));
    }
  }

  // If JSON parsed, use the structured result
  if (result) {
    // Check result type for success
    if (result.type === 'result' && result.subtype === 'success') {
      exitReason = 'success';
    } else if (result.type === 'result' && result.subtype) {
      exitReason = result.subtype;
    }
  }

  // Save transcript on failure
  if (browseErrors.length > 0 || exitReason !== 'success') {
    try {
      const transcriptDir = path.join(workingDirectory, '.gstack', 'test-transcripts');
      fs.mkdirSync(transcriptDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.writeFileSync(
        path.join(transcriptDir, `e2e-${timestamp}.json`),
        JSON.stringify({
          prompt: prompt.slice(0, 500),
          exitReason,
          browseErrors,
          duration,
          stderr: stderr.slice(0, 2000),
          result: result ? { type: result.type, subtype: result.subtype, result: result.result?.slice?.(0, 500) } : null,
        }, null, 2),
      );
    } catch { /* non-fatal */ }
  }

  // Cost from JSON result (exact) or estimate from chars
  const turnsUsed = result?.num_turns || 0;
  const estimatedCost = result?.total_cost_usd || 0;
  const inputChars = prompt.length;
  const outputChars = (result?.result || stdout).length;
  const estimatedTokens = (result?.usage?.input_tokens || 0)
    + (result?.usage?.output_tokens || 0)
    + (result?.usage?.cache_read_input_tokens || 0);

  const costEstimate: CostEstimate = {
    inputChars,
    outputChars,
    estimatedTokens,
    estimatedCost: Math.round((estimatedCost) * 100) / 100,
    turnsUsed,
  };

  return { messages, toolCalls, browseErrors, exitReason, duration, output: result?.result || stdout, costEstimate };
}
