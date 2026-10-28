import { CLOUD_ERROR_PREFIX, HetznerCloudBase } from "./base";
import { HETZNER_API_BASE } from "./common";
import { parseJsonBody, toHetznerApiError } from "./errors";

export interface ZoneDeprecation {
  announced: string;
  unavailable_after: string;
}

export interface Zone {
  id: number;
  name: string;
  ttl: number;
  mode: "primary" | "secondary";
  status: "verified" | "pending" | "failed";
  protection: { delete: boolean };
  labels: Record<string, string>;
  created: string;
  modified: string;
  primary_nameservers?: string[];
  secondary_dns?: {
    primary_ip: string;
    zone_transfer_ips: string[];
  };
  deprecation: ZoneDeprecation | null;
}

export interface CreateZoneRequest {
  name: string;
  ttl?: number;
  mode?: "primary" | "secondary";
  labels?: Record<string, string>;
  primary_nameservers?: string[];
  secondary_dns?: {
    primary_ip: string;
    zone_transfer_ips?: string[];
  };
}

export interface UpdateZoneRequest {
  ttl?: number;
  labels?: Record<string, string>;
}

export interface ListZonesRequest {
  name?: string;
  page?: number;
  per_page?: number;
  label_selector?: string;
  sort?: string;
  status?: "verified" | "pending" | "failed";
}

