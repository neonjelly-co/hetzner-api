# Hetzner API

Unofficial TypeScript client for the Hetzner Cloud, DNS, and Storage Box APIs.

This package is **not** affiliated with, endorsed by, or supported by Hetzner Online GmbH.

Official API documentation: [Hetzner Cloud API docs](https://docs.hetzner.cloud/)

Developed by [Neonjelly.Studio](https://neonjelly.studio)

## Requirements

- **Bun** 1.2+ for development
- **Bun** or **Node.js 22+** with standards-based `fetch` at runtime

## Install

```bash
bun add @neonjelly/hetzner-api
```

```bash
npm install @neonjelly/hetzner-api
```

## Tokens

Create API tokens in the Hetzner Cloud Console:

- **Cloud / DNS** — a Cloud API token (used for servers, volumes, locations, and DNS).
- **Storage Boxes** — a Storage Box API token (used by the Storage Box client).

Pass the appropriate token to `createHetznerClient`. Do not commit tokens or put them in the published package.

## Usage

### Root import

```ts
import { createHetznerClient } from "@neonjelly/hetzner-api";

const hetzner = createHetznerClient(process.env.HETZNER_API_TOKEN!);

const { locations } = await hetzner.locations.listLocations();
const { server, root_password } = await hetzner.servers.createServer({
  name: "my-server",
  server_type: "cx22",
  image: "ubuntu-24.04",
  location: "fsn1",
});
```

### Compatibility alias

```ts
import { createHetznerClient } from "@neonjelly/hetzner-api/api";
```

### Storage Boxes subpath

```ts
import { StorageBoxesClient } from "@neonjelly/hetzner-api/storage-boxes";

const storage = new StorageBoxesClient(process.env.HETZNER_STORAGE_TOKEN!);
const { storage_boxes } = await storage.listStorageBoxes();
```

Storage Boxes are also available on the root client as `hetzner.storageBoxes`.

## Errors

Every failed API response throws a `HetznerApiError`, exported from the root and from `/storage-boxes`:

| Property | Meaning |
| --- | --- |
| `code` | Hetzner's error code, such as `resource_unavailable` or `not_found`. `unknown_error` when the body was not a Hetzner error. |
| `status` | HTTP status of the response. |
| `apiMessage` | Hetzner's message, without the prefix. |
| `details` | Extra error data Hetzner sent, if any. |

```ts
import { createHetznerClient, isHetznerApiError } from "@neonjelly/hetzner-api";

try {
  await hetzner.servers.createServer({ name: "web", server_type: "cx33", image: "ubuntu-24.04", location: "fsn1" });
} catch (error) {
  if (isHetznerApiError(error, "resource_unavailable")) {
    // Hetzner has no capacity for this server type in this location right now.
  }
  throw error;
}
```

`message` keeps the shape earlier versions threw, so code that matched on it keeps working:

```text
Hetzner API Error [<code>]: <message>
Hetzner Storage API Error [<code>]: <message>
```

## Server type availability

`listServerTypes` returns, for every location that supports a server type, whether Hetzner currently has capacity
(`available`) and whether it recommends that location (`recommended`). Hetzner calls `available` an indicator, not a
guarantee: a `createServer` call can still fail with `resource_unavailable`.

```ts
const { server_types } = await hetzner.locations.listServerTypes({ name: "cx33" });
const inStock = server_types[0]?.locations.filter((location) => location.available).map((location) => location.name);
```

## Implemented coverage

| Area | Highlights |
| --- | --- |
| Locations | locations, server types with per-location availability |
| Servers | create, delete, reboot, actions, metrics |
| Volumes | CRUD, attach/detach, resize, protection, actions |
| DNS | zones, RRSets, import/export zone files, zone/RRSet actions |
| Storage Boxes | types, boxes, access settings, password reset, folders, subaccounts |

## Development

This repository is Bun-managed.

```bash
bun install
bun run check
```

`check` runs typecheck, tests, build, and a packed-package smoke validation.

## License

MIT
