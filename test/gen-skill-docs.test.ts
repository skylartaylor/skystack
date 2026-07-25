import { describe, test, expect } from 'bun:test';
import { COMMAND_DESCRIPTIONS } from '../browse/src/commands';
import { SNAPSHOT_FLAGS } from '../browse/src/snapshot';
import { CLAUDE_SKILLS, CODEX_SKILLS, SKILL_CATALOG } from '../scripts/skill-catalog';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');

describe('gen-skill-docs', () => {
  test('root skill is a router, not an embedded command reference', () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    expect(content).toContain('Route the request to the narrowest matching skill');
    expect(content).toContain('| `/browse` |');
    expect(content).not.toContain('### Navigation');
    expect(content).not.toContain('## Snapshot Flags');
  });

  test('browse points to runtime help instead of embedding the full registry', () => {
    const content = fs.readFileSync(path.join(ROOT, 'browse', 'SKILL.md'), 'utf-8');
    expect(content).toContain('$B --help');
    expect(content).not.toContain('### Server');
  });

  test('generated header is present in SKILL.md', () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    expect(content).toContain('AUTO-GENERATED from SKILL.md.tmpl');
    expect(content).toContain('Regenerate: bun run gen:skill-docs');
  });

  test('generated header is present in browse/SKILL.md', () => {
    const content = fs.readFileSync(path.join(ROOT, 'browse', 'SKILL.md'), 'utf-8');
    expect(content).toContain('AUTO-GENERATED from SKILL.md.tmpl');
  });

  test('every skill has a SKILL.md.tmpl template', () => {
    for (const skill of CLAUDE_SKILLS) {
      const tmplPath = path.join(ROOT, skill.claudeTemplate);
      expect(fs.existsSync(tmplPath)).toBe(true);
    }
  });

  test('every skill has a generated SKILL.md with auto-generated header', () => {
    for (const skill of CLAUDE_SKILLS) {
      const mdPath = path.join(ROOT, skill.claudeOutput);
      expect(fs.existsSync(mdPath)).toBe(true);
      const content = fs.readFileSync(mdPath, 'utf-8');
      expect(content).toContain('AUTO-GENERATED from SKILL.md.tmpl');
      expect(content).toContain('Regenerate: bun run gen:skill-docs');
    }
  });

  test('every generated SKILL.md has valid YAML frontmatter', () => {
    for (const skill of CLAUDE_SKILLS) {
      const content = fs.readFileSync(path.join(ROOT, skill.claudeOutput), 'utf-8');
      expect(content.startsWith('---\n')).toBe(true);
      expect(content).toContain('name:');
      expect(content).toContain('description:');
      const frontmatter = content.split('---', 3)[1] || '';
      const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim();
      expect(name).toBe(skill.name);
    }
  });

  test('generated files are fresh (match --dry-run)', () => {
    const result = Bun.spawnSync(['bun', 'run', 'scripts/gen-skill-docs.ts', '--dry-run'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    // Every skill should be FRESH
    for (const skill of CLAUDE_SKILLS) {
      expect(output).toContain(`FRESH: ${skill.claudeOutput}`);
    }
    expect(output).not.toContain('STALE');
    const reported = output.split('\n').filter((line) => line.startsWith('FRESH: '));
    expect(reported).toHaveLength(CLAUDE_SKILLS.length);
  });

  test('no generated SKILL.md contains unresolved placeholders', () => {
    for (const skill of CLAUDE_SKILLS) {
      const content = fs.readFileSync(path.join(ROOT, skill.claudeOutput), 'utf-8');
      const unresolved = content.match(/\{\{[A-Z_]+\}\}/g);
      expect(unresolved).toBeNull();
    }
  });

  test('templates contain placeholders', () => {
    const rootTmpl = fs.readFileSync(path.join(ROOT, 'SKILL.md.tmpl'), 'utf-8');
    expect(rootTmpl).not.toContain('{{COMMAND_REFERENCE}}');
    expect(rootTmpl).not.toContain('{{SNAPSHOT_FLAGS}}');
    expect(rootTmpl).not.toContain('{{PREAMBLE}}');

    const browseTmpl = fs.readFileSync(path.join(ROOT, 'browse', 'SKILL.md.tmpl'), 'utf-8');
    expect(browseTmpl).toContain('{{BROWSE_SETUP}}');
    expect(browseTmpl).not.toContain('{{COMMAND_REFERENCE}}');
    expect(browseTmpl).not.toContain('{{SNAPSHOT_FLAGS}}');
  });

  test('root stays lean and delegates workflow details', () => {
    const content = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
    expect(content).toContain('do not load unrelated skills');
    expect(content).not.toContain('AskUserQuestion Format');
    expect(content).not.toContain('_SESSIONS');
    expect(content.split('\n').length).toBeLessThan(100);
  });

  test('generated Claude prompt footprint stays below the modernization budget', () => {
    const words = CLAUDE_SKILLS.reduce((total, skill) => {
      const content = fs.readFileSync(path.join(ROOT, skill.claudeOutput), 'utf-8');
      return total + (content.match(/\S+/g) || []).length;
    }, 0);
    expect(words).toBeLessThanOrEqual(30_000);
  });

  test('qa template keeps capability setup and drops global ceremony', () => {
    const qaTmpl = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md.tmpl'), 'utf-8');
    expect(qaTmpl).toContain('{{BROWSE_SETUP}}');
    expect(qaTmpl).toContain('{{MOBILE_SETUP}}');
    expect(qaTmpl).not.toContain('{{PREAMBLE}}');
    expect(qaTmpl).not.toContain('{{VOICE_GUIDE}}');
  });

  test('qa generated file preserves outcome and evidence contracts', () => {
    const qaContent = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    expect(qaContent).toContain('report-only');
    expect(qaContent).toContain('Do not add a ceremonial test-plan approval');
    expect(qaContent).toContain('Evidence: screenshot, console error, network failure, or state assertion');
    expect(qaContent).toContain('Do not report success based only on page load');
  });

  test('qa keeps an explicit, request-gated fix loop', () => {
    const qaContent = fs.readFileSync(path.join(ROOT, 'qa', 'SKILL.md'), 'utf-8');
    expect(qaContent).toContain('Edit');
    expect(qaContent).toContain('Glob');
    expect(qaContent).toContain('Grep');
    expect(qaContent).toContain('Only enter this section when the user requested fixes');
    expect(qaContent).toContain('repeat the exact browser or mobile flow');
    expect(qaContent).toContain('tester.md');
  });
});

