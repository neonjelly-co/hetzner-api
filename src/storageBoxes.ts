const HETZNER_STORAGE_API_BASE = "https://api.hetzner.com/v1";

export interface HetznerError {
  error: {
    code: string;
    message: string;
  };
}

export interface StorageBoxAction {
  id: number;
  command: string;
  status: "running" | "success" | "error";
  progress: number;
  started: string;
  finished: string | null;
  resources: Array<{ id: number; type: string }>;
  error: { code: string; message: string } | null;
}

export interface StorageBoxLocation {
  id: number;
  name: string;
  description: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  network_zone: string;
}

export interface StorageBoxTypePrice {
  location: string;
  price_hourly: { net: string; gross: string };
  price_monthly: { net: string; gross: string };
}

export interface StorageBoxType {
  id: number;
  name: string;
  description: string;
  size: number;
  snapshot_limit: number;
  automatic_snapshot_limit: number;
  subaccounts_limit: number;
  prices: StorageBoxTypePrice[];
  deprecation: { announced: string; unavailable_after: string } | null;
}

export interface StorageBoxAccessSettings {
  reachable_externally: boolean;
  samba_enabled: boolean;
  ssh_enabled: boolean;
  webdav_enabled: boolean;
  zfs_enabled: boolean;
}

export interface StorageBoxStats {
  size: number;
  size_data: number;
  size_snapshots: number;
}

export interface StorageBox {
  id: number;
  username: string | null;
  status: "active" | "initializing" | "locked";
  name: string;
  storage_box_type: StorageBoxType;
  location: StorageBoxLocation;
  access_settings: StorageBoxAccessSettings;
  server: string | null;
  system: string | null;
  stats: StorageBoxStats;
  labels: Record<string, string>;
  protection: { delete: boolean };
  snapshot_plan: {
    max_snapshots: number;
    minute: number;
    hour: number;
    day_of_week: number | null;
    day_of_month: number | null;
  } | null;
  created: string;
}

export interface StorageBoxAccessSettingsInput {
  reachable_externally?: boolean;
  samba_enabled?: boolean;
  ssh_enabled?: boolean;
  webdav_enabled?: boolean;
  zfs_enabled?: boolean;
}

export interface CreateStorageBoxRequest {
  name: string;
  password: string;
  location: string | number;
  storage_box_type: string | number;
  labels?: Record<string, string>;
  ssh_keys?: string[];
  access_settings?: StorageBoxAccessSettingsInput;
}

export interface CreateStorageBoxResponse {
  storage_box: StorageBox;
  action: StorageBoxAction;
}

export interface ListStorageBoxTypesResponse {
  storage_box_types: StorageBoxType[];
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

export interface ListStorageBoxesResponse {
  storage_boxes: StorageBox[];
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

export interface StorageBoxSubaccountAccessSettings {
  readonly?: boolean;
  samba_enabled?: boolean;
  webdav_enabled?: boolean;
  reachable_externally?: boolean;
  ssh_enabled?: boolean;
}

export interface CreateStorageBoxSubaccountRequest {
  name?: string;
  description?: string;
  labels?: Record<string, string>;
  password: string;
  home_directory: string;
  access_settings?: StorageBoxSubaccountAccessSettings;
}

export interface StorageBoxSubaccount {
  id: number;
  name: string;
  username: string;
  server: string;
  home_directory: string;
  access_settings: {
    readonly: boolean;
    samba_enabled: boolean;
    webdav_enabled: boolean;
    reachable_externally: boolean;
    ssh_enabled: boolean;
  };
  description: string;
  labels: Record<string, string>;
  created: string;
}

export class StorageBoxesClient {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${HETZNER_STORAGE_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const error = data as HetznerError;
      throw new Error(`Hetzner Storage API Error [${error.error?.code}]: ${error.error?.message}`);
    }

    return data as T;
  }

  /**
   * Lists available Storage Box types.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-box-types
   */
  async listStorageBoxTypes(): Promise<ListStorageBoxTypesResponse> {
    return this.request<ListStorageBoxTypesResponse>("GET", "/storage_box_types");
  }

  /**
   * Gets a Storage Box type by ID or name.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-box-types
   */
  async getStorageBoxType(idOrName: number | string): Promise<{ storage_box_type: StorageBoxType }> {
    return this.request<{ storage_box_type: StorageBoxType }>("GET", `/storage_box_types/${idOrName}`);
  }

