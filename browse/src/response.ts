import { sanitizeBody } from './sanitize';

type ResponseBody = BodyInit | null | undefined;

export function buildResponse(
  body: ResponseBody,
  status: number,
  contentType: string,
  headers: Record<string, string> = {}
): Response {
  const responseBody = typeof body === 'string'
    ? sanitizeBody(body, contentType.toLowerCase().includes('application/json'))
    : body;

  return new Response(responseBody, {
    status,
    headers: {
      'Content-Type': contentType,
      ...headers,
    },
  });
}
