import { v4 as uuidv4 } from 'uuid';
import { Exhibition, Wall, Exhibit } from '@/types';

const sampleExhibitImages = [
  'https://images.unsplash.com/photo-1584811644165-33078f50eb15?w=200&h=300&fit=crop',
  'https://images.unsplash.com/photo-1580130379624-3a069adbffc5?w=200&h=300&fit=crop',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop',
  'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=200&h=300&fit=crop',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=300&fit=crop',
  'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=200&h=300&fit=crop',
];

const exhibitNames = [
  '青铜方鼎',
  '青花瓷瓶',
  '玉如意',
  '金缕玉衣',
  '兵马俑',
  '唐三彩',
];

export function createInitialWalls(): Wall[] {
  return [
    {
      id: uuidv4(),
      shape: 'rectangle',
      x: 200,
      y: 100,
      width: 20,
      height: 200,
      rotation: 0,
    },
    {
      id: uuidv4(),
      shape: 'rectangle',
      x: 500,
      y: 100,
      width: 20,
      height: 200,
      rotation: 0,
    },
    {
      id: uuidv4(),
      shape: 'L-shape',
      x: 200,
      y: 400,
      width: 150,
      height: 20,
      rotation: 0,
      lShapeSecondWidth: 20,
      lShapeSecondHeight: 100,
    },
    {
      id: uuidv4(),
      shape: 'arc',
      x: 600,
      y: 350,
      width: 20,
      height: 20,
      rotation: 0,
      arcRadius: 100,
      arcStartAngle: Math.PI,
      arcEndAngle: 2 * Math.PI,
    },
  ];
}

export function createInitialExhibits(walls: Wall[]): Exhibit[] {
  return walls.slice(0, 4).map((wall, index) => ({
    id: uuidv4(),
    wallId: wall.id,
    x: wall.x + 30,
    y: wall.y + 40 + index * 30,
    width: 60,
    height: 80,
    rotation: 0,
    imageUrl: sampleExhibitImages[index % sampleExhibitImages.length],
    name: exhibitNames[index % exhibitNames.length],
    description: `珍贵的${exhibitNames[index % exhibitNames.length]}展品，具有重要的历史和艺术价值。`,
  }));
}

export function createInitialExhibition(): Exhibition {
  const walls = createInitialWalls();
  const exhibits = createInitialExhibits(walls);

  return {
    id: uuidv4(),
    name: '默认展览方案',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    walls,
    exhibits,
    entrance: { x: 60, y: 300 },
    exit: { x: 880, y: 300 },
  };
}

export function createSampleExhibitions(): Exhibition[] {
  const exhibition1 = createInitialExhibition();
  exhibition1.name = '古代文明展';

  const exhibition2: Exhibition = JSON.parse(JSON.stringify(exhibition1));
  exhibition2.id = uuidv4();
  exhibition2.name = '现代艺术展';
  exhibition2.createdAt = Date.now() - 86400000;
  exhibition2.updatedAt = Date.now() - 3600000;

  const exhibition3: Exhibition = JSON.parse(JSON.stringify(exhibition1));
  exhibition3.id = uuidv4();
  exhibition3.name = '自然历史展';
  exhibition3.createdAt = Date.now() - 172800000;
  exhibition3.updatedAt = Date.now() - 7200000;

  return [exhibition1, exhibition2, exhibition3];
}

export const STORAGE_KEY = 'exhibition_schemes';
