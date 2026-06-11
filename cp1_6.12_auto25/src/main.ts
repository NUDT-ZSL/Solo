import { ParticleSystem, ParticleSystemConfig, ThemeName } from './particleSystem';
import { ControlPanel } from './controlPanel';

const DEFAULT_CONFIG: ParticleSystemConfig = {
  particleCount: 2000,
  theme: 'nebulaPurple',
  forceStrength: 0.5,
  mouseInteraction: true
};

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const particleSystem = new ParticleSystem(canvas, DEFAULT_CONFIG);

  const callbacks = {
    onParticleCountChange: (count: number) => {
      particleSystem.setParticleCount(count);
    },
    onThemeChange: (theme: ThemeName) => {
      particleSystem.setTheme(theme);
    },
    onForceStrengthChange: (strength: number) => {
      particleSystem.setForceStrength(strength);
    },
    onMouseInteractionToggle: (enabled: boolean) => {
      particleSystem.setMouseInteraction(enabled);
    }
  };

  const controlPanel = new ControlPanel(
    document.body,
    callbacks,
    DEFAULT_CONFIG.theme,
    DEFAULT_CONFIG.particleCount,
    DEFAULT_CONFIG.forceStrength,
    DEFAULT_CONFIG.mouseInteraction
  );

  const fpsUpdateInterval = window.setInterval(() => {
    controlPanel.updateFPS(particleSystem.getFPS());
  }, 500);

  let resizeTimeoutId: number | null = null;
  const handleResize = (): void => {
    if (resizeTimeoutId !== null) {
      clearTimeout(resizeTimeoutId);
    }
    resizeTimeoutId = window.setTimeout(() => {
      particleSystem.resize();
    }, 100);
  };
  window.addEventListener('resize', handleResize);

  const handleMouseMove = (e: MouseEvent): void => {
    particleSystem.handleMouseMove(e.clientX, e.clientY);
  };

  const handleMouseLeave = (): void => {
    particleSystem.handleMouseLeave();
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      particleSystem.handleTouchMove(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (): void => {
    particleSystem.handleTouchEnd();
  };

  window.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('touchmove', handleTouchMove, { passive: true });
  window.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('touchcancel', handleTouchEnd);

  particleSystem.start();

  window.addEventListener('beforeunload', () => {
    clearInterval(fpsUpdateInterval);
    particleSystem.stop();
    controlPanel.destroy();
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseleave', handleMouseLeave);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('touchcancel', handleTouchEnd);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
