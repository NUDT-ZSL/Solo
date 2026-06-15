import axios from "axios";
import type {
  Artwork,
  ArtworkListResponse,
  AuthResponse,
  LikeResponse,
  UploadRequest,
} from "./types";
import { useGalleryStore } from "./store";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const user = useGalleryStore.getState().user;
  if (user) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export const ArtworkService = {
  async fetchArtworks(page = 1, pageSize = 50): Promise<ArtworkListResponse> {
    const res = await api.get<ArtworkListResponse>("/artworks", {
      params: { page, page_size: pageSize },
    });
    return res.data;
  },

  async fetchArtwork(id: string): Promise<Artwork> {
    const res = await api.get<Artwork>(`/artworks/${id}`);
    return res.data;
  },

  async uploadArtwork(data: UploadRequest): Promise<{ id: string }> {
    const res = await api.post<{ id: string }>("/artworks", data);
    return res.data;
  },

  async toggleLike(artworkId: string): Promise<LikeResponse> {
    const res = await api.post<LikeResponse>(`/artworks/${artworkId}/like`);
    return res.data;
  },

  async addComment(
    artworkId: string,
    content: string
  ): Promise<{ id: string; username: string; content: string; created_at: string }> {
    const res = await api.post(`/artworks/${artworkId}/comments`, { content });
    return res.data;
  },

  async login(username: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/login", { username });
    return res.data;
  },

  async register(username: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/register", { username });
    return res.data;
  },

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};
