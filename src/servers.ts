import { HetznerCloudBase } from "./base";
import type { Location, ServerAction } from "./common";

export interface CreateServerRequest {
  name: string;
  server_type: string;
  image: string;
  location?: string;
  start_after_create?: boolean;
  labels?: Record<string, string>;
  automount?: boolean;
  volumes?: number[];
  networks?: number[];
  firewalls?: Array<{ firewall: number }>;
  placement_group?: number;
  ssh_keys?: Array<string | number>;
  user_data?: string;
  public_net?: {
    enable_ipv4?: boolean;
    enable_ipv6?: boolean;
    ipv4?: number;
    ipv6?: number;
  };
}

export interface Server {
  id: number;
  name: string;
  status:
    | "running"
    | "initializing"
    | "starting"
    | "stopping"
    | "off"
    | "deleting"
    | "rebuilding"
    | "migrating"
    | "unknown";
  public_net: {
    ipv4: { ip: string; blocked: boolean; dns_ptr: string } | null;
    ipv6: {
      ip: string;
      blocked: boolean;
      dns_ptr: Array<{ ip: string; dns_ptr: string }>;
    } | null;
    floating_ips: number[];
    firewalls: Array<{ id: number; status: string }>;
  };
  private_net: Array<{
    network: number;
    ip: string;
    alias_ips: string[];
    mac_address: string;
  }>;
  server_type: {
    id: number;
    name: string;
    description: string;
    cores: number;
    memory: number;
    disk: number;
  };
  /** Where the server runs. Replaces the `datacenter` property Hetzner removed on 1 July 2026. */
  location: Location;
  image: {
    id: number;
    name: string;
    description: string;
    type: string;
    os_flavor: string;
    os_version: string;
  } | null;
  iso: { id: number; name: string; description: string } | null;
  rescue_enabled: boolean;
  locked: boolean;
  backup_window: string | null;
  outgoing_traffic: number | null;
  ingoing_traffic: number | null;
  included_traffic: number;
  protection: { delete: boolean; rebuild: boolean };
  labels: Record<string, string>;
  volumes: number[];
  load_balancers: number[];
  primary_disk_size: number;
  created: string;
}

export interface CreateServerResponse {
  server: Server;
  action: ServerAction;
  root_password: string | null;
  next_actions: ServerAction[];
}

export interface GetMetricsRequest {
  server_id: number;
  type: "cpu" | "disk" | "network";
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
  step?: number; // Resolution in seconds
}

export interface MetricsTimeSeries {
  values: Array<[number, string]>; // [timestamp, value]
}

export interface MetricsResponse {
  metrics: {
    start: string;
    end: string;
    step: number;
    timeseries: Record<string, MetricsTimeSeries>;
  };
}

export interface ListServerActionsRequest {
  sort?: string;
  status?: "running" | "success" | "error";
  page?: number;
  per_page?: number;
}

export interface ListServerActionsResponse {
  actions: ServerAction[];
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

export class ServersClient extends HetznerCloudBase {
    /**
     * Creates a new server.
     * @see https://docs.hetzner.cloud/reference/cloud#servers-create-a-server
     */
    async createServer(request: CreateServerRequest): Promise<CreateServerResponse> {
      return this.request<CreateServerResponse>("POST", "/servers", request);
    }

    /**
     * Deletes a server. This immediately removes the server and all associated resources.
     * @see https://docs.hetzner.cloud/reference/cloud#servers-delete-a-server
     */
    async deleteServer(id: number): Promise<{ action: ServerAction }> {
      return this.request<{ action: ServerAction }>("DELETE", `/servers/${id}`);
    }

    /**
     * Reboots a server.
     * @see https://docs.hetzner.cloud/reference/cloud#server-actions-reboot-a-server
     */
    async rebootServer(id: number): Promise<{ action: ServerAction }> {
      return this.request<{ action: ServerAction }>("POST", `/servers/${id}/actions/reboot`);
    }

    /**
     * Gets a specific Action for a Server.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/server-actions/GET/servers/{id}/actions/{action_id}
     */
    async getServerAction(id: number, actionId: number): Promise<{ action: ServerAction }> {
      return this.request<{ action: ServerAction }>("GET", `/servers/${id}/actions/${actionId}`);
    }

    /**
     * Lists Actions for a Server.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/server-actions/GET/servers/{id}/actions
     */
    async listServerActions(id: number, request?: ListServerActionsRequest): Promise<ListServerActionsResponse> {
      const params: Record<string, string> = {};

      if (request?.sort) {
        params.sort = request.sort;
      }
      if (request?.status) {
        params.status = request.status;
      }
      if (request?.page !== undefined) {
        params.page = request.page.toString();
      }
      if (request?.per_page !== undefined) {
        params.per_page = request.per_page.toString();
      }

      return this.request<ListServerActionsResponse>(
        "GET",
        `/servers/${id}/actions`,
        undefined,
        Object.keys(params).length > 0 ? params : undefined,
      );
    }

    /**
     * Gets metrics for a server.
     * @see https://docs.hetzner.cloud/reference/cloud#servers-get-metrics-for-a-server
     */
    async getServerMetrics(request: GetMetricsRequest): Promise<MetricsResponse> {
      const { server_id, type, start, end, step } = request;

      const params: Record<string, string> = {
        type,
        start,
        end,
      };

      if (step !== undefined) {
        params.step = step.toString();
      }

      return this.request<MetricsResponse>("GET", `/servers/${server_id}/metrics`, undefined, params);
    }
}
