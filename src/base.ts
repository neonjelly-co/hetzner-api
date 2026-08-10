import { HETZNER_API_BASE, type HetznerError } from "./common";

/**
 * Shared Hetzner Cloud API client base (`api.hetzner.cloud`).
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
      return {} as T;
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const error = data as HetznerError;
      throw new Error(`Hetzner API Error [${error.error?.code}]: ${error.error?.message}`);
    }

    return data as T;
  }
}
