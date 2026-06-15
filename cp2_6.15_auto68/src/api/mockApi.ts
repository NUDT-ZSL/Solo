import { Snapshot } from '../store/paramStore';

const STORAGE_KEY = 'viewfinder_snapshots';

export interface SaveResponse {
  success: boolean;
  id: string;
  timestamp: number;
}

export const saveSnapshot = async (snapshot: Snapshot): Promise<SaveResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const existing = getSnapshotsFromStorage();
        const updated = [snapshot, ...existing].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        resolve({
          success: true,
          id: snapshot.id,
          timestamp: snapshot.timestamp,
        });
      } catch (error) {
        console.error('Failed to save snapshot:', error);
        resolve({
          success: false,
          id: snapshot.id,
          timestamp: snapshot.timestamp,
        });
      }
    }, 80);
  });
};

export const getSnapshots = async (): Promise<Snapshot[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getSnapshotsFromStorage());
    }, 50);
  });
};

const getSnapshotsFromStorage = (): Snapshot[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
