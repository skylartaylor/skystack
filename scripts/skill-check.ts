#!/usr/bin/env bun
/**
 * skill:check — Health summary for every cataloged generated skill.
 */

import { validateSkill } from '../test/helpers/skill-parser';
import { CLAUDE_SKILLS, CODEX_SKILLS } from './skill-catalog';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
let hasErrors = false;

console.log('  Claude skills:');
for (const skill of CLAUDE_SKILLS) {
  const file = skill.claudeOutput;
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    hasErrors = true;
    console.log(`  ❌ ${file.padEnd(30)} — generated file missing`);
    continue;
  }

  const result = validateSkill(fullPath);
  if (result.warnings.length > 0) {
    console.log(`  ⚠️  ${file.padEnd(30)} — ${result.warnings.join(', ')}`);
    continue;
  }

  const totalValid = result.valid.length;
  const totalInvalid = result.invalid.length;
  const totalSnapErrors = result.snapshotFlagErrors.length;
  if (totalInvalid > 0 || totalSnapErrors > 0) {
    hasErrors = true;
    console.log(
      `  ❌ ${file.padEnd(30)} — ${totalValid} valid, ${totalInvalid} invalid, ${totalSnapErrors} snapshot errors`,
    );
    for (const invalid of result.invalid) {
      console.log(`      line ${invalid.line}: unknown command '${invalid.command}'`);
    }
    for (const snapshotError of result.snapshotFlagErrors) {
      console.log(`      line ${snapshotError.command.line}: ${snapshotError.error}`);
    }
  } else {
    console.log(`  ✅ ${file.padEnd(30)} — ${totalValid} commands, all valid`);
  }
}

console.log('\n  Codex skills:');
for (const skill of CODEX_SKILLS) {
  const skillFile = path.join('.agents', 'skills', skill.name, 'SKILL.md');
  const metadataFile = path.join('.agents', 'skills', skill.name, 'agents', 'openai.yaml');
  const missing = [skillFile, metadataFile].filter((file) => !fs.existsSync(path.join(ROOT, file)));
  if (missing.length > 0) {
    hasErrors = true;
    console.log(`  ❌ ${skill.name.padEnd(30)} — missing ${missing.join(', ')}`);
  } else {
    console.log(`  ✅ ${skill.name.padEnd(30)} — generated files present`);
  }
}

console.log('\n  Templates:');
for (const skill of CLAUDE_SKILLS) {
  const tmplPath = path.join(ROOT, skill.claudeTemplate);
  const outPath = path.join(ROOT, skill.claudeOutput);
  if (!fs.existsSync(tmplPath)) {
    hasErrors = true;
    console.log(`  ❌ ${skill.claudeTemplate.padEnd(30)} — template missing`);
    continue;
  }
  if (!fs.existsSync(outPath)) {
    hasErrors = true;
    console.log(`  ❌ ${skill.claudeOutput.padEnd(30)} — generated file missing`);
    continue;
  }
  console.log(`  ✅ ${skill.claudeTemplate.padEnd(30)} → ${skill.claudeOutput}`);

  for (const reference of skill.references ?? []) {
    if (!fs.existsSync(path.join(ROOT, reference))) {
      hasErrors = true;
      console.log(`  ❌ ${reference.padEnd(30)} — referenced by ${skill.name}, file missing`);
    }
  }
}

console.log('\n  Freshness:');
for (const [label, command, fix] of [
  ['Claude', 'bun run scripts/gen-skill-docs.ts --dry-run', 'bun run gen:skill-docs'],
  ['Codex', 'bun run scripts/gen-codex-skills.ts --dry-run', 'bun run gen:codex-skills'],
] as const) {
  try {
    execSync(command, { cwd: ROOT, stdio: 'pipe' });
    console.log(`  ✅ ${label} generated files are fresh`);
  } catch (error: any) {
    hasErrors = true;
    const output = `${error.stdout?.toString() || ''}${error.stderr?.toString() || ''}`;
    console.log(`  ❌ ${label} generated files are stale:`);
    for (const line of output.split('\n').filter((value: string) => value.startsWith('STALE'))) {
      console.log(`      ${line}`);
    }
    console.log(`      Run: ${fix}`);
  }
}

console.log('');
process.exit(hasErrors ? 1 : 0);
