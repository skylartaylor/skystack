import { describe, expect, test } from 'bun:test';
import { sanitizeBody, stripLoneSurrogateEscapes, stripLoneSurrogates } from '../src/sanitize';

describe('stripLoneSurrogates', () => {
  test('replaces lone high surrogate with replacement character', () => {
    expect(stripLoneSurrogates('\uD800x')).toBe('\uFFFDx');
  });

  test('replaces lone low surrogate with replacement character', () => {
    expect(stripLoneSurrogates('x\uDC00')).toBe('x\uFFFD');
  });

  test('leaves valid surrogate pairs unchanged', () => {
    const smile = '😀';
    expect(stripLoneSurrogates(smile)).toBe(smile);
  });

  test('handles mixed valid and lone surrogates', () => {
    expect(stripLoneSurrogates('a\uD800b😀c\uDC00d')).toBe('a\uFFFDb😀c\uFFFDd');
  });
});

describe('stripLoneSurrogateEscapes', () => {
  test('replaces lone escaped high surrogate', () => {
    expect(stripLoneSurrogateEscapes('{"name":"\\uD800"}')).toBe('{"name":"\\uFFFD"}');
  });

  test('replaces lone escaped low surrogate', () => {
    expect(stripLoneSurrogateEscapes('{"name":"\\uDC00"}')).toBe('{"name":"\\uFFFD"}');
  });

  test('leaves valid escaped pair unchanged', () => {
    const json = '{"emoji":"\\uD83D\\uDE00"}';
    expect(stripLoneSurrogateEscapes(json)).toBe(json);
  });
});

describe('sanitizeBody', () => {
  test('text/plain applies raw surrogate pass', () => {
    expect(sanitizeBody('pre\uD800post', false)).toBe('pre\uFFFDpost');
  });

  test('application/json applies raw and escaped surrogate passes', () => {
    expect(sanitizeBody('{"raw":"\uD800","esc":"\\uD800"}', true))
      .toBe('{"raw":"\uFFFD","esc":"\\uFFFD"}');
  });
});
