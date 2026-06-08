import { type ZodiacSign, type Particle, type StarPoint, ZODIAC_INFO } from './WishData';

const ZODIAC_DATES: { month: number; day: number; sign: ZodiacSign }[] = [
  { month: 1,  day: 20, sign: 'aquarius' },
  { month: 2,  day: 19, sign: 'pisces' },
  { month: 3,  day: 21, sign: 'aries' },
  { month: 4,  day: 20, sign: 'taurus' },
  { month: 5,  day: 21, sign: 'gemini' },
  { month: 6,  day: 22, sign: 'cancer' },
  { month: 7,  day: 23, sign: 'leo' },
  { month: 8,  day: 23, sign: 'virgo' },
  { month: 9,  day: 23, sign: 'libra' },
  { month: 10, day: 24, sign: 'scorpio' },
  { month: 11, day: 23, sign: 'sagittarius' },
  { month: 12, day: 22, sign: 'capricorn' },
];

export function getZodiacByDate(date: Date): ZodiacSign {
  const m = date.getMonth() + 1;
  const d = date.getDate();

  let sign: ZodiacSign = 'capricorn';
  for (const zd of ZODIAC_DATES) {
    if (m > zd.month || (m === zd.month && d >= zd.day)) {
      sign = zd.sign;
    }
  }
  return sign;
}

const HOROSCOPE_TEXTS: Record<ZodiacSign, string[]> = {
  aries: [
    '今天的你充满活力，行动力极强，适合开启新计划。',
    '火星赐予你无穷勇气，大胆追逐心中的梦想吧。',
    '冲劲十足的一天，你的热情将感染身边每一个人。',
    '火象之力正旺，把握好每一个展现自我的机会。',
  ],
  taurus: [
    '稳扎稳打的一天，脚踏实地的你将收获满满。',
    '金星守护下，财运与感情都有好消息在等待。',
    '坚持自己的节奏，不急不躁才能走得更远。',
    '今日适合犒赏自己，生活中的美好正在向你靠近。',
  ],
  gemini: [
    '思维活跃的一天，你的创意和灵感将带来惊喜。',
    '水星加持沟通运，适合表达想法和建立新联系。',
    '双重魅力全开，社交场上你是当之无愧的焦点。',
    '好奇心是你最好的向导，今天去探索未知领域吧。',
  ],
  cancer: [
    '内心温暖充盈，今天适合与亲近的人共度时光。',
    '月亮守护你的直觉，信任内心的声音会带来好运。',
    '家是你力量的源泉，今日在温馨中蓄积能量。',
    '感性的一天，用温柔的力量去化解一切困难。',
  ],
  leo: [
    '王者气场全开，你的光芒无法被忽视。',
    '太阳赐予你无限能量，舞台正等待你的精彩表演。',
    '自信是你最大的魅力，今天勇敢做自己就对了。',
    '慷慨大方的一天，你的善意将获得丰厚的回报。',
  ],
  virgo: [
    '细节决定成败，你精准的洞察力今天将大放异彩。',
    '水星助你理清思绪，一切复杂问题都能迎刃而解。',
    '完美主义是双刃剑，今天试着享受「足够好」的快乐。',
    '组织能力超群的一天，把生活整理得井井有条吧。',
  ],
  libra: [
    '和谐之美环绕着你，今天的你散发着迷人魅力。',
    '金星眷顾，人际关系中充满温暖与善意。',
    '平衡是你的天赋，今天在取舍间找到最佳答案。',
    '审美力爆棚的一天，用你的品味创造美好事物。',
  ],
  scorpio: [
    '深邃的洞察力让你看透事物的本质，信赖直觉。',
    '冥王星赋予你重生的力量，今天是蜕变的好时机。',
    '神秘的吸引力在你周围环绕，让人不自觉被吸引。',
    '强大的意志力是你最锋利的武器，没有什么能阻挡你。',
  ],
  sagittarius: [
    '冒险精神正在召唤你，勇敢踏上新的旅程吧。',
    '木星带来好运与扩张力，你的世界正变得更加广阔。',
    '乐观是最好的通行证，今天你的笑容价值连城。',
    '自由灵魂的一天，远方有你未知的精彩在等待。',
  ],
  capricorn: [
    '坚韧不拔的品质今天将带来丰厚的回报。',
    '土星教会你耐心，稳扎稳打终将登上巅峰。',
    '目标清晰的一天，你的每一步都走在正确的道路上。',
    '责任感是你最耀眼的勋章，今天你值得被看见。',
  ],
  aquarius: [
    '独立思考的你今天将迸发惊人的创造力。',
    '天王星激发你的变革精神，打破常规才能看到新风景。',
    '超前的眼光让你看到别人看不到的可能性。',
    '人道主义精神闪耀，你的善意将温暖更多人的心。',
  ],
  pisces: [
    '梦幻与直觉交织，今天的你仿佛能与宇宙对话。',
    '海王星赐予你无限的想象力，让梦照进现实。',
    '温柔的力量是最强大的魔法，用爱去温暖世界吧。',
    '艺术灵感涌现的一天，把内心的美好表达出来。',
  ],
};

const HOROSCOPE_LEVELS: Record<ZodiacSign, number[]> = {
  aries: [4, 5, 3, 4],
  taurus: [3, 4, 5, 3],
  gemini: [4, 3, 5, 4],
  cancer: [3, 4, 3, 5],
  leo: [5, 4, 5, 3],
  virgo: [4, 3, 4, 5],
  libra: [3, 5, 4, 3],
  scorpio: [5, 4, 3, 5],
  sagittarius: [4, 5, 4, 4],
  capricorn: [3, 4, 5, 4],
  aquarius: [4, 3, 5, 4],
  pisces: [5, 4, 3, 5],
};

export function generateHoroscope(zodiac: ZodiacSign): { text: string; level: number } {
  const texts = HOROSCOPE_TEXTS[zodiac];
  const levels = HOROSCOPE_LEVELS[zodiac];
  const idx = Math.floor(Math.random() * texts.length);
  return { text: texts[idx], level: levels[idx] };
}

export function generateStarPoints(count: number, width: number, height: number): StarPoint[] {
  const stars: StarPoint[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.3 + 0.05,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function createParticleBurst(
  x: number,
  y: number,
  color: string,
  count: number = 60
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = Math.random() * 4 + 2;
    const life = Math.random() * 40 + 30;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: Math.random() * 3 + 1,
      color,
      alpha: 1,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vx: p.vx * 0.97,
      vy: p.vy * 0.97 + 0.05,
      life: p.life - 1,
      alpha: Math.max(0, p.life / p.maxLife),
      size: p.size * 0.995,
    }))
    .filter((p) => p.life > 0);
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function renderStars(
  ctx: CanvasRenderingContext2D,
  stars: StarPoint[],
  time: number
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const s of stars) {
    const twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase);
    const opacity = s.opacity * (0.5 + twinkle * 0.5);
    const currentY = s.y - time * s.speed * 0.01;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = s.size * 2;
    ctx.beginPath();
    ctx.arc(
      s.x,
      ((currentY % ctx.canvas.height) + ctx.canvas.height) % ctx.canvas.height,
      s.size,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }
}

export function getLevelStars(level: number): string {
  return '★'.repeat(level) + '☆'.repeat(5 - level);
}

export function getZodiacColor(sign: ZodiacSign): string {
  return ZODIAC_INFO[sign].color;
}
