import type { AgentRunOptions, ParsedAgentOutput, ToolCall } from './agent-runner';

export function buildCodexCommand(options: AgentRunOptions): string[] {
  const args = [
    'codex',
    'exec',
    '--json',
    '--ephemeral',
    '--ignore-user-config',
    '--ignore-rules',
    '--skip-git-repo-check',
    '--sandbox', 'workspace-write',
    '--cd', options.workingDirectory,
    '-c', 'approval_policy="never"',
  ];

  if (options.model) args.push('--model', options.model);
  if (options.effort) args.push('-c', `model_reasoning_effort="${options.effort}"`);
  args.push('-');
  return args;
}

function codexToolCall(item: any): ToolCall | null {
  switch (item?.type) {
    case 'command_execution':
      return {
        tool: 'exec_command',
        input: { command: item.command || '' },
        output: item.aggregated_output || '',
      };
    case 'mcp_tool_call':
      return {
        tool: [item.server, item.tool].filter(Boolean).join('/') || 'mcp_tool_call',
        input: item.arguments || {},
        output: typeof item.result === 'string' ? item.result : JSON.stringify(item.result || ''),
      };
    case 'file_change':
      return {
        tool: 'apply_patch',
        input: { changes: item.changes || [] },
        output: item.status || '',
      };
    case 'web_search':
      return {
        tool: 'web_search',
        input: { query: item.query || '' },
        output: '',
      };
    default:
      return null;
  }
}

/** Parse Codex CLI `exec --json` JSONL into the shared eval result shape. */
export function parseCodexOutput(lines: string[]): ParsedAgentOutput {
  const transcript: any[] = [];
  const toolCalls: ToolCall[] = [];
  let output = '';
  let turnCount = 0;
  let estimatedTokens = 0;
  let isError = false;
  let subtype: string | undefined;
  let resultLine: any = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      transcript.push(event);

      if (event.type === 'turn.started') turnCount++;
      if (event.type === 'error' || event.type === 'turn.failed') {
        isError = true;
        subtype = event.type;
        resultLine = event;
      }

      const item = event.item;
      if (event.type === 'item.completed' && item) {
        const toolCall = codexToolCall(item);
        if (toolCall) toolCalls.push(toolCall);
        if (item.type === 'agent_message' && typeof item.text === 'string') {
          output = item.text;
        }
      }

      if (event.type === 'turn.completed') {
        resultLine = event;
        const usage = event.usage || {};
        // input_tokens already includes the cached subset in Codex usage.
        estimatedTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
      }
    } catch {
      // Ignore non-JSON diagnostics; stderr and the exit code remain available.
    }
  }

  return {
    transcript,
    resultLine,
    turnCount,
    toolCalls,
    output,
    estimatedTokens,
    estimatedCost: 0,
    isError,
    subtype,
  };
}
