import { afterEach, describe, expect, test } from "bun:test";
import { createHetznerClient } from "../src/index";
import { emptyResponse, installFetchMock, jsonResponse, textResponse } from "./helpers";

let restoreFetch: (() => void) | undefined;

afterEach(() => {
  restoreFetch?.();
  restoreFetch = undefined;
});

describe("createHetznerClient", () => {
  test("sends Authorization bearer header on Cloud requests", async () => {
    const mock = installFetchMock(() => jsonResponse({ locations: [] }));
    restoreFetch = mock.restore;

    const client = createHetznerClient("cloud-token");
    await client.locations.listLocations();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]?.headers.get("Authorization")).toBe("Bearer cloud-token");
    expect(mock.calls[0]?.headers.get("Content-Type")).toBe("application/json");
    expect(mock.calls[0]?.url).toBe("https://api.hetzner.cloud/v1/locations");
  });

  test("serializes query params for list endpoints", async () => {
    const mock = installFetchMock(() => jsonResponse({ volumes: [] }));
    restoreFetch = mock.restore;

    const client = createHetznerClient("token");
    await client.volumes.listVolumes({
      name: "data",
      status: "available",
      page: 2,
      per_page: 25,
      sort: "name:asc",
      label_selector: "env=prod",
    });

    const url = new URL(mock.calls[0]!.url);
    expect(url.origin + url.pathname).toBe("https://api.hetzner.cloud/v1/volumes");
    expect(url.searchParams.get("name")).toBe("data");
    expect(url.searchParams.get("status")).toBe("available");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("per_page")).toBe("25");
    expect(url.searchParams.get("sort")).toBe("name:asc");
    expect(url.searchParams.get("label_selector")).toBe("env=prod");
  });

  test("parses JSON responses", async () => {
    const mock = installFetchMock(() =>
      jsonResponse({
        location: {
          id: 1,
          name: "fsn1",
          description: "Falkenstein",
          country: "DE",
          city: "Falkenstein",
          latitude: 50.47612,
          longitude: 12.370071,
          network_zone: "eu-central",
        },
      }),
    );
    restoreFetch = mock.restore;

    const client = createHetznerClient("token");
    const result = await client.locations.getLocation("fsn1");
    expect(result.location.name).toBe("fsn1");
  });

  test("handles 204 empty responses", async () => {
    const mock = installFetchMock(() => emptyResponse(204));
    restoreFetch = mock.restore;

    const client = createHetznerClient("token");
    await expect(client.volumes.deleteVolume(42)).resolves.toEqual(void 0);
    expect(mock.calls[0]?.method).toBe("DELETE");
    expect(mock.calls[0]?.url).toBe("https://api.hetzner.cloud/v1/volumes/42");
  });

  test("propagates Hetzner API errors", async () => {
    const mock = installFetchMock(() =>
      jsonResponse({ error: { code: "unauthorized", message: "Invalid token" } }, 401),
    );
    restoreFetch = mock.restore;

    const client = createHetznerClient("bad-token");
    await expect(client.locations.listLocations()).rejects.toThrow(
      "Hetzner API Error [unauthorized]: Invalid token",
    );
  });
});

describe("DNS import/export", () => {
  test("exportZoneFile returns plain text and omits JSON content-type", async () => {
    const zoneFile = "$ORIGIN example.com.\n";
    const mock = installFetchMock(() => textResponse(zoneFile, 200, "text/dns"));
    restoreFetch = mock.restore;

    const client = createHetznerClient("token");
    const result = await client.dns.exportZoneFile("example.com");

    expect(result).toBe(zoneFile);
    expect(mock.calls[0]?.url).toBe("https://api.hetzner.cloud/v1/zones/example.com/export");
    expect(mock.calls[0]?.headers.get("Authorization")).toBe("Bearer token");
    expect(mock.calls[0]?.headers.has("Content-Type")).toBe(false);
  });

  test("importZoneFile posts text/dns body", async () => {
    const zoneFile = "$ORIGIN example.com.\n";
    const mock = installFetchMock(() =>
      jsonResponse({
        action: {
          id: 9,
          command: "import_zone",
          status: "running",
          progress: 0,
          started: "2026-01-01T00:00:00Z",
          finished: null,
          resources: [],
          error: null,
        },
      }),
    );
    restoreFetch = mock.restore;

    const client = createHetznerClient("token");
    const result = await client.dns.importZoneFile(1, zoneFile);

    expect(result.action.id).toBe(9);
    expect(mock.calls[0]?.method).toBe("POST");
    expect(mock.calls[0]?.url).toBe("https://api.hetzner.cloud/v1/zones/1/import");
    expect(mock.calls[0]?.headers.get("Content-Type")).toBe("text/dns");
    expect(mock.calls[0]?.body).toBe(zoneFile);
  });
});

describe("servers and volumes", () => {
  test("createServer posts JSON body", async () => {
    const mock = installFetchMock(() =>
      jsonResponse({
        server: { id: 1, name: "web" },
        action: { id: 2, status: "running" },
        root_password: "secret",
        next_actions: [],
      }),
    );
    restoreFetch = mock.restore;

    const client = createHetznerClient("token");
    const result = await client.servers.createServer({
      name: "web",
      server_type: "cx22",
      image: "ubuntu-24.04",
      location: "fsn1",
    });

    expect(result.server.id).toBe(1);
    expect(mock.calls[0]?.method).toBe("POST");
    expect(mock.calls[0]?.url).toBe("https://api.hetzner.cloud/v1/servers");
    expect(JSON.parse(mock.calls[0]!.body!)).toEqual({
      name: "web",
      server_type: "cx22",
      image: "ubuntu-24.04",
      location: "fsn1",
    });
  });

  test("attachVolume posts to volume action endpoint", async () => {
    const mock = installFetchMock(() =>
      jsonResponse({
        action: {
          id: 3,
          command: "attach_volume",
          status: "running",
          progress: 0,
          started: "2026-01-01T00:00:00Z",
          finished: null,
          resources: [],
          error: null,
        },
      }),
    );
    restoreFetch = mock.restore;

    const client = createHetznerClient("token");
    await client.volumes.attachVolume(10, { server: 20, automount: true });

    expect(mock.calls[0]?.url).toBe("https://api.hetzner.cloud/v1/volumes/10/actions/attach");
    expect(JSON.parse(mock.calls[0]!.body!)).toEqual({ server: 20, automount: true });
  });
});

describe("storage boxes", () => {
  test("uses Storage API host and auth header", async () => {
    const mock = installFetchMock(() => jsonResponse({ storage_boxes: [] }));
    restoreFetch = mock.restore;

    const client = createHetznerClient("storage-token");
    await client.storageBoxes.listStorageBoxes();

    expect(mock.calls[0]?.url).toBe("https://api.hetzner.com/v1/storage_boxes");
    expect(mock.calls[0]?.headers.get("Authorization")).toBe("Bearer storage-token");
  });

  test("propagates Storage API errors", async () => {
    const mock = installFetchMock(() =>
      jsonResponse({ error: { code: "forbidden", message: "No access" } }, 403),
    );
    restoreFetch = mock.restore;

    const client = createHetznerClient("token");
    await expect(client.storageBoxes.getStorageBox(1)).rejects.toThrow(
      "Hetzner Storage API Error [forbidden]: No access",
    );
  });
});
