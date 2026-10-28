/**
 * Common error codes of the Hetzner Cloud and Storage APIs (the same set the official hcloud-go client names).
 * The union stays open (`string & {}`) because Hetzner adds codes over time and the client must not reject one it
 * does not know yet.
 * @see https://docs.hetzner.cloud/reference/cloud#errors
 */
export type HetznerErrorCode =
  | "bad_gateway"
  | "conflict"
  | "deprecated_api_endpoint"
  | "forbidden"
  | "invalid_input"
  | "json_error"
  | "locked"
  | "maintenance"
  | "not_found"
  | "protected"
  | "rate_limit_exceeded"
  | "resource_limit_exceeded"
  | "resource_locked"
  | "resource_unavailable"
  | "server_error"
  | "service_error"
  | "timeout"
  | "unauthorized"
  | "uniqueness_error"
  | "unknown_error"
  | "unsupported_error"
  | "invalid_server_type"
  | "placement_error"
  | "server_not_stopped"
  | "server_already_attached"
  | "volume_already_attached"
  | "no_space_left_in_location"
  | "ip_not_available"
  | "no_subnet_available"
  | (string & {});

/** The body Hetzner returns for a failed request. `details` is present for some codes, such as `invalid_input`. */
export interface HetznerErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Code used when the response body is missing or is not a Hetzner error object (an HTML 502 from a proxy, say). */
export const UNKNOWN_ERROR_CODE = "unknown_error";

/**
 * Thrown for every non-OK response. `message` keeps the `<prefix> [<code>]: <message>` shape earlier versions threw,
 * so callers that matched on the string keep working; new code should read `code` and `status` instead.
 */
export class HetznerApiError extends Error {
  override readonly name = "HetznerApiError";
  /** Hetzner's error code, or {@link UNKNOWN_ERROR_CODE} when the body carried none. */
  readonly code: HetznerErrorCode;
  /** HTTP status of the failed response. */
  readonly status: number;
  /** Hetzner's human-readable message, without the prefix and code. */
  readonly apiMessage: string;
  /** Extra error data Hetzner sent, if any. */
  readonly details: unknown;

  constructor(args: {
    prefix: string;
    code: string;
    status: number;
    apiMessage: string;
    details?: unknown;
  }) {
    super(`${args.prefix} [${args.code}]: ${args.apiMessage}`);
    this.code = args.code;
    this.status = args.status;
    this.apiMessage = args.apiMessage;
    this.details = args.details;
  }
}

/**
 * True when `error` is a {@link HetznerApiError}, optionally with one of the given codes.
 *
 * @example
 * ```ts
 * try {
 *   await hetzner.servers.createServer(request);
 * } catch (error) {
 *   if (isHetznerApiError(error, "resource_unavailable")) {
 *     // Hetzner has no capacity for this server type in this location right now.
 *   }
 *   throw error;
 * }
 * ```
 */
export function isHetznerApiError(error: unknown, ...codes: HetznerErrorCode[]): error is HetznerApiError {
  if (!(error instanceof HetznerApiError)) return false;
  return codes.length === 0 || codes.includes(error.code);
}

const isErrorBody = (value: unknown): value is HetznerErrorBody => {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const inner = (value as { error: unknown }).error;
  return (
    typeof inner === "object" &&
    inner !== null &&
    typeof (inner as { code?: unknown }).code === "string" &&
    typeof (inner as { message?: unknown }).message === "string"
  );
};

/** Parses a JSON body, returning `undefined` for an empty or non-JSON body instead of throwing. */
export function parseJsonBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Builds the error for a non-OK response from its already-read body text. */
export function toHetznerApiError(response: Response, text: string, prefix: string): HetznerApiError {
  const body = parseJsonBody(text);
  if (isErrorBody(body)) {
    return new HetznerApiError({
      prefix,
      code: body.error.code,
      status: response.status,
      apiMessage: body.error.message,
      details: body.error.details,
    });
  }
  const fallback = text.trim().slice(0, 200) || response.statusText || `HTTP ${response.status}`;
  return new HetznerApiError({
    prefix,
    code: UNKNOWN_ERROR_CODE,
    status: response.status,
    apiMessage: fallback,
  });
}
