/**
 * Cookie picker route handler — HTTP + Playwright glue
 *
 * Handles all /cookie-picker/* routes. Imports from cookie-import-browser.ts
 * (decryption) and cookie-picker-ui.ts (HTML generation).
 *
 * Security: One-time code exchange for session auth (Jupyter-style).
 * The master auth token never appears in HTML or URLs.
 *
 * Routes (session-gated):
 *   GET  /cookie-picker?code=X       → exchange one-time code for session cookie
 *   GET  /cookie-picker              → serves the picker HTML page (requires session)
 *   GET  /cookie-picker/browsers     → list installed browsers
 *   GET  /cookie-picker/domains      → list domains + counts for a browser
 *   POST /cookie-picker/import       → decrypt + import cookies to Playwright
 *   POST /cookie-picker/remove       → clear cookies for domains
 *   GET  /cookie-picker/imported     → currently imported domains + counts
 */

import type { BrowserManager } from './browser-manager';
import { findInstalledBrowsers, listDomains, importCookies, CookieImportError, type PlaywrightCookie } from './cookie-import-browser';
import { getCookiePickerHTML } from './cookie-picker-ui';

// ─── State ──────────────────────────────────────────────────────
// Tracks which domains were imported via the picker.
const importedDomains = new Set<string>();
const importedCounts = new Map<string, number>();

// ─── Session Auth ───────────────────────────────────────────────
// One-time codes (30s TTL) and session cookies (1h TTL)
const pendingCodes = new Map<string, { expires: number }>();
const validSessions = new Map<string, { expires: number }>();

const CODE_TTL_MS = 30_000;       // 30 seconds
const SESSION_TTL_MS = 3_600_000; // 1 hour

/**
 * Generate a one-time code for the cookie picker.
 * Called by write-commands.ts before opening the picker URL.
 */
export function generatePickerCode(): string {
  // Clean expired codes
  const now = Date.now();
  for (const [code, entry] of pendingCodes) {
    if (entry.expires < now) pendingCodes.delete(code);
  }
  const code = crypto.randomUUID();
  pendingCodes.set(code, { expires: now + CODE_TTL_MS });
  return code;
}

function exchangeCodeForSession(code: string): string | null {
  const entry = pendingCodes.get(code);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    pendingCodes.delete(code);
    return null;
  }
  // One-time use
  pendingCodes.delete(code);
  // Create session
  const sessionId = crypto.randomUUID();
  validSessions.set(sessionId, { expires: Date.now() + SESSION_TTL_MS });
  return sessionId;
}

function isValidSession(req: Request): boolean {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/skystack_picker=([a-f0-9-]+)/);
  if (!match) return false;
  const sessionId = match[1];
  const entry = validSessions.get(sessionId);
  if (!entry) return false;
  if (entry.expires < Date.now()) {
    validSessions.delete(sessionId);
    return false;
  }
  return true;
}

// ─── JSON Helpers ───────────────────────────────────────────────

function corsOrigin(port: number): string {
  return `http://127.0.0.1:${port}`;
}

