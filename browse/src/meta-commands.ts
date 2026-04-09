/**
 * Meta commands — tabs, server control, screenshots, chain, diff, snapshot
 */

import type { BrowserManager } from './browser-manager';
import { handleSnapshot } from './snapshot';
import { getCleanText } from './read-commands';
import { handleWriteCommand } from './write-commands';
import { READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS } from './commands';
import { resolveConfig } from './config';
import * as Diff from 'diff';
import * as fs from 'fs';
import * as path from 'path';

// Security: Path validation to prevent path traversal attacks
const SAFE_DIRECTORIES = ['/tmp', process.cwd()];

function validateOutputPath(filePath: string): void {
  const resolved = path.resolve(filePath);
  const isSafe = SAFE_DIRECTORIES.some(dir => resolved === dir || resolved.startsWith(dir + '/'));
  if (!isSafe) {
    throw new Error(`Path must be within: ${SAFE_DIRECTORIES.join(', ')}`);
  }
  // Second pass: resolve symlinks to prevent symlink-to-outside-safe-dir attacks
  try {
    const real = fs.realpathSync(resolved);
    const isSafeReal = SAFE_DIRECTORIES.some(dir => real === dir || real.startsWith(dir + '/'));
    if (!isSafeReal) {
      throw new Error(`Path symlink target must be within: ${SAFE_DIRECTORIES.join(', ')}`);
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e; // ENOENT = file doesn't exist yet, that's fine
  }
}

export async function handleMetaCommand(
  command: string,
  args: string[],
  bm: BrowserManager,
  shutdown: () => Promise<void> | void
): Promise<string> {
  switch (command) {
    // ─── Tabs ──────────────────────────────────────────
    case 'tabs': {
      const tabs = await bm.getTabListWithTitles();
      return tabs.map(t =>
        `${t.active ? '→ ' : '  '}[${t.id}] ${t.title || '(untitled)'} — ${t.url}`
      ).join('\n');
    }

    case 'tab': {
      const id = parseInt(args[0], 10);
      if (isNaN(id)) throw new Error('Usage: browse tab <id>');
      bm.switchTab(id);
      return `Switched to tab ${id}`;
    }

    case 'newtab': {
      const url = args[0];
      const id = await bm.newTab(url);
      return `Opened tab ${id}${url ? ` → ${url}` : ''}`;
    }

    case 'closetab': {
      const id = args[0] ? parseInt(args[0], 10) : undefined;
      await bm.closeTab(id);
      return `Closed tab${id ? ` ${id}` : ''}`;
    }

    // ─── Server Control ────────────────────────────────
    case 'status': {
      const page = bm.getPage();
      const tabs = bm.getTabCount();
      return [
        `Status: healthy`,
        `URL: ${page.url()}`,
        `Tabs: ${tabs}`,
        `PID: ${process.pid}`,
      ].join('\n');
    }

    case 'url': {
      return bm.getCurrentUrl();
    }

    case 'stop': {
      await shutdown();
      return 'Server stopped';
    }

    case 'restart': {
      // Signal that we want a restart — the CLI will detect exit and restart
      console.log('[browse] Restart requested. Exiting for CLI to restart.');
      await shutdown();
      return 'Restarting...';
    }

    // ─── Visual ────────────────────────────────────────
    case 'screenshot': {
      // Parse priority: flags (--viewport, --clip) → selector (@ref, CSS) → output path
      const page = bm.getPage();
      let outputPath = '/tmp/browse-screenshot.png';
      let clipRect: { x: number; y: number; width: number; height: number } | undefined;
      let targetSelector: string | undefined;
      let viewportOnly = false;

      const remaining: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--viewport') {
          viewportOnly = true;
        } else if (args[i] === '--clip') {
          const coords = args[++i];
          if (!coords) throw new Error('Usage: screenshot --clip x,y,w,h [path]');
          const parts = coords.split(',').map(Number);
          if (parts.length !== 4 || parts.some(isNaN))
            throw new Error('Usage: screenshot --clip x,y,width,height — all must be numbers');
          clipRect = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
        } else if (args[i].startsWith('--')) {
          throw new Error(`Unknown screenshot flag: ${args[i]}`);
        } else {
          remaining.push(args[i]);
        }
      }

      // Separate target (selector/@ref) from output path
      // Path detection takes priority: args containing '/' or ending with image extension are paths
      for (const arg of remaining) {
        const isPath = arg.includes('/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(arg);
        if (!isPath && (arg.startsWith('@e') || arg.startsWith('@c') || arg.startsWith('.') || arg.startsWith('#') || arg.includes('['))) {
          targetSelector = arg;
        } else {
          outputPath = arg;
        }
      }

      validateOutputPath(outputPath);

      if (clipRect && targetSelector) {
        throw new Error('Cannot use --clip with a selector/ref — choose one');
      }
      if (viewportOnly && clipRect) {
        throw new Error('Cannot use --viewport with --clip — choose one');
      }

      if (targetSelector) {
        const resolved = await bm.resolveRef(targetSelector);
        const locator = 'locator' in resolved ? resolved.locator : page.locator(resolved.selector);
        await locator.screenshot({ path: outputPath, timeout: 5000 });
        return `Screenshot saved (element): ${outputPath}`;
      }

      if (clipRect) {
        await page.screenshot({ path: outputPath, clip: clipRect });
        return `Screenshot saved (clip ${clipRect.x},${clipRect.y},${clipRect.width},${clipRect.height}): ${outputPath}`;
      }

      await page.screenshot({ path: outputPath, fullPage: !viewportOnly });
      return `Screenshot saved${viewportOnly ? ' (viewport)' : ''}: ${outputPath}`;
    }

    case 'pdf': {
      const page = bm.getPage();
      const pdfPath = args[0] || '/tmp/browse-page.pdf';
      validateOutputPath(pdfPath);
      await page.pdf({ path: pdfPath, format: 'A4' });
      return `PDF saved: ${pdfPath}`;
    }

    case 'responsive': {
      const page = bm.getPage();
      const prefix = args[0] || '/tmp/browse-responsive';
      validateOutputPath(prefix);
      const viewports = [
        { name: 'mobile', width: 375, height: 812 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1280, height: 720 },
      ];
      const originalViewport = page.viewportSize();
      const results: string[] = [];

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const path = `${prefix}-${vp.name}.png`;
        await page.screenshot({ path, fullPage: true });
        results.push(`${vp.name} (${vp.width}x${vp.height}): ${path}`);
      }

      // Restore original viewport
      if (originalViewport) {
        await page.setViewportSize(originalViewport);
      }

      return results.join('\n');
    }

    // ─── Chain ─────────────────────────────────────────
    case 'chain': {
      // Read JSON array from args[0] (if provided) or expect it was passed as body
      const jsonStr = args[0];
      if (!jsonStr) throw new Error('Usage: echo \'[["goto","url"],["text"]]\' | browse chain');

      let commands: string[][];
      try {
        commands = JSON.parse(jsonStr);
      } catch {
        throw new Error('Invalid JSON. Expected: [["command", "arg1", "arg2"], ...]');
      }

      if (!Array.isArray(commands)) throw new Error('Expected JSON array of commands');

      const results: string[] = [];
      const { handleReadCommand } = await import('./read-commands');
      const { handleWriteCommand } = await import('./write-commands');

      for (const cmd of commands) {
        const [name, ...cmdArgs] = cmd;
        try {
          let result: string;
          if (WRITE_COMMANDS.has(name))    result = await handleWriteCommand(name, cmdArgs, bm);
          else if (READ_COMMANDS.has(name))  result = await handleReadCommand(name, cmdArgs, bm);
          else if (META_COMMANDS.has(name))  result = await handleMetaCommand(name, cmdArgs, bm, shutdown);
          else throw new Error(`Unknown command: ${name}`);
          results.push(`[${name}] ${result}`);
        } catch (err: any) {
          results.push(`[${name}] ERROR: ${err.message}`);
        }
      }

      return results.join('\n\n');
    }

    // ─── Diff ──────────────────────────────────────────
    case 'diff': {
      const [url1, url2] = args;
      if (!url1 || !url2) throw new Error('Usage: browse diff <url1> <url2>');

      const page = bm.getPage();
      await page.goto(url1, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text1 = await getCleanText(page);

      await page.goto(url2, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text2 = await getCleanText(page);

      const changes = Diff.diffLines(text1, text2);
      const output: string[] = [`--- ${url1}`, `+++ ${url2}`, ''];

      for (const part of changes) {
        const prefix = part.added ? '+' : part.removed ? '-' : ' ';
        const lines = part.value.split('\n').filter(l => l.length > 0);
        for (const line of lines) {
          output.push(`${prefix} ${line}`);
        }
      }

      return output.join('\n');
    }

    // ─── Snapshot ─────────────────────────────────────
    case 'snapshot': {
      return await handleSnapshot(args, bm);
    }

    // ─── Pretty Screenshot ────────────────────────────
    case 'prettyscreenshot': {
      const page = bm.getPage();
      let outputPath = '/tmp/browse-pretty.png';
      let hideSelectors: string[] = [];
      let width: number | null = null;
      const originalViewport = page.viewportSize();

      // Parse flags
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--hide') {
          hideSelectors.push(args[++i]);
        } else if (args[i] === '--width') {
          width = parseInt(args[++i], 10);
        } else if (!args[i].startsWith('--')) {
          outputPath = args[i];
        }
      }

      validateOutputPath(outputPath);

      // Set viewport width if requested
      if (width && originalViewport) {
        await page.setViewportSize({ width, height: originalViewport.height });
      }

      // Run cleanup first
      await handleWriteCommand('cleanup', ['--all'], bm);

      // Hide additional selectors
      if (hideSelectors.length > 0) {
        await page.evaluate((sels: string[]) => {
          for (const sel of sels) {
            try {
              document.querySelectorAll(sel).forEach(el => {
                (el as HTMLElement).style.display = 'none';
              });
            } catch {}
          }
        }, hideSelectors);
      }

      await page.screenshot({ path: outputPath, fullPage: true });

      // Restore viewport
      if (width && originalViewport) {
        await page.setViewportSize(originalViewport);
      }

      const applied = ['cleanup'];
      if (hideSelectors.length) applied.push(`hide:${hideSelectors.join(',')}`);
      if (width) applied.push(`width:${width}`);
      return `Pretty screenshot saved: ${outputPath} (${applied.join(', ')})`;
    }

    // ─── Frame ────────────────────────────────────────
    case 'frame': {
      const target = args[0];
      if (!target) throw new Error('Usage: frame <selector|@ref|main>');

      if (target === 'main') {
        bm.setFrame(null);
        bm.clearRefs();
        return 'Switched to main frame';
      }

      const page = bm.getPage();
      const resolved = await bm.resolveRef(target);
      const locator = 'locator' in resolved ? resolved.locator : page.locator(resolved.selector);
      const elementHandle = await locator.elementHandle({ timeout: 5000 });
      const frame = await elementHandle?.contentFrame() ?? null;
      await elementHandle?.dispose();

      if (!frame) throw new Error(`Frame not found: ${target}`);
      bm.setFrame(frame);
      bm.clearRefs();
      return `Switched to frame: ${frame.url()}`;
    }

    // ─── State ────────────────────────────────────────
    case 'state': {
      const [action, name] = args;
      if (!action || !name) throw new Error('Usage: state save|load <name>');

      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new Error('State name must be alphanumeric (a-z, 0-9, _, -)');
      }

      const config = resolveConfig();
      const stateDir = path.join(config.stateDir, 'browse-states');
      fs.mkdirSync(stateDir, { recursive: true });
      const statePath = path.join(stateDir, `${name}.json`);

      if (action === 'save') {
        const { cookieCount, pageCount } = await bm.saveState(statePath);
        return `State saved: ${statePath} (${cookieCount} cookies, ${pageCount} pages, + localStorage)\n⚠️  Cookies stored in plaintext. Delete when no longer needed.`;
      }

      if (action === 'load') {
        if (!fs.existsSync(statePath)) throw new Error(`State not found: ${statePath}`);
        // Warn on state files older than 7 days
        const data = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        if (data.savedAt) {
          const ageMs = Date.now() - new Date(data.savedAt).getTime();
          const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
          if (ageMs > SEVEN_DAYS) {
            console.warn(`[browse] Warning: State file is ${Math.round(ageMs / 86400000)} days old. Consider re-saving.`);
          }
        }
        const { cookieCount, pageCount } = await bm.loadState(statePath);
        return `State loaded: ${cookieCount} cookies, ${pageCount} pages`;
      }

      throw new Error('Usage: state save|load <name>');
    }

    default:
      throw new Error(`Unknown meta command: ${command}`);
  }
}
