import {
  PATTERNS,
  PATTERNS_BY_ID,
  isPlaceholderSpan,
  type Category,
  type Tier,
} from './redact-patterns';

export type RepoVisibility = 'public' | 'private' | 'unknown';
export type Severity = Tier | 'WARN';

export interface Finding {
  id: string;
  tier: Tier;
  severity: Severity;
  category: Category;
  description: string;
  line: number;
  col: number;
  preview: string;
  autoRedactable: boolean;
  repoVisibility: RepoVisibility;
  /** Original input offsets for the matched sensitive span. */
  start: number;
  end: number;
  toolFenceDegraded?: boolean;
}

export interface ScanOptions {
  repoVisibility?: RepoVisibility;
  allowlist?: string[];
  selfEmail?: string;
  repoPublicEmails?: string[];
  maxBytes?: number;
}

export interface ScanResult {
  findings: Finding[];
  counts: { HIGH: number; MEDIUM: number; LOW: number; WARN: number };
  repoVisibility: RepoVisibility;
  oversize: boolean;
}

const DEFAULT_MAX_BYTES = 1024 * 1024;
const EMAIL_ALLOW_DOMAINS = [/@example\.(com|org|net)$/i, /@example\.[a-z]{2,}$/i];
const EMAIL_ALLOW_LOCALPARTS = [/^noreply@/i, /^no-reply@/i, /^donotreply@/i];
const ZERO_WIDTH = /[\u200B\u200C\u200D\u2060\uFEFF]/g;
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

export function normalizeWithMap(input: string): { normalized: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  let i = 0;
  while (i < input.length) {
    let matchedEntity = false;
    for (const ent in HTML_ENTITIES) {
      if (!input.startsWith(ent, i)) continue;
      for (const ch of HTML_ENTITIES[ent]) {
        out.push(ch);
        map.push(i);
      }
      i += ent.length;
      matchedEntity = true;
      break;
    }
    if (matchedEntity) continue;

    const ch = input[i];
    if (ZERO_WIDTH.test(ch)) {
      ZERO_WIDTH.lastIndex = 0;
      i += 1;
      continue;
    }
    ZERO_WIDTH.lastIndex = 0;

    for (const normalizedChar of ch.normalize('NFKC')) {
      out.push(normalizedChar);
      map.push(i);
    }
    i += 1;
  }
  map.push(input.length);
  return { normalized: out.join(''), map };
}

function lineColAt(original: string, offset: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < original.length; i++) {
    if (original[i] === '\n') {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }
  return { line, col };
}

export function maskPreview(span: string): string {
  const visible = span.slice(0, 4);
  const masked = span.length > 4 ? '*'.repeat(Math.min(span.length - 4, 8)) : '';
  return `${visible}${masked}${span.length > 12 ? '...' : ''}`;
}

const TOOL_FENCE_INFO = /^```(codex-review|greptile|eval|codex|tool-output)\b/;

function toolFenceRanges(normalized: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const lines = normalized.split('\n');
  let offset = 0;
  let inFence = false;
  let fenceStart = 0;
  for (const line of lines) {
    if (line.startsWith('```')) {
      if (!inFence && TOOL_FENCE_INFO.test(line)) {
        inFence = true;
        fenceStart = offset + line.length + 1;
      } else if (inFence) {
        ranges.push([fenceStart, offset]);
        inFence = false;
      }
    }
    offset += line.length + 1;
  }
  if (inFence) ranges.push([fenceStart, normalized.length]);
  return ranges;
}

function inRanges(offset: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => offset >= start && offset < end);
}

function hasNear(
  normalized: string,
  matchStart: number,
  matchEnd: number,
  nearRegex: RegExp,
  window: number
): boolean {
  const from = Math.max(0, matchStart - window);
  const to = Math.min(normalized.length, matchEnd + window);
  const re = new RegExp(nearRegex.source, nearRegex.flags.replace(/g/g, ''));
  return re.test(normalized.slice(from, to));
}

function emailAllowed(email: string, opts: ScanOptions): boolean {
  const lower = email.toLowerCase();
  if (opts.selfEmail && lower === opts.selfEmail.toLowerCase()) return true;
  if (opts.repoPublicEmails?.some(e => e.toLowerCase() === lower)) return true;
  if (EMAIL_ALLOW_DOMAINS.some(re => re.test(email))) return true;
  return EMAIL_ALLOW_LOCALPARTS.some(re => re.test(email));
}

function withFlags(flags: string): string {
  let next = flags;
  if (!next.includes('g')) next += 'g';
  if (!next.includes('m')) next += 'm';
  return next;
}

