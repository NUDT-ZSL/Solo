import { getComplementaryColor } from './drawEngine';
import type { BrushParams } from './types';

const NEON_PALETTE = ['#FF007F', '#00E5FF', '#FFD700', '#7F00FF', '#FF8C00'];

export interface UICallbacks {
  onBrushChange: (brush: BrushParams) => void;
  onClear: () => void;
  onGenerate: () => void;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function pickRandomPalette(): string[] {
  const shuffled = [...NEON_PALETTE].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

export function initUI(callbacks: UICallbacks): {
  getBrush: () => BrushParams;
  setBuildingGlowColor: (color: string) => void;
  palette: string[];
} {
  const palette = pickRandomPalette();
  let currentColor = palette[0];
  let currentSize = 14;
  let currentOpacity = 0.7;
  let buildingGlowColor = getComplementaryColor(currentColor);

  const brushSizeInput = document.getElementById('brushSize') as HTMLInputElement;
  const brushSizeValue = document.getElementById('brushSizeValue') as HTMLSpanElement;
  const brushOpacityInput = document.getElementById('brushOpacity') as HTMLInputElement;
  const brushOpacityValue = document.getElementById('brushOpacityValue') as HTMLSpanElement;
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
  const colorPalette = document.getElementById('colorPalette') as HTMLDivElement;
  const flashOverlay = document.getElementById('flashOverlay') as HTMLDivElement;

  const emitBrushChange = () => {
    callbacks.onBrushChange({
      size: currentSize,
      color: currentColor,
      opacity: currentOpacity,
      glowColor: currentColor,
    });
  };

  const applyBrushColorVars = () => {
    document.documentElement.style.setProperty('--brush-color', currentColor);
    document.documentElement.style.setProperty(
      '--brush-color-alpha',
      hexWithAlpha(currentColor, 0.2)
    );
  };

  brushSizeInput.addEventListener('input', () => {
    currentSize = parseInt(brushSizeInput.value, 10);
    brushSizeValue.textContent = String(currentSize);
    emitBrushChange();
  });

  brushOpacityInput.addEventListener('input', () => {
    currentOpacity = parseInt(brushOpacityInput.value, 10) / 100;
    brushOpacityValue.textContent = `${brushOpacityInput.value}%`;
    emitBrushChange();
  });

  clearBtn.addEventListener('click', () => {
    callbacks.onClear();
  });

  generateBtn.addEventListener('click', () => {
    let pulseCount = 0;
    const pulse = () => {
      pulseCount++;
      flashOverlay.style.transition = 'opacity 0.15s ease-out';
      flashOverlay.style.opacity = '0.7';
      setTimeout(() => {
        flashOverlay.style.opacity = '0';
        if (pulseCount < 2) {
          setTimeout(pulse, 100);
        } else {
          setTimeout(() => {
            callbacks.onGenerate();
            flashOverlay.style.transition = '';
          }, 300);
        }
      }, 150);
    };
    pulse();
  });

  palette.forEach((color, idx) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (idx === 0 ? ' active selected-ring' : '');
    swatch.style.background = color;
    swatch.style.setProperty('--swatch-color', color);
    swatch.dataset.color = color;

    swatch.addEventListener('click', () => {
      currentColor = color;
      buildingGlowColor = getComplementaryColor(color);
      applyBrushColorVars();

      document.querySelectorAll('.color-swatch').forEach((el) => {
        el.classList.remove('active', 'selected-ring');
      });
      swatch.classList.add('active', 'selected-ring');
      emitBrushChange();
    });

    colorPalette.appendChild(swatch);
  });

  applyBrushColorVars();
  emitBrushChange();

  return {
    getBrush: () => ({
      size: currentSize,
      color: currentColor,
      opacity: currentOpacity,
      glowColor: currentColor,
    }),
    setBuildingGlowColor: (color: string) => {
      buildingGlowColor = color;
    },
    palette,
  };
}