describe('BASE_BRANCH_DETECT resolver', () => {
  // Find a generated SKILL.md that uses the placeholder (ship is guaranteed to)
  const shipContent = fs.readFileSync(path.join(ROOT, 'publish', 'SKILL.md'), 'utf-8');

  test('resolver output contains PR base detection command', () => {
    expect(shipContent).toContain('gh pr view --json baseRefName');
  });

  test('resolver output contains repo default branch detection command', () => {
    expect(shipContent).toContain('gh repo view --json defaultBranchRef');
  });

  test('resolver output contains fallback to main', () => {
    expect(shipContent).toMatch(/fall\s*back\s+to\s+`main`/i);
  });

  test('resolver output uses "the base branch" phrasing', () => {
    expect(shipContent).toContain('the base branch');
  });
});

/**
 * Quality evals — catch description regressions.
 *
 * These test that generated output is *useful for an AI agent*,
 * not just structurally valid. Each test targets a specific
 * regression we actually shipped and caught in review.
 */
describe('description quality evals', () => {
  test('snapshot flags with values define value hints in registry metadata', () => {
    for (const flag of SNAPSHOT_FLAGS) {
      if (flag.takesValue) {
        expect(flag.valueHint).toBeDefined();
      }
    }
  });

  // Regression: "is" lost the valid states enum
  test('is command lists valid state values', () => {
    const desc = COMMAND_DESCRIPTIONS['is'].description;
    for (const state of ['visible', 'hidden', 'enabled', 'disabled', 'checked', 'editable', 'focused']) {
      expect(desc).toContain(state);
    }
  });

  // Regression: "press" lost common key examples
  test('press command lists example keys', () => {
    const desc = COMMAND_DESCRIPTIONS['press'].description;
    expect(desc).toContain('Enter');
    expect(desc).toContain('Tab');
    expect(desc).toContain('Escape');
  });

  // Regression: "console" lost --errors filter note
  test('console command describes --errors behavior', () => {
    const desc = COMMAND_DESCRIPTIONS['console'].description;
    expect(desc).toContain('--errors');
  });

  // Regression: snapshot -i lost "@e refs" context
  test('snapshot -i mentions @e refs', () => {
    const flag = SNAPSHOT_FLAGS.find(f => f.short === '-i')!;
    expect(flag.description).toContain('@e');
  });

  // Regression: snapshot -C lost "@c refs" context
  test('snapshot -C mentions @c refs', () => {
    const flag = SNAPSHOT_FLAGS.find(f => f.short === '-C')!;
    expect(flag.description).toContain('@c');
  });

  // Guard: every description must be at least 8 chars (catches empty or stub descriptions)
  test('all command descriptions have meaningful length', () => {
    for (const [cmd, meta] of Object.entries(COMMAND_DESCRIPTIONS)) {
      expect(meta.description.length).toBeGreaterThanOrEqual(8);
    }
  });

  // Guard: snapshot flag descriptions must be at least 10 chars
  test('all snapshot flag descriptions have meaningful length', () => {
    for (const flag of SNAPSHOT_FLAGS) {
      expect(flag.description.length).toBeGreaterThanOrEqual(10);
    }
  });

  // Guard: descriptions must not contain pipe (breaks markdown table cells)
  // Usage strings are backtick-wrapped in the table so pipes there are safe.
  test('no command description contains pipe character', () => {
    for (const [cmd, meta] of Object.entries(COMMAND_DESCRIPTIONS)) {
      expect(meta.description).not.toContain('|');
    }
  });

});

