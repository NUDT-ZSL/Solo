import { AudioAnalyzer } from './audioAnalyzer';
import { PatternRenderer, PatternMode, RenderParams } from './patternRenderer';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
};

function main(): void {
  const canvas = $<HTMLCanvasElement>('visualizer-canvas');
  const fileInput = $<HTMLInputElement>('fileInput');
  const micBtn = $<HTMLButtonElement>('micBtn');
  const patternBtns = document.querySelectorAll<HTMLButtonElement>('.pattern-btn');
  const panelToggle = $<HTMLButtonElement>('panelToggle');
  const controlPanel = $<HTMLDivElement>('controlPanel');
  const drawerHandle = $<HTMLDivElement>('drawerHandle');

  const beatThresholdSlider = $<HTMLInputElement>('beatThreshold');
  const saturationSlider = $<HTMLInputElement>('saturation');
  const particleCountSlider = $<HTMLInputElement>('particleCount');
  const sizeScaleSlider = $<HTMLInputElement>('sizeScale');

  const beatThresholdVal = $<HTMLSpanElement>('beatThresholdVal');
  const saturationVal = $<HTMLSpanElement>('saturationVal');
  const particleCountVal = $<HTMLSpanElement>('particleCountVal');
  const sizeScaleVal = $<HTMLSpanElement>('sizeScaleVal');

  const glowToggle = $<HTMLInputElement>('glowToggle');
  const trailToggle = $<HTMLInputElement>('trailToggle');
  const mosaicToggle = $<HTMLInputElement>('mosaicToggle');
  const glowIntensity = $<HTMLInputElement>('glowIntensity');
  const trailIntensity = $<HTMLInputElement>('trailIntensity');
  const mosaicBlockSize = $<HTMLInputElement>('mosaicBlockSize');

  const analyzer = new AudioAnalyzer();
  const renderer = new PatternRenderer(canvas);
  let audioElement: HTMLAudioElement | null = null;
  let isMicActive = false;

  const params: RenderParams = {
    patternMode: 'circle',
    beatThreshold: 0.5,
    saturation: 70,
    particleCount: 50,
    sizeScale: 1.0,
    glow: { enabled: false, intensity: 20 },
    trail: { enabled: false, intensity: 2 },
    mosaic: { enabled: false, blockSize: 10 }
  };

  window.addEventListener('resize', () => renderer.resize());

  fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    stopAllAudio();

    audioElement = new Audio();
    audioElement.src = URL.createObjectURL(file);
    audioElement.loop = true;
    audioElement.crossOrigin = 'anonymous';

    try {
      await analyzer.connectAudioElement(audioElement);
      await audioElement.play();
    } catch (err) {
      console.error('音频播放失败:', err);
    }
  });

  micBtn.addEventListener('click', async () => {
    if (isMicActive) {
      stopMicrophone();
    } else {
      try {
        stopAllAudio();
        await analyzer.connectMicrophone();
        isMicActive = true;
        micBtn.classList.add('active');
      } catch (err) {
        console.error('麦克风授权失败:', err);
        alert('无法访问麦克风，请检查浏览器权限设置。');
      }
    }
  });

  function stopMicrophone(): void {
    analyzer.stopMicrophone();
    isMicActive = false;
    micBtn.classList.remove('active');
  }

  function stopAllAudio(): void {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement = null;
    }
    stopMicrophone();
  }

  patternBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      patternBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.pattern as PatternMode;
      if (mode) {
        params.patternMode = mode;
      }
    });
  });

  panelToggle.addEventListener('click', () => {
    controlPanel.classList.toggle('collapsed');
  });

  drawerHandle.addEventListener('click', () => {
    controlPanel.classList.toggle('mobile-open');
    drawerHandle.classList.toggle('drawer-open');
  });

  beatThresholdSlider.addEventListener('input', () => {
    params.beatThreshold = parseFloat(beatThresholdSlider.value);
    beatThresholdVal.textContent = params.beatThreshold.toFixed(2);
    analyzer.setBeatThreshold(params.beatThreshold);
  });

  saturationSlider.addEventListener('input', () => {
    params.saturation = parseInt(saturationSlider.value, 10);
    saturationVal.textContent = String(params.saturation);
  });

  particleCountSlider.addEventListener('input', () => {
    params.particleCount = parseInt(particleCountSlider.value, 10);
    particleCountVal.textContent = String(params.particleCount);
  });

  sizeScaleSlider.addEventListener('input', () => {
    params.sizeScale = parseFloat(sizeScaleSlider.value);
    sizeScaleVal.textContent = params.sizeScale.toFixed(2);
  });

  glowToggle.addEventListener('change', () => {
    params.glow.enabled = glowToggle.checked;
  });
  glowIntensity.addEventListener('input', () => {
    params.glow.intensity = parseInt(glowIntensity.value, 10);
  });

  trailToggle.addEventListener('change', () => {
    params.trail.enabled = trailToggle.checked;
  });
  trailIntensity.addEventListener('input', () => {
    params.trail.intensity = parseInt(trailIntensity.value, 10);
  });

  mosaicToggle.addEventListener('change', () => {
    params.mosaic.enabled = mosaicToggle.checked;
  });
  mosaicBlockSize.addEventListener('input', () => {
    params.mosaic.blockSize = parseInt(mosaicBlockSize.value, 10);
  });

  let animationId: number;
  function animate(): void {
    const analysis = analyzer.analyze();
    if (analysis.isBeat) {
      renderer.triggerBeatBurst(analysis);
    }
    renderer.render(analysis, params);
    animationId = requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(animationId);
    stopAllAudio();
    analyzer.destroy();
  });

  document.addEventListener('click', async function onFirstClick() {
    try {
      await analyzer.resumeContext();
    } catch {
      /* ignore */
    }
    document.removeEventListener('click', onFirstClick);
  }, { once: true });
}

document.addEventListener('DOMContentLoaded', main);
