import axios from 'axios';

export interface Song {
  id: string;
  name: string;
  bpm: number;
  duration: number;
  style: string;
  color: string;
  beats?: number[];
  audioUrl?: string;
}

export interface ScoreEntry {
  id: string;
  playerName: string;
  score: number;
  songId: string;
  createdAt: string;
}

class NetworkManager {
  async fetchSongs(): Promise<Song[]> {
    const response = await axios.get('/api/songs');
    return response.data;
  }

  async fetchSongDetail(id: string): Promise<Song> {
    const response = await axios.get(`/api/songs/${id}`);
    return response.data;
  }

  async submitScore(playerName: string, score: number, songId: string): Promise<{ success: boolean; entry: ScoreEntry }> {
    const response = await axios.post('/api/score', { playerName, score, songId });
    return response.data;
  }

  async fetchLeaderboard(songId: string): Promise<ScoreEntry[]> {
    const response = await axios.get(`/api/leaderboard/${songId}`);
    return response.data;
  }
}

export const networkManager = new NetworkManager();
