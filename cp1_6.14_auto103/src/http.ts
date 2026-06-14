import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Photo {
  id: string;
  url: string;
  thumbnail: string;
  name: string;
}

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  elevation?: number;
  timestamp: string;
  photos: Photo[];
  notes: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  rating: number;
  createdAt: string;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  waypoints: Waypoint[];
  isFavorite: boolean;
  reviews: Review[];
  createdAt: string;
}

export interface PlaybackData {
  waypoints: Waypoint[];
  path: [number, number][];
}

export const api = {
  getRoutes: (): Promise<Route[]> => http.get('/routes').then((res) => res.data),

  createRoute: (data: Partial<Route>): Promise<Route> =>
    http.post('/routes', data).then((res) => res.data),

  getRoute: (id: string): Promise<Route> =>
    http.get(`/routes/${id}`).then((res) => res.data),

  updateRoute: (id: string, data: Partial<Route>): Promise<Route> =>
    http.put(`/routes/${id}`, data).then((res) => res.data),

  uploadPhoto: (
    routeId: string,
    waypointId: string,
    fileBase64: string,
    name: string,
    thumbnail?: string
  ): Promise<Photo> =>
    http
      .post(`/routes/${routeId}/photos`, {
        waypointId,
        file: fileBase64,
        name,
        thumbnail,
      })
      .then((res) => res.data),

  getPlaybackData: (id: string): Promise<PlaybackData> =>
    http.get(`/routes/${id}/playback`).then((res) => res.data),

  toggleFavorite: (id: string): Promise<Route> =>
    http.post(`/routes/${id}/favorite`).then((res) => res.data),

  addReview: (
    id: string,
    data: { userName: string; content: string; rating: number; avatar?: string }
  ): Promise<Review> =>
    http.post(`/routes/${id}/reviews`, data).then((res) => res.data),
};

export default http;
