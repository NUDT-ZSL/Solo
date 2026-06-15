import { useRef, useCallback, useEffect, useState } from 'react';
import { DrumSoundType } from '../types';

interface ActiveOscillator {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
}

interface ActiveDrumSound {
  source: AudioBufferSourceNode | OscillatorNode;
  gainNode: GainNode;
}

const noteToFrequency = (note: string): number => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 440;

  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = notes.indexOf(noteName);

  const semitones = (octave - 4) * 12 + (noteIndex - 9);
  return 440 * Math.pow(2, semitones / 12);
};

const useAudioEngine = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeOscillatorsRef = useRef<Map<string, ActiveOscillator>>(new Map());
  const activeDrumSoundsRef = useRef<Map<string, ActiveDrumSound>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const initAudio = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      return audioContextRef.current;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;

    const masterGain = audioContext.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(audioContext.destination);
    masterGainRef.current = masterGain;

    setIsInitialized(true);
    return audioContext;
  }, [volume]);

  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.01);
    }
  }, [volume]);

  const playPianoNote = useCallback((note: string, velocity: number = 0.8) => {
    const audioContext = initAudio();
    if (!audioContext || !masterGainRef.current) return;

    const frequency = noteToFrequency(note);
    const now = audioContext.currentTime;

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(velocity * 0.15, now + 0.3);
    gainNode.connect(masterGainRef.current);

    const oscillators: OscillatorNode[] = [];

    const osc1 = audioContext.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, now);
    const gain1 = audioContext.createGain();
    gain1.gain.value = 1;
    osc1.connect(gain1);
    gain1.connect(gainNode);
    oscillators.push(osc1);

    const osc2 = audioContext.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, now);
    const gain2 = audioContext.createGain();
    gain2.gain.value = 0.3;
    osc2.connect(gain2);
    gain2.connect(gainNode);
    oscillators.push(osc2);

    const osc3 = audioContext.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(frequency * 3, now);
    const gain3 = audioContext.createGain();
    gain3.gain.value = 0.1;
    osc3.connect(gain3);
    gain3.connect(gainNode);
    oscillators.push(osc3);

    oscillators.forEach((osc) => osc.start(now));

    activeOscillatorsRef.current.set(note, { oscillators, gainNode });
  }, [initAudio]);

  const stopPianoNote = useCallback((note: string) => {
    const active = activeOscillatorsRef.current.get(note);
    if (active && audioContextRef.current) {
      const { oscillators, gainNode } = active;
      const now = audioContextRef.current.currentTime;

      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      oscillators.forEach((osc) => {
        osc.stop(now + 0.3);
      });

      activeOscillatorsRef.current.delete(note);
    }
  }, []);

  const playDrumSound = useCallback((soundType: DrumSoundType, velocity: number = 0.9) => {
    const audioContext = initAudio();
    if (!audioContext || !masterGainRef.current) return;

    const now = audioContext.currentTime;
    const soundId = `${soundType}-${Date.now()}`;

    switch (soundType) {
      case 'kick': {
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(velocity, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gainNode);
        gainNode.connect(masterGainRef.current);
        osc.start(now);
        osc.stop(now + 0.5);

        activeDrumSoundsRef.current.set(soundId, { source: osc, gainNode });
        break;
      }

      case 'snare': {
        const bufferSize = audioContext.sampleRate * 0.2;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = buffer;

        const noiseGain = audioContext.createGain();
        noiseGain.gain.setValueAtTime(velocity * 0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        const bandpass = audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1000;
        bandpass.Q.value = 0.5;

        noiseSource.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(masterGainRef.current);
        noiseSource.start(now);

        const osc = audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 200;

        const oscGain = audioContext.createGain();
        oscGain.gain.setValueAtTime(velocity * 0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(oscGain);
        oscGain.connect(masterGainRef.current);
        osc.start(now);
        osc.stop(now + 0.15);

        activeDrumSoundsRef.current.set(soundId, { source: noiseSource, gainNode: noiseGain });
        break;
      }

      case 'hihat': {
        const bufferSize = audioContext.sampleRate * 0.05;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = buffer;

        const highpass = audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 7000;

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(velocity * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        noiseSource.connect(highpass);
        highpass.connect(gainNode);
        gainNode.connect(masterGainRef.current);
        noiseSource.start(now);

        activeDrumSoundsRef.current.set(soundId, { source: noiseSource, gainNode });
        break;
      }

      case 'tom': {
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(velocity * 0.7, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gainNode);
        gainNode.connect(masterGainRef.current);
        osc.start(now);
        osc.stop(now + 0.4);

        activeDrumSoundsRef.current.set(soundId, { source: osc, gainNode });
        break;
      }

      case 'clap': {
        const bufferSize = audioContext.sampleRate * 0.1;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = buffer;

        const bandpass = audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1500;
        bandpass.Q.value = 1;

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(velocity * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noiseSource.connect(bandpass);
        bandpass.connect(gainNode);
        gainNode.connect(masterGainRef.current);
        noiseSource.start(now);

        activeDrumSoundsRef.current.set(soundId, { source: noiseSource, gainNode });
        break;
      }

      case 'ride': {
        const bufferSize = audioContext.sampleRate * 0.5;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = buffer;

        const highpass = audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 5000;

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(velocity * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        noiseSource.connect(highpass);
        highpass.connect(gainNode);
        gainNode.connect(masterGainRef.current);
        noiseSource.start(now);

        activeDrumSoundsRef.current.set(soundId, { source: noiseSource, gainNode });
        break;
      }
    }

    setTimeout(() => {
      activeDrumSoundsRef.current.delete(soundId);
    }, 600);
  }, [initAudio]);

  const playGuitarNote = useCallback((note: string, velocity: number = 0.7) => {
    const audioContext = initAudio();
    if (!audioContext || !masterGainRef.current) return;

    const frequency = noteToFrequency(note);
    const now = audioContext.currentTime;

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.4, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(velocity * 0.2, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    gainNode.connect(masterGainRef.current);

    const oscillators: OscillatorNode[] = [];

    const osc1 = audioContext.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(frequency, now);
    const gain1 = audioContext.createGain();
    gain1.gain.value = 1;
    osc1.connect(gain1);
    gain1.connect(gainNode);
    oscillators.push(osc1);

    const osc2 = audioContext.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, now);
    const gain2 = audioContext.createGain();
    gain2.gain.value = 0.25;
    osc2.connect(gain2);
    gain2.connect(gainNode);
    oscillators.push(osc2);

    const osc3 = audioContext.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(frequency * 3, now);
    const gain3 = audioContext.createGain();
    gain3.gain.value = 0.08;
    osc3.connect(gain3);
    gain3.connect(gainNode);
    oscillators.push(osc3);

    oscillators.forEach((osc) => osc.start(now));

    oscillators.forEach((osc) => {
      osc.stop(now + 1.5);
    });

    activeOscillatorsRef.current.set(note, { oscillators, gainNode });

    setTimeout(() => {
      activeOscillatorsRef.current.delete(note);
    }, 1500);
  }, [initAudio]);

  const stopGuitarNote = useCallback((note: string) => {
    const active = activeOscillatorsRef.current.get(note);
    if (active && audioContextRef.current) {
      const { oscillators, gainNode } = active;
      const now = audioContextRef.current.currentTime;

      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      oscillators.forEach((osc) => {
        osc.stop(now + 0.2);
      });

      activeOscillatorsRef.current.delete(note);
    }
  }, []);

  return {
    isInitialized,
    volume,
    setVolume,
    initAudio,
    playPianoNote,
    stopPianoNote,
    playDrumSound,
    playGuitarNote,
    stopGuitarNote,
  };
};

export default useAudioEngine;
