let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playBeep = (
  frequency: number = 440,
  duration: number = 0.1,
  volume: number = 0.3,
  type: OscillatorType = 'square'
): void => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio not supported
  }
};

export const playClickSound = (): void => {
  playBeep(600, 0.08, 0.2, 'square');
};

export const playAttackSound = (): void => {
  playBeep(200, 0.15, 0.3, 'sawtooth');
  setTimeout(() => playBeep(150, 0.1, 0.2, 'sawtooth'), 50);
};

export const playHitSound = (): void => {
  playBeep(100, 0.2, 0.4, 'sawtooth');
};

export const playHealSound = (): void => {
  playBeep(523, 0.1, 0.2, 'sine');
  setTimeout(() => playBeep(659, 0.1, 0.2, 'sine'), 100);
  setTimeout(() => playBeep(784, 0.15, 0.2, 'sine'), 200);
};

export const playChestSound = (): void => {
  playBeep(523, 0.1, 0.3, 'sine');
  setTimeout(() => playBeep(659, 0.1, 0.3, 'sine'), 80);
  setTimeout(() => playBeep(784, 0.1, 0.3, 'sine'), 160);
  setTimeout(() => playBeep(1047, 0.2, 0.3, 'sine'), 240);
};

export const playVictorySound = (): void => {
  const notes = [523, 659, 784, 1047, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playBeep(freq, 0.2, 0.3, 'sine'), i * 150);
  });
};

export const playDefeatSound = (): void => {
  const notes = [400, 350, 300, 250, 200];
  notes.forEach((freq, i) => {
    setTimeout(() => playBeep(freq, 0.3, 0.3, 'sawtooth'), i * 200);
  });
};

export const playBossWarningSound = (): void => {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => playBeep(150, 0.15, 0.5, 'sawtooth'), i * 200);
  }
};
