export type GrowthStage = 'baby' | 'child' | 'teen' | 'adult';

export type AnimationType =
  | 'idle'
  | 'happy'
  | 'sad'
  | 'eating'
  | 'sleeping'
  | 'played';

export type ActionType = 'feed' | 'clean' | 'play' | 'talk' | 'tick' | 'init';

export type ParticleShape = 'star' | 'drop' | 'circle' | 'heart' | 'cross';

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  maxLife: number;
  type: ParticleShape;
}

export interface PetStateStats {
  mood: number;
  health: number;
  hunger: number;
  stage: GrowthStage;
  isWeak: boolean;
  isEndangered: boolean;
}

export interface AiCommand {
  animation: AnimationType;
  emoji: string;
  particles: ParticleConfig[];
  duration: number;
}

const STAGE_SIZES: Record<GrowthStage, number> = {
  baby: 16,
  child: 24,
  teen: 28,
  adult: 32,
};

export function getStageSize(stage: GrowthStage): number {
  return STAGE_SIZES[stage];
}

const ANIMATION_BY_STAGE: Record<GrowthStage, AnimationType[]> = {
  baby: ['idle', 'eating'],
  child: ['idle', 'eating', 'happy', 'sad'],
  teen: ['idle', 'eating', 'happy', 'sad', 'played'],
  adult: ['idle', 'eating', 'happy', 'sad', 'played', 'sleeping'],
};

function clampAnimation(
  anim: AnimationType,
  stage: GrowthStage,
): AnimationType {
  const avail = ANIMATION_BY_STAGE[stage];
  return avail.includes(anim) ? anim : 'idle';
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function generateEatParticles(cx: number, cy: number): ParticleConfig[] {
  const count = randInt(5, 8);
  const out: ParticleConfig[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rand(-Math.PI * 0.2, Math.PI * 0.2) - Math.PI / 2;
    const speed = rand(0.8, 1.8);
    out.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: rand(4, 6),
      color: ['#ffa500', '#ffcc00', '#ff8c00'][randInt(0, 2)],
      maxLife: 0.5,
      type: 'star',
    });
  }
  return out;
}

function generateCleanParticles(cx: number, cy: number): ParticleConfig[] {
  const count = randInt(10, 15);
  const out: ParticleConfig[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: cx + rand(-20, 20),
      y: cy - rand(0, 30),
      vx: rand(-0.3, 0.3),
      vy: rand(0.8, 1.5),
      radius: rand(3, 5),
      color: ['#4fc3f7', '#81d4fa', '#29b6f6'][randInt(0, 2)],
      maxLife: 1,
      type: 'drop',
    });
  }
  return out;
}

function generatePlayParticles(cx: number, cy: number): ParticleConfig[] {
  const count = randInt(8, 12);
  const out: ParticleConfig[] = [];
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#54a0ff'];
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1, 2.5);
    out.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: rand(6, 8),
      color: colors[randInt(0, colors.length - 1)],
      maxLife: 0.8,
      type: 'circle',
    });
  }
  return out;
}

function generateTalkParticles(cx: number, cy: number): ParticleConfig[] {
  const count = randInt(3, 5);
  const out: ParticleConfig[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: cx + rand(-10, 10),
      y: cy,
      vx: rand(-0.4, 0.4),
      vy: -rand(1, 2),
      radius: rand(8, 12),
      color: ['#ff4d6d', '#ff6b8b', '#ff8fa3'][randInt(0, 2)],
      maxLife: 0.6,
      type: 'heart',
    });
  }
  return out;
}

function generateWeakParticles(cx: number, cy: number): ParticleConfig[] {
  const count = randInt(4, 6);
  const out: ParticleConfig[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: cx + rand(-25, 25),
      y: cy + rand(-25, 25),
      vx: 0,
      vy: 0,
      radius: 5,
      color: '#888888',
      maxLife: 0.4,
      type: 'cross',
    });
  }
  return out;
}

export function getPetAiCommand(
  state: PetStateStats,
  action: ActionType,
  petCenter: { x: number; y: number },
): AiCommand {
  const size = getStageSize(state.stage);
  const mouthX = petCenter.x;
  const mouthY = petCenter.y + size * 0.1;
  const topX = petCenter.x;
  const topY = petCenter.y - size * 0.5;

  if (state.isEndangered) {
    return {
      animation: clampAnimation('sad', state.stage),
      emoji: '😵',
      particles: generateWeakParticles(petCenter.x, petCenter.y),
      duration: 1.2,
    };
  }

  switch (action) {
    case 'feed':
      return {
        animation: clampAnimation('eating', state.stage),
        emoji: '🍔',
        particles: generateEatParticles(mouthX, mouthY),
        duration: 1.5,
      };
    case 'clean':
      return {
        animation: clampAnimation('happy', state.stage),
        emoji: '✨',
        particles: generateCleanParticles(petCenter.x, petCenter.y),
        duration: 1.2,
      };
    case 'play':
      return {
        animation: clampAnimation('played', state.stage),
        emoji: '🌟',
        particles: generatePlayParticles(petCenter.x, petCenter.y),
        duration: 1.5,
      };
    case 'talk':
      return {
        animation: clampAnimation('happy', state.stage),
        emoji: '💬',
        particles: generateTalkParticles(topX, topY),
        duration: 1.2,
      };
    default:
      break;
  }

  if (state.isWeak) {
    return {
      animation: clampAnimation('sad', state.stage),
      emoji: '😢',
      particles: generateWeakParticles(petCenter.x, petCenter.y),
      duration: 1,
    };
  }

  if (state.health < 30 || state.hunger < 30) {
    return {
      animation: clampAnimation('sad', state.stage),
      emoji: '😢',
      particles: [],
      duration: 1,
    };
  }

  if (state.mood < 30) {
    return {
      animation: clampAnimation('sad', state.stage),
      emoji: '😔',
      particles: [],
      duration: 1,
    };
  }

  if (state.hunger > 80 && state.mood > 80 && state.health > 80) {
    return {
      animation: clampAnimation('sleeping', state.stage),
      emoji: '💤',
      particles: [],
      duration: 2,
    };
  }

  if (state.mood > 70) {
    return {
      animation: clampAnimation('happy', state.stage),
      emoji: '😊',
      particles: [],
      duration: 1.5,
    };
  }

  return {
    animation: 'idle',
    emoji: '😊',
    particles: [],
    duration: 2,
  };
}
