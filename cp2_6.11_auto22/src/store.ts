import { create } from "zustand"

interface Voiceprint {
  id: string
  userId: string
  filename: string
  createdAt: string
  spectrum: { high: number; mid: number; low: number; mfcc: number[] }
  story: string
  tags: string[]
  favorited: boolean
}

interface AppState {
  user: { id: string; email: string } | null
  token: string | null
  voiceprints: Voiceprint[]
  loading: boolean
  uploading: boolean
  searchQuery: string
  activeTag: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchVoiceprints: () => Promise<void>
  uploadAudio: (file: File) => Promise<void>
  deleteVoiceprint: (id: string) => Promise<void>
  updateVoiceprint: (id: string, data: Partial<Voiceprint>) => Promise<void>
  setSearchQuery: (query: string) => void
  setActiveTag: (tag: string | null) => void
  getFilteredVoiceprints: () => Voiceprint[]
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = (localStorage.getItem("token") || "").replace(/^"|"$/g, "")
  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (!(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "请求失败" }))
    throw new Error(err.error || "请求失败")
  }
  return res.json()
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  token: localStorage.getItem("token")?.replace(/^"|"$/g, "") || null,
  voiceprints: [],
  loading: false,
  uploading: false,
  searchQuery: "",
  activeTag: null,

  login: async (email, password) => {
    const data = await apiFetch<{ token: string; user: { id: string; email: string } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem("token", data.token)
    set({ token: data.token, user: data.user })
  },

  register: async (email, password) => {
    const data = await apiFetch<{ token: string; user: { id: string; email: string } }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem("token", data.token)
    set({ token: data.token, user: data.user })
  },

  logout: () => {
    localStorage.removeItem("token")
    set({ token: null, user: null, voiceprints: [] })
  },

  fetchVoiceprints: async () => {
    set({ loading: true })
    try {
      const { searchQuery, activeTag } = get()
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      if (activeTag) params.set("tag", activeTag)
      const qs = params.toString()
      const data = await apiFetch<{ voiceprints: Voiceprint[] }>(`/api/voiceprints${qs ? `?${qs}` : ""}`)
      set({ voiceprints: data.voiceprints })
    } finally {
      set({ loading: false })
    }
  },

  uploadAudio: async (file) => {
    set({ uploading: true })
    try {
      const formData = new FormData()
      formData.append("audio", file)
      const data = await apiFetch<{ voiceprint: Voiceprint }>("/api/voiceprints", {
        method: "POST",
        body: formData,
      })
      set((s) => ({ voiceprints: [data.voiceprint, ...s.voiceprints] }))
    } finally {
      set({ uploading: false })
    }
  },

  deleteVoiceprint: async (id) => {
    await apiFetch(`/api/voiceprints/${id}`, { method: "DELETE" })
    set((s) => ({ voiceprints: s.voiceprints.filter((v) => v.id !== id) }))
  },

  updateVoiceprint: async (id, data) => {
    const res = await apiFetch<{ voiceprint: Voiceprint }>(`/api/voiceprints/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
    set((s) => ({
      voiceprints: s.voiceprints.map((v) => (v.id === id ? res.voiceprint : v)),
    }))
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTag: (tag) => set({ activeTag: tag }),

  getFilteredVoiceprints: () => {
    const { voiceprints, searchQuery, activeTag } = get()
    let filtered = voiceprints
    if (activeTag) {
      filtered = filtered.filter((v) => v.tags.includes(activeTag!))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.story.toLowerCase().includes(q) ||
          v.tags.some((t) => t.toLowerCase().includes(q)) ||
          v.filename.toLowerCase().includes(q)
      )
    }
    return filtered
  },
}))
