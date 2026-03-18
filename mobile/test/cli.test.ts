import { describe, test, expect } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs';

describe('COMMANDS registry', () => {
  test('all expected commands are registered', async () => {
    const { COMMANDS } = await import('../src/commands');
    const expected = ['open', 'close', 'screenshot', 'snapshot', 'click', 'type', 'scroll', 'back', 'home', 'devices', 'apps', 'wait'];
    for (const cmd of expected) {
      expect(COMMANDS[cmd]).toBeDefined();
    }
  });

  test('each command has description and agentArgs', async () => {
    const { COMMANDS } = await import('../src/commands');
    for (const [name, def] of Object.entries(COMMANDS)) {
      expect(typeof def.description).toBe('string');
      expect(typeof def.agentArgs).toBe('function');
    }
  });
});

describe('platform injection', () => {
  test('ios platform appends --platform ios to snapshot', async () => {
    const { buildAgentArgs } = await import('../src/cli');
    const args = buildAgentArgs('snapshot', [], 'ios');
    expect(args).toContain('--platform');
    expect(args).toContain('ios');
  });

  test('android platform appends --platform android', async () => {
    const { buildAgentArgs } = await import('../src/cli');
    const args = buildAgentArgs('snapshot', [], 'android');
    expect(args).toContain('android');
  });

  test('devices command does not get --platform', async () => {
    const { buildAgentArgs } = await import('../src/cli');
    const args = buildAgentArgs('devices', [], 'ios');
    expect(args).not.toContain('--platform');
  });

  test('open command does not double the command name', async () => {
    const { buildAgentArgs } = await import('../src/cli');
    const args = buildAgentArgs('open', ['com.example.app'], 'ios');
    // Should be ['open', 'com.example.app', '--platform', 'ios']
    // NOT ['open', 'open', 'com.example.app', ...]
    expect(args.filter(a => a === 'open').length).toBe(1);
    expect(args).toContain('com.example.app');
  });

  test('screenshot with output path includes --out', async () => {
    const { buildAgentArgs } = await import('../src/cli');
    const args = buildAgentArgs('screenshot', ['out.png'], 'ios');
    expect(args[0]).toBe('screenshot');
    expect(args).toContain('--out');
    expect(args).toContain('out.png');
  });
});

describe('findAgentDevice', () => {
  test('findAgentDevice returns a non-empty string', async () => {
    const { findAgentDevice } = await import('../src/cli');
    // agent-device is globally installed, so this should resolve
    const result = findAgentDevice();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
