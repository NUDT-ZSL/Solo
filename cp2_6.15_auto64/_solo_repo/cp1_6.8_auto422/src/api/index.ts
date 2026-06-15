import type {
  PlantState,
  ActionResponse,
  DecayResponse,
  GrowthAction,
} from "@/types";

const API_BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "请求失败");
  }
  return res.json();
}

export async function fetchPlants(): Promise<PlantState[]> {
  return request<PlantState[]>("/plants");
}

export async function createPlant(name: string): Promise<PlantState> {
  return request<PlantState>("/plants", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function performAction(
  plantId: string,
  action: GrowthAction
): Promise<ActionResponse> {
  return request<ActionResponse>(`/plants/${plantId}/action`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function decayPlant(
  plantId: string
): Promise<DecayResponse> {
  return request<DecayResponse>(`/plants/${plantId}/decay`, {
    method: "POST",
  });
}

export async function deletePlant(
  plantId: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/plants/${plantId}`, {
    method: "DELETE",
  });
}

export async function recoverEnergy(
  plantId: string
): Promise<PlantState> {
  return request<PlantState>(`/plants/${plantId}/energy`, {
    method: "POST",
  });
}
