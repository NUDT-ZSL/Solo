import { AudioProcessor, type AudioParams } from './audioProcessor';
import { CanvasRenderer } from './canvasRenderer';

const HISTOGRAM_BARS = 32;
const LOADER_DURATION = 5000;

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const recordBtn = document.getElementById('recordBtn') as HTMLButtonElement;
const micIcon = document.getElementById('micIcon') as unknown as SVGSVGElement;
const histogramEl = document.getElementById('histogram') as HTMLDivElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const statusText = document.getElementById('statusText') as HTMLDivElement;
const canvasWrapper = document.getElementById('canvasWrapper') as HTMLDivElement;

if (!canvas || !recordBtn || !micIcon || !histogramEl || !loader || !statusText || !canvasWrapper) {
  throw new Error('Required DOM elements not found');
}

const audioProcessor = new AudioProcessor();
const canvasRenderer = new CanvasRenderer(canvas);

const histogramBars: HTMLDivElement[] = [];
for (let i = 0; i < HISTOGRAM_BARS; i++) {
  const bar = document.createElement('div');
  bar.className = 'histogram-bar';
  histogramEl.appendChild(bar);
  histogramBars.push(bar);
}

function resizeCanvas(): void {
  const wrapperWidth = window.innerWidth;
  const wrapperHeight = window.innerHeight;
  canvasRenderer.resize(wrapperWidth, wrapperHeight);
}

window.addEventListener('resize', resizeCanvas, { passive: true });
resizeCanvas();

let loaderHidden = false;
setTimeout(() => {
  loader.classList.add('hidden');
  loaderHidden = true;
  setTimeout(() => {
    statusText.classList.remove('hidden');
  }, 300);
}, LOADER_DURATION);

const STOP_ICON_PATH = 'M6 6h12v12H6z';
const MIC_ICON_PATH = 'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z';

function setRecordingUI(recording: boolean): void {
  if (recording) {
    recordBtn.classList.add('recording');
    recordBtn.setAttribute('aria-label', '停止录音');
    micIcon.innerHTML = `<path d="${STOP_ICON_PATH}"/>`;
    histogramEl.classList.add('visible');
    statusText.textContent = '正在录音 · 说话或唱歌试试';
  } else {
    recordBtn.classList.remove('recording');
    recordBtn.setAttribute('aria-label', '开始录音');
    micIcon.innerHTML = `<path d="${MIC_ICON_PATH}"/>`;
    histogramEl.classList.remove('visible');
    statusText.textContent = '点击右下角按钮开始录音';
  }
}

function updateHistogram(frequencyData: Uint8Array): void {
  const binCount = frequencyData.length;
  if (binCount === 0) return;

  const binsPerBar = Math.max(1, Math.floor(binCount / HISTOGRAM_BARS));
  for (let i = 0; i < HISTOGRAM_BARS; i++) {
    let sum = 0;
    const startBin = i * binsPerBar;
    const endBin = Math.min(binCount, startBin + binsPerBar);
    for (let j = startBin; j < endBin; j++) {
      sum += frequencyData[j];
    }
    const avg = endBin > startBin ? sum / (endBin - startBin) : 0;
    const normalized = avg / 255;
    const height = Math.max(4, Math.min(40, 4 + normalized * 36));
    histogramBars[i].style.height = `${height}px`;

    const hue = 150 - normalized * 150;
    const saturation = 80;
    const lightness = 45 + normalized * 20;
    histogramBars[i].style.background = `linear-gradient(180deg, hsl(${hue + 30}, ${saturation}%, ${lightness + 15}%) 0%, hsl(${hue}, ${saturation}%, ${lightness}%) 100%)`;
    histogramBars[i].style.boxShadow = `0 0 4px hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
  }
}

function handleAudioUpdate(params: AudioParams): void {
  canvasRenderer.updateAudioParams(params);
  updateHistogram(params.frequencyData);
}

audioProcessor.onUpdate(handleAudioUpdate);

let isProcessing = false;

async function toggleRecording(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    if (audioProcessor.isRecording()) {
      canvasRenderer.stop();
      audioProcessor.stopRecording();
      setRecordingUI(false);
    } else {
      statusText.textContent = '正在请求麦克风权限...';
      await audioProcessor.startRecording();
      canvasRenderer.start();
      setRecordingUI(true);
    }
  } catch (err) {
    console.error('Recording toggle failed:', err);
    statusText.textContent = '麦克风权限被拒绝，请在浏览器设置中允许访问';
    setRecordingUI(false);
  } finally {
    isProcessing = false;
  }
}

recordBtn.addEventListener('click', () => {
  void toggleRecording();
});

let idleRafId: number | null = null;
let idleTime = 0;
let lastIdleFrame = 0;

function idleAnimationLoop(timestamp: number): void {
  const delta = timestamp - lastIdleFrame;
  lastIdleFrame = timestamp;
  idleTime += delta;

  if (!audioProcessor.isRecording()) {
    const idleVolume = (Math.sin(idleTime * 0.001) * 0.5 + 0.5) * 0.08;
    const idlePitch = 80 + (Math.sin(idleTime * 0.0007) * 0.5 + 0.5) * 500;
    canvasRenderer.updateAudioParams({
      volume: idleVolume,
      pitch: idlePitch,
      cepstrum: 0,
      frequencyData: new Uint8Array(512),
      timeData: new Float32Array(1024)
    });

    if (!canvasRenderer['isRunning'] as unknown as boolean) {
      canvasRenderer.start();
      setTimeout(() => {
        if (!audioProcessor.isRecording()) {
          canvasRenderer.stop();
        }
      }, 100);
    }
  }

  idleRafId = requestAnimationFrame(idleAnimationLoop);
}

function waitForLoaderAndStart(): void {
  if (loaderHidden) {
    lastIdleFrame = performance.now();
    idleRafId = requestAnimationFrame(idleAnimationLoop);
  } else {
    setTimeout(waitForLoaderAndStart, 100);
  }
}
waitForLoaderAndStart();

window.addEventListener('beforeunload', () => {
  if (idleRafId !== null) {
    cancelAnimationFrame(idleRafId);
  }
  audioProcessor.destroy();
  canvasRenderer.destroy();
});
