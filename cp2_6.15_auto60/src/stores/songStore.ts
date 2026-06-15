import { create } from 'zustand';

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  coverUrl: string | null;
}

export interface SongWithMatch extends Song {
  matchScore: number;
}

interface WorkerResult {
  type: 'BPM_MATCH_RESULT';
  results: { id: string; bpm: number; matchScore: number }[];
  targetBpm: number;
}

interface SongState {
  songs: Song[];
  sortedSongs: SongWithMatch[];
  currentSong: SongWithMatch | null;
  isDetailOpen: boolean;
  targetBpm: number;
  worker: Worker | null;
  fetchSongs: () => Promise<void>;
  updateSortByBPM: (heartRate: number, cadence: number) => void;
  openDetail: (song: SongWithMatch) => void;
  closeDetail: () => void;
  initWorker: () => void;
  terminateWorker: () => void;
}

const FALLBACK_SONGS: Song[] = [
  { id: '1', title: 'Electric Dreams', artist: 'Pulse Runner', bpm: 85, duration: 210, coverUrl: null },
  { id: '2', title: 'Midnight Jog', artist: 'Night Stride', bpm: 95, duration: 195, coverUrl: null },
  { id: '3', title: 'Sunrise Pace', artist: 'Morning Beat', bpm: 100, duration: 220, coverUrl: null },
  { id: '4', title: 'Urban Rhythm', artist: 'City Walker', bpm: 105, duration: 205, coverUrl: null },
  { id: '5', title: 'Neon Step', artist: 'Flash Mob', bpm: 110, duration: 230, coverUrl: null },
  { id: '6', title: 'Speed Walker', artist: 'Quick Tempo', bpm: 115, duration: 215, coverUrl: null },
  { id: '7', title: "Runner's High", artist: 'Endorphin', bpm: 120, duration: 240, coverUrl: null },
  { id: '8', title: 'Cardio Blast', artist: 'Heart Pump', bpm: 125, duration: 225, coverUrl: null },
  { id: '9', title: 'Sprint Beat', artist: 'Dash Music', bpm: 130, duration: 200, coverUrl: null },
  { id: '10', title: 'Velocity', artist: 'Fast Forward', bpm: 135, duration: 235, coverUrl: null },
  { id: '11', title: 'Momentum', artist: 'Kinetic', bpm: 140, duration: 218, coverUrl: null },
  { id: '12', title: 'Thunder Run', artist: 'Storm Chaser', bpm: 145, duration: 245, coverUrl: null },
  { id: '13', title: 'Adrenaline', artist: 'Rush Hour', bpm: 150, duration: 228, coverUrl: null },
  { id: '14', title: 'Power Surge', artist: 'Energy Spike', bpm: 155, duration: 212, coverUrl: null },
  { id: '15', title: 'Turbo Charge', artist: 'Nitro Beat', bpm: 160, duration: 250, coverUrl: null },
  { id: '16', title: 'Speed Demon', artist: 'Velocity X', bpm: 165, duration: 232, coverUrl: null },
  { id: '17', title: 'Maximum Velocity', artist: 'Peak Performance', bpm: 170, duration: 242, coverUrl: null },
  { id: '18', title: 'Sprint Finale', artist: 'Finish Line', bpm: 175, duration: 215, coverUrl: null },
  { id: '19', title: 'Ultra Pace', artist: 'Hyper Drive', bpm: 158, duration: 222, coverUrl: null },
  { id: '20', title: 'Recovery Walk', artist: 'Cool Down', bpm: 75, duration: 260, coverUrl: null }
];

function computeLocalBPMTarget(heartRate: number, cadence: number): number {
  const hrWeight = 0.6;
  const cadenceWeight = 0.4;
  const hrTarget = heartRate * 0.95;
  const cadenceTarget = cadence * 1.0;
  return hrTarget * hrWeight + cadenceTarget * cadenceWeight;
}

function computeMatchScore(songBpm: number, targetBpm: number): number {
  const diff = Math.abs(songBpm - targetBpm);
  return Math.max(0, 1 - diff / 50);
}

export const useSongStore = create<SongState>((set, get) => ({
  songs: [],
  sortedSongs: [],
  currentSong: null,
  isDetailOpen: false,
  targetBpm: 0,
  worker: null,

  fetchSongs: async () => {
    try {
      const res = await fetch('/api/songs');
      const data = await res.json();
      if (data.songs && data.songs.length > 0) {
        const mapped: Song[] = data.songs.map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          bpm: s.bpm,
          duration: s.duration,
          coverUrl: s.cover_url
        }));
        set({
          songs: mapped,
          sortedSongs: mapped.map((s) => ({ ...s, matchScore: 0 }))
        });
        return;
      }
    } catch {
      // API unavailable, use fallback
    }
    set({
      songs: FALLBACK_SONGS,
      sortedSongs: FALLBACK_SONGS.map((s) => ({ ...s, matchScore: 0 }))
    });
  },

  updateSortByBPM: (heartRate: number, cadence: number) => {
    const { worker, songs } = get();

    if (worker && songs.length > 0) {
      worker.postMessage({
        type: 'BPM_MATCH',
        songs: songs.map((s) => ({ id: s.id, bpm: s.bpm })),
        heartRate,
        cadence
      });
      return;
    }

    const targetBpm = computeLocalBPMTarget(heartRate, cadence);
    const sorted = songs
      .map((s) => ({ ...s, matchScore: computeMatchScore(s.bpm, targetBpm) }))
      .sort((a, b) => b.matchScore - a.matchScore);
    set({ sortedSongs: sorted, targetBpm });
  },

  openDetail: (song: SongWithMatch) => {
    set({ currentSong: song, isDetailOpen: true });
  },

  closeDetail: () => {
    set({ isDetailOpen: false });
    setTimeout(() => set({ currentSong: null }), 400);
  },

  initWorker: () => {
    const existing = get().worker;
    if (existing) return;

    try {
      const worker = new Worker(
        new URL('../utils/bpmMatchWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent<WorkerResult>) => {
        if (e.data.type === 'BPM_MATCH_RESULT') {
          const { results, targetBpm } = e.data;
          const songs = get().songs;
          const scoreMap = new Map(results.map((r) => [r.id, r.matchScore]));
          const sorted = songs
            .map((s) => ({ ...s, matchScore: scoreMap.get(s.id) ?? 0 }))
            .sort((a, b) => b.matchScore - a.matchScore);
          set({ sortedSongs: sorted, targetBpm });
        }
      };

      worker.onerror = () => {
        set({ worker: null });
      };

      set({ worker });
    } catch {
      // Worker creation failed, fallback to local computation
    }
  },

  terminateWorker: () => {
    const worker = get().worker;
    if (worker) {
      worker.terminate();
      set({ worker: null });
    }
  }
}));
