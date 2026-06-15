export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function jaccardSimilarity(set1: string[], set2: string[]): number {
  if (set1.length === 0 && set2.length === 0) return 0;
  const intersection = set1.filter(tag => set2.includes(tag));
  const union = [...new Set([...set1, ...set2])];
  return intersection.length / union.length;
}

export function calculateMatchPercentage(
  userTags: string[],
  bookTags: string[],
  userLat: number,
  userLon: number,
  ownerLat: number,
  ownerLon: number
): number {
  const tagSimilarity = jaccardSimilarity(userTags, bookTags);
  const distance = haversineDistance(userLat, userLon, ownerLat, ownerLon);
  const distanceWeight = distance <= 5 ? Math.max(0, 1 - distance / 5) : 0;
  const matchScore = tagSimilarity * 0.7 + distanceWeight * 0.3;
  return Math.round(matchScore * 100);
}