function jsonResponse(data: any, opts: { port: number; status?: number }): Response {
  return new Response(JSON.stringify(data), {
    status: opts.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin(opts.port),
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

function errorResponse(message: string, code: string, opts: { port: number; status?: number; action?: string }): Response {
  return jsonResponse(
    { error: message, code, ...(opts.action ? { action: opts.action } : {}) },
    { port: opts.port, status: opts.status ?? 400 },
  );
}

// ─── Route Handler ──────────────────────────────────────────────

export async function handleCookiePickerRoute(
  url: URL,
  req: Request,
  bm: BrowserManager,
): Promise<Response> {
  const pathname = url.pathname;
  const port = parseInt(url.port, 10) || 9400;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin(port),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  try {
    // GET /cookie-picker?code=X — exchange one-time code for session
    if (pathname === '/cookie-picker' && req.method === 'GET' && url.searchParams.has('code')) {
      const code = url.searchParams.get('code')!;
      const sessionId = exchangeCodeForSession(code);
      if (!sessionId) {
        return new Response('Invalid or expired code. Close this tab and re-open the cookie picker.', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      // 302 redirect to /cookie-picker with session cookie
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `/cookie-picker`,
          'Set-Cookie': `skystack_picker=${sessionId}; HttpOnly; SameSite=Strict; Path=/cookie-picker`,
        },
      });
    }

    // All other routes require a valid session cookie
    if (!isValidSession(req)) {
      return new Response('Session expired. Close this tab and re-open the cookie picker.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // GET /cookie-picker — serve the picker UI
    if (pathname === '/cookie-picker' && req.method === 'GET') {
      const html = getCookiePickerHTML(port);
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // GET /cookie-picker/browsers — list installed browsers
    if (pathname === '/cookie-picker/browsers' && req.method === 'GET') {
      const browsers = findInstalledBrowsers();
      return jsonResponse({
        browsers: browsers.map(b => ({
          name: b.name,
          aliases: b.aliases,
        })),
      }, { port });
    }

    // GET /cookie-picker/domains?browser=<name> — list domains + counts
    if (pathname === '/cookie-picker/domains' && req.method === 'GET') {
      const browserName = url.searchParams.get('browser');
      if (!browserName) {
        return errorResponse("Missing 'browser' parameter", 'missing_param', { port });
      }
      const result = listDomains(browserName);
      return jsonResponse({
        browser: result.browser,
        domains: result.domains,
      }, { port });
    }

    // POST /cookie-picker/import — decrypt + import to Playwright session
    if (pathname === '/cookie-picker/import' && req.method === 'POST') {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return errorResponse('Invalid JSON body', 'bad_request', { port });
      }

      const { browser, domains } = body;
      if (!browser) return errorResponse("Missing 'browser' field", 'missing_param', { port });
      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return errorResponse("Missing or empty 'domains' array", 'missing_param', { port });
      }

      // Decrypt cookies from the browser DB
      const result = await importCookies(browser, domains);

      if (result.cookies.length === 0) {
        return jsonResponse({
          imported: 0,
          failed: result.failed,
          domainCounts: {},
          message: result.failed > 0
            ? `All ${result.failed} cookies failed to decrypt`
            : 'No cookies found for the specified domains',
        }, { port });
      }

      // Add to Playwright context
      const page = bm.getPage();
      await page.context().addCookies(result.cookies);

      // Track what was imported
      for (const domain of Object.keys(result.domainCounts)) {
        importedDomains.add(domain);
        importedCounts.set(domain, (importedCounts.get(domain) || 0) + result.domainCounts[domain]);
      }

      console.log(`[cookie-picker] Imported ${result.count} cookies for ${Object.keys(result.domainCounts).length} domains`);

      return jsonResponse({
        imported: result.count,
        failed: result.failed,
        domainCounts: result.domainCounts,
      }, { port });
    }

    // POST /cookie-picker/remove — clear cookies for domains
    if (pathname === '/cookie-picker/remove' && req.method === 'POST') {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return errorResponse('Invalid JSON body', 'bad_request', { port });
      }

      const { domains } = body;
      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return errorResponse("Missing or empty 'domains' array", 'missing_param', { port });
      }

      const page = bm.getPage();
      const context = page.context();
      for (const domain of domains) {
        await context.clearCookies({ domain });
        importedDomains.delete(domain);
        importedCounts.delete(domain);
      }

      console.log(`[cookie-picker] Removed cookies for ${domains.length} domains`);

      return jsonResponse({
        removed: domains.length,
        domains,
      }, { port });
    }

    // GET /cookie-picker/imported — currently imported domains + counts
    if (pathname === '/cookie-picker/imported' && req.method === 'GET') {
      const entries: Array<{ domain: string; count: number }> = [];
      for (const domain of importedDomains) {
        entries.push({ domain, count: importedCounts.get(domain) || 0 });
      }
      entries.sort((a, b) => b.count - a.count);

      return jsonResponse({
        domains: entries,
        totalDomains: entries.length,
        totalCookies: entries.reduce((sum, e) => sum + e.count, 0),
      }, { port });
    }

    return new Response('Not found', { status: 404 });
  } catch (err: any) {
    if (err instanceof CookieImportError) {
      return errorResponse(err.message, err.code, { port, status: 400, action: err.action });
    }
    console.error(`[cookie-picker] Error: ${err.message}`);
    return errorResponse(err.message || 'Internal error', 'internal_error', { port, status: 500 });
  }
}