  /**
   * Lists Storage Boxes.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-boxes
   */
  async listStorageBoxes(): Promise<ListStorageBoxesResponse> {
    return this.request<ListStorageBoxesResponse>("GET", "/storage_boxes");
  }

  /**
   * Gets a Storage Box by ID.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-boxes
   */
  async getStorageBox(id: number): Promise<{ storage_box: StorageBox }> {
    return this.request<{ storage_box: StorageBox }>("GET", `/storage_boxes/${id}`);
  }

  /**
   * Creates a Storage Box.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-boxes-create-a-storage-box
   */
  async createStorageBox(request: CreateStorageBoxRequest): Promise<CreateStorageBoxResponse> {
    return this.request<CreateStorageBoxResponse>("POST", "/storage_boxes", request);
  }

  /**
   * Deletes a Storage Box.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-boxes-delete-a-storage-box
   */
  async deleteStorageBox(id: number): Promise<{ action: StorageBoxAction }> {
    return this.request<{ action: StorageBoxAction }>("DELETE", `/storage_boxes/${id}`);
  }

  /**
   * Updates access settings for a Storage Box.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-box-actions-update-access-settings
   */
  async updateAccessSettings(
    id: number,
    accessSettings: StorageBoxAccessSettingsInput,
  ): Promise<{ action: StorageBoxAction }> {
    return this.request<{ action: StorageBoxAction }>(
      "POST",
      `/storage_boxes/${id}/actions/update_access_settings`,
      accessSettings,
    );
  }

  /**
   * Resets the password of a Storage Box.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-box-actions-reset-password
   */
  async resetPassword(id: number, password: string): Promise<{ action: StorageBoxAction }> {
    return this.request<{ action: StorageBoxAction }>("POST", `/storage_boxes/${id}/actions/reset_password`, {
      password,
    });
  }

  /**
   * Gets a Storage Box action.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-box-actions
   */
  async getStorageBoxAction(id: number, actionId: number): Promise<{ action: StorageBoxAction }> {
    return this.request<{ action: StorageBoxAction }>("GET", `/storage_boxes/${id}/actions/${actionId}`);
  }

  /**
   * Lists folders in a Storage Box (folders only, not files).
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-boxes-list-folders-of-a-storage-box
   */
  async listFolders(id: number, path?: string): Promise<{ folders: string[] }> {
    const params = path ? { path } : undefined;
    return this.request<{ folders: string[] }>("GET", `/storage_boxes/${id}/folders`, undefined, params);
  }

  /**
   * Creates a Subaccount for a Storage Box.
   * @see https://docs.hetzner.cloud/reference/hetzner#storage-box-subaccounts-create-a-subaccount
   */
  async createSubaccount(
    id: number,
    request: CreateStorageBoxSubaccountRequest,
  ): Promise<{ subaccount: StorageBoxSubaccount; action: StorageBoxAction }> {
    return this.request<{ subaccount: StorageBoxSubaccount; action: StorageBoxAction }>(
      "POST",
      `/storage_boxes/${id}/subaccounts`,
      request,
    );
  }

  /**
   * Waits until a Storage Box action finishes (success or error).
   */
  async waitForAction(
    storageBoxId: number,
    actionId: number,
    options?: { timeoutMs?: number; pollIntervalMs?: number },
  ): Promise<StorageBoxAction> {
    const timeoutMs = options?.timeoutMs ?? 120_000;
    const pollIntervalMs = options?.pollIntervalMs ?? 2_000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const { action } = await this.getStorageBoxAction(storageBoxId, actionId);
      if (action.status === "success" || action.status === "error") {
        return action;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timed out waiting for Storage Box action ${actionId}`);
  }

  /**
   * Waits until a Storage Box reaches active status.
   */
  async waitUntilActive(
    storageBoxId: number,
    options?: { timeoutMs?: number; pollIntervalMs?: number },
  ): Promise<StorageBox> {
    const timeoutMs = options?.timeoutMs ?? 180_000;
    const pollIntervalMs = options?.pollIntervalMs ?? 3_000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const { storage_box } = await this.getStorageBox(storageBoxId);
      if (storage_box.status === "active") {
        return storage_box;
      }
      if (storage_box.status === "locked") {
        throw new Error(`Storage Box ${storageBoxId} is locked`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timed out waiting for Storage Box ${storageBoxId} to become active`);
  }
}
