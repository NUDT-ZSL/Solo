export interface ResonatorState {
  frequency: number;
  targetFrequency: number;
  vibrationAmount: number;
  lastMatchTime: number;
}

export const FREQUENCY_MIN = 0;
export const FREQUENCY_MAX = 1000;
export const FREQUENCY_STEP = 1;
export const FREQUENCY_MATCH_TOLERANCE = 15;
export const FREQUENCY_LERP_SPEED = 8;

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function createResonator(): ResonatorState {
  return {
    frequency: 500,
    targetFrequency: 500,
    vibrationAmount: 0,
    lastMatchTime: 0,
  };
}

export function setResonatorFrequency(
  state: ResonatorState,
  freq: number,
): ResonatorState {
  const clamped = Math.max(FREQUENCY_MIN, Math.min(FREQUENCY_MAX, freq));
  return { ...state, targetFrequency: clamped };
}

export function adjustResonatorFrequency(
  state: ResonatorState,
  delta: number,
): ResonatorState {
  return setResonatorFrequency(state, state.targetFrequency + delta);
}

export function updateResonator(
  state: ResonatorState,
  dt: number,
): ResonatorState {
  const diff = state.targetFrequency - state.frequency;
  const step = FREQUENCY_LERP_SPEED * dt;
  let newFreq: number;

  if (Math.abs(diff) < step) {
    newFreq = state.targetFrequency;
  } else {
    newFreq = state.frequency + Math.sign(diff) * step;
  }

  newFreq = Math.max(FREQUENCY_MIN, Math.min(FREQUENCY_MAX, newFreq));

  const vibrationDecay = Math.max(0, state.vibrationAmount - dt * 6);

  return {
    ...state,
    frequency: newFreq,
    vibrationAmount: vibrationDecay,
  };
}

export function isFrequencyMatch(
  resonatorFreq: number,
  stoneFreq: number,
): boolean {
  return Math.abs(resonatorFreq - stoneFreq) <= FREQUENCY_MATCH_TOLERANCE;
}

export function triggerMatchFeedback(state: ResonatorState): ResonatorState {
  return {
    ...state,
    lastMatchTime: performance.now(),
  };
}

export function triggerMismatchFeedback(state: ResonatorState): ResonatorState {
  return {
    ...state,
    vibrationAmount: 1,
  };
}

export function playMatchSound(frequency: number): void {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      frequency * 1.5,
      ctx.currentTime + 0.15,
    );

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 2, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(
      frequency * 3,
      ctx.currentTime + 0.1,
    );
    gain2.gain.setValueAtTime(0.1, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.3);
  } catch {
    // audio not available
  }
}

export function playMismatchSound(): void {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.setValueAtTime(60, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // audio not available
  }
}

export function playDoorOpenSound(): void {
  try {
    const ctx = getAudioCtx();
    const freqs = [220, 330, 440, 660];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.12 + 0.6,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.6);
    });
  } catch {
    // audio not available
  }
}
