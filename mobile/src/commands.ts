/**
 * Command registry for the mobile CLI.
 * Each entry maps a $M command name to its agent-device args builder and description.
 *
 * IMPORTANT: agentArgs returns ONLY the extra args after the command name.
 * buildAgentArgs() in cli.ts prepends the command name itself.
 */

export interface CommandDef {
  /** Returns extra args (NOT including command name — that's prepended by buildAgentArgs) */
  agentArgs: (args: string[]) => string[];
  description: string;
  /** If true, --platform flag is NOT appended (e.g. devices works cross-platform) */
  noPlatform?: boolean;
}

export const COMMANDS: Record<string, CommandDef> = {
  open: {
    agentArgs: ([bundleId]) => [bundleId],
    description: 'Open app by bundle ID (iOS) or package name (Android)',
  },
  close: {
    agentArgs: () => [],
    description: 'Close the current app session',
  },
  screenshot: {
    agentArgs: ([outPath]) => outPath ? ['--out', outPath] : [],
    description: 'Take a screenshot. Prints the output file path.',
  },
  snapshot: {
    agentArgs: () => [],
    description: 'Capture accessibility tree as structured text',
  },
  click: {
    agentArgs: ([ref]) => [ref],
    description: 'Tap element by @ref or x,y coordinates',
  },
  type: {
    agentArgs: (words) => [words.join(' ')],
    description: 'Type text into the currently focused element',
  },
  scroll: {
    agentArgs: ([dir = 'down']) => [dir],
    description: 'Scroll in a direction: up | down | left | right',
  },
  back: {
    agentArgs: () => [],
    description: 'Navigate back',
  },
  home: {
    agentArgs: () => [],
    description: 'Go to home screen',
  },
  wait: {
    agentArgs: ([target, timeoutMs]) => timeoutMs ? [target, timeoutMs] : [target],
    description: 'Wait for @ref, text, or duration (ms)',
  },
  devices: {
    agentArgs: () => [],
    description: 'List available simulators and physical devices',
    noPlatform: true,
  },
  apps: {
    agentArgs: () => ['--user-installed'],
    description: 'List user-installed apps on the active device',
  },
};
