import {
  Renderer,
  Note,
  getPitchColor,
  getRowHeight,
  getColWidth,
  NOTE_WIDTH,
  NOTE_HEIGHT,
  PITCH_COUNT,
  SEMITONE_NAMES,
  PITCH_FREQUENCIES
} from './renderer';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 500;
const BASE_SPEED = 3;
const PLAYBACK_TRIGGER_X = CANVAS_WIDTH * 0.85;

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

function ensureAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.7;
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playNote(pitchIndex: number, volume: number): void {
  const ctx = ensureAudioContext();
  if (!masterGain) return;

  const frequency = PITCH_FREQUENCIES[SEMITONE_NAMES[PITCH_COUNT - 1 - pitchIndex]];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.value = frequency;

  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  filter.Q.value = 0.5;

  const now = ctx.currentTime;
  const vol = (volume / 100) * 0.5;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(vol * 0.7, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.85);
}

const canvas = document.getElementById('pianoCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('找不到 canvas 元素');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const renderer = new Renderer(canvas);

const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
const speedValue = document.getElementById('speedValue') as HTMLSpanElement;
const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
const volumeValue = document.getElementById('volumeValue') as HTMLSpanElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;

let notes: Note[] = [];
let noteIdCounter = 0;
let isPlaying = false;
let speed = parseFloat(speedSlider.value);
let volume = parseInt(volumeSlider.value, 10);
let animationFrameId: number | null = null;

function getGridPosition(clientX: number, clientY: number): { gridX: number; gridY: number; pitchIndex: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  const colWidth = getColWidth();
  const rowHeight = getRowHeight(canvas.height);

  const gridX = Math.floor(x / colWidth) * colWidth;
  const gridY = Math.floor(y / rowHeight) * rowHeight;
  const pitchIndex = Math.floor(gridY / rowHeight);

  return { gridX, gridY, pitchIndex };
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  const clickedNote = notes.find(note =>
    x >= note.x && x <= note.x + note.width &&
    y >= note.y && y <= note.y + note.height
  );

  if (clickedNote) {
    notes = notes.filter(n => n.id !== clickedNote.id);
    render();
    return;
  }

  const { gridX, pitchIndex } = getGridPosition(e.clientX, e.clientY);
  if (pitchIndex < 0 || pitchIndex >= PITCH_COUNT) return;

  const rowHeight = getRowHeight(canvas.height);
  const gridY = pitchIndex * rowHeight;
  const height = Math.min(NOTE_HEIGHT, rowHeight - 2);

  const newNote: Note = {
    id: noteIdCounter++,
    pitchIndex,
    x: gridX,
    y: gridY + (rowHeight - height) / 2,
    width: NOTE_WIDTH,
    height,
    color: getPitchColor(pitchIndex),
    triggered: false,
    glowIntensity: 0
  };

  notes.push(newNote);
  ensureAudioContext();
  playNote(pitchIndex, volume);
  newNote.glowIntensity = 1;
  render();
});

playBtn.addEventListener('click', () => {
  togglePlay();
});

function togglePlay(): void {
  ensureAudioContext();
  isPlaying = !isPlaying;
  if (isPlaying) {
    playBtn.textContent = '■';
    playBtn.classList.add('playing');
    notes.forEach(n => { n.triggered = false; });
    startLoop();
  } else {
    playBtn.textContent = '▶';
    playBtn.classList.remove('playing');
    stopLoop();
    notes.forEach(n => { n.glowIntensity = 0; });
    render();
  }
}

speedSlider.addEventListener('input', () => {
  speed = parseFloat(speedSlider.value);
  speedValue.textContent = `${speed.toFixed(1)}x`;
});

volumeSlider.addEventListener('input', () => {
  volume = parseInt(volumeSlider.value, 10);
  volumeValue.textContent = `${volume}`;
  if (masterGain) {
    masterGain.gain.value = volume / 100;
  }
});

clearBtn.addEventListener('click', () => {
  if (notes.length === 0) {
    notes = [];
    render();
    return;
  }
  if (window.confirm('确定要清除所有音符吗？')) {
    notes = [];
    render();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  }
});

function update(deltaTime: number): void {
  const movement = speed * BASE_SPEED * (deltaTime / 16.67);

  for (const note of notes) {
    if (isPlaying) {
      note.x += movement;
      if (note.x > CANVAS_WIDTH) {
        note.x = -note.width;
        note.triggered = false;
      }

      const noteCenter = note.x + note.width / 2;
      if (!note.triggered && noteCenter >= PLAYBACK_TRIGGER_X && noteCenter <= PLAYBACK_TRIGGER_X + movement + 2) {
        note.triggered = true;
        playNote(note.pitchIndex, volume);
        note.glowIntensity = 1;
      }
    }

    if (note.glowIntensity > 0) {
      note.glowIntensity = Math.max(0, note.glowIntensity - 0.02);
    }
  }
}

function render(): void {
  renderer.render({
    notes,
    isPlaying,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT
  });
}

let lastTime = 0;
function loop(timestamp: number): void {
  if (lastTime === 0) lastTime = timestamp;
  const deltaTime = Math.min(timestamp - lastTime, 33);
  lastTime = timestamp;

  update(deltaTime);
  render();

  animationFrameId = requestAnimationFrame(loop);
}

function startLoop(): void {
  if (animationFrameId !== null) return;
  lastTime = 0;
  animationFrameId = requestAnimationFrame(loop);
}

function stopLoop(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function idleLoop(): void {
  let needsRender = false;
  for (const note of notes) {
    if (note.glowIntensity > 0) {
      note.glowIntensity = Math.max(0, note.glowIntensity - 0.02);
      needsRender = true;
    }
  }
  if (needsRender) {
    render();
  }
  animationFrameId = requestAnimationFrame(idleLoop);
}

render();
idleLoop();
