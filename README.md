# @neonjelly/hetzner

Unofficial TypeScript client for the Hetzner Cloud, DNS, and Storage Box APIs.

This package is **not** affiliated with, endorsed by, or supported by Hetzner Online GmbH.

Official API documentation: [Hetzner Cloud API docs](https://docs.hetzner.cloud/)

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

Failed API responses throw `Error` instances with messages shaped like:

```text
Hetzner API Error [<code>]: <message>
```

Storage Box failures use:

```text
Hetzner Storage API Error [<code>]: <message>
```

DNS zone import/export use the same Cloud error shape when the HTTP status is not OK.

## Implemented coverage

| Area | Highlights |
| --- | --- |
| Locations | locations, datacenters, server types |
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
