import { describe, expect, test } from 'bun:test';
import { scan } from '../lib/redact-engine';
import { PATTERNS } from '../lib/redact-patterns';

const NESTED_QUANTIFIER = /\([^)]*[+*]\)[+*]|\([^)]*[+*]\)\{\d+,?\}|\([^)]*\{\d+,\}\)[+*]/;

describe('redact pattern lint', () => {
  for (const pattern of PATTERNS) {
    test(`${pattern.id} has no nested unbounded quantifier`, () => {
      expect(NESTED_QUANTIFIER.test(pattern.regex.source)).toBe(false);
    });
  }

  test('linter catches a planted catastrophic pattern', () => {
    expect(NESTED_QUANTIFIER.test('(a+)+')).toBe(true);
    expect(NESTED_QUANTIFIER.test('(\\d*)*')).toBe(true);
  });
});

describe('redact runtime budget', () => {
  const adversarial = [
    `${'a'.repeat(5000)}!`,
    `AKIA${'A'.repeat(5000)}`,
    `eyJ${'a'.repeat(2000)}.${'b'.repeat(2000)}`,
    `x@${'a'.repeat(3000)}`,
    `/Users/${'a'.repeat(4000)}`,
    `${'1'.repeat(19)} `.repeat(200),
  ];

  for (const [i, input] of adversarial.entries()) {
    test(`adversarial input #${i} scans within budget`, () => {
      const start = performance.now();
      scan(input, { repoVisibility: 'private', maxBytes: 1024 * 1024 });
      expect(performance.now() - start).toBeLessThan(1000);
    });
  }
});