export interface ListZonesResponse {
  zones: Zone[];
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

export interface ZoneAction {
  id: number;
  command: string;
  status: "running" | "success" | "error";
  progress: number;
  started: string;
  finished: string | null;
  resources: Array<{ id: number; type: string }>;
  error: { code: string; message: string } | null;
}

export interface ChangePrimaryNameserversRequest {
  primary_nameservers: string[];
}

export interface ChangeZoneProtectionRequest {
  delete: boolean;
}

export interface ChangeDefaultTTLRequest {
  ttl: number;
}

export type RRSetType =
  | "A"
  | "AAAA"
  | "CAA"
  | "CNAME"
  | "DS"
  | "HINFO"
  | "HTTPS"
  | "MX"
  | "NS"
  | "PTR"
  | "RP"
  | "SOA"
  | "SRV"
  | "SVCB"
  | "TLSA"
  | "TXT";

export interface RRSetRecord {
  value: string;
  comment?: string;
}

export interface RRSet {
  name: string;
  type: RRSetType;
  ttl: number | null;
  records: RRSetRecord[];
  protection: { delete: boolean };
}

export interface CreateRRSetRequest {
  name: string;
  type: RRSetType;
  ttl?: number;
  records: RRSetRecord[];
  labels?: Record<string, string>;
}

export interface UpdateRRSetRequest {
  ttl?: number;
}

export interface ListRRSetsRequest {
  type?: RRSetType;
  page?: number;
  per_page?: number;
}

export interface ListRRSetsResponse {
  rrsets: RRSet[];
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

export interface ChangeRRSetProtectionRequest {
  delete: boolean;
}

export interface ChangeRRSetTTLRequest {
  ttl: number;
}

export interface SetRecordsRequest {
  records: RRSetRecord[];
}

export interface AddRecordsRequest {
  ttl?: number;
  records: RRSetRecord[];
}

export interface RemoveRecordsRequest {
  records: RRSetRecord[];
}

export interface UpdateRecordsRequest {
  records: RRSetRecord[];
}

export class DnsClient extends HetznerCloudBase {
    /**
     * Lists all DNS zones.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async listZones(request?: ListZonesRequest): Promise<ListZonesResponse> {
      const params: Record<string, string> = {};

      if (request?.name) params.name = request.name;
      if (request?.page !== undefined) params.page = request.page.toString();
      if (request?.per_page !== undefined) params.per_page = request.per_page.toString();
      if (request?.label_selector) params.label_selector = request.label_selector;
      if (request?.sort) params.sort = request.sort;
      if (request?.status) params.status = request.status;

      return this.request<ListZonesResponse>(
        "GET",
        "/zones",
        undefined,
        Object.keys(params).length > 0 ? params : undefined,
      );
    }

    /**
     * Creates a new DNS zone.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async createZone(request: CreateZoneRequest): Promise<{ zone: Zone }> {
      return this.request<{ zone: Zone }>("POST", "/zones", request);
    }

    /**
     * Gets a specific DNS zone by ID or name.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async getZone(idOrName: number | string): Promise<{ zone: Zone }> {
      return this.request<{ zone: Zone }>("GET", `/zones/${idOrName}`);
    }

    /**
     * Updates a DNS zone.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async updateZone(idOrName: number | string, request: UpdateZoneRequest): Promise<{ zone: Zone }> {
      return this.request<{ zone: Zone }>("PUT", `/zones/${idOrName}`, request);
    }

    /**
     * Deletes a DNS zone.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async deleteZone(idOrName: number | string): Promise<void> {
      return this.request<void>("DELETE", `/zones/${idOrName}`);
    }

    /**
     * Exports a zone file.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async exportZoneFile(idOrName: number | string): Promise<string> {
      const url = new URL(`${HETZNER_API_BASE}/zones/${idOrName}/export`);
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });

      const text = await response.text();

      if (!response.ok) {
        throw toHetznerApiError(response, text, CLOUD_ERROR_PREFIX);
      }

      return text;
    }

    /**
     * Imports a zone file.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async importZoneFile(idOrName: number | string, zoneFile: string): Promise<{ action: ZoneAction }> {
      const url = new URL(`${HETZNER_API_BASE}/zones/${idOrName}/import`);
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "text/dns",
        },
        body: zoneFile,
      });

      const text = await response.text();

      if (!response.ok) {
        throw toHetznerApiError(response, text, CLOUD_ERROR_PREFIX);
      }

      return parseJsonBody(text) as { action: ZoneAction };
    }

    /**
     * Changes a zone's primary nameservers.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async changeZonePrimaryNameservers(
      idOrName: number | string,
      request: ChangePrimaryNameserversRequest,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>(
        "POST",
        `/zones/${idOrName}/actions/change_primary_nameservers`,
        request,
      );
    }

    /**
     * Changes a zone's protection.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async changeZoneProtection(
      idOrName: number | string,
      request: ChangeZoneProtectionRequest,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>("POST", `/zones/${idOrName}/actions/change_protection`, request);
    }

    /**
     * Changes a zone's default TTL.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async changeZoneDefaultTTL(
      idOrName: number | string,
      request: ChangeDefaultTTLRequest,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>("POST", `/zones/${idOrName}/actions/change_ttl`, request);
    }

    /**
     * Lists actions for a zone.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async listZoneActions(
      idOrName: number | string,
      options?: {
        page?: number;
        per_page?: number;
        sort?: string;
        status?: string;
      },
    ): Promise<{ actions: ZoneAction[] }> {
      const params: Record<string, string> = {};
      if (options?.page !== undefined) params.page = options.page.toString();
      if (options?.per_page !== undefined) params.per_page = options.per_page.toString();
      if (options?.sort) params.sort = options.sort;
      if (options?.status) params.status = options.status;

      return this.request<{ actions: ZoneAction[] }>(
        "GET",
        `/zones/${idOrName}/actions`,
        undefined,
        Object.keys(params).length > 0 ? params : undefined,
      );
    }

    /**
     * Gets an action for a zone.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async getZoneAction(idOrName: number | string, actionId: number): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>("GET", `/zones/${idOrName}/actions/${actionId}`);
    }

    /**
     * Lists all RRSets in a zone.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async listRRSets(zoneIdOrName: number | string, request?: ListRRSetsRequest): Promise<ListRRSetsResponse> {
      const params: Record<string, string> = {};

      if (request?.type) params.type = request.type;
      if (request?.page !== undefined) params.page = request.page.toString();
      if (request?.per_page !== undefined) params.per_page = request.per_page.toString();

      return this.request<ListRRSetsResponse>(
        "GET",
        `/zones/${zoneIdOrName}/rrsets`,
        undefined,
        Object.keys(params).length > 0 ? params : undefined,
      );
    }

    /**
     * Creates a new RRSet in a zone.
     * @see https://docs.hetzner.cloud/reference/cloud#zone-rrsets-create-an-rrset
     */
    async createRRSet(
      zoneIdOrName: number | string,
      request: CreateRRSetRequest,
    ): Promise<{ rrset: RRSet; action: ZoneAction }> {
      return this.request<{ rrset: RRSet; action: ZoneAction }>("POST", `/zones/${zoneIdOrName}/rrsets`, request);
    }

