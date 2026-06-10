import { ParticleSystem } from './particle';
import { Harp } from './harp';
import { AudioSynthesizer, ToneLevel } from './audio';
import { Recorder } from './recorder';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const particleSystem = new ParticleSystem();
const audioSynth = new AudioSynthesizer();
const harp = new Harp(particleSystem, audioSynth);
const recorder = new Recorder();

(window as any).particleSystem = particleSystem;
(window as any).harp = harp;

let lastTime = 0;
let isDragging = false;
let lastStringIndex = -1;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  
  updateHarpPosition();
}

function updateHarpPosition(): void {
  const isMobile = window.innerWidth <= 768;
  const controlBarHeight = isMobile ? 180 : 80;
  const availableHeight = window.innerHeight - controlBarHeight - 60;
  const availableWidth = window.innerWidth - 40;
  
  let scale = 1;
  if (isMobile) {
    const scaleByWidth = availableWidth / 400;
    const scaleByHeight = availableHeight / 600;
    scale = Math.min(scaleByWidth, scaleByHeight, 1);
  } else {
    const scaleByWidth = availableWidth / 500;
    const scaleByHeight = availableHeight / 700;
    scale = Math.min(scaleByWidth, scaleByHeight, 1);
  }
  
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2 - controlBarHeight / 2;
  
  harp.setCenter(centerX, centerY, scale);
}

function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function handleStart(x: number, y: number): void {
  const stringIndex = harp.getStringAtPoint(x, y);
  if (stringIndex >= 0) {
    isDragging = true;
    lastStringIndex = stringIndex;
    harp.triggerString(stringIndex);
    
    if (recorder.isRecordingActive()) {
      recorder.recordEvent(stringIndex);
    }
  }
}

function handleMove(x: number, y: number): void {
  if (!isDragging) return;
  
  const stringIndex = harp.getStringAtPoint(x, y);
  if (stringIndex >= 0 && stringIndex !== lastStringIndex) {
    harp.handleDrag(lastStringIndex, stringIndex);
    lastStringIndex = stringIndex;
    
    if (recorder.isRecordingActive()) {
      recorder.recordEvent(stringIndex);
    }
  }
}

function handleEnd(): void {
  isDragging = false;
  lastStringIndex = -1;
}

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);
  handleStart(x, y);
});

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);
  handleMove(x, y);
});

canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('mouseleave', handleEnd);

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
  handleStart(x, y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
  handleMove(x, y);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  handleEnd();
}, { passive: false });

canvas.addEventListener('touchcancel', handleEnd);

const stringCountSlider = document.getElementById('stringCount') as HTMLInputElement;
const toneSelect = document.getElementById('toneSelect') as HTMLSelectElement;
const recordBtn = document.getElementById('recordBtn') as HTMLButtonElement;
const playlistBtn = document.getElementById('playlistBtn') as HTMLButtonElement;
const playlistPanel = document.getElementById('playlistPanel') as HTMLDivElement;
const closePlaylistBtn = document.getElementById('closePlaylistBtn') as HTMLButtonElement;
const playlistContent = document.getElementById('playlistContent') as HTMLDivElement;
const progressContainer = document.getElementById('progressContainer') as HTMLDivElement;
const progressText = document.getElementById('progressText') as HTMLSpanElement;
const progressFill = document.getElementById('progressFill') as HTMLDivElement;

stringCountSlider.addEventListener('input', () => {
  const count = parseInt(stringCountSlider.value);
  harp.setStringCount(count);
});

toneSelect.addEventListener('change', () => {
  const tone = toneSelect.value as ToneLevel;
  harp.setToneLevel(tone);
});

recordBtn.addEventListener('click', () => {
  if (recorder.isRecordingActive()) {
    recorder.stopRecording();
    recordBtn.classList.remove('recording');
    recordBtn.classList.remove('playing');
    progressContainer.style.display = 'none';
    updatePlaylist();
  } else if (recorder.isPlayingActive()) {
    recorder.stopPlayback();
    recordBtn.classList.remove('playing');
    progressContainer.style.display = 'none';
  } else {
    recorder.startRecording(harp.getStringCount(), harp.getToneLevel());
    recordBtn.classList.add('recording');
    recordBtn.classList.remove('playing');
    progressContainer.style.display = 'flex';
    progressText.textContent = '00:00/00:30';
    progressFill.style.width = '0%';
  }
});

playlistBtn.addEventListener('click', () => {
  playlistPanel.classList.toggle('open');
  if (playlistPanel.classList.contains('open')) {
    updatePlaylist();
  }
});

closePlaylistBtn.addEventListener('click', () => {
  playlistPanel.classList.remove('open');
});

function updatePlaylist(): void {
  const melodies = recorder.getAllMelodies();
  
  if (melodies.length === 0) {
    playlistContent.innerHTML = '<p class="empty-text">暂无录音</p>';
    return;
  }

  playlistContent.innerHTML = '';
  
  for (const melody of melodies) {
    const item = document.createElement('div');
    item.className = 'playlist-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'playlist-item-name';
    nameSpan.textContent = melody.name.replace('.json', '');
    
    const btnGroup = document.createElement('div');
    btnGroup.className = 'playlist-item-buttons';
    
    const playBtn = document.createElement('button');
    playBtn.className = 'playlist-item-btn play';
    playBtn.textContent = '▶️';
    playBtn.addEventListener('click', () => {
      playlistPanel.classList.remove('open');
      recorder.playMelody(melody.name);
      progressContainer.style.display = 'flex';
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'playlist-item-btn delete';
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('确定要删除这个录音吗？')) {
        recorder.deleteMelody(melody.name);
        updatePlaylist();
      }
    });
    
    btnGroup.appendChild(playBtn);
    btnGroup.appendChild(deleteBtn);
    item.appendChild(nameSpan);
    item.appendChild(btnGroup);
    playlistContent.appendChild(item);
  }
}

recorder.onTrigger = (index: number) => {
  harp.triggerString(index);
};

recorder.onPlaybackStart = () => {
  progressContainer.style.display = 'flex';
  recordBtn.classList.add('playing');
  recordBtn.classList.remove('recording');
};

recorder.onPlaybackStop = () => {
  progressContainer.style.display = 'none';
  recordBtn.classList.remove('playing');
};

recorder.onPlaybackProgress = (current: number, total: number) => {
  progressText.textContent = `${recorder.formatTime(current)}/${recorder.formatTime(total)}`;
  progressFill.style.width = `${(current / total) * 100}%`;
};

function animate(currentTime: number): void {
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  harp.update(deltaTime);
  particleSystem.update(deltaTime);
  recorder.update();

  if (recorder.isRecordingActive()) {
    const current = recorder.getCurrentRecordingTime();
    const max = recorder.getMaxDuration();
    progressText.textContent = `${recorder.formatTime(current)}/${recorder.formatTime(max)}`;
    progressFill.style.width = `${(current / max) * 100}%`;
    
    if (current >= max) {
      recorder.stopRecording();
      recordBtn.classList.remove('recording');
      progressContainer.style.display = 'none';
      updatePlaylist();
    }
  }

  particleSystem.draw(ctx);
  harp.draw(ctx);

  requestAnimationFrame(animate);
}

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
harp.setStringCount(12);
harp.setToneLevel('mid');
requestAnimationFrame((t) => {
  lastTime = t;
  animate(t);
});
