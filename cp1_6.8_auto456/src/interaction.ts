import type { TextParticleSystem } from './text';
import { scatterParticles, hitTestParticles } from './text';
import type { PaperCrane } from './papercrane';
import { createCrane } from './papercrane';

export type AppPhase = 'idle' | 'crane' | 'particles';

export interface InteractionState {
  phase: AppPhase;
  onLaunch: (text: string) => void;
  onRescatter: () => void;
}

export function createInteractionState(): InteractionState {
  return {
    phase: 'idle',
    onLaunch: () => {},
    onRescatter: () => {},
  };
}

export function setupCanvasInteraction(
  canvas: HTMLCanvasElement,
  state: InteractionState,
  getParticleSystem: () => TextParticleSystem | null,
  getCrane: () => PaperCrane | null,
  recreateCrane: () => void
) {
  function handleClick(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    if (state.phase === 'particles') {
      const ps = getParticleSystem();
      if (ps && hitTestParticles(ps, mx, my)) {
        scatterParticles(ps, canvas.width / 2, canvas.height / 2);
        state.phase = 'idle';
        setTimeout(() => {
          recreateCrane();
        }, 1500);
      }
    }
  }

  canvas.addEventListener('click', (e) => {
    handleClick(e.clientX, e.clientY);
  });

  canvas.addEventListener('touchend', (e) => {
    if (e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      handleClick(t.clientX, t.clientY);
    }
  });
}
