import { analyzeText, emotionColors, emotionNames } from './analyzer';
import type { EmotionKeyword } from './analyzer';
import { InkRenderer } from './renderer';

let diaryInput: HTMLTextAreaElement;
let wordCountEl: HTMLElement;
let keywordsPanel: HTMLElement;
let canvasHint: HTMLElement;
let exportBtn: HTMLButtonElement;
let resetBtn: HTMLButtonElement;

let renderer: InkRenderer;
let debounceTimer: number | null = null;

function init(): void {
  diaryInput = document.getElementById('diaryInput') as HTMLTextAreaElement;
  wordCountEl = document.getElementById('wordCount') as HTMLElement;
  keywordsPanel = document.getElementById('keywordsPanel') as HTMLElement;
  canvasHint = document.getElementById('canvasHint') as HTMLElement;
  exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
  resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

  const canvas = document.getElementById('inkCanvas') as HTMLCanvasElement;
  renderer = new InkRenderer(canvas);

  bindEvents();
  updateWordCount();
}

function bindEvents(): void {
  diaryInput.addEventListener('input', handleInput);
  exportBtn.addEventListener('click', handleExport);
  resetBtn.addEventListener('click', handleReset);

  window.addEventListener('resize', () => {
    renderer.resize();
    if (diaryInput.value.trim().length > 0) {
      const result = analyzeText(diaryInput.value);
      renderer.setAnalysis(result);
    }
  });
}

function handleInput(): void {
  updateWordCount();

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    performAnalysis();
  }, 200);
}

function updateWordCount(): void {
  const count = diaryInput.value.length;
  wordCountEl.textContent = String(count);
}

function performAnalysis(): void {
  const text = diaryInput.value.trim();

  if (text.length === 0) {
    renderer.clear();
    keywordsPanel.innerHTML = '';
    canvasHint.classList.remove('hidden');
    return;
  }

  canvasHint.classList.add('hidden');

  const result = analyzeText(text);
  renderer.setAnalysis(result);
  renderKeywords(result.totalKeywords);
}

function renderKeywords(keywords: EmotionKeyword[]): void {
  keywordsPanel.innerHTML = '';

  const seen = new Set<string>();
  const uniqueKeywords: EmotionKeyword[] = [];

  for (const kw of keywords) {
    if (!seen.has(kw.word)) {
      seen.add(kw.word);
      uniqueKeywords.push(kw);
    }
  }

  if (uniqueKeywords.length === 0) {
    const empty = document.createElement('span');
    empty.style.color = '#B8A898';
    empty.style.fontSize = '14px';
    empty.textContent = '暂未识别到情绪关键词';
    empty.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    keywordsPanel.appendChild(empty);
    return;
  }

  for (const kw of uniqueKeywords) {
    const tag = document.createElement('span');
    tag.className = 'keyword-tag';

    const dot = document.createElement('span');
    dot.className = 'keyword-dot';
    dot.style.backgroundColor = emotionColors[kw.emotion];

    const text = document.createTextNode(`${kw.word}·${emotionNames[kw.emotion]}`);

    tag.appendChild(dot);
    tag.appendChild(text);
    keywordsPanel.appendChild(tag);
  }
}

function handleExport(): void {
  const dataUrl = renderer.exportPNG();

  const link = document.createElement('a');
  link.download = `墨韵日记_${formatDate()}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleReset(): void {
  diaryInput.value = '';
  updateWordCount();
  renderer.clear();
  keywordsPanel.innerHTML = '';
  canvasHint.classList.remove('hidden');
}

function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
