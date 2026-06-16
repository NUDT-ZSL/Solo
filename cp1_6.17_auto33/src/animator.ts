import { eventBus } from './eventBus';
import { getBlockById, timeToMinutes, minutesToTime } from './data';
import { setState } from './visualizer';

interface AnimationPhase {
  name: string;
  duration: number;
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

let isPlaying = false;
let startTime = 0;
let currentPhaseIndex = 0;
let phases: AnimationPhase[] = [];
let phaseStartTime = 0;
let blockId: number | null = null;
let audioContext: AudioContext | null = null;

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playNote(frequency: number, startTime: number, duration: number): void {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0.05, startTime + duration * 0.5);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playMelody(startOffset: number = 0): void {
  if (!audioContext) return;
  
  const cMajorScale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
  const melody = [0, 2, 4, 5, 4, 2, 0, 2, 4, 5, 7, 5, 4, 2, 0];
  const bpm = 90;
  const noteDuration = 60 / bpm / 2;
  
  const now = audioContext.currentTime + startOffset;
  
  melody.forEach((noteIndex, i) => {
    const frequency = cMajorScale[noteIndex % cMajorScale.length];
    const noteStart = now + i * noteDuration;
    playNote(frequency, noteStart, noteDuration * 0.8);
  });
}

function buildNarrativePhases(blockId: number): AnimationPhase[] {
  const block = getBlockById(blockId);
  if (!block) return [];
  
  const zoomInDuration = 2000;
  const eventDuration = 1500;
  const zoomOutDuration = 1500;
  
  const phaseList: AnimationPhase[] = [];
  
  phaseList.push({
    name: 'zoomIn',
    duration: zoomInDuration,
    onStart: () => {
      setState({ isAnimating: true });
      eventBus.emit('narrativeStart', blockId);
    },
    onUpdate: (progress) => {
      const eased = easeInOut(progress);
      const zoom = lerp(1, 2.5, eased);
      setState({ zoomLevel: zoom });
    }
  });
  
  block.events.forEach((event, index) => {
    phaseList.push({
      name: `event-${index}`,
      duration: eventDuration,
      onStart: () => {
        setState({ 
          highlightedEventIndex: index,
          currentTime: timeToMinutes(event.time)
        });
        eventBus.emit('highlightEvent', index, event);
      },
      onUpdate: (progress) => {
        const eased = easeInOut(progress);
        setState({ narrativeProgress: eased });
      }
    });
  });
  
  phaseList.push({
    name: 'zoomOut',
    duration: zoomOutDuration,
    onStart: () => {
      setState({ highlightedEventIndex: -1 });
      eventBus.emit('narrativeEnd', blockId);
    },
    onUpdate: (progress) => {
      const eased = easeInOut(progress);
      const zoom = lerp(2.5, 1, eased);
      setState({ zoomLevel: zoom });
    },
    onComplete: () => {
      setState({ 
        isAnimating: false,
        narrativeProgress: 0,
        currentTime: 23 * 60
      });
    }
  });
  
  return phaseList;
}

function buildPlaybackPhases(): AnimationPhase[] {
  const phaseList: AnimationPhase[] = [];
  const totalDuration = 60000;
  const startTime = 18 * 60;
  const endTime = 23 * 60;
  
  phaseList.push({
    name: 'playback',
    duration: totalDuration,
    onStart: () => {
      setState({ 
        isAnimating: true,
        mode: 'playback',
        currentTime: startTime
      });
      eventBus.emit('playbackStart');
      playMelody();
    },
    onUpdate: (progress) => {
      const currentTime = lerp(startTime, endTime, progress);
      setState({ currentTime });
      eventBus.emit('playbackTimeUpdate', minutesToTime(Math.floor(currentTime)));
    },
    onComplete: () => {
      setState({ 
        isAnimating: false,
        mode: 'map'
      });
      eventBus.emit('playbackEnd');
    }
  });
  
  return phaseList;
}

export function startNarrative(blockIdParam: number): void {
  if (isPlaying) return;
  
  initAudio();
  blockId = blockIdParam;
  phases = buildNarrativePhases(blockId);
  
  if (phases.length === 0) return;
  
  isPlaying = true;
  startTime = performance.now();
  currentPhaseIndex = 0;
  phaseStartTime = startTime;
  
  if (phases[0].onStart) {
    phases[0].onStart();
  }
  
  playMelody(0.1);
  requestAnimationFrame(animate);
}

export function startPlayback(): void {
  if (isPlaying) return;
  
  initAudio();
  phases = buildPlaybackPhases();
  
  if (phases.length === 0) return;
  
  isPlaying = true;
  startTime = performance.now();
  currentPhaseIndex = 0;
  phaseStartTime = startTime;
  
  if (phases[0].onStart) {
    phases[0].onStart();
  }
  
  requestAnimationFrame(animate);
}

export function stopNarrative(): void {
  isPlaying = false;
  blockId = null;
  setState({
    isAnimating: false,
    zoomLevel: 1,
    highlightedEventIndex: -1,
    narrativeProgress: 0
  });
  eventBus.emit('narrativeStopped');
}

function animate(timestamp: number): void {
  if (!isPlaying) return;
  
  const currentPhase = phases[currentPhaseIndex];
  if (!currentPhase) {
    isPlaying = false;
    return;
  }
  
  const elapsed = timestamp - phaseStartTime;
  const progress = Math.min(elapsed / currentPhase.duration, 1);
  
  if (currentPhase.onUpdate) {
    currentPhase.onUpdate(progress);
  }
  
  if (progress >= 1) {
    if (currentPhase.onComplete) {
      currentPhase.onComplete();
    }
    
    currentPhaseIndex++;
    
    if (currentPhaseIndex < phases.length) {
      phaseStartTime = timestamp;
      const nextPhase = phases[currentPhaseIndex];
      if (nextPhase && nextPhase.onStart) {
        nextPhase.onStart();
      }
    } else {
      isPlaying = false;
      return;
    }
  }
  
  requestAnimationFrame(animate);
}

export function isNarrativePlaying(): boolean {
  return isPlaying;
}

export function resetAnimation(): void {
  stopNarrative();
  setState({
    selectedBlockId: null,
    hoveredBlockId: null,
    zoomLevel: 1,
    offsetX: 0,
    offsetY: 0,
    mode: 'map',
    currentTime: 23 * 60,
    highlightedEventIndex: -1,
    isAnimating: false,
    narrativeProgress: 0
  });
  eventBus.emit('reset');
}
