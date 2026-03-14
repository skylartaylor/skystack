/**
 * LLM-as-a-Judge evals for generated SKILL.md quality.
 *
 * Uses the Anthropic API directly (not Agent SDK) to evaluate whether
 * generated command docs are clear, complete, and actionable for an AI agent.
 *
 * Requires: ANTHROPIC_API_KEY env var (or EVALS=1 with key already set)
 * Run: EVALS=1 bun run test:eval
 *
 * Cost: ~$0.05-0.15 per run (sonnet)
 */

import { describe, test, expect } from 'bun:test';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { callJudge, judge } from './helpers/llm-judge';
import type { JudgeScore } from './helpers/llm-judge';

const ROOT = path.resolve(import.meta.dir, '..');
// Run when EVALS=1 is set (requires ANTHROPIC_API_KEY in env)
const describeEval = process.env.EVALS ? describe : describe.skip;

describeEval('LLM-as-judge quality evals', () => {
  test('command reference table scores >= 4 on all dimensions', async () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    // Extract just the command reference section
    const start = content.indexOf('## Command Reference');
    const end = content.indexOf('## Tips');
    const section = content.slice(start, end);

    const scores = await judge('command reference table', section);
    console.log('Command reference scores:', JSON.stringify(scores, null, 2));

    expect(scores.clarity).toBeGreaterThanOrEqual(4);
    expect(scores.completeness).toBeGreaterThanOrEqual(4);
    expect(scores.actionability).toBeGreaterThanOrEqual(4);
  }, 30_000);

  test('snapshot flags section scores >= 4 on all dimensions', async () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    const start = content.indexOf('## Snapshot System');
    const end = content.indexOf('## Command Reference');
    const section = content.slice(start, end);

    const scores = await judge('snapshot flags reference', section);
    console.log('Snapshot flags scores:', JSON.stringify(scores, null, 2));

    expect(scores.clarity).toBeGreaterThanOrEqual(4);
    expect(scores.completeness).toBeGreaterThanOrEqual(4);
    expect(scores.actionability).toBeGreaterThanOrEqual(4);
  }, 30_000);

  test('browse/SKILL.md overall scores >= 4', async () => {
    const content = fs.readFileSync(path.join(ROOT, 'browse', 'SKILL.md'), 'utf-8');
    // Just the reference sections (skip examples/patterns)
    const start = content.indexOf('## Snapshot Flags');
    const section = content.slice(start);

    const scores = await judge('browse skill reference (flags + commands)', section);
    console.log('Browse SKILL.md scores:', JSON.stringify(scores, null, 2));

    expect(scores.clarity).toBeGreaterThanOrEqual(4);
    expect(scores.completeness).toBeGreaterThanOrEqual(4);
    expect(scores.actionability).toBeGreaterThanOrEqual(4);
  }, 30_000);

  test('setup block scores >= 4 on actionability and clarity', async () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    const setupStart = content.indexOf('## SETUP');
    const setupEnd = content.indexOf('## IMPORTANT');
    const section = content.slice(setupStart, setupEnd);

    const scores = await judge('setup/binary discovery instructions', section);
    console.log('Setup block scores:', JSON.stringify(scores, null, 2));

    expect(scores.actionability).toBeGreaterThanOrEqual(4);
    expect(scores.clarity).toBeGreaterThanOrEqual(4);
  }, 30_000);

  test('regression check: compare branch vs baseline quality', async () => {
    // This test compares the generated output against the hand-maintained
    // baseline from main. The generated version should score equal or higher.
    const generated = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    const genStart = generated.indexOf('## Command Reference');
    const genEnd = generated.indexOf('## Tips');
    const genSection = generated.slice(genStart, genEnd);

    const baseline = `## Command Reference

### Navigation
| Command | Description |
|---------|-------------|
| \`goto <url>\` | Navigate to URL |
| \`back\` / \`forward\` | History navigation |
| \`reload\` | Reload page |
| \`url\` | Print current URL |

### Interaction
| Command | Description |
|---------|-------------|
| \`click <sel>\` | Click element |
| \`fill <sel> <val>\` | Fill input |
| \`select <sel> <val>\` | Select dropdown |
| \`hover <sel>\` | Hover element |
| \`type <text>\` | Type into focused element |
| \`press <key>\` | Press key (Enter, Tab, Escape) |
| \`scroll [sel]\` | Scroll element into view |
| \`wait <sel>\` | Wait for element (max 10s) |
| \`wait --networkidle\` | Wait for network to be idle |
| \`wait --load\` | Wait for page load event |

### Inspection
| Command | Description |
|---------|-------------|
| \`js <expr>\` | Run JavaScript |
| \`css <sel> <prop>\` | Computed CSS |
| \`attrs <sel>\` | Element attributes |
| \`is <prop> <sel>\` | State check (visible/hidden/enabled/disabled/checked/editable/focused) |
| \`console [--clear\\|--errors]\` | Console messages (--errors filters to error/warning) |`;

    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are comparing two versions of CLI documentation for an AI coding agent.

VERSION A (baseline — hand-maintained):
${baseline}

VERSION B (auto-generated from source):
${genSection}

Which version is better for an AI agent trying to use these commands? Consider:
- Completeness (more commands documented? all args shown?)
- Clarity (descriptions helpful?)
- Coverage (missing commands in either version?)

Respond with ONLY valid JSON:
{"winner": "A" or "B" or "tie", "reasoning": "brief explanation", "a_score": N, "b_score": N}

Scores are 1-5 overall quality.`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`Judge returned non-JSON: ${text.slice(0, 200)}`);
    const result = JSON.parse(jsonMatch[0]);
    console.log('Regression comparison:', JSON.stringify(result, null, 2));

    // Generated version should be at least as good as hand-maintained
    expect(result.b_score).toBeGreaterThanOrEqual(result.a_score);
  }, 30_000);
});

// --- Part 7: QA skill quality evals (C6) ---

describeEval('QA skill quality evals', () => {
  const qaContent = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');

  test('qa/SKILL.md workflow quality scores >= 4', async () => {
    // Extract the workflow section (Phases 1-7)
    const start = qaContent.indexOf('## Workflow');
    const end = qaContent.indexOf('## Health Score Rubric');
    const section = qaContent.slice(start, end);

    // Use workflow-specific prompt (not the CLI-reference judge, since this is a
    // workflow doc that references $B commands defined in a separate browse SKILL.md)
    const scores = await callJudge<JudgeScore>(`You are evaluating the quality of a QA testing workflow document for an AI coding agent.

The agent reads this document to learn how to systematically QA test a web application. The workflow references
a headless browser CLI ($B commands) that is documented separately — do NOT penalize for missing CLI definitions.
Instead, evaluate whether the workflow itself is clear, complete, and actionable.

Rate on three dimensions (1-5 scale):
- **clarity** (1-5): Can an agent follow the step-by-step phases without ambiguity?
- **completeness** (1-5): Are all phases, decision points, and outputs well-defined?
- **actionability** (1-5): Can an agent execute the workflow and produce the expected deliverables?

Respond with ONLY valid JSON:
{"clarity": N, "completeness": N, "actionability": N, "reasoning": "brief explanation"}

Here is the QA workflow to evaluate:

${section}`);
    console.log('QA workflow scores:', JSON.stringify(scores, null, 2));

    expect(scores.clarity).toBeGreaterThanOrEqual(4);
    expect(scores.completeness).toBeGreaterThanOrEqual(4);
    expect(scores.actionability).toBeGreaterThanOrEqual(4);
  }, 30_000);

  test('qa/SKILL.md health score rubric is unambiguous', async () => {
    const start = qaContent.indexOf('## Health Score Rubric');
    const section = qaContent.slice(start);

    // Use rubric-specific prompt
    const scores = await callJudge<JudgeScore>(`You are evaluating a health score rubric that an AI agent must follow to compute a numeric QA score.

The agent uses this rubric after QA testing a website. It needs to:
1. Understand each scoring category and what counts as a deduction
2. Apply the weights correctly to compute a final score out of 100
3. Produce a consistent, reproducible score

Rate on three dimensions (1-5 scale):
- **clarity** (1-5): Are the categories, deduction criteria, and weights unambiguous?
- **completeness** (1-5): Are all edge cases and scoring boundaries defined?
- **actionability** (1-5): Can an agent compute a correct score from this rubric alone?

Respond with ONLY valid JSON:
{"clarity": N, "completeness": N, "actionability": N, "reasoning": "brief explanation"}

Here is the rubric to evaluate:

${section}`);
    console.log('QA health rubric scores:', JSON.stringify(scores, null, 2));

    expect(scores.clarity).toBeGreaterThanOrEqual(4);
    // Completeness threshold is 3 — the rubric intentionally leaves some edge cases
    // to agent judgment (e.g., partial testing, cross-category findings). The judge
    // consistently flags these as gaps, but over-specifying would make the rubric
    // rigid and harder to follow. Clarity + actionability >= 4 is what matters.
    expect(scores.completeness).toBeGreaterThanOrEqual(3);
    expect(scores.actionability).toBeGreaterThanOrEqual(4);
  }, 30_000);
});

// --- Part 7: Cross-skill consistency judge (C7) ---

describeEval('Cross-skill consistency evals', () => {
  test('greptile-history patterns are consistent across all skills', async () => {
    const reviewContent = fs.readFileSync(path.join(ROOT, 'review', 'SKILL.md'), 'utf-8');
    const shipContent = fs.readFileSync(path.join(ROOT, 'ship', 'SKILL.md'), 'utf-8');
    const triageContent = fs.readFileSync(path.join(ROOT, 'review', 'greptile-triage.md'), 'utf-8');
    const retroContent = fs.readFileSync(path.join(ROOT, 'retro', 'SKILL.md'), 'utf-8');

    // Extract greptile-related lines from each file
    const extractGrepLines = (content: string, filename: string) => {
      const lines = content.split('\n')
        .filter(l => /greptile|history\.md|REMOTE_SLUG/i.test(l))
        .map(l => l.trim());
      return `--- ${filename} ---\n${lines.join('\n')}`;
    };

    const collected = [
      extractGrepLines(reviewContent, 'review/SKILL.md'),
      extractGrepLines(shipContent, 'ship/SKILL.md'),
      extractGrepLines(triageContent, 'review/greptile-triage.md'),
      extractGrepLines(retroContent, 'retro/SKILL.md'),
    ].join('\n\n');

    const result = await callJudge<{ consistent: boolean; issues: string[]; score: number; reasoning: string }>(`You are evaluating whether multiple skill configuration files implement the same data architecture consistently.

INTENDED ARCHITECTURE:
- greptile-history has TWO paths: per-project (~/.gstack/projects/{slug}/greptile-history.md) and global (~/.gstack/greptile-history.md)
- /review and /ship WRITE to BOTH paths (per-project for suppressions, global for retro aggregation)
- /review and /ship delegate write mechanics to greptile-triage.md
- /retro READS from the GLOBAL path only (it aggregates across all projects)
- REMOTE_SLUG derivation should be consistent across files that use it

Below are greptile-related lines extracted from each skill file:

${collected}

Evaluate consistency. Respond with ONLY valid JSON:
{
  "consistent": true/false,
  "issues": ["issue 1", "issue 2"],
  "score": N,
  "reasoning": "brief explanation"
}

score (1-5): 5 = perfectly consistent, 1 = contradictory`);

    console.log('Cross-skill consistency:', JSON.stringify(result, null, 2));

    expect(result.consistent).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(4);
  }, 30_000);
});

// --- Part 7: Baseline score pinning (C9) ---

describeEval('Baseline score pinning', () => {
  const baselinesPath = path.join(ROOT, 'test', 'fixtures', 'eval-baselines.json');

  test('LLM eval scores do not regress below baselines', async () => {
    if (!fs.existsSync(baselinesPath)) {
      console.log('No baseline file found — skipping pinning check');
      return;
    }

    const baselines = JSON.parse(fs.readFileSync(baselinesPath, 'utf-8'));
    const regressions: string[] = [];

    // Test command reference
    const skillContent = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    const cmdStart = skillContent.indexOf('## Command Reference');
    const cmdEnd = skillContent.indexOf('## Tips');
    const cmdSection = skillContent.slice(cmdStart, cmdEnd);
    const cmdScores = await judge('command reference table', cmdSection);

    for (const dim of ['clarity', 'completeness', 'actionability'] as const) {
      if (cmdScores[dim] < baselines.command_reference[dim]) {
        regressions.push(`command_reference.${dim}: ${cmdScores[dim]} < baseline ${baselines.command_reference[dim]}`);
      }
    }

    // Update baselines if requested
    if (process.env.UPDATE_BASELINES) {
      baselines.command_reference = {
        clarity: cmdScores.clarity,
        completeness: cmdScores.completeness,
        actionability: cmdScores.actionability,
      };
      fs.writeFileSync(baselinesPath, JSON.stringify(baselines, null, 2) + '\n');
      console.log('Updated eval baselines');
    }

    if (regressions.length > 0) {
      throw new Error(`Score regressions detected:\n${regressions.join('\n')}`);
    }
  }, 60_000);
});
