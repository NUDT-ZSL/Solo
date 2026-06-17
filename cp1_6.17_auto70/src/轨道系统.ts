export interface Diamond {
  id: number;
  track: number;
  y: number;
  size: number;
  color: string;
  glowColor: string;
  opacity: number;
  passed: boolean;
  hit: boolean;
  beatAligned: boolean;
}

export interface Track {
  index: number;
  x: number;
  width: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

const DIAMOND_SIZE = 40;
const TRACK_COUNT = 3;
const BASE_SPEED = 150;
const MIN_SPACING = 200;
const MAX_SPACING = 400;
const MAX_DIAMONDS = 50;

let diamondIdCounter = 0;
let particleIdCounter = 0;

export function createTracks(canvasWidth: number, canvasHeight: number): Track[] {
  const trackWidth = canvasWidth / TRACK_COUNT;
  return Array.from({ length: TRACK_COUNT }, (_, i) => ({
    index: i,
    x: i * trackWidth,
    width: trackWidth,
  }));
}

export function createDiamond(
  trackIndex: number,
  startY: number,
  beatAligned: boolean = false
): Diamond {
  return {
    id: diamondIdCounter++,
    track: trackIndex,
    y: startY,
    size: DIAMOND_SIZE,
    color: '#00FFFF',
    glowColor: '#00FFFF',
    opacity: 0.8,
    passed: false,
    hit: false,
    beatAligned,
  };
}

export function updateDiamonds(
  diamonds: Diamond[],
  deltaTime: number,
  speedMultiplier: number = 1
): Diamond[] {
  const speed = BASE_SPEED * speedMultiplier;
  const updated = diamonds
    .map((d) => ({
      ...d,
      y: d.y + speed * deltaTime,
    }))
    .filter((d) => d.y < 1000 && diamonds.length <= MAX_DIAMONDS);
  return updated;
}

export function spawnDiamond(
  diamonds: Diamond[],
  canvasHeight: number,
  lastSpawnY: number,
  beatAligned: boolean = false
): { diamonds: Diamond[]; newLastSpawnY: number } {
  if (diamonds.length >= MAX_DIAMONDS) {
    return { diamonds, newLastSpawnY: lastSpawnY };
  }

  const spacing = MIN_SPACING + Math.random() * (MAX_SPACING - MIN_SPACING);
  const newY = lastSpawnY - spacing;

  const trackIndex = Math.floor(Math.random() * TRACK_COUNT);
  const newDiamond = createDiamond(trackIndex, newY, beatAligned);
  return {
    diamonds: [...diamonds, newDiamond],
    newLastSpawnY: newY,
  };
}

export function checkCollision(
  diamonds: Diamond[],
  playerTrack: number,
  playerY: number,
  playerHeight: number,
  isJumping: boolean,
  jumpProgress: number
): {
  diamonds: Diamond[];
  hitType: 'perfect' | 'normal' | 'miss' | null;
  hitDiamond: Diamond | null;
} {
  const collisionWindow = 5;
  let hitType: 'perfect' | 'normal' | 'miss' | null = null;
  let hitDiamond: Diamond | null = null;

  const updatedDiamonds = diamonds.map((diamond) => {
    if (diamond.passed || diamond.hit) return diamond;

    const distance = Math.abs(diamond.y - playerY);
    const sameTrack = diamond.track === playerTrack;

    if (distance < collisionWindow) {
      if (sameTrack && !isJumping) {
        hitType = diamond.beatAligned ? 'perfect' : 'normal';
        hitDiamond = diamond;
        return { ...diamond, passed: true };
      } else if (!sameTrack || isJumping) {
        if (diamond.beatAligned && distance < 10) {
          hitType = 'perfect';
        } else {
          hitType = 'normal';
        }
        hitDiamond = diamond;
        return { ...diamond, passed: true };
      }
    }

    if (sameTrack && !isJumping && diamond.y > playerY && diamond.y < playerY + playerHeight / 2) {
      hitType = 'miss';
      hitDiamond = diamond;
      return { ...diamond, hit: true, passed: true };
    }

    if (diamond.y > playerY + 50 && !diamond.passed) {
      return { ...diamond, passed: true };
    }

    return diamond;
  });

  return { diamonds: updatedDiamonds, hitType, hitDiamond };
}

export function createParticles(
  tracks: Track[],
  count: number = 150
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    particles.push({
      id: particleIdCounter++,
      x: track.x + Math.random() * track.width,
      y: Math.random() * 600,
      vx: (Math.random() - 0.5) * 100,
      vy: 50 + Math.random() * 50,
      size: 3 + Math.random() * 3,
      color: '#FFD700',
      life: 0.5,
      maxLife: 0.5,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], deltaTime: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * deltaTime,
      y: p.y + p.vy * deltaTime,
      life: p.life - deltaTime,
    }))
    .filter((p) => p.life > 0);
}

export function getTrackX(tracks: Track[], trackIndex: number): number {
  const track = tracks[trackIndex];
  return track.x + track.width / 2;
}
