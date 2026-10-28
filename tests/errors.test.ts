import { afterEach, describe, expect, test } from "bun:test";
import { createHetznerClient, HetznerApiError, isHetznerApiError, UNKNOWN_ERROR_CODE } from "../src/index";
import { StorageBoxesClient, HetznerApiError as StorageHetznerApiError } from "../src/storageBoxes";
import { installFetchMock, jsonResponse, textResponse } from "./helpers";

let restoreFetch: (() => void) | undefined;

afterEach(() => {
  restoreFetch?.();
  restoreFetch = undefined;
});

const rejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to reject");
};

describe("HetznerApiError", () => {
  test("carries code, status, message and details from a Cloud error body", async () => {
    const mock = installFetchMock(() =>
      jsonResponse(
        {
          error: {
            code: "resource_unavailable",
            message: "server type cx33 is currently unavailable in fsn1",
            details: { resource: "server_type" },
          },
        },
        412,
      ),
    );
    restoreFetch = mock.restore;

    const error = await rejection(
      createHetznerClient("token").servers.createServer({
        name: "web",
        server_type: "cx33",
        image: "ubuntu-24.04",
        location: "fsn1",
      }),
    );

    expect(error).toBeInstanceOf(HetznerApiError);
    expect(error).toBeInstanceOf(Error);
    const apiError = error as HetznerApiError;
    expect(apiError.name).toBe("HetznerApiError");
    expect(apiError.code).toBe("resource_unavailable");
    expect(apiError.status).toBe(412);
    expect(apiError.apiMessage).toBe("server type cx33 is currently unavailable in fsn1");
    expect(apiError.details).toEqual({ resource: "server_type" });
    expect(apiError.message).toBe(
      "Hetzner API Error [resource_unavailable]: server type cx33 is currently unavailable in fsn1",
    );
  });

  test("isHetznerApiError matches by code", async () => {
    const mock = installFetchMock(() =>
      jsonResponse({ error: { code: "resource_unavailable", message: "no capacity" } }, 412),
    );
    restoreFetch = mock.restore;

    const error = await rejection(createHetznerClient("token").locations.listLocations());

    expect(isHetznerApiError(error)).toBe(true);
    expect(isHetznerApiError(error, "resource_unavailable")).toBe(true);
    expect(isHetznerApiError(error, "no_space_left_in_location", "resource_unavailable")).toBe(true);
    expect(isHetznerApiError(error, "not_found")).toBe(false);
    expect(isHetznerApiError(new Error("Hetzner API Error [resource_unavailable]: no"))).toBe(false);
    expect(isHetznerApiError("resource_unavailable")).toBe(false);
  });

  test("a non-JSON error body becomes unknown_error instead of a SyntaxError", async () => {
    const mock = installFetchMock(() => textResponse("<html>502 Bad Gateway</html>", 502, "text/html"));
    restoreFetch = mock.restore;

    const error = await rejection(createHetznerClient("token").locations.listLocations());

    expect(error).toBeInstanceOf(HetznerApiError);
    const apiError = error as HetznerApiError;
    expect(apiError.code).toBe(UNKNOWN_ERROR_CODE);
    expect(apiError.status).toBe(502);
    expect(apiError.message).toBe("Hetzner API Error [unknown_error]: <html>502 Bad Gateway</html>");
  });

  test("an empty error body falls back to the status text", async () => {
    const mock = installFetchMock(() => new Response(null, { status: 503, statusText: "Service Unavailable" }));
    restoreFetch = mock.restore;

    const error = (await rejection(createHetznerClient("token").locations.listLocations())) as HetznerApiError;

    expect(error.code).toBe(UNKNOWN_ERROR_CODE);
    expect(error.status).toBe(503);
    expect(error.apiMessage).toBe("Service Unavailable");
  });

  test("DNS zone export failures are typed", async () => {
    const mock = installFetchMock(() => jsonResponse({ error: { code: "not_found", message: "zone not found" } }, 404));
    restoreFetch = mock.restore;

    const error = await rejection(createHetznerClient("token").dns.exportZoneFile("example.com"));

    expect(isHetznerApiError(error, "not_found")).toBe(true);
    expect((error as HetznerApiError).status).toBe(404);
  });

  test("DNS zone import failures are typed", async () => {
    const mock = installFetchMock(() =>
      jsonResponse({ error: { code: "invalid_input", message: "invalid zone file" } }, 422),
    );
    restoreFetch = mock.restore;

    const error = await rejection(createHetznerClient("token").dns.importZoneFile(1, "garbage"));

    expect(isHetznerApiError(error, "invalid_input")).toBe(true);
  });

  test("Storage API errors use the same class across the root and storage-boxes entries", async () => {
    const mock = installFetchMock(() => jsonResponse({ error: { code: "forbidden", message: "No access" } }, 403));
    restoreFetch = mock.restore;

    const error = await rejection(new StorageBoxesClient("token").getStorageBox(1));

    expect(StorageHetznerApiError).toBe(HetznerApiError);
    expect(isHetznerApiError(error, "forbidden")).toBe(true);
    expect((error as HetznerApiError).message).toBe("Hetzner Storage API Error [forbidden]: No access");
  });
});

describe("server type availability", () => {
  test("listServerTypes exposes per-location available and recommended", async () => {
    const mock = installFetchMock(() =>
      jsonResponse({
        server_types: [
          {
            id: 1,
            name: "cx33",
            description: "CX33",
            cores: 4,
            memory: 8,
            disk: 80,
            deprecation: null,
            prices: [],
            storage_type: "local",
            cpu_type: "shared",
            category: "cost_optimized",
            architecture: "x86",
            included_traffic: 21990232555520,
            locations: [
              { id: 1, name: "fsn1", deprecation: null, available: false, recommended: false },
              { id: 2, name: "nbg1", deprecation: null, available: true, recommended: true },
            ],
          },
        ],
        meta: {
          pagination: { page: 1, per_page: 50, previous_page: null, next_page: null, last_page: 1, total_entries: 1 },
        },
      }),
    );
    restoreFetch = mock.restore;

    const { server_types } = await createHetznerClient("token").locations.listServerTypes({ per_page: 50 });
    const locations = server_types[0]?.locations ?? [];

    expect(locations.map(({ name, available, recommended }) => ({ name, available, recommended }))).toEqual([
      { name: "fsn1", available: false, recommended: false },
      { name: "nbg1", available: true, recommended: true },
    ]);
    expect(server_types[0]?.deprecated).toBeUndefined();
  });

  test("the removed datacenters endpoints are no longer on the client", () => {
    const locations = createHetznerClient("token").locations as unknown as Record<string, unknown>;
    expect(locations.listDatacenters).toBeUndefined();
    expect(locations.getDatacenter).toBeUndefined();
  });
});
