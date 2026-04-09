/**
 * Tests for cookie-picker route handler
 *
 * Tests the HTTP glue layer directly with mock BrowserManager objects.
 * Verifies that all routes return valid JSON (not HTML) with correct CORS headers.
 */

import { describe, test, expect } from 'bun:test';
import { handleCookiePickerRoute, generatePickerCode } from '../src/cookie-picker-routes';

// ─── Mock BrowserManager ──────────────────────────────────────

function mockBrowserManager() {
  const addedCookies: any[] = [];
  const clearedDomains: string[] = [];
  return {
    bm: {
      getPage: () => ({
        context: () => ({
          addCookies: (cookies: any[]) => { addedCookies.push(...cookies); },
          clearCookies: (opts: { domain: string }) => { clearedDomains.push(opts.domain); },
        }),
      }),
    } as any,
    addedCookies,
    clearedDomains,
  };
}

function makeUrl(path: string, port = 9470): URL {
  return new URL(`http://127.0.0.1:${port}${path}`);
}

function makeReq(method: string, body?: any, sessionCookie?: string): Request {
  const opts: RequestInit = { method, headers: {} as Record<string, string> };
  if (body) {
    opts.body = JSON.stringify(body);
    (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  if (sessionCookie) {
    (opts.headers as Record<string, string>)['Cookie'] = `skystack_picker=${sessionCookie}`;
  }
  return new Request('http://127.0.0.1:9470', opts);
}

function makeReqWithSession(method: string, sessionId: string, body?: any): Request {
  return makeReq(method, body, sessionId);
}

/** Exchange a one-time code for a session cookie via the route handler */
async function getSession(bm: any): Promise<string> {
  const code = generatePickerCode();
  const url = makeUrl(`/cookie-picker?code=${code}`);
  const req = new Request('http://127.0.0.1:9470', { method: 'GET' });
  const res = await handleCookiePickerRoute(url, req, bm);
  const setCookie = res.headers.get('Set-Cookie') || '';
  const match = setCookie.match(/skystack_picker=([a-f0-9-]+)/);
  if (!match) throw new Error('Failed to get session from code exchange');
  return match[1];
}

// ─── Tests ──────────────────────────────────────────────────────

describe('cookie-picker-routes', () => {
  describe('CORS', () => {
    test('OPTIONS returns 204 with correct CORS headers', async () => {
      const { bm } = mockBrowserManager();
      const url = makeUrl('/cookie-picker/browsers');
      const req = new Request('http://127.0.0.1:9470', { method: 'OPTIONS' });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:9470');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    test('JSON responses include correct CORS origin with port', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/browsers', 9450);
      const req = new Request('http://127.0.0.1:9450', {
        method: 'GET',
        headers: { 'Cookie': `skystack_picker=${sessionId}` },
      });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:9450');
    });
  });

  describe('JSON responses (not HTML)', () => {
    test('GET /cookie-picker/browsers returns JSON', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/browsers');
      const req = new Request('http://127.0.0.1:9470', {
        method: 'GET',
        headers: { 'Cookie': `skystack_picker=${sessionId}` },
      });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      const body = await res.json();
      expect(body).toHaveProperty('browsers');
      expect(Array.isArray(body.browsers)).toBe(true);
    });

    test('GET /cookie-picker/domains without browser param returns JSON error', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/domains');
      const req = new Request('http://127.0.0.1:9470', {
        method: 'GET',
        headers: { 'Cookie': `skystack_picker=${sessionId}` },
      });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(400);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code', 'missing_param');
    });

    test('POST /cookie-picker/import with invalid JSON returns JSON error', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/import');
      const req = new Request('http://127.0.0.1:9470', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json', 'Cookie': `skystack_picker=${sessionId}` },
      });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(400);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      const body = await res.json();
      expect(body.code).toBe('bad_request');
    });

    test('POST /cookie-picker/import missing browser field returns JSON error', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/import');
      const req = makeReqWithSession('POST', sessionId, { domains: ['.example.com'] });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('missing_param');
    });

    test('POST /cookie-picker/import missing domains returns JSON error', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/import');
      const req = makeReqWithSession('POST', sessionId, { browser: 'Chrome' });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('missing_param');
    });

    test('POST /cookie-picker/remove with invalid JSON returns JSON error', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/remove');
      const req = new Request('http://127.0.0.1:9470', {
        method: 'POST',
        body: '{bad',
        headers: { 'Content-Type': 'application/json', 'Cookie': `skystack_picker=${sessionId}` },
      });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(400);
      expect(res.headers.get('Content-Type')).toBe('application/json');
    });

    test('POST /cookie-picker/remove missing domains returns JSON error', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/remove');
      const req = makeReqWithSession('POST', sessionId, {});

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('missing_param');
    });

    test('GET /cookie-picker/imported returns JSON with domain list', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/imported');
      const req = new Request('http://127.0.0.1:9470', {
        method: 'GET',
        headers: { 'Cookie': `skystack_picker=${sessionId}` },
      });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      const body = await res.json();
      expect(body).toHaveProperty('domains');
      expect(body).toHaveProperty('totalDomains');
      expect(body).toHaveProperty('totalCookies');
    });
  });

  describe('auth — one-time code exchange', () => {
    test('GET /cookie-picker without session returns 403', async () => {
      const { bm } = mockBrowserManager();
      const url = makeUrl('/cookie-picker');
      const req = new Request('http://127.0.0.1:9470', { method: 'GET' });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(403);
    });

    test('GET /cookie-picker?code=invalid returns 403', async () => {
      const { bm } = mockBrowserManager();
      const url = makeUrl('/cookie-picker?code=not-a-real-code');
      const req = new Request('http://127.0.0.1:9470', { method: 'GET' });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(403);
    });

    test('GET /cookie-picker?code=valid returns 302 with Set-Cookie', async () => {
      const { bm } = mockBrowserManager();
      const code = generatePickerCode();
      const url = makeUrl(`/cookie-picker?code=${code}`);
      const req = new Request('http://127.0.0.1:9470', { method: 'GET' });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe('/cookie-picker');
      const setCookie = res.headers.get('Set-Cookie')!;
      expect(setCookie).toContain('skystack_picker=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Max-Age=3600');
    });

    test('code is single-use — second exchange returns 403', async () => {
      const { bm } = mockBrowserManager();
      const code = generatePickerCode();
      const url = makeUrl(`/cookie-picker?code=${code}`);
      const req1 = new Request('http://127.0.0.1:9470', { method: 'GET' });

      const res1 = await handleCookiePickerRoute(url, req1, bm);
      expect(res1.status).toBe(302);

      const req2 = new Request('http://127.0.0.1:9470', { method: 'GET' });
      const res2 = await handleCookiePickerRoute(url, req2, bm);
      expect(res2.status).toBe(403);
    });

    test('GET /cookie-picker with valid session returns HTML', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker');
      const req = new Request('http://127.0.0.1:9470', {
        method: 'GET',
        headers: { 'Cookie': `skystack_picker=${sessionId}` },
      });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/html');
    });

    test('API routes require session cookie', async () => {
      const { bm } = mockBrowserManager();
      // Without session — should 403
      const url = makeUrl('/cookie-picker/browsers');
      const req = new Request('http://127.0.0.1:9470', { method: 'GET' });

      const res = await handleCookiePickerRoute(url, req, bm);
      expect(res.status).toBe(403);
    });

    test('API routes work with valid session', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/browsers');
      const req = new Request('http://127.0.0.1:9470', {
        method: 'GET',
        headers: { 'Cookie': `skystack_picker=${sessionId}` },
      });

      const res = await handleCookiePickerRoute(url, req, bm);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('routing', () => {
    test('unknown path returns 404 (with session)', async () => {
      const { bm } = mockBrowserManager();
      const sessionId = await getSession(bm);
      const url = makeUrl('/cookie-picker/nonexistent');
      const req = new Request('http://127.0.0.1:9470', {
        method: 'GET',
        headers: { 'Cookie': `skystack_picker=${sessionId}` },
      });

      const res = await handleCookiePickerRoute(url, req, bm);

      expect(res.status).toBe(404);
    });
  });
});
