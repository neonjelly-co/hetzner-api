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

export interface ServerTypeLocation {
  id: number;
  name: string;
  deprecation: ServerTypeDeprecation | null;
}

export interface ServerType {
  id: number;
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  deprecated: boolean;
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

export interface DatacenterServerTypes {
  available: number[];
  available_for_migration: number[];
  supported: number[];
}

export interface Datacenter {
  id: number;
  name: string;
  description: string;
  location: Location;
  server_types: DatacenterServerTypes;
}

export interface ListDatacentersRequest {
  name?: string;
  page?: number;
  per_page?: number;
  sort?: "id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc";
}

export interface ListDatacentersResponse {
  datacenters: Datacenter[];
  recommendation: number;
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

    /**
     * Lists all available data centers.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/data-centers/list_datacenters
     */
    async listDatacenters(request?: ListDatacentersRequest): Promise<ListDatacentersResponse> {
      const params: Record<string, string> = {};

      if (request?.name) params.name = request.name;
      if (request?.page !== undefined) params.page = request.page.toString();
      if (request?.per_page !== undefined) params.per_page = request.per_page.toString();
      if (request?.sort) params.sort = request.sort;

      return this.request<ListDatacentersResponse>(
        "GET",
        "/datacenters",
        undefined,
        Object.keys(params).length > 0 ? params : undefined,
      );
    }

    /**
     * Gets a specific data center by ID.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/data-centers/get_datacenter
     */
    async getDatacenter(id: number): Promise<{ datacenter: Datacenter }> {
      return this.request<{ datacenter: Datacenter }>("GET", `/datacenters/${id}`);
    }
}
