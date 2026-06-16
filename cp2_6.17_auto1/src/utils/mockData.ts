import type { Photo, ImageFeatures } from '@/types';
import { generateTags } from '@/modules/TagManager';

function generateId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateRandomFeatures(): ImageFeatures {
  const featureTypes = [
    { r: 255, g: 150, b: 50, complexity: 65 },
    { r: 100, g: 150, b: 220, complexity: 15 },
    { r: 200, g: 100, b: 80, complexity: 55 },
    { r: 135, g: 206, b: 235, complexity: 35 },
    { r: 255, g: 200, b: 100, complexity: 45 },
    { r: 70, g: 130, b: 180, complexity: 10 },
    { r: 255, g: 120, b: 80, complexity: 70 },
    { r: 180, g: 180, b: 200, complexity: 25 },
    { r: 255, g: 180, b: 100, complexity: 60 },
    { r: 150, g: 200, b: 255, complexity: 20 },
  ];

  const randomType = featureTypes[Math.floor(Math.random() * featureTypes.length)];
  const r = Math.min(255, Math.max(0, randomType.r + Math.floor(Math.random() * 30 - 15)));
  const g = Math.min(255, Math.max(0, randomType.g + Math.floor(Math.random() * 30 - 15)));
  const b = Math.min(255, Math.max(0, randomType.b + Math.floor(Math.random() * 30 - 15)));
  const textureComplexity = Math.max(5, Math.min(90, randomType.complexity + Math.random() * 15 - 7.5));

  let colorTemperature: 'warm' | 'cool' | 'neutral';
  if (r > 200 && g < 180) {
    colorTemperature = 'warm';
  } else if (b > 150 && b > r) {
    colorTemperature = 'cool';
  } else {
    colorTemperature = 'neutral';
  }

  let textureType: 'clear' | 'medium' | 'cloudy';
  if (textureComplexity > 50) {
    textureType = 'cloudy';
  } else if (textureComplexity >= 20) {
    textureType = 'medium';
  } else {
    textureType = 'clear';
  }

  return {
    dominantColor: { r, g, b },
    textureComplexity,
    colorTemperature,
    textureType,
  };
}

function generateGradientDataUrl(features: ImageFeatures, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const { r, g, b } = features.dominantColor;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`);
  gradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
  gradient.addColorStop(1, `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (features.textureComplexity > 40) {
    for (let i = 0; i < 8; i++) {
      const cloudY = Math.random() * height * 0.7;
      const cloudWidth = 80 + Math.random() * 120;
      const cloudHeight = 20 + Math.random() * 40;

      ctx.beginPath();
      ctx.ellipse(width * 0.3 + Math.random() * width * 0.4, cloudY, cloudWidth / 2, cloudHeight / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`;
      ctx.fill();
    }
  } else if (features.textureComplexity > 20) {
    for (let i = 0; i < 4; i++) {
      const cloudY = Math.random() * height * 0.6;
      const cloudWidth = 60 + Math.random() * 80;
      const cloudHeight = 15 + Math.random() * 25;

      ctx.beginPath();
      ctx.ellipse(width * 0.25 + Math.random() * width * 0.5, cloudY, cloudWidth / 2, cloudHeight / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.3})`;
      ctx.fill();
    }
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

const sampleFileNames = [
  'sunrise_mountain.jpg',
  'clear_blue_sky.png',
  'storm_clouds.jpg',
  'golden_hour.jpg',
  'misty_morning.png',
  'sunset_ocean.jpg',
  'cloudy_day.png',
  'rainbow_sky.jpg',
  'night_sky.png',
  'dramatic_clouds.jpg',
  'pastel_sky.png',
  'fiery_sunset.jpg',
  'overcast_day.png',
  'summer_sky.jpg',
  'winter_sky.png',
];

export function generateMockPhoto(index: number): Photo {
  const features = generateRandomFeatures();
  const tags = generateTags(features);
  const id = generateId();

  return {
    id,
    dataUrl: generateGradientDataUrl(features, 480, 360),
    fileName: sampleFileNames[index % sampleFileNames.length],
    fileSize: Math.floor(Math.random() * 8 * 1024 * 1024) + 500 * 1024,
    uploadTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    tags,
    features,
  };
}

export function generateMockPhotos(count: number): Photo[] {
  const photos: Photo[] = [];
  for (let i = 0; i < count; i++) {
    photos.push(generateMockPhoto(i));
  }
  return photos;
}
