export type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'idle';

export interface BreathingPattern {
  name: string;
  inhale: number;
  hold: number;
  exhale: number;
  holdAfterExhale?: number;
}

export const BREATHING_PATTERNS: Record<string, BreathingPattern> = {
  '4-7-8': {
    name: '4-7-8 放松呼吸',
    inhale: 4,
    hold: 7,
    exhale: 8,
  },
  box: {
    name: '方形呼吸',
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfterExhale: 4,
  },
  free: {
    name: '自由模式',
    inhale: 3,
    hold: 2,
    exhale: 4,
  },
};

export interface PhaseColor {
  r: number;
  g: number;
  b: number;
}

const PHASE_COLORS: Record<BreathingPhase, [PhaseColor, PhaseColor]> = {
  inhale: [
    { r: 60, g: 130, b: 246 },
    { r: 50, g: 210, b: 140 },
  ],
  hold: [
    { r: 50, g: 210, b: 140 },
    { r: 160, g: 90, b: 220 },
  ],
  exhale: [
    { r: 160, g: 90, b: 220 },
    { r: 230, g: 70, b: 70 },
  ],
  idle: [
    { r: 100, g: 100, b: 140 },
    { r: 100, g: 100, b: 140 },
  ],
};

export function lerpColor(a: PhaseColor, b: PhaseColor, t: number): PhaseColor {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export function getPhaseColor(phase: BreathingPhase, progress: number): PhaseColor {
  const [start, end] = PHASE_COLORS[phase];
  return lerpColor(start, end, progress);
}

export function colorToRgba(c: PhaseColor, alpha: number = 1): string {
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${alpha})`;
}

export function getPhaseLabel(phase: BreathingPhase): string {
  switch (phase) {
    case 'inhale': return '吸气';
    case 'hold': return '屏息';
    case 'exhale': return '呼气';
    case 'idle': return '准备开始';
  }
}

export interface BreathingState {
  phase: BreathingPhase;
  phaseProgress: number;
  cycleCount: number;
  totalElapsed: number;
}

export function computeBreathingState(
  pattern: BreathingPattern,
  durationMultiplier: number,
  elapsedMs: number
): BreathingState {
  const inhaleDur = pattern.inhale * durationMultiplier * 1000;
  const holdDur = pattern.hold * durationMultiplier * 1000;
  const exhaleDur = pattern.exhale * durationMultiplier * 1000;
  const holdAfterDur = (pattern.holdAfterExhale ?? 0) * durationMultiplier * 1000;

  const cycleDuration = inhaleDur + holdDur + exhaleDur + holdAfterDur;
  if (cycleDuration <= 0) {
    return { phase: 'idle', phaseProgress: 0, cycleCount: 0, totalElapsed: 0 };
  }

  const cycleCount = Math.floor(elapsedMs / cycleDuration);
  const inCycleElapsed = elapsedMs % cycleDuration;

  let phase: BreathingPhase;
  let phaseProgress: number;

  if (inCycleElapsed < inhaleDur) {
    phase = 'inhale';
    phaseProgress = inCycleElapsed / inhaleDur;
  } else if (inCycleElapsed < inhaleDur + holdDur) {
    phase = 'hold';
    phaseProgress = (inCycleElapsed - inhaleDur) / holdDur;
  } else if (inCycleElapsed < inhaleDur + holdDur + exhaleDur) {
    phase = 'exhale';
    phaseProgress = (inCycleElapsed - inhaleDur - holdDur) / exhaleDur;
  } else {
    phase = 'hold';
    phaseProgress = (inCycleElapsed - inhaleDur - holdDur - exhaleDur) / holdAfterDur;
  }

  return {
    phase,
    phaseProgress: Math.min(1, Math.max(0, phaseProgress)),
    cycleCount,
    totalElapsed: elapsedMs,
  };
}

export function computeHaloScale(state: BreathingState): number {
  const { phase, phaseProgress } = state;
  switch (phase) {
    case 'inhale':
      return 0.5 + 0.5 * easeInOutSine(phaseProgress);
    case 'hold':
      return 1.0;
    case 'exhale':
      return 1.0 - 0.5 * easeInOutSine(phaseProgress);
    case 'idle':
      return 0.5;
  }
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function estimateHeartRate(cycleCount: number, totalElapsedSec: number): number {
  if (totalElapsedSec < 5) return 72;
  const baseRate = 72;
  const relaxationFactor = Math.min(cycleCount * 0.8, 12);
  const noise = Math.sin(totalElapsedSec * 0.3) * 2;
  return Math.round(Math.max(55, baseRate - relaxationFactor + noise));
}

export function computeRelaxationIndex(cycleCount: number, totalElapsedSec: number): number {
  if (totalElapsedSec < 5) return 0;
  const base = Math.min(cycleCount * 8, 60);
  const timeBonus = Math.min(totalElapsedSec / 60 * 15, 15);
  const noise = Math.sin(totalElapsedSec * 0.2) * 3;
  return Math.round(Math.min(100, Math.max(0, base + timeBonus + 25 + noise)));
}

export function playBreathSound(phase: BreathingPhase, audioCtxRef: React.MutableRefObject<AudioContext | null>) {
  if (!audioCtxRef.current) {
    try {
      audioCtxRef.current = new AudioContext();
    } catch {
      return;
    }
  }
  const ctx = audioCtxRef.current;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const freq = phase === 'inhale' ? 440 : phase === 'exhale' ? 330 : 392;
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}
