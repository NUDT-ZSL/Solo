import {
  drawWaveform,
  drawSpectrum,
  setupCanvas,
  clearCanvas,
  type VisualizerMode
} from './visualizer.js';

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let gainNode: GainNode | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let audioBuffer: AudioBuffer | null = null;

let isPlaying = false;
let startTime = 0;
let pauseTime = 0;
let rafId: number | null = null;
let currentMode: VisualizerMode = 'waveform';

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const ctx = setupCanvas(canvas);

const uploadZone = document.getElementById('uploadZone') as HTMLDivElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const uploadHint = document.getElementById('uploadHint') as HTMLParagraphElement;
const fileNameEl = document.getElementById('fileName') as HTMLParagraphElement;

const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const playIcon = document.getElementById('playIcon') as HTMLElement;
const pauseIcon = document.getElementById('pauseIcon') as HTMLElement;

const progressSlider = document.getElementById('progressSlider') as HTMLInputElement;
const currentTimeEl = document.getElementById('currentTime') as HTMLSpanElement;
const totalTimeEl = document.getElementById('totalTime') as HTMLSpanElement;

const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
const modeBtns = document.querySelectorAll<HTMLButtonElement>('.mode-btn');

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ensureAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;
    gainNode = audioContext.createGain();
    gainNode.gain.value = parseFloat(volumeSlider.value);
    analyser.connect(gainNode);
    gainNode.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

function stopSource(): void {
  if (sourceNode) {
    try {
      sourceNode.stop();
    } catch (_e) {
      // ignore
    }
    sourceNode.disconnect();
    sourceNode = null;
  }
}

function playFrom(offset: number): void {
  if (!audioBuffer || !analyser || !audioContext) return;

  stopSource();

  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(analyser);
  sourceNode.onended = () => {
    if (isPlaying && sourceNode) {
      isPlaying = false;
      updatePlayButton();
      pauseTime = 0;
      progressSlider.value = '0';
      currentTimeEl.textContent = '0:00';
    }
  };

  const safeOffset = Math.min(Math.max(offset, 0), audioBuffer.duration);
  sourceNode.start(0, safeOffset);
  startTime = audioContext.currentTime - safeOffset;
  isPlaying = true;
  updatePlayButton();
  startVisualization();
}

function togglePlay(): void {
  if (!audioBuffer) return;
  const ctxAudio = ensureAudioContext();

  if (isPlaying) {
    pauseTime = ctxAudio.currentTime - startTime;
    stopSource();
    isPlaying = false;
    updatePlayButton();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  } else {
    playFrom(pauseTime);
  }
}

function updatePlayButton(): void {
  playIcon.style.display = isPlaying ? 'none' : '';
  pauseIcon.style.display = isPlaying ? '' : 'none';
}

function startVisualization(): void {
  if (rafId !== null) return;

  const render = () => {
    if (!analyser || !audioContext) {
      rafId = null;
      return;
    }

    if (audioBuffer && isPlaying) {
      const current = audioContext.currentTime - startTime;
      const clamped = Math.min(Math.max(current, 0), audioBuffer.duration);
      const percent = (clamped / audioBuffer.duration) * 100;
      if (!progressSlider.matches(':active')) {
        progressSlider.value = percent.toString();
      }
      currentTimeEl.textContent = formatTime(clamped);

      if (current >= audioBuffer.duration) {
        isPlaying = false;
        updatePlayButton();
        pauseTime = 0;
      }
    }

    const channelData: Float32Array[] = [];
    if (audioBuffer) {
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
      }
    }
    const isStereo = audioBuffer ? audioBuffer.numberOfChannels >= 2 : false;

    if (currentMode === 'waveform') {
      drawWaveform(ctx, canvas, analyser, isStereo, channelData);
    } else {
      drawSpectrum(ctx, canvas, analyser);
    }

    rafId = requestAnimationFrame(render);
  };

  rafId = requestAnimationFrame(render);
}

function handleFile(file: File): void {
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav)$/i.test(file.name)) {
    uploadHint.textContent = '请选择 MP3 或 WAV 音频文件';
    return;
  }

  fileNameEl.textContent = file.name;
  uploadHint.textContent = '正在解析音频...';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const ctxAudio = ensureAudioContext();
      audioBuffer = await ctxAudio.decodeAudioData(arrayBuffer.slice(0));

      totalTimeEl.textContent = formatTime(audioBuffer.duration);
      progressSlider.value = '0';
      currentTimeEl.textContent = '0:00';
      pauseTime = 0;

      clearCanvas(ctx, canvas);
      playBtn.disabled = false;
      uploadHint.textContent = '解析完成，正在播放...';

      playFrom(0);
    } catch (_err) {
      uploadHint.textContent = '音频解析失败，请尝试其他文件';
      playBtn.disabled = true;
    }
  };
  reader.onerror = () => {
    uploadHint.textContent = '文件读取失败';
  };
  reader.readAsArrayBuffer(file);
}

uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    handleFile(target.files[0]);
  }
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer && e.dataTransfer.files[0]) {
    handleFile(e.dataTransfer.files[0]);
  }
});

playBtn.addEventListener('click', togglePlay);

volumeSlider.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  if (gainNode) {
    gainNode.gain.value = value;
  }
});

progressSlider.addEventListener('input', (e) => {
  if (!audioBuffer) return;
  const percent = parseFloat((e.target as HTMLInputElement).value);
  const newTime = (percent / 100) * audioBuffer.duration;
  currentTimeEl.textContent = formatTime(newTime);
});

progressSlider.addEventListener('change', (e) => {
  if (!audioBuffer) return;
  const percent = parseFloat((e.target as HTMLInputElement).value);
  const newTime = (percent / 100) * audioBuffer.duration;
  pauseTime = newTime;
  if (isPlaying) {
    playFrom(newTime);
  } else {
    currentTimeEl.textContent = formatTime(newTime);
  }
});

modeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    modeBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode as VisualizerMode;
    clearCanvas(ctx, canvas);
    if (isPlaying) {
      startVisualization();
    }
  });
});

window.addEventListener('resize', () => {
  setupCanvas(canvas);
  clearCanvas(ctx, canvas);
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !playBtn.disabled) {
    e.preventDefault();
    togglePlay();
  }
});
