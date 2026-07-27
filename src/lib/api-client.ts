import { API_KEY_HEADERS, type ApiKeyName } from "@/lib/api-keys";
import { useSettingsStore } from "@/lib/store/settings-store";

export interface ServiceResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  requiresApiKey?: boolean;
  service?: string;
}

export class RequiresApiKeyError extends Error {
  service: string;
  constructor(service: string) {
    super(`${service} API key required`);
    this.service = service;
  }
}

function buildKeyHeaders(): Record<string, string> {
  const apiKeys = useSettingsStore.getState().apiKeys;
  const headers: Record<string, string> = {};
  (Object.keys(API_KEY_HEADERS) as ApiKeyName[]).forEach((name) => {
    const value = apiKeys[name];
    if (value) headers[API_KEY_HEADERS[name]] = value;
  });
  return headers;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...buildKeyHeaders() },
    body: JSON.stringify(body),
  });
  const json: ServiceResponse<T> = await res.json();
  if (json.requiresApiKey) throw new RequiresApiKeyError(json.service ?? "This integration");
  if (!json.ok) throw new Error(json.error ?? "Request failed");
  return json.data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: buildKeyHeaders() });
  const json: ServiceResponse<T> = await res.json();
  if (json.requiresApiKey) throw new RequiresApiKeyError(json.service ?? "This integration");
  if (!json.ok) throw new Error(json.error ?? "Request failed");
  return json.data as T;
}

export function getKeyHeaders() {
  return buildKeyHeaders();
}
