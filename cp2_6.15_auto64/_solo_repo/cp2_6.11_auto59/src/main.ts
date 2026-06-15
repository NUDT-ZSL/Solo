import { ArtRenderer } from './renderer';
import { analyzeMood, getComplementary, MoodResult } from './moodEngine';

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: number | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  }) as T;
}

class WeavingDreamApp {
  private renderer: ArtRenderer;
  private diaryInput: HTMLTextAreaElement;
  private generateBtn: HTMLButtonElement;
  private charCount: HTMLElement;
  private currentMoodEl: HTMLElement;
  private currentMoodName: HTMLElement;
  private currentMoodKeywords: HTMLElement;
  private currentMoodResult: MoodResult | null = null;
  private debouncedUpdateBorder: () => void;

  constructor() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('找不到 canvas 元素');
    }

    this.renderer = new ArtRenderer(canvas, 'fps-counter');

    this.diaryInput = document.getElementById('diary-input') as HTMLTextAreaElement;
    this.generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
    this.charCount = document.getElementById('char-count') as HTMLElement;
    this.currentMoodEl = document.getElementById('current-mood') as HTMLElement;
    this.currentMoodName = document.getElementById('current-mood-name') as HTMLElement;
    this.currentMoodKeywords = document.getElementById('current-mood-keywords') as HTMLElement;

    this.debouncedUpdateBorder = debounce(() => this.updateInputBorder(), 300);

    this.bindEvents();
    this.init();
  }

  private bindEvents(): void {
    this.diaryInput.addEventListener('input', () => {
      this.updateCharCount();
      this.debouncedUpdateBorder();
    });

    this.generateBtn.addEventListener('click', () => {
      this.generateArtwork();
    });

    this.diaryInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.generateArtwork();
      }
    });
  }

  private init(): void {
    this.updateCharCount();
    this.renderer.start();

    const defaultMood = analyzeMood('平静 治愈 安宁');
    this.renderer.setMood(defaultMood);
    this.currentMoodResult = defaultMood;
    this.updateMoodDisplay(defaultMood);

    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      const app = document.getElementById('app');
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 800);
      }
      if (app) {
        app.classList.add('ready');
      }
    }, 1200);
  }

  private updateCharCount(): void {
    const count = this.diaryInput.value.length;
    this.charCount.textContent = String(count);
  }

  private updateInputBorder(): void {
    const text = this.diaryInput.value.trim();
    if (text.length > 0) {
      const moodResult = analyzeMood(text);
      const complementColor = getComplementary(moodResult.palette.startColor);
      this.diaryInput.style.borderColor = complementColor;
      this.diaryInput.style.boxShadow = `0 0 0 1px ${complementColor}40, 0 0 20px ${complementColor}10`;
    } else {
      this.diaryInput.style.borderColor = 'rgba(224, 224, 224, 0.15)';
      this.diaryInput.style.boxShadow = 'none';
    }
  }

  private generateArtwork(): void {
    const text = this.diaryInput.value.trim();
    if (text.length < 1) {
      this.diaryInput.focus();
      this.shakeElement(this.diaryInput);
      return;
    }

    this.currentMoodResult = analyzeMood(text);
    this.renderer.setMood(this.currentMoodResult);
    this.updateMoodDisplay(this.currentMoodResult);
    this.pulseButton();
  }

  private updateMoodDisplay(moodResult: MoodResult): void {
    this.currentMoodEl.style.display = 'block';
    this.currentMoodName.textContent = `${moodResult.moodName} · ${moodResult.moodNameEn}`;
    this.currentMoodName.style.color = moodResult.palette.startColor;

    this.currentMoodKeywords.innerHTML = '';
    for (const keyword of moodResult.keywords) {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
      tag.style.borderColor = `${moodResult.palette.startColor}40`;
      tag.style.color = moodResult.palette.startColor;
      tag.textContent = keyword;
      this.currentMoodKeywords.appendChild(tag);
    }
  }

  private shakeElement(el: HTMLElement): void {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
  }

  private pulseButton(): void {
    this.generateBtn.style.animation = 'none';
    this.generateBtn.offsetHeight;
    this.generateBtn.style.animation = 'pulse-btn 0.6s ease';
  }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  @keyframes pulse-btn {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);

window.addEventListener('DOMContentLoaded', () => {
  try {
    new WeavingDreamApp();
  } catch (error) {
    console.error('织梦日记启动失败:', error);
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      const loadingText = loadingScreen.querySelector('.loading-text');
      if (loadingText) {
        loadingText.textContent = '启动失败，请刷新重试';
      }
    }
  }
});
