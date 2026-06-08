export interface Card {
  id: string;
  title: string;
  description: string;
  color: string;
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  source_id: string;
  target_id: string;
  source_offset_x: number;
  source_offset_y: number;
  target_offset_x: number;
  target_offset_y: number;
}

export interface GraphData {
  cards: Record<string, Card>;
  connections: Record<string, Connection>;
}

export interface VitalityData {
  vitality: number;
  card_count: number;
  connection_count: number;
  density: number;
}

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const api = {
  getGraph: () => request<GraphData>("/graph"),

  createCard: (data: Partial<Card> & { x: number; y: number }) =>
    request<Card>("/cards", { method: "POST", body: JSON.stringify(data) }),

  updateCard: (id: string, data: Partial<Card>) =>
    request<Card>(`/cards/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteCard: (id: string) =>
    request<{ ok: boolean }>(`/cards/${id}`, { method: "DELETE" }),

  createConnection: (data: {
    source_id: string;
    target_id: string;
    source_offset_x?: number;
    source_offset_y?: number;
    target_offset_x?: number;
    target_offset_y?: number;
  }) => request<Connection>("/connections", { method: "POST", body: JSON.stringify(data) }),

  updateConnection: (id: string, data: Partial<Connection>) =>
    request<Connection>(`/connections/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteConnection: (id: string) =>
    request<{ ok: boolean }>(`/connections/${id}`, { method: "DELETE" }),

  getVitality: () => request<VitalityData>("/vitality"),
};
