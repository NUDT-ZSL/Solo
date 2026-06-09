import { AudioManager } from './AudioManager';
import { SceneManager } from './SceneManager';

const container = document.getElementById('canvas-container')!;
const playBtn = document.getElementById('play-btn')!;
const iconPlay = document.getElementById('icon-play')!;
const iconPause = document.getElementById('icon-pause')!;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;

const audioManager = new AudioManager();
const sceneManager = new SceneManager(container);

let audioInitialized = false;

async function initAudio() {
  if (!audioInitialized) {
    await audioManager.init();
    audioManager.setVolume(parseInt(volumeSlider.value));
    audioInitialized = true;
  }
}

playBtn.addEventListener('click', async () => {
  await initAudio();
  const playing = audioManager.togglePlay();
  iconPlay.style.display = playing ? 'none' : 'block';
  iconPause.style.display = playing ? 'block' : 'none';
});

volumeSlider.addEventListener('input', () => {
  audioManager.setVolume(parseInt(volumeSlider.value));
});

function drawWaveform() {
  const ctx = waveformCanvas.getContext('2d')!;
  const w = waveformCanvas.width;
  const h = waveformCanvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#00D4FF';
  ctx.lineWidth = 1;
  ctx.beginPath();

  const timeData = audioManager.getTimeData();
  const step = Math.floor(timeData.length / w);

  for (let x = 0; x < w; x++) {
    const i = x * step;
    const v = timeData[i] / 128.0;
    const y = (v * h) / 2;
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

function animate() {
  requestAnimationFrame(animate);

  const spectrum = audioManager.update();
  sceneManager.update(spectrum);
  drawWaveform();
}

animate();
