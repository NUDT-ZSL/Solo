import { SpellType } from '../game/SpellMatcher';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.log('Audio not supported');
  }
}

export function playFailSound() {
  try {
    const ctx = getAudioContext();
    
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    noise.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    noise.start(ctx.currentTime);
  } catch (e) {
    console.log('Audio not supported');
  }
}

export function playSpellSound(spell: SpellType) {
  try {
    const ctx = getAudioContext();
    
    switch (spell) {
      case 'fireball':
        playFireballSound(ctx);
        break;
      case 'iceSpike':
        playIceSpikeSound(ctx);
        break;
      case 'thunder':
        playThunderSound(ctx);
        break;
      case 'shield':
        playShieldSound(ctx);
        break;
      case 'heal':
        playHealSound(ctx);
        break;
      case 'haste':
        playHasteSound(ctx);
        break;
    }
  } catch (e) {
    console.log('Audio not supported');
  }
}

function playFireballSound(ctx: AudioContext) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(200, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
  
  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
}

function playIceSpikeSound(ctx: AudioContext) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(800, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
  oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
  
  gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
}

function playThunderSound(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3)) * 0.3;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  noise.start(ctx.currentTime);
}

function playShieldSound(ctx: AudioContext) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(300, ctx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.2);
  oscillator.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.4);
  
  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.4);
}

function playHealSound(ctx: AudioContext) {
  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator1.type = 'sine';
  oscillator2.type = 'sine';
  
  oscillator1.frequency.setValueAtTime(400, ctx.currentTime);
  oscillator1.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
  
  oscillator2.frequency.setValueAtTime(600, ctx.currentTime);
  oscillator2.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
  
  gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  
  oscillator1.start(ctx.currentTime);
  oscillator2.start(ctx.currentTime);
  oscillator1.stop(ctx.currentTime + 0.4);
  oscillator2.stop(ctx.currentTime + 0.4);
}

function playHasteSound(ctx: AudioContext) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(440, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
  
  gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);
}