describe('VOICE_GUIDE resolver', () => {
  test('voice guidance is generated only for templates that request it', () => {
    for (const skill of CLAUDE_SKILLS) {
      const tmpl = fs.readFileSync(path.join(ROOT, skill.claudeTemplate), 'utf-8');
      const content = fs.readFileSync(path.join(ROOT, skill.claudeOutput), 'utf-8');
      expect(content.includes('## Voice')).toBe(tmpl.includes('{{VOICE_GUIDE}}'));
      expect(content).not.toContain('Banned AI vocabulary');
      expect(content).not.toContain('Banned filler phrases');
    }
  });
});

describe('skill catalog integrity', () => {
  test('skill names are unique and surface metadata is complete', () => {
    expect(new Set(SKILL_CATALOG.map((skill) => skill.name)).size).toBe(SKILL_CATALOG.length);
    for (const skill of SKILL_CATALOG) {
      expect(skill.surfaces.length).toBeGreaterThan(0);
      expect(new Set(skill.surfaces).size).toBe(skill.surfaces.length);
      if (skill.surfaces.includes('claude')) {
        expect(skill.claudeTemplate).toBeDefined();
        expect(skill.claudeOutput).toBeDefined();
      } else {
        expect(skill.claudeTemplate).toBeUndefined();
        expect(skill.claudeOutput).toBeUndefined();
      }
      expect(skill.codexGenerated === true).toBe(skill.surfaces.includes('codex'));
    }
  });

  test('cataloged Claude and Codex files exist', () => {
    for (const skill of CLAUDE_SKILLS) {
      expect(fs.existsSync(path.join(ROOT, skill.claudeTemplate))).toBe(true);
      expect(fs.existsSync(path.join(ROOT, skill.claudeOutput))).toBe(true);
    }
    for (const skill of CODEX_SKILLS) {
      expect(fs.existsSync(path.join(ROOT, '.agents', 'skills', skill.name, 'SKILL.md'))).toBe(true);
      expect(
        fs.existsSync(path.join(ROOT, '.agents', 'skills', skill.name, 'agents', 'openai.yaml')),
      ).toBe(true);
    }
  });

  test('Codex dry-run is clean when generated files and links are fresh', () => {
    const result = Bun.spawnSync(['bun', 'run', 'scripts/gen-codex-skills.ts', '--dry-run'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).not.toContain('STALE');
  });
});

describe('TASTE_MEMORY resolver', () => {
  test('taste memory is generated only for templates that request it', () => {
    for (const skill of CLAUDE_SKILLS) {
      const tmpl = fs.readFileSync(path.join(ROOT, skill.claudeTemplate), 'utf-8');
      const content = fs.readFileSync(path.join(ROOT, skill.claudeOutput), 'utf-8');
      expect(content.includes('## Taste Memory')).toBe(tmpl.includes('{{TASTE_MEMORY}}'));
    }
  });
});

describe('gen-codex-skills', () => {
  test('claude-review resolves bundled wrapper from installed skill path', () => {
    const content = fs.readFileSync(
      path.join(ROOT, '.agents', 'skills', 'claude-review', 'SKILL.md'),
      'utf-8'
    );

    expect(content).toContain('${CODEX_HOME:-$HOME/.codex}/skills/claude-review/scripts/claude_review.sh');
    expect(content).toContain('$(git rev-parse --show-toplevel 2>/dev/null)/.agents/skills/claude-review/scripts/claude_review.sh');
    expect(content).toContain('"$CLAUDE_REVIEW" --focus');
    expect(content).not.toContain('\n.agents/skills/claude-review/scripts/claude_review.sh\n');
  });

  test('claude-review defaults to bounded tool-enabled review', () => {
    const skill = fs.readFileSync(
      path.join(ROOT, '.agents', 'skills', 'claude-review', 'SKILL.md'),
      'utf-8'
    );
    const wrapper = fs.readFileSync(
      path.join(ROOT, '.agents', 'skills', 'claude-review', 'scripts', 'claude_review.sh'),
      'utf-8'
    );

    expect(skill).toContain('timeout_ms: 900000');
    expect(skill).toContain('read-only repo tools by default');
    expect(skill).toContain('If the user asks for a "fable review", pass `--fable`');
    expect(skill).toContain('If they ask for an\n"opus review", pass `--opus`');
    expect(skill).toContain('--max-diff-bytes N');
    expect(wrapper).toContain('WITH_TOOLS="${CLAUDE_REVIEW_WITH_TOOLS:-1}"');
    expect(wrapper).toContain('MAX_DIFF_BYTES="${CLAUDE_REVIEW_MAX_DIFF_BYTES:-1500000}"');
    expect(wrapper).toContain('--opus|--fable|--reviewer opus|fable|--model MODEL');
    expect(wrapper).toContain('MODEL="claude-opus-5"');
    expect(wrapper).toContain('MODEL="claude-fable-5"');
    expect(wrapper).toContain('CLAUDE_ARGS+=(--tools "")');
    expect(wrapper).toContain('if ! claude "${CLAUDE_ARGS[@]}"');
    expect(wrapper).not.toContain('build_claude_command');
    expect(wrapper).toContain('--with-tools');
    expect(wrapper).toContain('--no-tools');
    expect(wrapper).toContain('diff is too large');
  });

  test('skystack umbrella exposes redaction helper in bin symlinks', () => {
    const link = path.join(ROOT, '.agents', 'skills', 'skystack', 'bin', 'skystack-redact');
    expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
    expect(fs.readlinkSync(link)).toBe('../../../../bin/skystack-redact');
  });
});

describe('codex skill reliability', () => {
  const tmpl = fs.readFileSync(path.join(ROOT, 'codex', 'SKILL.md.tmpl'), 'utf-8');
  const probe = path.join(ROOT, 'bin', 'skystack-codex-probe');

  test('selects the newest compatible Codex binary instead of the first PATH entry', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-resolver-'));
    const stale = path.join(dir, 'codex-stale');
    const current = path.join(dir, 'codex-current');
    fs.writeFileSync(stale, '#!/bin/sh\necho "codex-cli 0.142.2"\n');
    fs.writeFileSync(current, '#!/bin/sh\necho "codex-cli 0.145.0"\n');
    fs.chmodSync(stale, 0o755);
    fs.chmodSync(current, 0o755);

    try {
      const result = Bun.spawnSync(
        ['bash', '-c', `source "${probe}"; _skystack_codex_resolve "${stale}" "${current}"`],
        { stdout: 'pipe', stderr: 'pipe' }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString().trim()).toBe(current);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('uses the current exec review interface with explicit base scope', () => {
    expect(tmpl).toContain('"$CODEX_BIN" --search exec');
    expect(tmpl).toContain('review --base "<base branch>"');
    expect(tmpl).not.toContain('"$CODEX_BIN" review --base');
  });

  test('resolves the newest Codex binary in every self-contained invocation', () => {
    const probeContent = fs.readFileSync(probe, 'utf-8');

    expect(tmpl).not.toContain('_skystack_codex_command');
    expect(tmpl).not.toContain('CODEX_RUNNER:');
    expect(tmpl).toContain('CODEX_BIN="$(_skystack_codex_resolve)"');
    expect((tmpl.match(/_skystack_codex_resolve/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(probeContent).toContain('/opt/homebrew/bin/codex');
    expect(probeContent).toContain('0\\.142\\.2');
  });

  test('pins review to GPT-5.6 Sol Ultra with read-only tool use', () => {
    expect(tmpl).toContain('-m gpt-5.6-sol');
    expect(tmpl).toContain('-c \'model_reasoning_effort="ultra"\'');
    expect(tmpl).toContain('-s read-only');
    expect(tmpl).toContain('--ephemeral');
    expect(tmpl).toContain('--ignore-user-config');
    expect(tmpl).toContain('"$CODEX_BIN" --search exec');
    expect(tmpl).not.toContain('workspace-write');
    expect(tmpl).not.toContain('--enable web_search_cached');
  });

  test('surfaces nonzero codex exits from every invocation shape', () => {
    expect((tmpl.match(/_STATUS=\$\?/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((tmpl.match(/exit "\$_STATUS"/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(tmpl).toContain('Surface the exact useful error');
  });
});
