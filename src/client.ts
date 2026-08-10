import { DnsClient } from "./dns";
import { LocationsClient } from "./locations";
import { ServersClient } from "./servers";
import { StorageBoxesClient } from "./storageBoxes";
import { VolumesClient } from "./volumes";

class HetznerCloudClient {
  readonly dns: DnsClient;
  readonly locations: LocationsClient;
  readonly servers: ServersClient;
  readonly storageBoxes: StorageBoxesClient;
  readonly volumes: VolumesClient;

  constructor(apiToken: string) {
    this.dns = new DnsClient(apiToken);
    this.locations = new LocationsClient(apiToken);
    this.servers = new ServersClient(apiToken);
    this.storageBoxes = new StorageBoxesClient(apiToken);
    this.volumes = new VolumesClient(apiToken);
  }
}

/**
 * Creates a Hetzner Cloud API client.
 *
 * @example
 * ```ts
 * import { createHetznerClient } from "@repo/hetzner/api";
 *
 * const hetzner = createHetznerClient("your-api-token");
 *
 * // Create a server
 * const { server, root_password } = await hetzner.servers.createServer({
 *   name: "my-server",
 *   server_type: "cx22",
 *   image: "ubuntu-24.04",
 *   location: "fsn1",
 * });
 *
 * // Get CPU metrics for the last hour
 * const metrics = await hetzner.servers.getServerMetrics({
 *   server_id: server.id,
 *   type: "cpu",
 *   start: new Date(Date.now() - 3600000).toISOString(),
 *   end: new Date().toISOString(),
 * });
 * ```
 */
export function createHetznerClient(apiToken: string): HetznerCloudClient {
  return new HetznerCloudClient(apiToken);
}

export type { HetznerCloudClient };
