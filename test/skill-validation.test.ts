import { describe, test, expect } from 'bun:test';
import { validateSkill, extractRemoteSlugPatterns } from './helpers/skill-parser';
import { ALL_COMMANDS, COMMAND_DESCRIPTIONS, READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS } from '../browse/src/commands';
import { SNAPSHOT_FLAGS } from '../browse/src/snapshot';
import { CLAUDE_SKILLS } from '../scripts/skill-catalog';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const SKILLS_WITH_PREAMBLE = CLAUDE_SKILLS
  .filter((skill) =>
    fs.readFileSync(path.join(ROOT, skill.claudeTemplate), 'utf-8').includes('{{PREAMBLE}}'),
  )
  .map((skill) => skill.claudeOutput);

describe('SKILL.md command validation', () => {
  test('all $B commands in SKILL.md are valid browse commands', () => {
    const result = validateSkill(path.join(ROOT, 'SKILL.md'));
    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(0);
  });

  test('all snapshot flags in SKILL.md are valid', () => {
    const result = validateSkill(path.join(ROOT, 'SKILL.md'));
    expect(result.snapshotFlagErrors).toHaveLength(0);
  });

  test('all $B commands in browse/SKILL.md are valid browse commands', () => {
    const result = validateSkill(path.join(ROOT, 'browse', 'SKILL.md'));
    expect(result.invalid).toHaveLength(0);
    expect(result.valid.length).toBeGreaterThan(0);
  });

  test('all snapshot flags in browse/SKILL.md are valid', () => {
    const result = validateSkill(path.join(ROOT, 'browse', 'SKILL.md'));
    expect(result.snapshotFlagErrors).toHaveLength(0);
  });

  test('all $B commands in qa/SKILL.md are valid browse commands', () => {
    const qaSkill = path.join(ROOT, 'qa', 'SKILL.md');
    if (!fs.existsSync(qaSkill)) return; // skip if missing
    const result = validateSkill(qaSkill);
    expect(result.invalid).toHaveLength(0);
  });

  test('all snapshot flags in qa/SKILL.md are valid', () => {
    const qaSkill = path.join(ROOT, 'qa', 'SKILL.md');
    if (!fs.existsSync(qaSkill)) return;
    const result = validateSkill(qaSkill);
    expect(result.snapshotFlagErrors).toHaveLength(0);
  });

  test('all $B commands in design/SKILL.md are valid browse commands', () => {
    const skill = path.join(ROOT, 'design', 'SKILL.md');
    if (!fs.existsSync(skill)) return;
    const result = validateSkill(skill);
    expect(result.invalid).toHaveLength(0);
  });

  test('all snapshot flags in design/SKILL.md are valid', () => {
    const skill = path.join(ROOT, 'design', 'SKILL.md');
    if (!fs.existsSync(skill)) return;
    const result = validateSkill(skill);
    expect(result.snapshotFlagErrors).toHaveLength(0);
  });
});

describe('Command registry consistency', () => {
  test('COMMAND_DESCRIPTIONS covers all commands in sets', () => {
    const allCmds = new Set([...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS]);
    const descKeys = new Set(Object.keys(COMMAND_DESCRIPTIONS));
    for (const cmd of allCmds) {
      expect(descKeys.has(cmd)).toBe(true);
    }
  });

  test('COMMAND_DESCRIPTIONS has no extra commands not in sets', () => {
    const allCmds = new Set([...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS]);
    for (const key of Object.keys(COMMAND_DESCRIPTIONS)) {
      expect(allCmds.has(key)).toBe(true);
    }
  });

  test('ALL_COMMANDS matches union of all sets', () => {
    const union = new Set([...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS]);
    expect(ALL_COMMANDS.size).toBe(union.size);
    for (const cmd of union) {
      expect(ALL_COMMANDS.has(cmd)).toBe(true);
    }
  });

  test('SNAPSHOT_FLAGS option keys are valid SnapshotOptions fields', () => {
    const validKeys = new Set([
      'interactive', 'compact', 'depth', 'selector',
      'diff', 'annotate', 'outputPath', 'cursorInteractive',
    ]);
    for (const flag of SNAPSHOT_FLAGS) {
      expect(validKeys.has(flag.optionKey)).toBe(true);
    }
  });
});

