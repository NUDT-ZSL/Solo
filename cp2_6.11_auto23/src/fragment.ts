export interface PixelData {
  id: string;
  year: number;
  type: 'music' | 'movie' | 'game' | 'book' | 'tech';
  icon: number[][];
  color: string;
  complementaryColor: string;
  title: string;
  description: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface FloatingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  ownerId: string;
}

export interface CollectedCard {
  fragment: PixelData;
  x: number;
  y: number;
  scale: number;
  targetScale: number;
  hover: boolean;
}

const FRAGMENT_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8C42', '#A78BFA', '#F472B6', '#34D399', '#FB923C'];

const PIXEL_ICONS: Record<string, number[][]> = {
  music: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ],
  movie: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
    [0,1,0,1,1,0,0,0,0,0,0,1,1,0,1,0],
    [0,1,0,1,1,0,0,0,0,0,0,1,1,0,1,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
    [0,1,0,0,0,0,1,1,0,0,0,0,0,0,1,0],
    [0,1,0,0,0,1,1,1,1,0,0,0,0,0,1,0],
    [0,1,0,0,0,0,1,1,0,0,0,0,0,0,1,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
    [0,1,0,1,0,0,0,0,0,0,0,1,0,0,1,0],
    [0,1,0,1,1,0,0,0,0,0,1,1,0,0,1,0],
    [0,1,0,0,1,1,1,1,1,1,1,0,0,0,1,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ],
  game: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0],
    [0,1,0,0,1,1,0,0,0,1,1,0,0,1,0,0],
    [0,1,0,1,1,1,1,0,1,1,1,1,0,1,0,0],
    [0,1,0,0,1,1,0,0,0,1,1,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,1,1,1,1,0,0,0,0,1,0,0],
    [0,1,0,0,0,1,0,0,1,0,0,0,0,1,0,0],
    [0,0,1,1,0,1,1,1,1,0,1,1,1,0,0,0],
    [0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ],
  book: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
    [0,1,0,1,1,1,1,1,1,1,1,1,0,0,1,0],
    [0,1,0,1,0,0,0,0,0,0,0,1,0,0,1,0],
    [0,1,0,1,0,1,1,1,1,1,0,1,0,0,1,0],
    [0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0],
    [0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0],
    [0,1,0,1,0,1,1,1,1,1,0,1,0,0,1,0],
    [0,1,0,1,0,0,0,0,0,0,0,1,0,0,1,0],
    [0,1,0,1,1,1,1,1,1,1,1,1,0,0,1,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ],
  tech: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,1,1,0,0,1,0,0,1,0,0,1,1,0,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    [0,1,0,0,1,1,1,1,1,1,0,0,1,0,0,0],
    [0,1,0,0,1,0,0,0,0,1,0,0,1,0,0,0],
    [0,1,0,0,1,0,0,0,0,1,0,0,1,0,0,0],
    [0,1,0,0,1,1,1,1,1,1,0,0,1,0,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    [0,1,1,0,0,1,0,0,1,0,0,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  ]
};

const DESCRIPTIONS: Record<string, string[]> = {
  music: ['一张改变乐坛的专辑', '一首传唱至今的经典', '地下乐队的首张专辑', '风靡全球的流行金曲', '摇滚史上的里程碑', '电子音乐的破晓之作'],
  movie: ['定义了一个时代的电影', '票房神话的诞生', ' cult 经典之作', '奥斯卡获奖影片', '改变电影语言的杰作', '影响深远的科幻巨制'],
  game: ['重新定义类型的游戏', '一代玩家的集体回忆', '开放世界的开拓者', '独立游戏奇迹', '电子竞技的起点', '游戏艺术的巅峰'],
  book: ['畅销千万的文学作品', '改变思潮的思想巨著', '青春回忆的漫画经典', '重新定义类型的小说', '文化现象级出版物', '影响深远的学术著作'],
  tech: ['改变世界的科技产品', '行业标准的奠基者', '下一代技术的突破', '消费电子的革命', '开源社区的里程碑', '互联网时代的标志']
};

export function generateComplementaryColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
}

export function generateFragment(year: number, typeIndex?: number): PixelData {
  const types: Array<'music' | 'movie' | 'game' | 'book' | 'tech'> = ['music', 'movie', 'game', 'book', 'tech'];
  const type = types[typeIndex ?? Math.floor(Math.random() * types.length)];
  const color = FRAGMENT_COLORS[Math.floor(Math.random() * FRAGMENT_COLORS.length)];
  const descriptions = DESCRIPTIONS[type];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  const typeNames: Record<string, string> = {
    music: '音乐',
    movie: '电影',
    game: '游戏',
    book: '书籍',
    tech: '科技'
  };

  return {
    id: `${year}-${type}-${Math.random().toString(36).substr(2, 9)}`,
    year,
    type,
    icon: PIXEL_ICONS[type],
    color,
    complementaryColor: generateComplementaryColor(color),
    title: `${year} ${typeNames[type]}碎片`,
    description
  };
}

export function generateFragmentsForYear(year: number, count: number = 5): PixelData[] {
  const fragments: PixelData[] = [];
  for (let i = 0; i < count; i++) {
    fragments.push(generateFragment(year, i % 5));
  }
  return fragments;
}

export function createFloatingParticles(fragmentId: string, centerX: number, centerY: number, color: string): FloatingParticle[] {
  const particles: FloatingParticle[] = [];
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: centerX + (Math.random() - 0.5) * 40,
      y: centerY + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: 2 + Math.random() * 2,
      color,
      angle: Math.random() * Math.PI * 2,
      ownerId: fragmentId
    });
  }
  return particles;
}

export function createExplosionParticles(x: number, y: number, colors: string[]): Particle[] {
  const particles: Particle[] = [];
  const count = 30 + Math.floor(Math.random() * 20);
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 2 * (i / count);
    const speed = 2 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: 48
    });
  }
  return particles;
}

export function drawPixelIcon(
  ctx: CanvasRenderingContext2D, icon: number[][], x: number, y: number, pixelSize: number, color: string): void {
  for (let py = 0; py < icon.length; py++) {
    for (let px = 0; px < icon[py].length; px++) {
      if (icon[py][px]) {
        ctx.fillStyle = color;
        ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
      }
    }
  }
}
