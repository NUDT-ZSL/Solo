import type { Band, MusicGenre, StageName } from '../types';
import { bands as allBands } from '../data/bands';

let favoriteIds: string[] = [];

export function getAllBands(): Band[] {
  return [...allBands];
}

export function getBandsByStage(stage: StageName): Band[] {
  return allBands.filter((band) => band.stage === stage);
}

export function getBandsByGenre(genres: MusicGenre[]): Band[] {
  return allBands.filter((band) => genres.includes(band.genre));
}

export function searchBands(keyword: string): Band[] {
  const lowerKeyword = keyword.toLowerCase().trim();
  if (!lowerKeyword) return [...allBands];
  return allBands.filter((band) =>
    band.name.toLowerCase().includes(lowerKeyword)
  );
}

export function filterBands(
  stage?: StageName,
  genres?: MusicGenre[],
  keyword?: string
): Band[] {
  let result = [...allBands];

  if (stage) {
    result = result.filter((band) => band.stage === stage);
  }

  if (genres && genres.length > 0) {
    result = result.filter((band) => genres.includes(band.genre));
  }

  if (keyword && keyword.trim()) {
    const lowerKeyword = keyword.toLowerCase().trim();
    result = result.filter((band) =>
      band.name.toLowerCase().includes(lowerKeyword)
    );
  }

  return result;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function hasTimeConflict(band1: Band, band2: Band): boolean {
  if (band1.id === band2.id) return false;
  const start1 = timeToMinutes(band1.startTime);
  const end1 = timeToMinutes(band1.endTime);
  const start2 = timeToMinutes(band2.startTime);
  const end2 = timeToMinutes(band2.endTime);
  return start1 < end2 && start2 < end1;
}

export function getConflictsForBand(
  band: Band,
  bandsToCheck: Band[]
): Band[] {
  return bandsToCheck.filter((b) => hasTimeConflict(band, b));
}

export function hasAnyConflict(bandsList: Band[]): boolean {
  for (let i = 0; i < bandsList.length; i++) {
    for (let j = i + 1; j < bandsList.length; j++) {
      if (hasTimeConflict(bandsList[i], bandsList[j])) {
        return true;
      }
    }
  }
  return false;
}

export function getFavoriteIds(): string[] {
  return [...favoriteIds];
}

export function getFavoriteBands(): Band[] {
  return allBands.filter((band) => favoriteIds.includes(band.id));
}

export function isFavorite(bandId: string): boolean {
  return favoriteIds.includes(bandId);
}

export function toggleFavorite(bandId: string): boolean {
  const index = favoriteIds.indexOf(bandId);
  if (index === -1) {
    favoriteIds.push(bandId);
    return true;
  } else {
    favoriteIds.splice(index, 1);
    return false;
  }
}

export function addFavorite(bandId: string): void {
  if (!favoriteIds.includes(bandId)) {
    favoriteIds.push(bandId);
  }
}

export function removeFavorite(bandId: string): void {
  const index = favoriteIds.indexOf(bandId);
  if (index !== -1) {
    favoriteIds.splice(index, 1);
  }
}

export function clearFavorites(): void {
  favoriteIds = [];
}

export function getBandById(bandId: string): Band | undefined {
  return allBands.find((band) => band.id === bandId);
}

export function sortBandsByTime(bandsList: Band[]): Band[] {
  return [...bandsList].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
}
