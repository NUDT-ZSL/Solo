let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.2
) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // audio not available
  }
}

export function playCollect() {
  playTone(880, 0.2, 'sine', 0.25);
  setTimeout(() => playTone(1320, 0.1, 'sine', 0.15), 60);
}

export function playStep() {
  playTone(440, 0.05, 'triangle', 0.08);
}

export function playRotate() {
  playTone(330, 0.15, 'sawtooth', 0.12);
  setTimeout(() => playTone(440, 0.15, 'sawtooth', 0.12), 120);
  setTimeout(() => playTone(550, 0.2, 'sawtooth', 0.12), 260);
}

export function playWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.3, 'sine', 0.2), i * 120);
  });
}

export function playLose() {
  playTone(330, 0.3, 'sawtooth', 0.2);
  setTimeout(() => playTone(220, 0.5, 'sawtooth', 0.2), 200);
}

export function unlockAudio() {
  try {
    getAudioContext();
  } catch (e) {
    // noop
  }
}
