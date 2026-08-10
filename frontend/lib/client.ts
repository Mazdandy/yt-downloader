import { API_BASE } from "./api";
import { JobStatusResponse, ParseResponse } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function parseUrl(url: string): Promise<ParseResponse> {
  return request<ParseResponse>("/api/v1/parse", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export function queueDownload(input: {
  url: string;
  platform: string;
  formatId: string;
  title: string;
}): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>("/api/v1/download", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getStatus(id: string): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/api/v1/status/${id}`);
}

export function cancelDownload(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/v1/cancel/${id}`, { method: "DELETE" });
}

export function downloadUrl(id: string): string {
  return `${API_BASE}/api/v1/file/${id}`;
}
