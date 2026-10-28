// Shared fetch mock utilities for Bun tests.

export type FetchCall = {
  url: string;
  method: string;
  headers: Headers;
  body: string | null;
};

export function installFetchMock(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    calls.push({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: init?.body == null ? null : String(init.body),
    });
    return handler(input, init);
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function textResponse(body: string, status = 200, contentType = "text/plain"): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": contentType },
  });
}

export function emptyResponse(status = 204): Response {
  return new Response(null, { status });
}
