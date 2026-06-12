import type { Artwork, TrendDataPoint } from '@/types'

export const mockArtworks: Artwork[] = [
  {
    id: '1',
    title: '春日漫步',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
    createdAt: '2023-03-15',
    year: 2023,
    tools: ['watercolor', 'pencil'],
    size: '30×40cm',
    description: '这幅作品描绘了春天午后的公园小径，阳光透过树叶洒下斑驳的光影。使用水彩晕染出柔和的色调，铅笔勾勒细节。创作过程中尝试了湿画法与干画法的结合，表现出春天特有的朦胧美感。',
    colorPalette: [
      { hex: '#7CB342', percentage: 18 },
      { hex: '#AED581', percentage: 15 },
      { hex: '#FFD54F', percentage: 12 },
      { hex: '#8D6E63', percentage: 10 },
      { hex: '#B39DDB', percentage: 8 },
      { hex: '#F48FB1', percentage: 7 },
      { hex: '#90CAF9', percentage: 6 },
      { hex: '#FFAB91', percentage: 5 }
    ],
    styleMetrics: {
      warmRatio: 62,
      coolRatio: 38,
      saturation: 55,
      brightness: 72,
      contrast: 45
    }
  },
  {
    id: '2',
    title: '城市夜景',
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400',
    createdAt: '2023-07-22',
    year: 2023,
    tools: ['digital'],
    size: '1920×1080px',
    description: '数字绘画作品，展现都市夜晚的霓虹灯火。运用高对比度的色彩和强烈的明暗对比，营造出赛博朋克风格的未来感。使用Procreate和Photoshop结合创作。',
    colorPalette: [
      { hex: '#1A237E', percentage: 25 },
      { hex: '#E040FB', percentage: 18 },
      { hex: '#00BCD4', percentage: 15 },
      { hex: '#FF1744', percentage: 12 },
      { hex: '#7C4DFF', percentage: 10 },
      { hex: '#00E5FF', percentage: 8 },
      { hex: '#FF6F00', percentage: 6 }
    ],
    styleMetrics: {
      warmRatio: 42,
      coolRatio: 58,
      saturation: 78,
      brightness: 35,
      contrast: 85
    }
  },
  {
    id: '3',
    title: '山间晨雾',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    createdAt: '2022-11-08',
    year: 2022,
    tools: ['watercolor'],
    size: '50×70cm',
    description: '清晨山间的雾气缭绕，使用大量的留白和淡蓝色调表现出空灵的意境。水彩的透明感在这里得到了充分的发挥，层层叠叠的山峦在雾中若隐若现。',
    colorPalette: [
      { hex: '#ECEFF1', percentage: 30 },
      { hex: '#B0BEC5', percentage: 22 },
      { hex: '#78909C', percentage: 15 },
      { hex: '#546E7A', percentage: 10 },
      { hex: '#90A4AE', percentage: 8 },
      { hex: '#CFD8DC', percentage: 7 },
      { hex: '#607D8B', percentage: 5 }
    ],
    styleMetrics: {
      warmRatio: 15,
      coolRatio: 85,
      saturation: 25,
      brightness: 68,
      contrast: 30
    }
  },
  {
    id: '4',
    title: '人物速写',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    createdAt: '2022-05-14',
    year: 2022,
    tools: ['pencil'],
    size: '21×29.7cm',
    description: '一幅铅笔人物速写，专注于人物的神态和线条的表现力。使用不同硬度的铅笔（2H到6B）来表现丰富的灰度层次，注重光影的微妙变化。',
    colorPalette: [
      { hex: '#424242', percentage: 28 },
      { hex: '#757575', percentage: 25 },
      { hex: '#9E9E9E', percentage: 20 },
      { hex: '#BDBDBD', percentage: 15 },
      { hex: '#E0E0E0', percentage: 8 },
      { hex: '#616161', percentage: 4 }
    ],
    styleMetrics: {
      warmRatio: 45,
      coolRatio: 55,
      saturation: 5,
      brightness: 55,
      contrast: 70
    }
  },
  {
    id: '5',
    title: '夏日海边',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    createdAt: '2023-08-30',
    year: 2023,
    tools: ['digital', 'watercolor'],
    size: '800×600px',
    description: '夏日海边的风景，结合了数字绘画的精确与水彩的柔和。海浪的泡沫使用特殊笔刷绘制，天空的渐变色彩经过精心调配。',
    colorPalette: [
      { hex: '#0288D1', percentage: 22 },
      { hex: '#4FC3F7', percentage: 18 },
      { hex: '#FFEB3B', percentage: 15 },
      { hex: '#FFA726', percentage: 12 },
      { hex: '#E1F5FE', percentage: 10 },
      { hex: '#009688', percentage: 8 },
      { hex: '#FFCCBC', percentage: 7 },
      { hex: '#B3E5FC', percentage: 5 }
    ],
    styleMetrics: {
      warmRatio: 48,
      coolRatio: 52,
      saturation: 70,
      brightness: 82,
      contrast: 55
    }
  },
  {
    id: '6',
    title: '森林秘境',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400',
    createdAt: '2024-01-20',
    year: 2024,
    tools: ['digital'],
    size: '1200×900px',
    description: '神秘的森林深处，光线从树冠间洒落。使用数字绘画的图层功能，构建出丰富的空间层次感。植物细节经过精心刻画，营造出沉浸式的视觉体验。',
    colorPalette: [
      { hex: '#1B5E20', percentage: 20 },
      { hex: '#388E3C', percentage: 18 },
      { hex: '#66BB6A', percentage: 15 },
      { hex: '#8BC34A', percentage: 12 },
      { hex: '#CDDC39', percentage: 10 },
      { hex: '#FFEB3B', percentage: 8 },
      { hex: '#795548', percentage: 7 },
      { hex: '#A5D6A7', percentage: 5 }
    ],
    styleMetrics: {
      warmRatio: 35,
      coolRatio: 65,
      saturation: 60,
      brightness: 50,
      contrast: 65
    }
  },
  {
    id: '7',
    title: '秋日私语',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    createdAt: '2024-10-15',
    year: 2024,
    tools: ['watercolor', 'pencil'],
    size: '40×50cm',
    description: '秋天的树林，金黄的落叶铺满小径。暖色调为主，表现出秋日特有的温馨与浪漫。水彩的晕染效果让落叶显得柔和而富有诗意。',
    colorPalette: [
      { hex: '#FF8F00', percentage: 20 },
      { hex: '#FFB300', percentage: 18 },
      { hex: '#FFD54F', percentage: 15 },
      { hex: '#E65100', percentage: 12 },
      { hex: '#BF360C', percentage: 10 },
      { hex: '#FFCC80', percentage: 8 },
      { hex: '#8D6E63', percentage: 7 },
      { hex: '#6D4C41', percentage: 5 }
    ],
    styleMetrics: {
      warmRatio: 85,
      coolRatio: 15,
      saturation: 65,
      brightness: 60,
      contrast: 50
    }
  },
  {
    id: '8',
    title: '星辰大海',
    imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400',
    createdAt: '2024-06-05',
    year: 2024,
    tools: ['digital'],
    size: '1920×1200px',
    description: '夜空下的海面，繁星点点倒映在水中。深蓝色调营造出宁静而深邃的氛围。使用数字绘画的星空笔刷和光晕效果，打造梦幻般的视觉体验。',
    colorPalette: [
      { hex: '#0D47A1', percentage: 25 },
      { hex: '#1565C0', percentage: 20 },
      { hex: '#1976D2', percentage: 15 },
      { hex: '#42A5F5', percentage: 12 },
      { hex: '#00B8D4', percentage: 10 },
      { hex: '#00E5FF', percentage: 8 },
      { hex: '#3949AB', percentage: 6 },
      { hex: '#E3F2FD', percentage: 4 }
    ],
    styleMetrics: {
      warmRatio: 12,
      coolRatio: 88,
      saturation: 55,
      brightness: 30,
      contrast: 75
    }
  },
  {
    id: '9',
    title: '静物花卉',
    imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400',
    createdAt: '2022-03-28',
    year: 2022,
    tools: ['watercolor'],
    size: '30×40cm',
    description: '经典的静物花卉主题，花瓶中的玫瑰和郁金香。注重光影的变化和花瓣的透明质感。水彩多层叠色，展现丰富的色彩层次。',
    colorPalette: [
      { hex: '#E91E63', percentage: 18 },
      { hex: '#F48FB1', percentage: 15 },
      { hex: '#FCE4EC', percentage: 12 },
      { hex: '#4CAF50', percentage: 12 },
      { hex: '#81C784', percentage: 10 },
      { hex: '#795548', percentage: 10 },
      { hex: '#FFC107', percentage: 8 },
      { hex: '#9C27B0', percentage: 6 }
    ],
    styleMetrics: {
      warmRatio: 58,
      coolRatio: 42,
      saturation: 62,
      brightness: 75,
      contrast: 40
    }
  }
]

export const generateTrendData = (): TrendDataPoint[] => {
  return [
    { label: '2022', value: 45, date: '2022年' },
    { label: '2023', value: 52, date: '2023年' },
    { label: '2024', value: 65, date: '2024年' }
  ]
}
