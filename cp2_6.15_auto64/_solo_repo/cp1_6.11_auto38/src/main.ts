import { LetterEngine } from './letterEngine';
import { TextAnimation } from './textAnimation';
import { PaperFold } from './paperFold';
import { UIController } from './ui';
import { SeasonName, lerpColor, hexToRgb } from './seasonThemes';

const LOADING_FADE_OUT_MS = 400;
const APP_READY_DELAY_MS = 300;

function hideLoading(onDone?: () => void): void {
  const loading = document.getElementById('loading');
  const app = document.getElementById('app');
  if (!loading || !app) {
    onDone?.();
    return;
  }
  setTimeout(() => {
    loading.classList.add('hidden');
    app.classList.add('ready');
    setTimeout(() => {
      loading.remove();
      onDone?.();
    }, 900);
  }, LOADING_FADE_OUT_MS);
}

function preloadFonts(): Promise<void> {
  return new Promise((resolve) => {
    const maxWait = setTimeout(() => resolve(), 1800);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        clearTimeout(maxWait);
        resolve();
      });
    } else {
      clearTimeout(maxWait);
      setTimeout(() => resolve(), 500);
    }
  });
}

async function init(): Promise<void> {
  const particleCanvas = document.getElementById('particleCanvas') as HTMLCanvasElement | null;
  const textCanvas = document.getElementById('textCanvas') as HTMLCanvasElement | null;
  const letterCard = document.getElementById('letterCard') as HTMLElement | null;
  const letterEdge = document.getElementById('letterEdge') as HTMLElement | null;
  const backIcon = document.getElementById('backIcon') as HTMLElement | null;
  const backProverb = document.getElementById('backProverb') as HTMLElement | null;
  const cornerHits = Array.from(document.querySelectorAll('.corner-hit')) as HTMLElement[];

  if (!particleCanvas || !textCanvas || !letterCard || !letterEdge || !backIcon || !backProverb) {
    console.error('[季风信笺] 必要的DOM元素缺失，初始化失败');
    hideLoading();
    return;
  }

  const particleEngine = new LetterEngine(particleCanvas, letterEdge, 'spring');
  const textAnim = new TextAnimation(textCanvas);
  const paperFold = new PaperFold(letterCard, cornerHits, backIcon, backProverb);
  particleEngine.start();
  textAnim.start();
  paperFold.startAnimationLoop();

  let debounceTimer: number | null = null;
  window.addEventListener('resize', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      particleEngine.resize();
      textAnim.resize();
    }, 150);
  });

  new UIController({
    onSeasonChange: (season: SeasonName) => {
      particleEngine.setSeason(season);
      paperFold.setSeason(season);
      textAnim.clear();
    },
    onGenerate: (text: string) => {
      return textAnim.generate(text);
    },
    onDownload: async () => {
      const { width, height, dpr } = particleEngine.getDimensions();

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width * dpr;
      tempCanvas.height = height * dpr;
      const outCtx = tempCanvas.getContext('2d')!;
      outCtx.scale(dpr, dpr);

      const bgGrad = outCtx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#FFFEF7');
      bgGrad.addColorStop(1, '#FFF9E8');
      outCtx.fillStyle = bgGrad;
      outCtx.fillRect(0, 0, width, height);

      outCtx.drawImage(particleEngine.getCanvas(), 0, 0, width, height);

      const theme = particleEngine.getTheme();
      if (theme.edgeEffect === 'burn') {
        const burnCanvas = document.createElement('canvas');
        burnCanvas.width = width * dpr;
        burnCanvas.height = height * dpr;
        const bCtx = burnCanvas.getContext('2d')!;
        bCtx.scale(dpr, dpr);
        const gradConfigs = [
          { x: 0.2,  y: 0,   a: 0.15, r: 0.40 },
          { x: 0.8,  y: 0,   a: 0.12, r: 0.35 },
          { x: 0,    y: 0.8, a: 0.10, r: 0.30 },
          { x: 1,    y: 0.2, a: 0.13, r: 0.35 },
          { x: 0.5,  y: 1,   a: 0.10, r: 0.30 },
        ];
        for (const g of gradConfigs) {
          const gx = g.x * width;
          const gy = g.y * height;
          const rad = Math.max(width, height) * g.r;
          const grad = bCtx.createRadialGradient(gx, gy, 0, gx, gy, rad);
          grad.addColorStop(0, `rgba(139,69,19,${g.a})`);
          grad.addColorStop(1, 'transparent');
          bCtx.fillStyle = grad;
          bCtx.fillRect(0, 0, width, height);
        }
        outCtx.drawImage(burnCanvas, 0, 0, width, height);
      } else {
        const c = hexToRgb(theme.particle.colorStart);
        const rgba = (a: string) => `rgba(${c.r},${c.g},${c.b},${a})`;
        const inkCanvas = document.createElement('canvas');
        inkCanvas.width = width * dpr;
        inkCanvas.height = height * dpr;
        const iCtx = inkCanvas.getContext('2d')!;
        iCtx.scale(dpr, dpr);
        const inkConfigs = [
          { x: 0.15, y: 0.1,  a: '0.15', r: 0.45 },
          { x: 0.85, y: 0.15, a: '0.12', r: 0.40 },
          { x: 0.1,  y: 0.9,  a: '0.10', r: 0.35 },
          { x: 0.9,  y: 0.85, a: '0.13', r: 0.40 },
        ];
        for (const g of inkConfigs) {
          const gx = g.x * width;
          const gy = g.y * height;
          const rad = Math.max(width, height) * g.r;
          const grad = iCtx.createRadialGradient(gx, gy, 0, gx, gy, rad);
          grad.addColorStop(0, rgba(g.a));
          grad.addColorStop(1, 'transparent');
          iCtx.fillStyle = grad;
          iCtx.fillRect(0, 0, width, height);
        }
        outCtx.drawImage(inkCanvas, 0, 0, width, height);
      }

      outCtx.drawImage(textAnim.getCanvas(), 0, 0, width, height);

      const link = document.createElement('a');
      link.download = `季风信笺-${theme.displayName}-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    },
    onParticleCountChange: (count: number) => {
      particleEngine.setParticleCount(count);
    },
    getPrimaryColor: () => particleEngine.getPrimaryColor(),
    getCurrentSeason: () => particleEngine.getSeason()
  });

  hideLoading();
}

window.addEventListener('DOMContentLoaded', async () => {
  await preloadFonts();
  setTimeout(() => {
    init().catch((err) => {
      console.error('[季风信笺] 初始化错误:', err);
      hideLoading();
    });
  }, APP_READY_DELAY_MS);
});
