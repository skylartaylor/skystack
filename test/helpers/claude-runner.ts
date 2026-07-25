import type {
  AgentEffort,
  AgentRunOptions,
  ParsedAgentOutput,
  ToolCall,
} from './agent-runner';

export interface ParsedNDJSON {
  transcript: any[];
  resultLine: any | null;
  turnCount: number;
  toolCallCount: number;
  toolCalls: ToolCall[];
}

export function buildClaudeCommand(options: AgentRunOptions): string[] {
  const args = [
    'claude',
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--no-session-persistence',
    '--dangerously-skip-permissions',
    '--max-turns', String(options.maxTurns ?? 15),
    '--allowed-tools', ...(options.allowedTools ?? ['Bash', 'Read', 'Write']),
  ];

  if (options.model) args.push('--model', options.model);
  if (options.effort) args.push('--effort', options.effort satisfies AgentEffort);
  return args;
}

/**
 * Parse Claude Code's stream-json output. Kept as a pure function because the
 * legacy E2E tests and transcript tools import it directly.
 */
export function parseNDJSON(lines: string[]): ParsedNDJSON {
  const transcript: any[] = [];
  let resultLine: any = null;
  let turnCount = 0;
  let toolCallCount = 0;
  const toolCalls: ToolCall[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      transcript.push(event);

      if (event.type === 'assistant') {
        turnCount++;
        const content = event.message?.content || [];
        for (const item of content) {
          if (item.type === 'tool_use') {
            toolCallCount++;
            toolCalls.push({
              tool: item.name || 'unknown',
              input: item.input || {},
              output: '',
            });
          }
        }
      }

      if (event.type === 'result') resultLine = event;
    } catch {
      // Ignore malformed output; the process exit code still determines failure.
    }
  }

  return { transcript, resultLine, turnCount, toolCallCount, toolCalls };
}

export function parseClaudeOutput(lines: string[]): ParsedAgentOutput {
  const parsed = parseNDJSON(lines);
  const result = parsed.resultLine;
  const estimatedTokens = (result?.usage?.input_tokens || 0)
    + (result?.usage?.output_tokens || 0)
    + (result?.usage?.cache_read_input_tokens || 0);

  return {
    transcript: parsed.transcript,
    resultLine: result,
    turnCount: result?.num_turns ?? parsed.turnCount,
    toolCalls: parsed.toolCalls,
    output: result?.result || '',
    estimatedTokens,
    estimatedCost: result?.total_cost_usd || 0,
    isError: !!result?.is_error,
    subtype: result?.subtype,
  };
}
