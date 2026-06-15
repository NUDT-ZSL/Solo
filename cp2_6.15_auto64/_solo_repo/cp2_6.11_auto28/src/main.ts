import { BadgeEngine, StyleType } from './badgeEngine';

function initApp(): void {
  const loading = document.getElementById('loading') as HTMLDivElement;
  const textInput = document.getElementById('textInput') as HTMLInputElement;
  const styleButtons = document.querySelectorAll('.style-btn') as NodeListOf<HTMLButtonElement>;
  const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
  const canvas = document.getElementById('badgeCanvas') as HTMLCanvasElement;
  const badgeContainer = document.querySelector('.badge-container') as HTMLDivElement;

  const engine = new BadgeEngine(canvas);
  engine.start();

  engine.generate('Badge');

  function updateCanvasSize(): void {
    const containerWidth = badgeContainer.clientWidth;
    const containerHeight = badgeContainer.clientHeight;
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    engine.resize(containerWidth, containerHeight);
  }

  updateCanvasSize();
  window.addEventListener('resize', updateCanvasSize);

  function setActiveStyle(style: StyleType): void {
    styleButtons.forEach(btn => {
      btn.classList.remove('active-minimal', 'active-cyber', 'active-nature');
      const btnStyle = btn.dataset.style as StyleType;
      if (btnStyle === style) {
        btn.classList.add(`active-${style}`);
      }
    });
    engine.setStyle(style);
  }

  styleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const style = btn.dataset.style as StyleType;
      setActiveStyle(style);
    });
  });

  function handleGenerate(): void {
    const text = textInput.value.trim();
    if (text) {
      engine.generate(text);
    }
  }

  textInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  });

  textInput.addEventListener('input', () => {
    if (textInput.value.trim()) {
      handleGenerate();
    }
  });

  exportBtn.addEventListener('click', () => {
    try {
      const blob = engine.exportPNG();
      const timestamp = Date.now();
      const filename = `badge_${timestamp}.png`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  });

  setTimeout(() => {
    loading.classList.add('hidden');
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
