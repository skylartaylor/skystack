/**
 * Backward-compatible Claude runner facade.
 *
 * New eval code should call runAgentTest from agent-runner.ts with an explicit
 * provider, model, effort, and skillRoot. Existing Claude E2E tests can keep
 * calling runSkillTest unchanged.
 */

import {
  defaultSkillRoot,
  runAgentTest,
} from './agent-runner';
import type {
  AgentEffort,
  AgentProvider,
  AgentTestResult,
  CostEstimate,
} from './agent-runner';

export { parseNDJSON } from './claude-runner';
export { sanitizeTestName } from './agent-runner';
export type { CostEstimate };

export type SkillTestResult = AgentTestResult;

export async function runSkillTest(options: {
  prompt: string;
  workingDirectory: string;
  provider?: AgentProvider;
  model?: string;
  effort?: AgentEffort;
  skillRoot?: string;
  maxTurns?: number;
  allowedTools?: string[];
  timeout?: number;
  testName?: string;
  runId?: string;
}): Promise<SkillTestResult> {
  return runAgentTest({
    provider: options.provider ?? 'claude',
    model: options.model,
    effort: options.effort,
    skillRoot: options.skillRoot ?? defaultSkillRoot(),
    prompt: options.prompt,
    workingDirectory: options.workingDirectory,
    maxTurns: options.maxTurns,
    allowedTools: options.allowedTools,
    timeout: options.timeout,
    testName: options.testName,
    runId: options.runId,
  });
}
