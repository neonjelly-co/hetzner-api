import { HetznerCloudBase } from "./base";
import type { ListLocationsResponse, Location } from "./common";

export interface ServerTypePrice {
  location: string;
  price_hourly: { net: string; gross: string };
  price_monthly: { net: string; gross: string };
  included_traffic: number;
  price_per_tb_traffic: { net: string; gross: string };
}

export interface ServerTypeDeprecation {
  announced: string; // ISO 8601 timestamp
  unavailable_after: string; // ISO 8601 timestamp
}

/** A location that supports the server type. A location missing from `locations` does not support it. */
export interface ServerTypeLocation {
  id: number;
  name: string;
  /** Deprecation of the server type in this location. Replaces the top-level `ServerType.deprecated` flag. */
  deprecation: ServerTypeDeprecation | null;
  /**
   * Whether Hetzner currently has capacity for this server type in this location. Hetzner documents it as
   * "only an indicator whether resources are currently available and is no guarantee": a create call can still
   * fail with `resource_unavailable`. Replaces the removed `datacenter.server_types.available` lists.
   */
  available: boolean;
  /** Whether Hetzner recommends this location for this server type. Several locations can be recommended. */
  recommended: boolean;
}

export interface ServerType {
  id: number;
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  /**
   * @deprecated Hetzner removes this field on 2 November 2026. Read `deprecation` on the matching entry of
   * `locations` instead.
   */
  deprecated?: boolean;
  deprecation: ServerTypeDeprecation | null;
  prices: ServerTypePrice[];
  storage_type: "local" | "network";
  cpu_type: "shared" | "dedicated";
  category: string;
  architecture: "x86" | "arm";
  included_traffic: number;
  locations: ServerTypeLocation[];
}

export interface ListServerTypesRequest {
  name?: string;
  page?: number;
  per_page?: number;
}

export interface ListServerTypesResponse {
  server_types: ServerType[];
  meta?: {
    pagination: {
      page: number;
      per_page: number;
      previous_page: number | null;
      next_page: number | null;
      last_page: number;
      total_entries: number;
    };
  };
}

export class LocationsClient extends HetznerCloudBase {
    /**
     * Lists all available server types.
     * @see https://docs.hetzner.cloud/reference/cloud#server-types-list-server-types
     */
    async listServerTypes(request?: ListServerTypesRequest): Promise<ListServerTypesResponse> {
      const params: Record<string, string> = {};

      if (request?.name) {
        params.name = request.name;
      }
      if (request?.page !== undefined) {
        params.page = request.page.toString();
      }
      if (request?.per_page !== undefined) {
        params.per_page = request.per_page.toString();
      }

      return this.request<ListServerTypesResponse>(
        "GET",
        "/server_types",
        undefined,
        Object.keys(params).length > 0 ? params : undefined,
      );
    }

    /**
     * Gets a specific server type by ID.
     * @see https://docs.hetzner.cloud/reference/cloud#server-types-get-a-server-type
     */
    async getServerType(id: number): Promise<{ server_type: ServerType }> {
      return this.request<{ server_type: ServerType }>("GET", `/server_types/${id}`);
    }

    /**
     * Lists all available locations.
     * @see https://docs.hetzner.cloud/reference/cloud#locations-list-locations
     */
    async listLocations(): Promise<ListLocationsResponse> {
      return this.request<ListLocationsResponse>("GET", "/locations");
    }

    /**
     * Gets a specific location by ID or name.
     * @see https://docs.hetzner.cloud/reference/cloud#locations-get-a-location
     */
    async getLocation(idOrName: number | string): Promise<{ location: Location }> {
      return this.request<{ location: Location }>("GET", `/locations/${idOrName}`);
    }
}
