let audioContext: AudioContext | null = null;

export function initAudioContext(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

export function playUnlockSound(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  const ctx = audioContext;
  const now = ctx.currentTime;

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.3;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(2000, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 0.3);
  noiseFilter.Q.value = 1.5;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);
  noiseSource.stop(now + 0.3);

  const frequencies = [800, 1200, 1600];
  frequencies.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.02);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.25, now + idx * 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + idx * 0.02);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now + idx * 0.02);
    osc.stop(now + 0.3);
  });

  const impactOsc = ctx.createOscillator();
  impactOsc.type = 'triangle';
  impactOsc.frequency.setValueAtTime(150, now);
  impactOsc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

  const impactGain = ctx.createGain();
  impactGain.gain.setValueAtTime(0.35, now);
  impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  impactOsc.connect(impactGain);
  impactGain.connect(ctx.destination);
  impactOsc.start(now);
  impactOsc.stop(now + 0.15);
}
