export const HETZNER_API_BASE = "https://api.hetzner.cloud/v1";

export interface HetznerError {
  error: {
    code: string;
    message: string;
  };
}

export interface ServerAction {
  id: number;
  command: string;
  status: "running" | "success" | "error";
  progress: number;
  started: string;
  finished: string | null;
  resources: Array<{ id: number; type: string }>;
  error: { code: string; message: string } | null;
}

export interface Location {
  id: number;
  name: string;
  description: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  network_zone: string;
}

export interface ListLocationsResponse {
  locations: Location[];
}
