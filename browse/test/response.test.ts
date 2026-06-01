import { describe, expect, test } from 'bun:test';
import { buildResponse } from '../src/response';

describe('buildResponse', () => {
  test('sanitizes lone surrogates in text/plain responses', async () => {
    const res = buildResponse('pre\uD800post', 200, 'text/plain');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain');
    expect(await res.text()).toBe('pre\uFFFDpost');
  });

  test('sanitizes escaped lone surrogates in JSON responses', async () => {
    const res = buildResponse('{"name":"\\uD800"}', 500, 'application/json');
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('{"name":"\\uFFFD"}');
  });

  test('passes binary bodies through unchanged', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const res = buildResponse(bytes, 200, 'application/octet-stream');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });
});
