import * as Tone from 'tone';
import type { AudioController } from '../types/gameTypes';

export function createAudioController(): AudioController {
  let ambientStarted = false;
  let noiseNode: Tone.Noise | null = null;
  let noiseFilter: Tone.Filter | null = null;
  let noiseGain: Tone.Gain | null = null;
  let lowOsc: Tone.Oscillator | null = null;
  let lowOscGain: Tone.Gain | null = null;
  let lfo: Tone.LFO | null = null;

  let bossLoopId: number | null = null;
  let bossKick: Tone.MembraneSynth | null = null;

  function startAmbient() {
    if (ambientStarted) return;
    void Tone.start().then(() => {
      ambientStarted = true;

      noiseNode = new Tone.Noise('pink').start();
      noiseFilter = new Tone.Filter({
        type: 'lowpass',
        frequency: 400,
        Q: 1
      });
      noiseGain = new Tone.Gain(0.15).toDestination();
      noiseNode.connect(noiseFilter).connect(noiseGain);

      lowOsc = new Tone.Oscillator({
        frequency: 80,
        type: 'sine'
      }).start();
      lowOscGain = new Tone.Gain(0.08).toDestination();
      lowOsc.connect(lowOscGain);

      lfo = new Tone.LFO({
        frequency: 0.3,
        min: 0.05,
        max: 0.18
      }).start();
      lfo.connect(noiseGain.gain);
    });
  }

  function stopAmbient() {
    ambientStarted = false;
    if (noiseNode) { noiseNode.stop(); noiseNode.dispose(); noiseNode = null; }
    if (noiseFilter) { noiseFilter.dispose(); noiseFilter = null; }
    if (noiseGain) { noiseGain.dispose(); noiseGain = null; }
    if (lowOsc) { lowOsc.stop(); lowOsc.dispose(); lowOsc = null; }
    if (lowOscGain) { lowOscGain.dispose(); lowOscGain = null; }
    if (lfo) { lfo.stop(); lfo.dispose(); lfo = null; }
  }

  function playStardustCollect() {
    if (!ambientStarted) return;
    const bell = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 }
    }).toDestination();
    bell.volume.value = -10;
    bell.triggerAttackRelease('G5', 0.1);
    const bell2 = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 }
    }).toDestination();
    bell2.volume.value = -15;
    setTimeout(() => bell2.triggerAttackRelease('B5', 0.08), 30);
    setTimeout(() => { bell.dispose(); bell2.dispose(); }, 200);
  }

  function playVortexHit() {
    if (!ambientStarted) return;
    const osc = new Tone.Oscillator({ frequency: 100, type: 'sawtooth' }).start();
    const gain = new Tone.Gain(0).toDestination();
    const filter = new Tone.Filter({ type: 'lowpass', frequency: 300 });
    osc.connect(filter).connect(gain);
    gain.gain.setValueAtTime(0.2, Tone.now());
    gain.gain.exponentialRampToValueAtTime(0.001, Tone.now() + 0.3);
    osc.frequency.linearRampToValueAtTime(50, Tone.now() + 0.3);
    setTimeout(() => {
      osc.stop();
      osc.dispose();
      gain.dispose();
      filter.dispose();
    }, 320);
  }

  function playBossAppear() {
    if (!ambientStarted) return;
    bossKick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).toDestination();
    bossKick.volume.value = -5;

    const interval = 500;
    const tick = () => {
      if (bossKick) {
        bossKick.triggerAttackRelease('C1', '8n');
      }
    };
    tick();
    const loop = window.setInterval(tick, interval);
    bossLoopId = loop;
  }

  function stopBossAppear() {
    if (bossLoopId !== null) {
      clearInterval(bossLoopId);
      bossLoopId = null;
    }
    if (bossKick) {
      bossKick.dispose();
      bossKick = null;
    }
  }

  function playProjectile() {
    if (!ambientStarted) return;
    const osc = new Tone.Oscillator({ frequency: 600, type: 'square' }).start();
    const gain = new Tone.Gain(0).toDestination();
    osc.connect(gain);
    gain.gain.setValueAtTime(0.08, Tone.now());
    osc.frequency.exponentialRampToValueAtTime(1200, Tone.now() + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, Tone.now() + 0.1);
    setTimeout(() => { osc.stop(); osc.dispose(); gain.dispose(); }, 120);
  }

  function playBossHit() {
    if (!ambientStarted) return;
    const osc = new Tone.Oscillator({ frequency: 200, type: 'triangle' }).start();
    const gain = new Tone.Gain(0).toDestination();
    osc.connect(gain);
    gain.gain.setValueAtTime(0.2, Tone.now());
    osc.frequency.exponentialRampToValueAtTime(80, Tone.now() + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, Tone.now() + 0.15);
    setTimeout(() => { osc.stop(); osc.dispose(); gain.dispose(); }, 170);
  }

  function playLevelUp() {
    if (!ambientStarted) return;
    const notes = ['C4', 'E4', 'G4', 'C5'];
    notes.forEach((note, i) => {
      setTimeout(() => {
        const syn = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
        }).toDestination();
        syn.volume.value = -12;
        syn.triggerAttackRelease(note, 0.15);
        setTimeout(() => syn.dispose(), 300);
      }, i * 100);
    });
  }

  function playGameOver() {
    if (!ambientStarted) return;
    const notes = ['G3', 'E3', 'C3', 'G2'];
    notes.forEach((note, i) => {
      setTimeout(() => {
        const syn = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.1, decay: 0.6, sustain: 0.1, release: 0.8 }
        }).toDestination();
        syn.volume.value = -10;
        syn.triggerAttackRelease(note, 0.5);
        setTimeout(() => syn.dispose(), 900);
      }, i * 250);
    });
  }

  return {
    startAmbient,
    stopAmbient,
    playStardustCollect,
    playVortexHit,
    playBossAppear,
    stopBossAppear,
    playProjectile,
    playBossHit,
    playLevelUp,
    playGameOver
  };
}