describe('Usage string consistency', () => {
  // Normalize a usage string to its structural skeleton for comparison.
  // Replaces <param-names> with <>, [optional] with [], strips parenthetical hints.
  // This catches format mismatches (e.g., <name>:<value> vs <name> <value>)
  // without tripping on abbreviation differences (e.g., <sel> vs <selector>).
  function skeleton(usage: string): string {
    return usage
      .replace(/\(.*?\)/g, '')        // strip parenthetical hints like (e.g., Enter, Tab)
      .replace(/<[^>]*>/g, '<>')      // normalize <param-name> → <>
      .replace(/\[[^\]]*\]/g, '[]')   // normalize [optional] → []
      .replace(/\s+/g, ' ')           // collapse whitespace
      .trim();
  }

  // Cross-check Usage: patterns in implementation against COMMAND_DESCRIPTIONS
  test('implementation Usage: structural format matches COMMAND_DESCRIPTIONS', () => {
    const implFiles = [
      path.join(ROOT, 'browse', 'src', 'write-commands.ts'),
      path.join(ROOT, 'browse', 'src', 'read-commands.ts'),
      path.join(ROOT, 'browse', 'src', 'meta-commands.ts'),
    ];

    // Extract "Usage: browse <pattern>" from throw new Error(...) calls
    const usagePattern = /throw new Error\(['"`]Usage:\s*browse\s+(.+?)['"`]\)/g;
    const implUsages = new Map<string, string>();

    for (const file of implFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      let match;
      while ((match = usagePattern.exec(content)) !== null) {
        const usage = match[1].split('\\n')[0].trim();
        const cmd = usage.split(/\s/)[0];
        implUsages.set(cmd, usage);
      }
    }

    // Compare structural skeletons
    const mismatches: string[] = [];
    for (const [cmd, implUsage] of implUsages) {
      const desc = COMMAND_DESCRIPTIONS[cmd];
      if (!desc) continue;
      if (!desc.usage) continue;
      const descSkel = skeleton(desc.usage);
      const implSkel = skeleton(implUsage);
      if (descSkel !== implSkel) {
        mismatches.push(`${cmd}: docs "${desc.usage}" (${descSkel}) vs impl "${implUsage}" (${implSkel})`);
      }
    }

    expect(mismatches).toEqual([]);
  });
});

describe('Generated SKILL.md freshness', () => {
  test('no unresolved {{placeholders}} in generated SKILL.md', () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    const unresolved = content.match(/\{\{\w+\}\}/g);
    expect(unresolved).toBeNull();
  });

  test('no unresolved {{placeholders}} in generated browse/SKILL.md', () => {
    const content = fs.readFileSync(path.join(ROOT, 'browse', 'SKILL.md'), 'utf-8');
    const unresolved = content.match(/\{\{\w+\}\}/g);
    expect(unresolved).toBeNull();
  });

  test('MOBILE_SETUP resolves in qa SKILL.md after template update', () => {
    // This test will pass after Task 4 updates qa/SKILL.md.tmpl
    // For now just verify the resolver is registered by checking gen output doesn't error
    const qa = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    // After Task 4, qa SKILL.md will contain $M
    // For now, just check it doesn't contain the unresolved placeholder
    expect(qa).not.toContain('{{MOBILE_SETUP}}');
  });

  test('generated SKILL.md has AUTO-GENERATED header', () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    expect(content).toContain('AUTO-GENERATED');
  });
});

// --- Part 7: Cross-skill path consistency (A1) ---

// --- Part 7: QA skill structure validation (A2) ---

describe('QA skill structure validation', () => {
  const qaContent = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');

  test('keeps a complete outcome-oriented flow', () => {
    for (const section of ['## Set up', '## Orient', '## Exercise each flow', '## Findings', '## Fixes', '## Report']) {
      expect(qaContent).toContain(section);
    }
  });

  test('runs autonomously unless genuinely blocked', () => {
    expect(qaContent).toContain('report-only');
    expect(qaContent).toContain('Ask one concise question only when');
    expect(qaContent).toContain('Do not add a ceremonial test-plan approval');
    expect(qaContent).toContain('--quick');
    expect(qaContent).toContain('--exhaustive');
  });

  test('requires interaction evidence and supports mobile', () => {
    expect(qaContent).toContain('Do not report success based only on page load');
    expect(qaContent).toContain('Evidence: screenshot, console error, network failure, or state assertion');
    expect(qaContent).toContain('$M snapshot');
    expect(qaContent).toContain('Do not substitute browser testing for a native');
  });

  test('has tester reference file reading', () => {
    expect(qaContent).toContain('tester.md');
    expect(qaContent).toContain('references/tester.md');
  });

  test('fixes remain explicitly request-gated and verified', () => {
    expect(qaContent).toContain('Only enter this section when the user requested fixes');
    expect(qaContent).toContain('Confirm the root cause');
    expect(qaContent).toContain('repeat the exact browser or mobile flow');
  });
});


