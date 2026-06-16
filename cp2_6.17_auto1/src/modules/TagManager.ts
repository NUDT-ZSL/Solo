import type { ImageFeatures, Photo, TagStats } from '@/types';

export function getColorTemperature(r: number, g: number, b: number): 'warm' | 'cool' | 'neutral' {
  if (r > 200 && g < 180) {
    return 'warm';
  } else if (b > 150 && b > r) {
    return 'cool';
  }
  return 'neutral';
}

export function getTextureType(complexity: number): 'clear' | 'medium' | 'cloudy' {
  if (complexity > 50) return 'cloudy';
  if (complexity >= 20) return 'medium';
  return 'clear';
}

export function generateBaseTags(features: ImageFeatures): string[] {
  const tags: string[] = [];
  const { colorTemperature, textureType } = features;

  switch (colorTemperature) {
    case 'warm':
      tags.push('暖色');
      break;
    case 'cool':
      tags.push('冷色');
      break;
    default:
      tags.push('中性色');
  }

  switch (textureType) {
    case 'cloudy':
      tags.push('多云');
      break;
    case 'medium':
      tags.push('散射云');
      break;
    default:
      tags.push('晴空');
  }

  return tags;
}

export function generateEnhancedTags(features: ImageFeatures): string[] {
  const tags: string[] = [];
  const { dominantColor, textureComplexity, colorTemperature } = features;
  const { r, g, b } = dominantColor;

  if (textureComplexity > 50 && (r > 200 || r - g > 30)) {
    tags.push('强对比');
  }

  if (textureComplexity < 20 && b > r && b > g) {
    tags.push('柔和过渡');
  }

  if (textureComplexity >= 20 && textureComplexity <= 50 && b > 150) {
    tags.push('顺光');
  }

  if (textureComplexity > 50 && r > 180 && g < 150) {
    tags.push('逆光');
  }

  const maxColor = Math.max(r, g, b);
  const minColor = Math.min(r, g, b);
  if (textureComplexity > 40 && (maxColor - minColor) > 80) {
    tags.push('层次丰富');
  }

  if (textureComplexity < 25 && colorTemperature === 'neutral') {
    tags.push('静谧');
  }

  return tags;
}

export function generateTags(features: ImageFeatures): string[] {
  const baseTags = generateBaseTags(features);
  const enhancedTags = generateEnhancedTags(features);
  return [...baseTags, ...enhancedTags];
}

export function filterPhotosByTags(photos: Photo[], selectedTags: string[]): Photo[] {
  if (selectedTags.length === 0) return photos;

  return photos.filter(photo =>
    selectedTags.every(tag => photo.tags.includes(tag))
  );
}

export function findSimilarPhotos(photos: Photo[], referencePhotoId: string): Photo[] {
  const referencePhoto = photos.find(p => p.id === referencePhotoId);
  if (!referencePhoto) return [];

  const referenceTags = new Set(referencePhoto.tags);

  const photosWithScore = photos
    .filter(p => p.id !== referencePhotoId)
    .map(photo => {
      const commonTags = photo.tags.filter(tag => referenceTags.has(tag));
      return {
        photo,
        score: commonTags.length,
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return photosWithScore.map(item => item.photo);
}

export function getAllTagStats(photos: Photo[]): TagStats[] {
  const tagCount: Record<string, number> = {};

  photos.forEach(photo => {
    photo.tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });

  return Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
