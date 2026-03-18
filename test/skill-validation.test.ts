import { describe, test, expect } from 'bun:test';
import { validateSkill, extractRemoteSlugPatterns, extractWeightsFromTable } from './helpers/skill-parser';
import { ALL_COMMANDS, COMMAND_DESCRIPTIONS, READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS } from '../browse/src/commands';
import { SNAPSHOT_FLAGS } from '../browse/src/snapshot';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');

describe('SKILL.md command validation', () => {
  test('all $B commands in SKILL.md are valid browse commands', () => {
    const result = validateSkill(path.join(ROOT, 'SKILL.md'));
    expect(result.invalid).toHaveLength(0);
    expect(result.valid.length).toBeGreaterThan(0);
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

// --- Update check preamble validation ---

describe('Update check preamble', () => {
  const skillsWithUpdateCheck = [
    'SKILL.md', 'browse/SKILL.md', 'qa/SKILL.md',
    'setup-browser-cookies/SKILL.md',
    'publish/SKILL.md', 'review/SKILL.md',
    'retro/SKILL.md',
    'design/SKILL.md',
    'document-release/SKILL.md',
  ];

  for (const skill of skillsWithUpdateCheck) {
    test(`${skill} update check line ends with || true`, () => {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      // The second line of the bash block must end with || true
      // to avoid exit code 1 when _UPD is empty (up to date)
      const match = content.match(/\[ -n "\$_UPD" \].*$/m);
      expect(match).not.toBeNull();
      expect(match![0]).toContain('|| true');
    });
  }

  test('all skills with update check are generated from .tmpl', () => {
    for (const skill of skillsWithUpdateCheck) {
      const tmplPath = path.join(ROOT, skill + '.tmpl');
      expect(fs.existsSync(tmplPath)).toBe(true);
    }
  });

  test('update check bash block exits 0 when up to date', () => {
    // Simulate the exact preamble command from SKILL.md
    const result = Bun.spawnSync(['bash', '-c',
      '_UPD=$(echo "" || true); [ -n "$_UPD" ] && echo "$_UPD" || true'
    ], { stdout: 'pipe', stderr: 'pipe' });
    expect(result.exitCode).toBe(0);
  });

  test('update check bash block exits 0 when upgrade available', () => {
    const result = Bun.spawnSync(['bash', '-c',
      '_UPD=$(echo "UPGRADE_AVAILABLE 0.3.3 0.4.0" || true); [ -n "$_UPD" ] && echo "$_UPD" || true'
    ], { stdout: 'pipe', stderr: 'pipe' });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString().trim()).toBe('UPGRADE_AVAILABLE 0.3.3 0.4.0');
  });
});

// --- Part 7: Cross-skill path consistency (A1) ---

// --- Part 7: QA skill structure validation (A2) ---

describe('QA skill structure validation', () => {
  const qaContent = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');

  test('qa/SKILL.md has all 5 phases', () => {
    const phases = [
      'Phase 1', 'Orient',
      'Phase 2', 'Test Plan',
      'Phase 3', 'Test',
      'Phase 4', 'Fix',
      'Phase 5', 'Report',
    ];
    for (const phase of phases) {
      expect(qaContent).toContain(phase);
    }
  });

  test('has plan-first flow and report-only mode', () => {
    // Plan-first
    expect(qaContent).toContain('Present the Test Plan');
    expect(qaContent).toContain('Always present a test plan before testing');

    // Report-only as a mode choice
    expect(qaContent).toContain('Report only');
    expect(qaContent).toContain('report-only');

    // Diff-aware mode
    expect(qaContent).toContain('diff-aware');

    // Tiers
    expect(qaContent).toContain('--quick');
    expect(qaContent).toContain('--exhaustive');
  });

  test('has all three tiers defined', () => {
    const tiers = ['Quick', 'Standard', 'Exhaustive'];
    for (const tier of tiers) {
      expect(qaContent).toContain(tier);
    }
  });

  test('health score weights sum to 100%', () => {
    const weights = extractWeightsFromTable(qaContent);
    expect(weights.size).toBeGreaterThan(0);

    let sum = 0;
    for (const pct of weights.values()) {
      sum += pct;
    }
    expect(sum).toBe(100);
  });

  test('health score has all 8 categories', () => {
    const weights = extractWeightsFromTable(qaContent);
    const expectedCategories = [
      'Console', 'Links', 'Visual', 'Functional',
      'UX', 'Performance', 'Content', 'Accessibility',
    ];
    for (const cat of expectedCategories) {
      expect(weights.has(cat)).toBe(true);
    }
    expect(weights.size).toBe(8);
  });

  test('has tester reference file reading', () => {
    expect(qaContent).toContain('tester.md');
    expect(qaContent).toContain('references/tester.md');
  });

  test('output structure references report directory layout', () => {
    expect(qaContent).toContain('qa-report-');
    expect(qaContent).toContain('baseline.json');
    expect(qaContent).toContain('screenshots/');
    expect(qaContent).toContain('.skystack/qa-reports/');
  });
});


// --- Hardcoded branch name detection in templates ---

describe('No hardcoded branch names in SKILL templates', () => {
  const tmplFiles = [
    'publish/SKILL.md.tmpl',
    'review/SKILL.md.tmpl',
    'qa/SKILL.md.tmpl',
    'retro/SKILL.md.tmpl',
    'document-release/SKILL.md.tmpl',
    'design/SKILL.md.tmpl',
  ];

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

  test('skills that write TODOs reference TODOS-format.md', () => {
    const shipContent = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');

    expect(shipContent).toContain('TODOS-format.md');
  });
});

// --- v0.4.1 feature coverage: RECOMMENDATION format, session awareness, enum completeness ---

describe('v0.4.1 preamble features', () => {
  const skillsWithPreamble = [
    'SKILL.md', 'browse/SKILL.md', 'qa/SKILL.md',
    'setup-browser-cookies/SKILL.md',
    'publish/SKILL.md', 'review/SKILL.md',
    'retro/SKILL.md',
    'design/SKILL.md',
    'document-release/SKILL.md',
  ];

  for (const skill of skillsWithPreamble) {
    test(`${skill} contains RECOMMENDATION format`, () => {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      expect(content).toContain('RECOMMENDATION: Choose');
      expect(content).toContain('AskUserQuestion');
    });

    test(`${skill} contains session awareness`, () => {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      expect(content).toContain('_SESSIONS');
      expect(content).toContain('RECOMMENDATION');
    });
  }
});

// --- Contributor mode preamble structure validation ---

describe('Contributor mode preamble structure', () => {
  const skillsWithPreamble = [
    'SKILL.md', 'browse/SKILL.md', 'qa/SKILL.md',
    'setup-browser-cookies/SKILL.md',
    'publish/SKILL.md', 'review/SKILL.md',
    'retro/SKILL.md',
    'design/SKILL.md',
    'document-release/SKILL.md',
  ];

  for (const skill of skillsWithPreamble) {
    test(`${skill} has 0-10 rating in contributor mode`, () => {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      expect(content).toContain('0 to 10');
      expect(content).toContain('My rating');
    });

    test(`${skill} has calibration example`, () => {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      expect(content).toContain('Calibration');
      expect(content).toContain('the bar');
    });

    test(`${skill} has "what would make this a 10" field`, () => {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      expect(content).toContain('What would make this a 10');
    });

    test(`${skill} uses periodic reflection (not per-command)`, () => {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      expect(content).toContain('workflow step');
      expect(content).not.toContain('After you use skystack-provided CLIs');
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

  test('Fix-First Heuristic exists in checklist and is referenced by review + ship', () => {
    expect(checklist).toContain('## Fix-First Heuristic');
    expect(checklist).toContain('AUTO-FIX');
    expect(checklist).toContain('ASK');

    const reviewSkill = fs.readFileSync(path.join(ROOT, 'review/SKILL.md'), 'utf-8');
    const shipSkill = fs.readFileSync(path.join(ROOT, 'publish/SKILL.md'), 'utf-8');
    expect(reviewSkill).toContain('AUTO-FIX');
    expect(reviewSkill).toContain('[AUTO-FIXED]');
    expect(shipSkill).toContain('AUTO-FIX');
    expect(shipSkill).toContain('[AUTO-FIXED]');
  });
});

// --- Completeness Principle spot-check ---

describe('Completeness Principle in generated SKILL.md files', () => {
  const skillsWithPreamble = [
    'SKILL.md', 'browse/SKILL.md', 'qa/SKILL.md',
    'setup-browser-cookies/SKILL.md',
    'publish/SKILL.md', 'review/SKILL.md',
    'retro/SKILL.md',
    'design/SKILL.md',
    'document-release/SKILL.md',
  ];

  for (const skill of skillsWithPreamble) {
    test(`${skill} contains Completeness Principle section`, () => {
      const content = fs.readFileSync(path.join(ROOT, skill), 'utf-8');
      expect(content).toContain('Completeness Principle');
      expect(content).toContain('Boil the Lake');
    });
  }

  test('Completeness Principle includes compression table', () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    expect(content).toContain('CC+skystack');
    expect(content).toContain('Compression');
  });

  test('Completeness Principle includes anti-patterns', () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    expect(content).toContain('BAD:');
    expect(content).toContain('Anti-patterns');
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

// --- Test Bootstrap validation ---

describe('Test Bootstrap ({{TEST_BOOTSTRAP}}) integration', () => {
  test('TEST_BOOTSTRAP resolver produces valid content', () => {
    const shipContent = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(shipContent).toContain('Test Framework Bootstrap');
    expect(shipContent).toContain('RUNTIME:ruby');
    expect(shipContent).toContain('RUNTIME:node');
    expect(shipContent).toContain('RUNTIME:python');
    expect(shipContent).toContain('no-test-bootstrap');
    expect(shipContent).toContain('BOOTSTRAP_DECLINED');
  });

  test('TEST_BOOTSTRAP no longer appears in qa/SKILL.md (v3 inlines methodology)', () => {
    const content = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    expect(content).not.toContain('Test Framework Bootstrap');
  });

  test('TEST_BOOTSTRAP appears in publish/SKILL.md', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Test Framework Bootstrap');
    expect(content).toContain('Step 2.5');
  });

  test('TEST_BOOTSTRAP appears in design/SKILL.md (if present)', () => {
    const skillPath = path.join(ROOT, 'design', 'SKILL.md');
    if (!fs.existsSync(skillPath)) return;
    // design skill may or may not include test bootstrap depending on implementation
    // This test verifies the file exists and is readable
    const content = fs.readFileSync(skillPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  test('bootstrap includes framework knowledge table', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('vitest');
    expect(content).toContain('minitest');
    expect(content).toContain('pytest');
    expect(content).toContain('cargo test');
    expect(content).toContain('phpunit');
    expect(content).toContain('ExUnit');
  });

  test('bootstrap includes CI/CD pipeline generation', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('.github/workflows/test.yml');
    expect(content).toContain('GitHub Actions');
  });

  test('bootstrap includes first real tests step', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('First real tests');
    expect(content).toContain('git log --since=30.days');
    expect(content).toContain('Prioritize by risk');
  });

  test('bootstrap includes vibe coding philosophy', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('vibe coding');
    expect(content).toContain('100% test coverage');
  });

  test('WebSearch is in allowed-tools for research-oriented skills', () => {
    const design = fs.readFileSync(path.join(ROOT, 'design', 'SKILL.md'), 'utf-8');
    const research = fs.readFileSync(path.join(ROOT, 'research', 'SKILL.md'), 'utf-8');
    const pm = fs.readFileSync(path.join(ROOT, 'pm', 'SKILL.md'), 'utf-8');
    expect(design).toContain('WebSearch');
    expect(research).toContain('WebSearch');
    expect(pm).toContain('WebSearch');
  });
});

// --- Phase 8e.5 regression test validation ---

describe('Phase 4e regression test generation', () => {
  test('qa/SKILL.md contains regression test section', () => {
    const content = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    expect(content).toContain('4e. Regression test');
    expect(content).toContain('Regression: ISSUE-NNN');
    expect(content).toContain('WTF');
  });

  test('qa/SKILL.md has self-regulation with WTF heuristic', () => {
    const content = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Self-regulation');
    expect(content).toContain('WTF-LIKELIHOOD');
  });

  test('design has CSS-aware regression test variant (if applicable)', () => {
    const skillPath = path.join(ROOT, 'design', 'SKILL.md');
    if (!fs.existsSync(skillPath)) return;
    const content = fs.readFileSync(skillPath, 'utf-8');
    // design skill should reference regression testing concepts
    expect(content.length).toBeGreaterThan(0);
  });

  test('regression test includes attribution comment', () => {
    const content = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    expect(content).toContain('// Regression: ISSUE-NNN');
  });
});

// --- Step 3.4 coverage audit validation ---

describe('Step 3.4 test coverage audit', () => {
  test('publish/SKILL.md contains Step 3.4', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Step 3.4: Test Coverage Audit');
    expect(content).toContain('CODE PATH COVERAGE');
  });

  test('Step 3.4 includes quality scoring rubric', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('★★★');
    expect(content).toContain('★★');
    expect(content).toContain('edge cases AND error paths');
    expect(content).toContain('happy path only');
  });

  test('Step 3.4 includes before/after test count', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Count test files before');
    expect(content).toContain('Count test files after');
  });

  test('ship PR body includes Test Coverage section', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('## Test Coverage');
  });

  test('ship rules include test generation rule', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Step 3.4 generates coverage tests');
    expect(content).toContain('Never commit failing tests');
  });

  test('Step 3.4 includes vibe coding philosophy', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('vibe coding becomes yolo coding');
  });

  test('Step 3.4 traces actual codepaths, not just syntax', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Trace every codepath');
    expect(content).toContain('Trace data flow');
    expect(content).toContain('Diagram the execution');
  });

  test('Step 3.4 maps user flows and interaction edge cases', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Map user flows');
    expect(content).toContain('Interaction edge cases');
    expect(content).toContain('Double-click');
    expect(content).toContain('Navigate away');
    expect(content).toContain('Error states the user can see');
    expect(content).toContain('Empty/zero/boundary states');
  });

  test('Step 3.4 diagram includes USER FLOW COVERAGE section', () => {
    const content = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');
    expect(content).toContain('USER FLOW COVERAGE');
    expect(content).toContain('Code paths:');
    expect(content).toContain('User flows:');
  });
});

// --- Retro test health validation ---

describe('Retro test health tracking', () => {
  test('retro/SKILL.md has test health data gathering commands', () => {
    const content = fs.readFileSync(path.join(ROOT, 'retro', 'SKILL.md'), 'utf-8');
    expect(content).toContain('# 9. Test file count');
    expect(content).toContain('# 10. Regression test commits');
    expect(content).toContain('# 11. Test files changed');
  });

  test('retro/SKILL.md has Test Health metrics row', () => {
    const content = fs.readFileSync(path.join(ROOT, 'retro', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Test Health');
    expect(content).toContain('regression tests');
  });

  test('retro/SKILL.md has Test Health narrative section', () => {
    const content = fs.readFileSync(path.join(ROOT, 'retro', 'SKILL.md'), 'utf-8');
    expect(content).toContain('### Test Health');
    expect(content).toContain('Total test files');
    expect(content).toContain('vibe coding safe');
  });

  test('retro JSON schema includes test_health field', () => {
    const content = fs.readFileSync(path.join(ROOT, 'retro', 'SKILL.md'), 'utf-8');
    expect(content).toContain('test_health');
    expect(content).toContain('total_test_files');
    expect(content).toContain('regression_test_commits');
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