export function scan(input: string, opts: ScanOptions = {}): ScanResult {
  const repoVisibility: RepoVisibility = opts.repoVisibility ?? 'unknown';
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const byteLen = Buffer.byteLength(input, 'utf8');

  if (byteLen > maxBytes) {
    const finding: Finding = {
      id: 'engine.input_too_large',
      tier: 'HIGH',
      severity: 'HIGH',
      category: 'secret',
      description: `Input too large to scan safely (${byteLen} > ${maxBytes} bytes); blocking fail-closed`,
      line: 1,
      col: 1,
      preview: '',
      autoRedactable: false,
      repoVisibility,
      start: 0,
      end: input.length,
    };
    return {
      findings: [finding],
      counts: { HIGH: 1, MEDIUM: 0, LOW: 0, WARN: 0 },
      repoVisibility,
      oversize: true,
    };
  }

  const { normalized, map } = normalizeWithMap(input);
  const fenceRanges = toolFenceRanges(normalized);
  const allow = new Set(opts.allowlist ?? []);
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const pattern of PATTERNS) {
    const re = new RegExp(pattern.regex.source, withFlags(pattern.regex.flags));
    let match: RegExpExecArray | null;
    while ((match = re.exec(normalized)) !== null) {
      if (match.index === re.lastIndex) re.lastIndex++;

      const span = match[1] ?? match[0];
      const spanStartInMatch = match[1] !== undefined ? match[0].indexOf(match[1]) : 0;
      const normOffset = match.index + Math.max(0, spanStartInMatch);

      if (isPlaceholderSpan(span)) continue;
      if (allow.has(span)) continue;
      if (pattern.validate && !pattern.validate(span, match)) continue;
      if (
        pattern.nearRegex &&
        !hasNear(normalized, match.index, match.index + match[0].length, pattern.nearRegex, pattern.nearWindow ?? 100)
      ) {
        continue;
      }
      if (pattern.id === 'pii.email' && emailAllowed(span, opts)) continue;

      const origOffset = map[Math.min(normOffset, map.length - 1)] ?? 0;
      const origEnd = originalEndOffset(input, map, normOffset + span.length);
      const key = `${pattern.id}:${origOffset}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const { line, col } = lineColAt(input, origOffset);
      let severity: Severity = pattern.tier;
      let toolFenceDegraded = false;
      if (
        pattern.category === 'secret' &&
        inRanges(normOffset, fenceRanges) &&
        isPlaceholderSpan(span)
      ) {
        severity = 'WARN';
        toolFenceDegraded = true;
      }

      findings.push({
        id: pattern.id,
        tier: pattern.tier,
        severity,
        category: pattern.category,
        description: pattern.description,
        line,
        col,
        preview: maskPreview(span),
        autoRedactable: !!pattern.autoRedactable,
        repoVisibility,
        start: origOffset,
        end: origEnd,
        ...(toolFenceDegraded ? { toolFenceDegraded } : {}),
      });
    }
  }

  findings.sort((a, b) => a.line - b.line || a.col - b.col || a.id.localeCompare(b.id));
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, WARN: 0 };
  for (const finding of findings) counts[finding.severity] += 1;

  return { findings, counts, repoVisibility, oversize: false };
}

export interface RedactResult {
  body: string;
  diff: string;
  skipped: Finding[];
}

export function applyRedactions(
  input: string,
  findingIds: string[],
  opts: ScanOptions = {}
): RedactResult {
  const ids = new Set(findingIds);
  const targets = scan(input, opts).findings
    .filter(f => ids.has(f.id) && f.autoRedactable)
    .map(f => ({ f, start: f.start, end: f.end }))
    .filter(t => t.start >= 0)
    .sort((a, b) => b.start - a.start);

  const skipped: Finding[] = [];
  const diffLines: string[] = [];
  let body = input;

  for (const target of targets) {
    const token = PATTERNS_BY_ID[target.f.id]?.redactToken ?? '<REDACTED>';
    if (inStructuralToken(body, target.start, target.end)) {
      skipped.push(target.f);
      continue;
    }
    const before = lineContaining(body, target.start);
    body = body.slice(0, target.start) + token + body.slice(target.end);
    const after = lineContaining(body, target.start);
    diffLines.push(`- ${before}`);
    diffLines.push(`+ ${after}`);
  }

  return { body, diff: diffLines.reverse().join('\n'), skipped };
}

function originalEndOffset(input: string, map: number[], normEnd: number): number {
  if (normEnd >= map.length - 1) return input.length;
  return map[normEnd] ?? input.length;
}

function inStructuralToken(body: string, start: number, end: number): boolean {
  for (let i = start - 1; i >= 0; i--) {
    const ch = body[i];
    if (ch === ')' || ch === '\n' || ch === ' ' || ch === '\t') break;
    if (ch === '(' && i > 0 && body[i - 1] === ']') {
      for (let j = end; j < body.length; j++) {
        const c = body[j];
        if (c === ' ' || c === '\t' || c === '\n') break;
        if (c === ')') return true;
      }
      break;
    }
  }
  const before = body.slice(Math.max(0, start - 80), start);
  const after = body.slice(end, Math.min(body.length, end + 4));
  return /:\s*"$/.test(before) && /^"/.test(after);
}

function lineContaining(body: string, offset: number): string {
  const start = body.lastIndexOf('\n', offset - 1) + 1;
  let end = body.indexOf('\n', offset);
  if (end === -1) end = body.length;
  return body.slice(start, end);
}

export function exitCodeFor(result: ScanResult): 0 | 2 | 3 {
  if (result.counts.HIGH > 0) return 3;
  if (result.counts.MEDIUM > 0) return 2;
  return 0;
}
