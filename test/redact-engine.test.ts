import { describe, expect, test } from 'bun:test';
import {
  applyRedactions,
  exitCodeFor,
  maskPreview,
  normalizeWithMap,
  scan,
  type RepoVisibility,
} from '../lib/redact-engine';
import {
  isPlaceholderSpan,
  isPublicIPv4,
  luhnValid,
  PATTERNS,
  shannonEntropy,
} from '../lib/redact-patterns';

function ids(text: string, vis: RepoVisibility = 'private'): string[] {
  return scan(text, { repoVisibility: vis }).findings.map(f => f.id);
}

describe('redact engine credential patterns', () => {
  const highCases: Array<[string, string]> = [
    ['aws.access_key', 'key = AKIA1234567890ABCDEF'],
    ['aws.secret_key', 'aws_secret_access_key = AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCd'],
    ['github.pat', `token ghp_${'a'.repeat(36)}`],
    ['github.oauth', `gho_${'a'.repeat(36)}`],
    ['github.server', `ghs_${'a'.repeat(36)}`],
    ['github.fine_grained', `github_pat_${'A'.repeat(82)}`],
    ['anthropic.key', 'sk-ant-api03-abcdefghij1234567890XYZ'],
    ['openai.key', `sk-proj-${'a'.repeat(40)}`],
    ['sendgrid.key', `SG.${'a'.repeat(22)}.${'b'.repeat(43)}`],
    ['stripe.secret', `sk_live_${'a'.repeat(30)}`],
    ['slack.token', `xox${'b'}-1234567890-abcdefghijklmnop`],
    ['slack.webhook', `https://hooks.slack.com/services/T00000000/B11111111/${'a'.repeat(24)}`],
    ['discord.webhook', `https://discord.com/api/webhooks/123456789012345678/${'a'.repeat(60)}`],
    ['pem.private_key', '-----BEGIN RSA PRIVATE KEY-----'],
  ];

  for (const [id, text] of highCases) {
    test(`flags ${id}`, () => {
      expect(ids(text)).toContain(id);
    });
  }

  test('nearby validators reduce high-noise secret shapes', () => {
    const sid = `AC${'a'.repeat(32)}`;
    const tok = 'b'.repeat(32);
    expect(ids(`account ${sid} token ${tok}`)).toContain('twilio.auth_token');
    expect(ids(`random ${tok} here`)).not.toContain('twilio.auth_token');
  });

  test('high findings block', () => {
    expect(exitCodeFor(scan('AKIA1234567890ABCDEF'))).toBe(3);
  });
});

describe('redact engine medium and low patterns', () => {
  test('demoted credential-shaped values remain medium', () => {
    const stripe = scan(`pk_live_${'a'.repeat(30)}`).findings.find(f => f.id === 'stripe.publishable');
    const google = scan(`AIza${'a'.repeat(35)}`).findings.find(f => f.id === 'google.api_key');
    expect(stripe?.severity).toBe('MEDIUM');
    expect(google?.severity).toBe('MEDIUM');
  });

  test('PII patterns flag and auto-redact', () => {
    const result = scan('mail alice@corp.io or call +14155550123');
    expect(result.findings.map(f => f.id)).toContain('pii.email');
    expect(result.findings.map(f => f.id)).toContain('pii.phone.e164');
    expect(result.counts.MEDIUM).toBeGreaterThanOrEqual(2);
  });

  test('email allowlist suppresses safe addresses', () => {
    expect(ids('see user@example.com')).not.toContain('pii.email');
    expect(ids('from noreply@github.com')).not.toContain('pii.email');
    expect(scan('me@site.dev', { selfEmail: 'me@site.dev' }).findings).toHaveLength(0);
    expect(scan('bob@corp.io', { repoPublicEmails: ['bob@corp.io'] }).findings).toHaveLength(0);
  });

  test('internal and legal markers surface as medium', () => {
    expect(ids('db1.corp')).toContain('internal.hostname');
    expect(ids('This is CONFIDENTIAL')).toContain('legal.nda_marker');
    expect(ids('John Smith is negligent')).toContain('legal.named_criticism');
  });

  test('low findings do not change exit code', () => {
    const result = scan('/Users/alice/project TODO(owner)');
    expect(result.findings.map(f => f.id)).toEqual(['internal.user_path', 'hygiene.todo']);
    expect(exitCodeFor(result)).toBe(0);
  });
});

describe('redact engine safeguards', () => {
  test('placeholder suppression is per-span', () => {
    expect(isPlaceholderSpan('your_api_key')).toBe(true);
    expect(ids('AKIAIOSFODNN7EXAMPLE')).not.toContain('aws.access_key');
    expect(ids('# EXAMPLE usage\nkey AKIA1234567890ABCDEF')).toContain('aws.access_key');
  });

  test('normalization catches zero-width evasions and maps offsets', () => {
    const broken = `AKIA1234567890\u200BABCDEF`;
    expect(ids(broken)).toContain('aws.access_key');
    const { normalized, map } = normalizeWithMap('xy\u200Bz');
    expect(normalized).toBe('xyz');
    expect(map[2]).toBe(3);
  });

  test('oversize input fails closed', () => {
    const result = scan('a'.repeat(2000), { maxBytes: 1000 });
    expect(result.oversize).toBe(true);
    expect(result.counts.HIGH).toBe(1);
    expect(exitCodeFor(result)).toBe(3);
  });

  test('auto-redaction replaces selected PII only', () => {
    const result = applyRedactions('mail bob@corp.io, card 4111111111111111', ['pii.email']);
    expect(result.body).toContain('<REDACTED-EMAIL>');
    expect(result.body).not.toContain('bob@corp.io');
    expect(result.body).toContain('4111111111111111');
  });

  test('auto-redaction uses normalized scan offsets', () => {
    const input = 'mail bob@\u200Bcorp.io';
    expect(scan(input).findings.map(f => f.id)).toContain('pii.email');
    const result = applyRedactions(input, ['pii.email']);
    expect(result.body).toBe('mail <REDACTED-EMAIL>');
  });

  test('validators and previews are calibrated', () => {
    expect(luhnValid('4111111111111111')).toBe(true);
    expect(luhnValid('4111111111111112')).toBe(false);
    expect(isPublicIPv4('8.8.8.8')).toBe(true);
    expect(isPublicIPv4('10.0.0.1')).toBe(false);
    expect(shannonEntropy('aaaaaaaa')).toBeLessThan(1);
    expect(shannonEntropy('8Fk2pQ9vXz4wL7mN')).toBeGreaterThan(3);
    expect(maskPreview('AKIA1234567890ABCDEF')).toBe('AKIA********...');
  });

  test('taxonomy ids are unique', () => {
    const ids = new Set(PATTERNS.map(p => p.id));
    expect(ids.size).toBe(PATTERNS.length);
  });
});
