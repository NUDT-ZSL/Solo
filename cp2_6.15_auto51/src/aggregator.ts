import type { SongRecord, YearlyReport, Platform } from './types';

export async function fetchPlatformRecords(platformId: string): Promise<SongRecord[]> {
  const response = await fetch(`/api/records?platform=${platformId}`);
  if (!response.ok) throw new Error('Failed to fetch records');
  return response.json();
}

export async function fetchAllPlatforms(): Promise<Platform[]> {
  const response = await fetch('/api/platforms');
  if (!response.ok) throw new Error('Failed to fetch platforms');
  return response.json();
}

export async function savePlatformConfig(platformId: string, token: string): Promise<void> {
  await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platformId, token }),
  });
}

export function mergeAndDeduplicate(records: SongRecord[]): SongRecord[] {
  const merged = new Map<string, SongRecord & { platforms: string[] }>();

  for (const record of records) {
    const key = `${record.title.toLowerCase()}-${record.artist.toLowerCase()}`;
    if (merged.has(key)) {
      const existing = merged.get(key)!;
      existing.playCount += record.playCount;
      if (!existing.platforms.includes(record.platformId)) {
        existing.platforms.push(record.platformId);
      }
      if (record.date < existing.date) {
        existing.date = record.date;
      }
      if (!existing.genre && record.genre) {
        existing.genre = record.genre;
      }
    } else {
      merged.set(key, {
        ...record,
        id: key,
        platforms: [record.platformId],
      });
    }
  }

  return Array.from(merged.values());
}

export function generateYearlyReport(
  records: SongRecord[],
): YearlyReport {
  const merged = mergeAndDeduplicate(records);

  const totalPlays = merged.reduce((sum, r) => sum + r.playCount, 0);

  const sortedByPlays = [...merged].sort((a, b) => b.playCount - a.playCount);

  const topSongs = sortedByPlays.slice(0, 10).map((song) => {
    const platforms = (song as SongRecord & { platforms: string[] }).platforms;
    const platformDistribution: Record<string, number> = {};
    for (const p of platforms) {
      platformDistribution[p] = records
        .filter(
          (r) =>
            r.title === song.title &&
            r.artist === song.artist &&
            r.platformId === p
        )
        .reduce((s, r) => s + r.playCount, 0);
    }
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      playCount: song.playCount,
      firstPlayDate: song.date,
      platformDistribution,
      coverColor: song.coverColor || '#ccc',
    };
  });

  const artistPlays = new Map<string, { playCount: number; avatarColor: string }>();
  for (const song of merged) {
    const existing = artistPlays.get(song.artist);
    if (existing) {
      existing.playCount += song.playCount;
    } else {
      artistPlays.set(song.artist, {
        playCount: song.playCount,
        avatarColor: song.coverColor || '#ccc',
      });
    }
  }
  const topArtists = Array.from(artistPlays.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 5);

  const genrePlays = new Map<string, number>();
  for (const song of merged) {
    const genre = song.genre || '其他';
    genrePlays.set(genre, (genrePlays.get(genre) || 0) + song.playCount);
  }
  const genreColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
  const genreDistribution = Array.from(genrePlays.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count], i) => ({
      genre,
      percentage: totalPlays > 0 ? Math.round((count / totalPlays) * 100) : 0,
      color: genreColors[i % genreColors.length],
    }));

  return { totalPlays, topSongs, topArtists, genreDistribution };
}
