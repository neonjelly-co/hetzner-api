import { HETZNER_API_BASE } from "./common";
import { type HetznerApiError, parseJsonBody, toHetznerApiError } from "./errors";

/** Prefix of every Cloud API error message: `Hetzner API Error [<code>]: <message>`. */
export const CLOUD_ERROR_PREFIX = "Hetzner API Error";

/**
 * Shared Hetzner Cloud API client base (`api.hetzner.cloud`). Failed responses throw {@link HetznerApiError}.
 */
export class HetznerCloudBase {
  protected apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  protected async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${HETZNER_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return void 0 as T;
    }

    const text = await response.text();

    if (!response.ok) {
      throw toHetznerApiError(response, text, CLOUD_ERROR_PREFIX);
    }

    return (parseJsonBody(text) ?? {}) as T;
  }
}
