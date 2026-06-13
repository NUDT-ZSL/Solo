import axios from 'axios';
import { BandEvent, Song, MemberName } from '../types';

const api = {
  fetchEvents: () => axios.get<BandEvent[]>('/api/events').then(r => r.data),
  createEvent: (data: Partial<BandEvent>) => axios.post<BandEvent>('/api/events', data).then(r => r.data),
  updateEvent: (id: string, data: Partial<BandEvent>) => axios.put<BandEvent>(`/api/events/${id}`, data).then(r => r.data),
  deleteEvent: (id: string) => axios.delete(`/api/events/${id}`).then(r => r.data),
  fetchSongs: () => axios.get<Song[]>('/api/songs').then(r => r.data),
  updateSongs: (data: Partial<Song>[]) => axios.put<Song[]>('/api/songs', data).then(r => r.data),
  updateSong: (id: string, data: Partial<Song>) => axios.put<Song>(`/api/songs/${id}`, data).then(r => r.data),
};

export default api;
