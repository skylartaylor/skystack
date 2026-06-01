// Lone Unicode surrogate sanitization.
//
// Lone surrogates are valid UTF-16 but invalid UTF-8. Real-world page captures
// can contain them via broken emoji bytes or mid-emoji splits, and API clients
// reject those response bodies. Replace only unpaired surrogates with U+FFFD.

const LONE_SURROGATE_HIGH = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g;
const LONE_SURROGATE_LOW = /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function stripLoneSurrogates(s: string): string {
  return s.replace(LONE_SURROGATE_HIGH, '�').replace(LONE_SURROGATE_LOW, '�');
}

const LONE_SURROGATE_HIGH_ESCAPE = /\\u[Dd][89ABab][0-9A-Fa-f]{2}(?!\\u[Dd][C-Fc-f][0-9A-Fa-f]{2})/g;
const LONE_SURROGATE_LOW_ESCAPE = /(?<!\\u[Dd][89ABab][0-9A-Fa-f]{2})\\u[Dd][C-Fc-f][0-9A-Fa-f]{2}/g;

export function stripLoneSurrogateEscapes(s: string): string {
  return s
    .replace(LONE_SURROGATE_HIGH_ESCAPE, '\\uFFFD')
    .replace(LONE_SURROGATE_LOW_ESCAPE, '\\uFFFD');
}

export function sanitizeBody(body: string, isJson: boolean): string {
  return isJson
    ? stripLoneSurrogateEscapes(stripLoneSurrogates(body))
    : stripLoneSurrogates(body);
}
