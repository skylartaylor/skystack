import { describe, expect, test } from 'bun:test';
import { handleMetaCommand } from '../src/meta-commands';
import { formatBytes } from '../src/memory-snapshot';
import type { MemorySnapshot, MemoryStructureStats } from '../src/memory-snapshot';

function makeBrowserManagerStub() {
  return {
    getRefCount: () => 3,
    getTabCount: () => 1,
    getMemorySnapshot: async (structures: MemoryStructureStats): Promise<MemorySnapshot> => ({
      bunServer: {
        rss: 128 * 1024 * 1024,
        heapUsed: 32 * 1024 * 1024,
        heapTotal: 64 * 1024 * 1024,
        external: 1024,
      },
      tabs: [{
        id: 1,
        url: 'https://example.com/path',
        title: 'Example',
        jsHeapUsed: 2 * 1024 * 1024,
        jsHeapTotal: 4 * 1024 * 1024,
        documents: 1,
        nodes: 42,
        listeners: 7,
      }],
      processes: [{ id: 10, type: 'renderer', cpuTime: 0.5 }],
      structures,
      capturedAt: 123456,
      notes: ['test note'],
    }),
  };
}

describe('memory command', () => {
  test('formatBytes emits compact human units', () => {
    expect(formatBytes(12)).toBe('12 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });

  test('returns JSON snapshot with buffer and browser structures', async () => {
    const result = await handleMetaCommand(
      'memory',
      ['--json'],
      makeBrowserManagerStub() as any,
      async () => {}
    );
    const snapshot = JSON.parse(result);
    expect(snapshot.bunServer.rss).toBe(128 * 1024 * 1024);
    expect(snapshot.tabs[0].jsHeapUsed).toBe(2 * 1024 * 1024);
    expect(snapshot.structures.refCount).toBe(3);
    expect(snapshot.structures.tabCount).toBe(1);
  });

  test('formats a terminal summary', async () => {
    const result = await handleMetaCommand(
      'memory',
      [],
      makeBrowserManagerStub() as any,
      async () => {}
    );
    expect(result).toContain('Bun server:');
    expect(result).toContain('Renderers:');
    expect(result).toContain('tab #1 - https://example.com/path');
    expect(result).toContain('test note');
  });
});
