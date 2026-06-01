// `$B memory` - diagnostic snapshot of Bun heap, per-tab JS heap, Chromium
// process metadata, and bounded buffer sizes.

import type { BrowserManager } from './browser-manager';
import { consoleBuffer, dialogBuffer, networkBuffer } from './buffers';
import { formatBytes, type MemorySnapshot, type MemoryStructureStats } from './memory-snapshot';

function collectStructureStats(bm: BrowserManager): MemoryStructureStats {
  return {
    consoleBufferLen: consoleBuffer.length,
    networkBufferLen: networkBuffer.length,
    dialogBufferLen: dialogBuffer.length,
    refCount: bm.getRefCount(),
    tabCount: bm.getTabCount(),
  };
}

function formatSnapshotText(s: MemorySnapshot): string {
  const lines: string[] = [];
  lines.push(
    `Bun server:        RSS: ${formatBytes(s.bunServer.rss)}  ` +
    `heap: ${formatBytes(s.bunServer.heapUsed)} / ${formatBytes(s.bunServer.heapTotal)}  ` +
    `external: ${formatBytes(s.bunServer.external)}`
  );

  if (s.processes && s.processes.length > 0) {
    const byType: Record<string, number> = {};
    for (const p of s.processes) byType[p.type] = (byType[p.type] ?? 0) + 1;
    const summary = Object.entries(byType)
      .map(([type, count]) => `${type}=${count}`)
      .join(' ');
    lines.push(`Chromium processes: ${s.processes.length} total (${summary})`);
  } else if (s.processes === null) {
    lines.push('Chromium processes: (unavailable; see notes)');
  } else {
    lines.push('Chromium processes: 0');
  }

  if (s.tabs.length > 0) {
    const shown = [...s.tabs]
      .sort((a, b) => b.jsHeapUsed - a.jsHeapUsed)
      .slice(0, 10);
    lines.push(`Renderers:         ${s.tabs.length} tabs (top by JS heap):`);
    for (const tab of shown) {
      const url = tab.url.length > 80 ? `${tab.url.slice(0, 77)}...` : tab.url;
      lines.push(
        `  [${formatBytes(tab.jsHeapUsed).padStart(8)} JS, ` +
        `${String(tab.nodes).padStart(6)} nodes, ` +
        `${String(tab.listeners).padStart(5)} listeners] ` +
        `tab #${tab.id} - ${url}`
      );
    }
    if (s.tabs.length > shown.length) {
      lines.push(`  ...and ${s.tabs.length - shown.length} more`);
    }
  } else {
    lines.push('Renderers:         (no tabs tracked)');
  }

  lines.push('-------------------------------------------------');
  lines.push('In-memory structures (Bun side):');
  lines.push(`  tabs:                   ${s.structures.tabCount}`);
  lines.push(`  refs:                   ${s.structures.refCount}`);
  lines.push(`  consoleBuffer:          ${s.structures.consoleBufferLen} entries`);
  lines.push(`  networkBuffer:          ${s.structures.networkBufferLen} entries`);
  lines.push(`  dialogBuffer:           ${s.structures.dialogBufferLen} entries`);

  if (s.notes.length > 0) {
    lines.push('');
    lines.push('Notes:');
    for (const note of s.notes) lines.push(`  - ${note}`);
  }

  return lines.join('\n');
}

export async function handleMemoryCommand(args: string[], bm: BrowserManager): Promise<string> {
  const snapshot = await bm.getMemorySnapshot(collectStructureStats(bm));
  if (args.includes('--json')) return JSON.stringify(snapshot);
  return formatSnapshotText(snapshot);
}
