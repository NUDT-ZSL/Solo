import {
  BeatTrackState,
  BeatBubble,
  BubbleType,
  PlayerState,
  Particle,
  GAME_CONFIG,
  COLORS,
} from './types';

export function createBeatTrack(): BeatTrackState {
  const bpm = GAME_CONFIG.BPM;
  return {
    amplitude: 40,
    baseAmplitude: 40,
    frequency: 0.008,
    phase: 0,
    beatCount: 0,
    bpm,
    beatInterval: 60 / bpm,
    lastBeatTime: 0,
  };
}

export function updateBeatTrack(
  track: BeatTrackState,
  time: number,
  dt: number
): boolean {
  track.phase += dt * 2;
  track.amplitude = track.baseAmplitude + Math.sin(time * 0.5) * 15;

  const beatElapsed = time - track.lastBeatTime;
  if (beatElapsed >= track.beatInterval) {
    track.beatCount += Math.floor(beatElapsed / track.beatInterval);
    track.lastBeatTime = time;
    return true;
  }
  return false;
}

export function getTrackY(
  track: BeatTrackState,
  x: number,
  canvasH: number
): number {
  const baseY = canvasH * 0.75;
  return (
    baseY +
    Math.sin(x * track.frequency + track.phase) * track.amplitude +
    Math.sin(x * track.frequency * 2.3 + track.phase * 1.7) * track.amplitude * 0.3
  );
}

export function shouldSpawnBubble(track: BeatTrackState): boolean {
  return track.beatCount > 0 && track.beatCount % GAME_CONFIG.BEAT_BUBBLE_INTERVAL === 0;
}

export function createBeatBubble(
  id: number,
  track: BeatTrackState,
  canvasW: number,
  canvasH: number
): BeatBubble {
  const x = 100 + Math.random() * (canvasW - 200);
  const y = getTrackY(track, x, canvasH) - 40;
  const type: BubbleType = Math.random() < 0.5 ? 'speed' : 'shield';
  return {
    id,
    x,
    y,
    radius: GAME_CONFIG.BEAT_BUBBLE_RADIUS,
    type,
    collected: false,
    expired: false,
    spawnBeat: track.beatCount,
    life: GAME_CONFIG.BEAT_BUBBLE_LIFETIME,
    maxLife: GAME_CONFIG.BEAT_BUBBLE_LIFETIME,
    pulsePhase: 0,
  };
}

export function updateBeatBubbles(
  bubbles: BeatBubble[],
  dt: number,
  players: [PlayerState, PlayerState],
  track: BeatTrackState,
  canvasH: number,
  spawnParticles: (ps: Particle[]) => void
) {
  for (const bubble of bubbles) {
    if (bubble.collected || bubble.expired) continue;

    bubble.life -= dt;
    bubble.pulsePhase += dt * 4;
    bubble.y = getTrackY(track, bubble.x, canvasH) - 40 - Math.sin(bubble.pulsePhase) * 5;

    if (bubble.life <= 0) {
      bubble.expired = true;
      for (const player of players) {
        if (player.hp > 0) {
          player.hp = Math.max(0, player.hp - 0.5);
        }
      }
      const particles: Particle[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        particles.push({
          x: bubble.x + Math.cos(angle) * 10,
          y: bubble.y + Math.sin(angle) * 10,
          vx: Math.cos(angle) * 40,
          vy: Math.sin(angle) * 40,
          life: 0.4,
          maxLife: 0.4,
          color: COLORS.neonRed,
          size: 3,
          type: 'pulse',
          alpha: 0.7,
          rotation: 0,
          rotationSpeed: 0,
        });
      }
      spawnParticles(particles);
      continue;
    }

    for (const player of players) {
      const dx = player.x - bubble.x;
      const dy = player.y - bubble.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bubble.radius + GAME_CONFIG.PLAYER_SIZE) {
        bubble.collected = true;
        if (bubble.type === 'speed') {
          player.speedBoostTimer = GAME_CONFIG.SPEED_BOOST_DURATION;
        } else {
          player.shield = Math.min(player.maxShield, player.shield + 1);
        }

        const particles: Particle[] = [];
        const color = bubble.type === 'speed' ? COLORS.bubbleSpeed : COLORS.bubbleShield;
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * 2 * i) / 10;
          particles.push({
            x: bubble.x,
            y: bubble.y,
            vx: Math.cos(angle) * (60 + Math.random() * 40),
            vy: Math.sin(angle) * (60 + Math.random() * 40),
            life: 0.5,
            maxLife: 0.5,
            color,
            size: 4,
            type: 'pulse',
            alpha: 1,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 5,
          });
        }
        spawnParticles(particles);
        break;
      }
    }
  }
}
