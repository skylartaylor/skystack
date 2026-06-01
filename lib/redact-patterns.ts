export type Tier = 'HIGH' | 'MEDIUM' | 'LOW';

export type Category = 'secret' | 'pii' | 'legal' | 'internal' | 'hygiene';

export interface RedactPattern {
  id: string;
  tier: Tier;
  category: Category;
  description: string;
  regex: RegExp;
  autoRedactable?: boolean;
  redactToken?: string;
  validate?: (span: string, match: RegExpExecArray) => boolean;
  nearRegex?: RegExp;
  nearWindow?: number;
}

export function luhnValid(span: string): boolean {
  const digits = span.replace(/[ -]/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function shannonEntropy(s: string): number {
  if (!s.length) return 0;
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  let h = 0;
  for (const ch in freq) {
    const p = freq[ch] / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export function isPublicIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = m.slice(1, 5).map(Number);
  if (octets.some(n => n > 255)) return false;
  const [a, b] = octets;
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 192 && b === 168) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a >= 224) return false;
  return true;
}

function looksLikeWallet(span: string): boolean {
  if (/^0x[a-fA-F0-9]{40}$/.test(span)) {
    const body = span.slice(2).toLowerCase();
    return !/^(.)\1{39}$/.test(body);
  }
  return span.length >= 26 && span.length <= 62;
}

const PLACEHOLDER_STRUCTURAL = [
  /^your[_-]/i,
  /^<[^>]*>$/,
  /^\*+$/,
  /^x{6,}$/i,
];

const PLACEHOLDER_SUBSTRING = [
  /example/i,
  /^changeme$/i,
  /^redacted/i,
  /^placeholder/i,
  /^dummy/i,
  /^fake/i,
  /test[_-]?(key|token|secret)/i,
];

export function isPlaceholderSpan(span: string): boolean {
  if (PLACEHOLDER_STRUCTURAL.some(re => re.test(span))) return true;
  const isCompound = span.includes('://') || span.includes('@');
  return !isCompound && PLACEHOLDER_SUBSTRING.some(re => re.test(span));
}

export const PATTERNS: RedactPattern[] = [
  {
    id: 'aws.access_key',
    tier: 'HIGH',
    category: 'secret',
    description: 'AWS access key ID',
    regex: /\b(AKIA[0-9A-Z]{16})\b/,
  },
  {
    id: 'aws.secret_key',
    tier: 'HIGH',
    category: 'secret',
    description: 'AWS secret access key with aws_secret_access_key nearby',
    regex: /\b([A-Za-z0-9/+=]{40})\b/,
    nearRegex: /aws.{0,3}secret.{0,3}access.{0,3}key/i,
    nearWindow: 100,
  },
  {
    id: 'github.pat',
    tier: 'HIGH',
    category: 'secret',
    description: 'GitHub personal access token',
    regex: /\b(ghp_[A-Za-z0-9]{36})\b/,
  },
  {
    id: 'github.oauth',
    tier: 'HIGH',
    category: 'secret',
    description: 'GitHub OAuth token',
    regex: /\b(gho_[A-Za-z0-9]{36})\b/,
  },
  {
    id: 'github.server',
    tier: 'HIGH',
    category: 'secret',
    description: 'GitHub server-to-server token',
    regex: /\b(ghs_[A-Za-z0-9]{36})\b/,
  },
  {
    id: 'github.fine_grained',
    tier: 'HIGH',
    category: 'secret',
    description: 'GitHub fine-grained PAT',
    regex: /\b(github_pat_[A-Za-z0-9_]{82})\b/,
  },
  {
    id: 'anthropic.key',
    tier: 'HIGH',
    category: 'secret',
    description: 'Anthropic API key',
    regex: /\b(sk-ant-[A-Za-z0-9_-]{20,})\b/,
  },
  {
    id: 'openai.key',
    tier: 'HIGH',
    category: 'secret',
    description: 'OpenAI API key',
    regex: /\b(sk-(?:proj-)?[A-Za-z0-9]{32,})\b/,
  },
  {
    id: 'sendgrid.key',
    tier: 'HIGH',
    category: 'secret',
    description: 'SendGrid API key',
    regex: /\b(SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43})\b/,
  },
  {
    id: 'stripe.secret',
    tier: 'HIGH',
    category: 'secret',
    description: 'Stripe live secret key',
    regex: /\b(sk_live_[A-Za-z0-9]{24,})\b/,
  },
  {
    id: 'slack.token',
    tier: 'HIGH',
    category: 'secret',
    description: 'Slack token',
    regex: /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/,
  },
  {
    id: 'slack.webhook',
    tier: 'HIGH',
    category: 'secret',
    description: 'Slack incoming webhook URL',
    regex: /(https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]{24})/,
  },
  {
    id: 'discord.webhook',
    tier: 'HIGH',
    category: 'secret',
    description: 'Discord webhook URL',
    regex: /(https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/[0-9]{17,20}\/[A-Za-z0-9_-]{60,})/,
  },
  {
    id: 'twilio.auth_token',
    tier: 'HIGH',
    category: 'secret',
    description: 'Twilio auth token with Account SID nearby',
    regex: /\b([a-f0-9]{32})\b/,
    nearRegex: /\bAC[a-f0-9]{32}\b/,
    nearWindow: 200,
  },
  {
    id: 'pem.private_key',
    tier: 'HIGH',
    category: 'secret',
    description: 'PEM private key block',
    regex: /(-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----)/,
  },
  {
    id: 'db.url_with_password',
    tier: 'HIGH',
    category: 'secret',
    description: 'Database URL with embedded password',
    regex: /\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s/@]+:[^@\s/]+@[^\s/]+)/,
    validate: (span) => {
      const m = span.match(/:\/\/[^:]+:([^@]+)@/);
      const pw = m?.[1] ?? '';
      return !isPlaceholderSpan(pw) && pw !== '' && !/^\$\{?[A-Z_]+\}?$/.test(pw);
    },
  },
  {
    id: 'creds.basic_auth_url',
    tier: 'HIGH',
    category: 'secret',
    description: 'HTTP(S) URL with embedded basic-auth credentials',
    regex: /(https?:\/\/[^:\s/@]+:[^@\s/]+@[^\s/]+)/,
    validate: (span) => {
      const m = span.match(/:\/\/[^:]+:([^@]+)@/);
      const pw = m?.[1] ?? '';
      return !isPlaceholderSpan(pw) && pw !== '' && !/^\$\{?[A-Z_]+\}?$/.test(pw);
    },
  },
  {
    id: 'stripe.publishable',
    tier: 'MEDIUM',
    category: 'secret',
    description: 'Stripe live publishable key',
    regex: /\b(pk_live_[A-Za-z0-9]{24,})\b/,
  },
  {
    id: 'google.api_key',
    tier: 'MEDIUM',
    category: 'secret',
    description: 'Google API key',
    regex: /\b(AIza[0-9A-Za-z_-]{35})\b/,
  },
  {
    id: 'jwt',
    tier: 'MEDIUM',
    category: 'secret',
    description: 'JSON Web Token',
    regex: /\b(eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/,
  },
  {
    id: 'env.kv',
    tier: 'MEDIUM',
    category: 'secret',
    description: 'Env-style secret assignment with high-entropy value',
    regex: /^[ \t]*(?:export[ \t]+)?[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIALS?|DSN|AUTH|COOKIE|SESSION|PRIVATE)[ \t]*=[ \t]*['"]?([^\s'"]{8,})['"]?/,
    validate: (span) =>
      !isPlaceholderSpan(span) &&
      !/^\$\{?[A-Za-z_]/.test(span) &&
      shannonEntropy(span) >= 3.0,
  },
  {
    id: 'pii.email',
    tier: 'MEDIUM',
    category: 'pii',
    description: 'Email address',
    regex: /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/,
    autoRedactable: true,
    redactToken: '<REDACTED-EMAIL>',
  },
  {
    id: 'pii.phone.e164',
    tier: 'MEDIUM',
    category: 'pii',
    description: 'Phone number',
    regex: /(?<![\w.])(\+?[1-9]\d{0,2}[ .-]?\(?\d{2,4}\)?[ .-]?\d{3,4}[ .-]?\d{3,4})(?![\w.])/,
    autoRedactable: true,
    redactToken: '<REDACTED-PHONE>',
    validate: (span) => span.replace(/\D/g, '').length >= 10,
  },
  {
    id: 'pii.ssn',
    tier: 'MEDIUM',
    category: 'pii',
    description: 'US Social Security Number',
    regex: /\b(\d{3}-\d{2}-\d{4})\b/,
    autoRedactable: true,
    redactToken: '<REDACTED-SSN>',
    validate: (span) => {
      const [a, b, c] = span.split('-');
      return a !== '000' && b !== '00' && c !== '0000' && a !== '666' && a[0] !== '9';
    },
  },
  {
    id: 'pii.cc',
    tier: 'MEDIUM',
    category: 'pii',
    description: 'Credit-card number',
    regex: /\b((?:\d[ -]?){13,19})\b/,
    autoRedactable: true,
    redactToken: '<REDACTED-CC>',
    validate: (span) => luhnValid(span),
  },
  {
    id: 'pii.ip_public',
    tier: 'MEDIUM',
    category: 'pii',
    description: 'Public IPv4 address',
    regex: /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/,
    validate: (span) => isPublicIPv4(span),
  },
  {
    id: 'pii.wallet',
    tier: 'MEDIUM',
    category: 'pii',
    description: 'Crypto wallet address',
    regex: /\b(0x[a-fA-F0-9]{40}|bc1[a-z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/,
    validate: (span) => looksLikeWallet(span),
  },
  {
    id: 'internal.hostname',
    tier: 'MEDIUM',
    category: 'internal',
    description: 'Internal hostname',
    regex: /\b([a-z0-9][a-z0-9-]*\.(?:internal|corp|local|lan|prod|staging))\b/i,
  },
  {
    id: 'internal.url_private',
    tier: 'MEDIUM',
    category: 'internal',
    description: 'localhost URL with non-trivial path',
    regex: /(https?:\/\/(?:localhost|127\.0\.0\.1):\d{2,5}\/[^\s)]+)/,
  },
  {
    id: 'legal.nda_marker',
    tier: 'MEDIUM',
    category: 'legal',
    description: 'Confidentiality or NDA marker',
    regex: /\b(CONFIDENTIAL|UNDER NDA|ATTORNEY[- ]CLIENT|PRIVILEGED|DO NOT DISTRIBUTE|EYES ONLY)\b/,
  },
  {
    id: 'legal.named_criticism',
    tier: 'MEDIUM',
    category: 'legal',
    description: 'Negative judgment near a capitalized full name',
    regex: /\b(incompetent|negligent|fraudulent|fraud|fired|terminated|harassed|underperforming)\b/i,
    nearRegex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/,
    nearWindow: 80,
  },
  {
    id: 'internal.user_path',
    tier: 'LOW',
    category: 'internal',
    description: 'Absolute path under a user home dir',
    regex: /(\/(?:Users|home)\/[a-z][a-z0-9_-]+\/[^\s)]*)/,
  },
  {
    id: 'hygiene.todo',
    tier: 'LOW',
    category: 'hygiene',
    description: 'TODO(owner) marker',
    regex: /\b(TODO\([^)]+\))/,
  },
];

export const PATTERNS_BY_ID: Record<string, RedactPattern> = Object.fromEntries(
  PATTERNS.map(p => [p.id, p])
);