    /**
     * Gets a specific RRSet.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async getRRSet(zoneIdOrName: number | string, rrName: string, rrType: RRSetType): Promise<{ rrset: RRSet }> {
      return this.request<{ rrset: RRSet }>("GET", `/zones/${zoneIdOrName}/rrsets/${rrName}/${rrType}`);
    }

    /**
     * Updates an RRSet.
     * @see https://docs.hetzner.cloud/reference/cloud#zone-rrsets-update-an-rrset
     */
    async updateRRSet(
      zoneIdOrName: number | string,
      rrName: string,
      rrType: RRSetType,
      request: UpdateRRSetRequest,
    ): Promise<{ rrset: RRSet; action: ZoneAction }> {
      return this.request<{ rrset: RRSet; action: ZoneAction }>(
        "PUT",
        `/zones/${zoneIdOrName}/rrsets/${rrName}/${rrType}`,
        request,
      );
    }

    /**
     * Deletes an RRSet.
     * @see https://docs.hetzner.cloud/reference/cloud#zone-rrsets-delete-an-rrset
     */
    async deleteRRSet(
      zoneIdOrName: number | string,
      rrName: string,
      rrType: RRSetType,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>("DELETE", `/zones/${zoneIdOrName}/rrsets/${rrName}/${rrType}`);
    }

    /**
     * Changes an RRSet's protection.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async changeRRSetProtection(
      zoneIdOrName: number | string,
      rrName: string,
      rrType: RRSetType,
      request: ChangeRRSetProtectionRequest,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>(
        "POST",
        `/zones/${zoneIdOrName}/rrsets/${rrName}/${rrType}/actions/change_protection`,
        request,
      );
    }

    /**
     * Changes an RRSet's TTL.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async changeRRSetTTL(
      zoneIdOrName: number | string,
      rrName: string,
      rrType: RRSetType,
      request: ChangeRRSetTTLRequest,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>(
        "POST",
        `/zones/${zoneIdOrName}/rrsets/${rrName}/${rrType}/actions/change_ttl`,
        request,
      );
    }

    /**
     * Sets records of an RRSet (replaces all existing records).
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async setRRSetRecords(
      zoneIdOrName: number | string,
      rrName: string,
      rrType: RRSetType,
      request: SetRecordsRequest,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>(
        "POST",
        `/zones/${zoneIdOrName}/rrsets/${rrName}/${rrType}/actions/set_records`,
        request,
      );
    }

    /**
     * Adds records to an RRSet.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async addRRSetRecords(
      zoneIdOrName: number | string,
      rrName: string,
      rrType: RRSetType,
      request: AddRecordsRequest,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>(
        "POST",
        `/zones/${zoneIdOrName}/rrsets/${rrName}/${rrType}/actions/add_records`,
        request,
      );
    }

    /**
     * Removes records from an RRSet.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async removeRRSetRecords(
      zoneIdOrName: number | string,
      rrName: string,
      rrType: RRSetType,
      request: RemoveRecordsRequest,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>(
        "POST",
        `/zones/${zoneIdOrName}/rrsets/${rrName}/${rrType}/actions/remove_records`,
        request,
      );
    }

    /**
     * Updates records' comments in an RRSet.
     * @see https://docs.hetzner.cloud/reference/cloud#dns
     */
    async updateRRSetRecords(
      zoneIdOrName: number | string,
      rrName: string,
      rrType: RRSetType,
      request: UpdateRecordsRequest,
    ): Promise<{ action: ZoneAction }> {
      return this.request<{ action: ZoneAction }>(
        "POST",
        `/zones/${zoneIdOrName}/rrsets/${rrName}/${rrType}/actions/update_records`,
        request,
      );
    }
}
