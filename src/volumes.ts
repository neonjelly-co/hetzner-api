import { HetznerCloudBase } from "./base";
import type { Location, ServerAction } from "./common";

export interface Volume {
  id: number;
  name: string;
  status: "creating" | "available";
  server: number | null;
  location: Location;
  size: number;
  linux_device: string;
  protection: { delete: boolean };
  labels: Record<string, string>;
  created: string;
  format: string | null;
}

export interface CreateVolumeRequest {
  name: string;
  size: number;
  server?: number;
  location?: string;
  automount?: boolean;
  format?: string;
  labels?: Record<string, string>;
}

export interface CreateVolumeResponse {
  volume: Volume;
  action: ServerAction;
  next_actions: ServerAction[];
}

export interface UpdateVolumeRequest {
  name?: string;
  labels?: Record<string, string>;
}

export interface ListVolumesRequest {
  sort?: "id" | "id:asc" | "id:desc" | "name" | "name:asc" | "name:desc" | "created" | "created:asc" | "created:desc";
  name?: string;
  label_selector?: string;
  status?: "available" | "creating";
  page?: number;
  per_page?: number;
}

export interface ListVolumesResponse {
  volumes: Volume[];
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

export interface AttachVolumeRequest {
  server: number;
  automount?: boolean;
}

export interface ResizeVolumeRequest {
  size: number;
}

export interface ChangeVolumeProtectionRequest {
  delete?: boolean;
}

export interface ListVolumeActionsRequest {
  sort?: string;
  status?: "running" | "success" | "error";
  page?: number;
  per_page?: number;
}

export interface ListVolumeActionsResponse {
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

export class VolumesClient extends HetznerCloudBase {
    /**
     * Lists all Volumes.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/GET/volumes
     */
    async listVolumes(request?: ListVolumesRequest): Promise<ListVolumesResponse> {
      const params: Record<string, string> = {};

      if (request?.sort) params.sort = request.sort;
      if (request?.name) params.name = request.name;
      if (request?.label_selector) params.label_selector = request.label_selector;
      if (request?.status) params.status = request.status;
      if (request?.page !== undefined) params.page = request.page.toString();
      if (request?.per_page !== undefined) params.per_page = request.per_page.toString();

      return this.request<ListVolumesResponse>(
        "GET",
        "/volumes",
        undefined,
        Object.keys(params).length > 0 ? params : undefined,
      );
    }

    /**
     * Creates a new Volume attached to a Server or at a Location.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/POST/volumes
     */
    async createVolume(request: CreateVolumeRequest): Promise<CreateVolumeResponse> {
      return this.request<CreateVolumeResponse>("POST", "/volumes", request);
    }

    /**
     * Gets a specific Volume by ID.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/GET/volumes/{id}
     */
    async getVolume(id: number): Promise<{ volume: Volume }> {
      return this.request<{ volume: Volume }>("GET", `/volumes/${id}`);
    }

    /**
     * Updates a Volume's properties.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/PUT/volumes/{id}
     */
    async updateVolume(id: number, request: UpdateVolumeRequest): Promise<{ volume: Volume }> {
      return this.request<{ volume: Volume }>("PUT", `/volumes/${id}`, request);
    }

    /**
     * Deletes a Volume. The Volume must not be attached to a Server and must not have delete protection enabled.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/DELETE/volumes/{id}
     */
    async deleteVolume(id: number): Promise<void> {
      return this.request<void>("DELETE", `/volumes/${id}`);
    }

    /**
     * Lists all Actions for a Volume.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/GET/volumes/{id}/actions
     */
    async listVolumeActions(id: number, request?: ListVolumeActionsRequest): Promise<ListVolumeActionsResponse> {
      const params: Record<string, string> = {};

      if (request?.sort) params.sort = request.sort;
      if (request?.status) params.status = request.status;
      if (request?.page !== undefined) params.page = request.page.toString();
      if (request?.per_page !== undefined) params.per_page = request.per_page.toString();

      return this.request<ListVolumeActionsResponse>(
        "GET",
        `/volumes/${id}/actions`,
        undefined,
        Object.keys(params).length > 0 ? params : undefined,
      );
    }

    /**
     * Gets a specific Action for a Volume.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/GET/volumes/{id}/actions/{action_id}
     */
    async getVolumeAction(id: number, actionId: number): Promise<{ action: ServerAction }> {
      return this.request<{ action: ServerAction }>("GET", `/volumes/${id}/actions/${actionId}`);
    }

    /**
     * Attaches a Volume to a Server. Works only if the Server is in the same Location as the Volume.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/POST/volumes/{id}/actions/attach
     */
    async attachVolume(id: number, request: AttachVolumeRequest): Promise<{ action: ServerAction }> {
      return this.request<{ action: ServerAction }>("POST", `/volumes/${id}/actions/attach`, request);
    }

    /**
     * Detaches a Volume from the Server it's attached to.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/POST/volumes/{id}/actions/detach
     */
    async detachVolume(id: number): Promise<{ action: ServerAction }> {
      return this.request<{ action: ServerAction }>("POST", `/volumes/${id}/actions/detach`);
    }

    /**
     * Changes the size of a Volume. Note that downsizing a Volume is not possible.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/POST/volumes/{id}/actions/resize
     */
    async resizeVolume(id: number, request: ResizeVolumeRequest): Promise<{ action: ServerAction }> {
      return this.request<{ action: ServerAction }>("POST", `/volumes/${id}/actions/resize`, request);
    }

    /**
     * Changes the protection configuration of a Volume.
     * @see https://docs.hetzner.cloud/reference/cloud#tag/volumes/POST/volumes/{id}/actions/change_protection
     */
    async changeVolumeProtection(
      id: number,
      request: ChangeVolumeProtectionRequest,
    ): Promise<{ action: ServerAction }> {
      return this.request<{ action: ServerAction }>("POST", `/volumes/${id}/actions/change_protection`, request);
    }
}