// --- Hardcoded branch name detection in templates ---

describe('No hardcoded branch names in SKILL templates', () => {
  const tmplFiles = CLAUDE_SKILLS
    .filter((skill) =>
      fs.readFileSync(path.join(ROOT, skill.claudeTemplate), 'utf-8').includes('{{BASE_BRANCH_DETECT}}'),
    )
    .map((skill) => skill.claudeTemplate);

  // Patterns that indicate hardcoded 'main' in git commands
  const gitMainPatterns = [
    /\bgit\s+diff\s+(?:origin\/)?main\b/,
    /\bgit\s+log\s+(?:origin\/)?main\b/,
    /\bgit\s+fetch\s+origin\s+main\b/,
    /\bgit\s+merge\s+origin\/main\b/,
    /\borigin\/main\b/,
  ];

  // Lines that are allowed to mention 'main' (fallback logic, prose)
  const allowlist = [
    /fall\s*back\s+to\s+`main`/i,
    /fall\s*back\s+to\s+`?main`?/i,
    /typically\s+`?main`?/i,
    /If\s+on\s+`main`/i,  // old pattern — should not exist
  ];

  for (const tmplFile of tmplFiles) {
    test(`${tmplFile} has no hardcoded 'main' in git commands`, () => {
      const filePath = path.join(ROOT, tmplFile);
      if (!fs.existsSync(filePath)) return;
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
      const violations: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isAllowlisted = allowlist.some(p => p.test(line));
        if (isAllowlisted) continue;

        for (const pattern of gitMainPatterns) {
          if (pattern.test(line)) {
            violations.push(`Line ${i + 1}: ${line.trim()}`);
            break;
          }
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `${tmplFile} has hardcoded 'main' in git commands:\n` +
          violations.map(v => `  ${v}`).join('\n')
        );
      }
    });
  }
});

// --- Part 7b: TODOS-format.md reference consistency ---

describe('TODOS-format.md reference consistency', () => {
  test('review/TODOS-format.md exists and defines canonical format', () => {
    const content = fs.readFileSync(path.join(ROOT, 'review', 'TODOS-format.md'), 'utf-8');
    expect(content).toContain('**What:**');
    expect(content).toContain('**Why:**');
    expect(content).toContain('**Priority:**');
    expect(content).toContain('**Effort:**');
    expect(content).toContain('## Completed');
  });

});

describe('Shared working-context contract', () => {
  for (const skill of SKILLS_WITH_PREAMBLE) {
    test(`${skill} keeps context guidance compact and outcome-focused`, () => {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      expect(content).toContain('## Working context');
      expect(content).toContain('safe, reversible work in scope');
      expect(content).not.toContain('_SESSIONS');
      expect(content).not.toContain('Contributor Mode');
      expect(content).not.toContain('Completeness: X/10');
    });
  }
});

