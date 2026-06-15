import { ColorTheme } from './particleSystem';

interface ThemeConfig {
  key: ColorTheme;
  label: string;
  colors: string[];
}

const THEMES: ThemeConfig[] = [
  { key: 'rainbow', label: '彩虹', colors: ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff'] },
  { key: 'fire',    label: '火焰', colors: ['#ff0000', '#ff6a00', '#ffb300', '#fff200'] },
  { key: 'ocean',   label: '海洋', colors: ['#03045e', '#023e8a', '#0096c7', '#00b4d8', '#48cae4'] },
  { key: 'forest',  label: '森林', colors: ['#1b4332', '#2d6a4f', '#40916c', '#52b788', '#95d5b2'] },
];

export function setupUI(
  onClear: () => void,
  onThemeChange: (theme: ColorTheme) => void
): void {
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', onClear);
  }

  const themesContainer = document.getElementById('color-themes');
  if (!themesContainer) return;

  let currentTheme: ColorTheme = 'rainbow';

  THEMES.forEach((theme, idx) => {
    const btn = document.createElement('button');
    btn.className = 'theme-btn' + (idx === 0 ? ' active' : '');
    btn.dataset.theme = theme.key;

    const dots = document.createElement('span');
    dots.className = 'theme-dots';
    theme.colors.forEach((c) => {
      const dot = document.createElement('span');
      dot.className = 'theme-dot';
      dot.style.background = c;
      dots.appendChild(dot);
    });

    const label = document.createElement('span');
    label.textContent = theme.label;

    btn.appendChild(dots);
    btn.appendChild(label);

    btn.addEventListener('click', () => {
      if (currentTheme === theme.key) return;
      currentTheme = theme.key;
      document.querySelectorAll('.theme-btn').forEach((el) => {
        el.classList.remove('active');
      });
      btn.classList.add('active');
      onThemeChange(theme.key);
    });

    themesContainer.appendChild(btn);
  });
}
