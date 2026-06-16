import { Album, ListenRecord, RecommendTrack } from '@/types';

const API_BASE = 'http://localhost:3001';

export function usePlayHistory() {
  const fetchListens = async (): Promise<ListenRecord[]> => {
    const response = await fetch(`${API_BASE}/api/listens`);
    if (!response.ok) {
      throw new Error('Failed to fetch listens');
    }
    return response.json();
  };

  const recordListen = async (
    albumId: string,
    trackTitle: string,
    duration: number
  ): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/listen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ albumId, trackTitle, duration }),
    });
    if (!response.ok) {
      throw new Error('Failed to record listen');
    }
  };

  const getRecommendations = (
    albums: Album[],
    listens: ListenRecord[]
  ): RecommendTrack[] => {
    const listenedKeySet = new Set(
      listens.map((l) => `${l.albumId}-${l.trackTitle}`)
    );

    const albumListenCount = new Map<string, number>();
    listens.forEach((listen) => {
      albumListenCount.set(
        listen.albumId,
        (albumListenCount.get(listen.albumId) || 0) + 1
      );
    });

    const sortedAlbumIds = Array.from(albumListenCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([albumId]) => albumId);

    const recommendations: RecommendTrack[] = [];

    for (const albumId of sortedAlbumIds) {
      const album = albums.find((a) => a.id === albumId);
      if (!album) continue;

      for (const trackTitle of album.trackList) {
        const key = `${albumId}-${trackTitle}`;
        if (!listenedKeySet.has(key)) {
          recommendations.push({
            id: `${albumId}-${trackTitle}`,
            albumId: album.id,
            albumTitle: album.title,
            trackTitle,
            coverColor: album.coverColor,
          });
          if (recommendations.length >= 3) {
            return recommendations;
          }
        }
      }
    }

    return recommendations;
  };

  return {
    fetchListens,
    recordListen,
    getRecommendations,
  };
}