describe('Enum & Value Completeness in review checklist', () => {
  const checklist = fs.readFileSync(path.join(ROOT, 'review', 'checklist.md'), 'utf-8');

  test('checklist has Enum & Value Completeness section', () => {
    expect(checklist).toContain('Enum & Value Completeness');
  });

  test('Enum & Value Completeness is classified as CRITICAL', () => {
    // It should appear under Pass 1 — CRITICAL, not Pass 2
    const pass1Start = checklist.indexOf('### Pass 1');
    const pass2Start = checklist.indexOf('### Pass 2');
    const enumStart = checklist.indexOf('Enum & Value Completeness');
    expect(enumStart).toBeGreaterThan(pass1Start);
    expect(enumStart).toBeLessThan(pass2Start);
  });

  test('Enum & Value Completeness mentions tracing through consumers', () => {
    expect(checklist).toContain('Trace it through every consumer');
    expect(checklist).toContain('case');
    expect(checklist).toContain('allowlist');
  });

  test('Enum & Value Completeness is in the severity classification as CRITICAL', () => {
    const gateSection = checklist.slice(checklist.indexOf('## Severity Classification'));
    // The ASCII art has CRITICAL on the left and INFORMATIONAL on the right
    // Enum & Value Completeness should appear on a line with the CRITICAL tree (├─ or └─)
    const enumLine = gateSection.split('\n').find(l => l.includes('Enum & Value Completeness'));
    expect(enumLine).toBeDefined();
    // It's on the left (CRITICAL) side — starts with ├─ or └─
    expect(enumLine!.trimStart().startsWith('├─') || enumLine!.trimStart().startsWith('└─')).toBe(true);
  });

  test('Fix-First Heuristic remains available while workflows gate edits by request', () => {
    expect(checklist).toContain('## Fix-First Heuristic');
    expect(checklist).toContain('AUTO-FIX');
    expect(checklist).toContain('ASK');

    const reviewSkill = fs.readFileSync(path.join(ROOT, 'review/SKILL.md'), 'utf-8');
    const shipSkill = fs.readFileSync(path.join(ROOT, 'publish/SKILL.md'), 'utf-8');
    expect(reviewSkill).toContain('Review is read-only unless the user explicitly asked for fixes');
    expect(shipSkill).toContain('Fix clear, in-scope issues locally');
    expect(shipSkill).toContain('Ask only when a finding requires a product');
  });
});

// --- Part 7: Planted-bug fixture validation (A4) ---

describe('Planted-bug fixture validation', () => {
  test('qa-eval ground truth has exactly 5 planted bugs', () => {
    const groundTruth = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'qa-eval-ground-truth.json'), 'utf-8')
    );
    expect(groundTruth.bugs).toHaveLength(5);
    expect(groundTruth.total_bugs).toBe(5);
  });

  test('qa-eval-spa ground truth has exactly 5 planted bugs', () => {
    const groundTruth = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'qa-eval-spa-ground-truth.json'), 'utf-8')
    );
    expect(groundTruth.bugs).toHaveLength(5);
    expect(groundTruth.total_bugs).toBe(5);
  });

  test('qa-eval-checkout ground truth has exactly 5 planted bugs', () => {
    const groundTruth = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'qa-eval-checkout-ground-truth.json'), 'utf-8')
    );
    expect(groundTruth.bugs).toHaveLength(5);
    expect(groundTruth.total_bugs).toBe(5);
  });

  test('qa-eval.html contains the planted bugs', () => {
    const html = fs.readFileSync(path.join(ROOT, 'browse', 'test', 'fixtures', 'qa-eval.html'), 'utf-8');
    // BUG 1: broken link
    expect(html).toContain('/nonexistent-404-page');
    // BUG 2: disabled submit
    expect(html).toContain('disabled');
    // BUG 3: overflow
    expect(html).toContain('overflow: hidden');
    // BUG 4: missing alt
    expect(html).toMatch(/<img[^>]*src="\/logo\.png"[^>]*>/);
    expect(html).not.toMatch(/<img[^>]*src="\/logo\.png"[^>]*alt=/);
    // BUG 5: console error
    expect(html).toContain("Cannot read properties of undefined");
  });

  test('review-eval-vuln.rb contains expected vulnerability patterns', () => {
    const content = fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'review-eval-vuln.rb'), 'utf-8');
    expect(content).toContain('params[:id]');
    expect(content).toContain('update_column');
  });
});

// --- skystack-slug helper ---

