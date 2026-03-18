/**
 * skystack mobile — thin wrapper for mobile device/simulator automation
 *
 * Wraps agent-device CLI to provide a stable $M interface for the /qa skill.
 * To swap agent-device for another tool, only this file and commands.ts change.
 *
 * Usage: mobile [--platform ios|android] <command> [args...]
 */

import * as path from 'path';
import * as fs from 'fs';
import { COMMANDS } from './commands';

// ─── Locate agent-device ──────────────────────────────────────────────────────

export function findAgentDevice(): string {
  // IMPORTANT: import.meta.dir resolves to $bunfs/root in compiled binaries — don't use it.
  // 1. Global / PATH install
  const which = Bun.spawnSync(['which', 'agent-device'], { stdout: 'pipe', stderr: 'pipe' });
  const globalPath = which.stdout.toString().trim();
  if (globalPath) return globalPath;

  // 2. Local node_modules relative to the compiled binary's real location
  const binDir = path.dirname(process.execPath);
  const local = path.resolve(binDir, '..', '..', 'node_modules', '.bin', 'agent-device');
  if (fs.existsSync(local)) return local;

  throw new Error(
    'agent-device not found. Run: cd ~/.claude/skills/skystack && bun install'
  );
}

// ─── Argument builder (exported for testing) ─────────────────────────────────

export function buildAgentArgs(command: string, userArgs: string[], platform: string): string[] {
  const def = COMMANDS[command];
  if (!def) {
    // Unknown command — pass through verbatim, add platform
    return [command, ...userArgs, '--platform', platform].filter((a): a is string => a !== undefined);
  }

  const base = [command, ...def.agentArgs(userArgs)].filter((a): a is string => a !== undefined);
  if (def.noPlatform) return base;
  return [...base, '--platform', platform];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let args = process.argv.slice(2);

  // Extract --platform flag (default ios)
  let platform = 'ios';
  const platformIdx = args.indexOf('--platform');
  if (platformIdx !== -1) {
    platform = args[platformIdx + 1] ?? 'ios';
    args = [...args.slice(0, platformIdx), ...args.slice(platformIdx + 2)];
  }

  const command = args[0];
  const userArgs = args.slice(1);

  if (!command || command === '--help' || command === '-h') {
    const lines = [
      'skystack mobile — iOS/Android simulator automation for AI agents',
      '',
      'Usage: mobile [--platform ios|android] <command> [args...]',
      'Default platform: ios',
      '',
      'Commands:',
    ];
    for (const [name, def] of Object.entries(COMMANDS)) {
      lines.push(`  ${name.padEnd(12)} ${def.description}`);
    }
    lines.push('', 'Refs: After snapshot, use @e1, @e2... as selectors: click @e3');
    console.log(lines.join('\n'));
    process.exit(0);
  }

  const agentDevice = findAgentDevice();
  const agentArgs = buildAgentArgs(command, userArgs, platform);

  const result = Bun.spawnSync([agentDevice, ...agentArgs], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const out = result.stdout.toString();
  const err = result.stderr.toString();

  if (out) process.stdout.write(out);
  if (err) process.stderr.write(err);
  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`[mobile] ${err.message}`);
    process.exit(1);
  });
}
