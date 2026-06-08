export interface Wish {
  id: string;
  text: string;
  color: string;
  user_id: string;
  blessings: number;
  created_at: string;
}

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const ApiClient = {
  createWish(text: string, color: string, userId: string) {
    return request<Wish>("/wishes", {
      method: "POST",
      body: JSON.stringify({ text, color, user_id: userId }),
    });
  },

  getAllWishes() {
    return request<Wish[]>("/wishes");
  },

  getMyWishes(userId: string) {
    return request<Wish[]>(`/wishes?user_id=${encodeURIComponent(userId)}`);
  },

  deleteWish(wishId: string, userId: string) {
    return request<{ ok: boolean }>(
      `/wishes/${wishId}?user_id=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
  },

  blessWish(wishId: string, userId: string) {
    return request<Wish>(`/wishes/${wishId}/bless`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  },

  getLeaderboard() {
    return request<Wish[]>("/leaderboard");
  },
};