describe('skystack-slug', () => {
  const SLUG_BIN = path.join(ROOT, 'bin', 'skystack-slug');

  test('binary exists and is executable', () => {
    expect(fs.existsSync(SLUG_BIN)).toBe(true);
    const stat = fs.statSync(SLUG_BIN);
    expect(stat.mode & 0o111).toBeGreaterThan(0);
  });

  test('outputs SLUG and BRANCH lines in a git repo', () => {
    const result = Bun.spawnSync([SLUG_BIN], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('SLUG=');
    expect(output).toContain('BRANCH=');
  });

  test('SLUG does not contain forward slashes', () => {
    const result = Bun.spawnSync([SLUG_BIN], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
    const slug = result.stdout.toString().match(/SLUG=(.*)/)?.[1] ?? '';
    expect(slug).not.toContain('/');
    expect(slug.length).toBeGreaterThan(0);
  });

  test('BRANCH does not contain forward slashes', () => {
    const result = Bun.spawnSync([SLUG_BIN], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
    const branch = result.stdout.toString().match(/BRANCH=(.*)/)?.[1] ?? '';
    expect(branch).not.toContain('/');
    expect(branch.length).toBeGreaterThan(0);
  });

  test('output is eval-compatible (KEY=VALUE format)', () => {
    const result = Bun.spawnSync([SLUG_BIN], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
    const lines = result.stdout.toString().trim().split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toMatch(/^SLUG=.+/);
    expect(lines[1]).toMatch(/^BRANCH=.+/);
  });
});

describe('Lean QA and publish contracts', () => {
  test('QA fixes are rooted in evidence and followed by an exact retest', () => {
    const content = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Confirm the root cause');
    expect(content).toContain('Add a regression test when practical');
    expect(content).toContain('repeat the exact browser or mobile flow');
  });

  test('publish discovers repository checks instead of embedding framework tutorials', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Discover verification commands from repository instructions');
    expect(content).toContain('targeted tests for changed behavior');
    expect(content).not.toContain('Test Framework Bootstrap');
    expect(content).not.toContain('Step 3.4: Test Coverage Audit');
  });

  test('publish blocks delivery on failures and requires fresh final evidence', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('If verification fails, stop before publishing');
    expect(content).toContain('Do not claim completion from stale');
    expect(content).toContain('Never report a push, PR, merge, deployment, or release');
  });

  test('research-oriented skills retain web search capability', () => {
    for (const skill of ['design', 'research', 'pm']) {
      const content = fs.readFileSync(path.join(ROOT, skill, 'SKILL.md'), 'utf-8');
      expect(content).toContain('WebSearch');
    }
  });
});

// --- Retro test health validation ---

describe('Retro test health tracking', () => {
  test('retro gathers test evidence without equating file count with health', () => {
    const content = fs.readFileSync(path.join(ROOT, 'retro', 'SKILL.md'), 'utf-8');
    expect(content).toContain('changed test/spec/fixture files');
    expect(content).toContain('have durable passing');
    expect(content).toMatch(/Do not infer test health or coverage from file\s+count/);
  });

  test('retro reports verification status and uncertainty', () => {
    const content = fs.readFileSync(path.join(ROOT, 'retro', 'SKILL.md'), 'utf-8');
    expect(content).toContain('test_files_changed');
    expect(content).toContain('unrun tests');
    expect(content).toContain('limitations');
  });

  test('retro rejects vanity productivity metrics', () => {
    const content = fs.readFileSync(path.join(ROOT, 'retro', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Never calculate LOC/hour');
    expect(content).toContain('Never equate activity volume with value');
    expect(content).not.toContain('focus score');
  });
});

// --- QA report template regression tests section ---

describe('QA report template', () => {
  test('qa-report-template.md has Regression Tests section', () => {
    const content = fs.readFileSync(path.join(ROOT, 'qa', 'templates', 'qa-report-template.md'), 'utf-8');
    expect(content).toContain('## Regression Tests');
    expect(content).toContain('committed / deferred / skipped');
    expect(content).toContain('### Deferred Tests');
    expect(content).toContain('**Precondition:**');
  });
});

// --- Mobile binary validation ---

describe('Mobile binary', () => {
  test('mobile/dist/mobile exists and is executable', () => {
    const bin = path.join(ROOT, 'mobile', 'dist', 'mobile');
    expect(fs.existsSync(bin)).toBe(true);
    const stat = fs.statSync(bin);
    expect(stat.mode & 0o111).toBeGreaterThan(0);
  });

  test('qa SKILL.md contains $M commands', () => {
    const qa = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    expect(qa).toContain('$M');
    expect(qa).toContain('MOBILE_READY');
  });

  test('qa SKILL.md contains mobile/dist/mobile path', () => {
    const qa = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    expect(qa).toContain('mobile/dist/mobile');
  });
});
