// Shared types for the $B memory diagnostic command.

/** Counts for bounded in-memory structures on the Bun side. */
export interface MemoryStructureStats {
  consoleBufferLen: number;
  networkBufferLen: number;
  dialogBufferLen: number;
  refCount: number;
  tabCount: number;
}

/** Per-tab JS heap snapshot from CDP Performance.getMetrics. */
export interface MemoryTabSnapshot {
  id: number;
  url: string;
  title: string;
  jsHeapUsed: number;
  jsHeapTotal: number;
  documents: number;
  nodes: number;
  listeners: number;
}

/** Chromium process metadata from CDP SystemInfo.getProcessInfo. */
export interface MemoryProcess {
  /** Chromium-internal process id, not OS PID. */
  id: number;
  /** 'browser' | 'renderer' | 'gpu' | 'utility' | ... */
  type: string;
  /** CPU time accumulated since process start, in seconds. */
  cpuTime: number;
}

export interface MemorySnapshot {
  bunServer: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  tabs: MemoryTabSnapshot[];
  processes: MemoryProcess[] | null;
  structures: MemoryStructureStats;
  capturedAt: number;
  notes: string[];
}

/** Format bytes as a short human string ("1.4 GB", "312 MB", "84 KB"). */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
