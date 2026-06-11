import { analyzeText, getAllKeywords, getEmotionColor } from './analyzer';
import type { EmotionKeyword } from './analyzer';
import { Renderer } from './renderer';

class App {
  private diaryInput: HTMLTextAreaElement;
  private charCount: HTMLSpanElement;
  private keywordsList: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private canvasPlaceholder: HTMLDivElement;
  private exportBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private renderer: Renderer;
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 200;
  private readonly MIN_CHARS = 50;
  private readonly MAX_CHARS = 500;

  constructor() {
    const diaryInput = document.getElementById('diaryInput') as HTMLTextAreaElement;
    const charCount = document.getElementById('charCount') as HTMLSpanElement;
    const keywordsList = document.getElementById('keywordsList') as HTMLDivElement;
    const canvas = document.getElementById('inkCanvas') as HTMLCanvasElement;
    const canvasPlaceholder = document.getElementById('canvasPlaceholder') as HTMLDivElement;
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    if (!diaryInput || !charCount || !keywordsList || !canvas || !canvasPlaceholder || !exportBtn || !resetBtn) {
      throw new Error('Required DOM elements not found');
    }

    this.diaryInput = diaryInput;
    this.charCount = charCount;
    this.keywordsList = keywordsList;
    this.canvas = canvas;
    this.canvasPlaceholder = canvasPlaceholder;
    this.exportBtn = exportBtn;
    this.resetBtn = resetBtn;
    this.renderer = new Renderer(canvas);

    this.bindEvents();
    this.renderer.startAnimationLoop();
    this.updateCharCount();
  }

  private bindEvents(): void {
    this.diaryInput.addEventListener('input', () => this.handleTextInput());
    
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleCanvasTouchMove(e), { passive: true });
    
    this.exportBtn.addEventListener('click', () => this.handleExport());
    this.resetBtn.addEventListener('click', () => this.handleReset());
  }

  private handleTextInput(): void {
    this.updateCharCount();
    
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      this.processText();
    }, this.DEBOUNCE_DELAY);
  }

  private updateCharCount(): void {
    const length = this.diaryInput.value.length;
    this.charCount.textContent = `${length} / ${this.MAX_CHARS}`;
    
    if (length > this.MAX_CHARS) {
      this.charCount.classList.add('warning');
    } else {
      this.charCount.classList.remove('warning');
    }
  }

  private processText(): void {
    const text = this.diaryInput.value.trim();
    
    if (text.length < this.MIN_CHARS) {
      this.renderer.reset();
      this.updateKeywordsDisplay([]);
      this.showPlaceholder(true);
      return;
    }
    
    const result = analyzeText(text);
    this.renderer.updateAnalysis(result);
    
    const allKeywords = getAllKeywords(result);
    this.updateKeywordsDisplay(allKeywords);
    
    this.showPlaceholder(allKeywords.length === 0);
  }

  private updateKeywordsDisplay(keywords: EmotionKeyword[]): void {
    this.keywordsList.innerHTML = '';
    
    if (keywords.length === 0) {
      const emptySpan = document.createElement('span');
      emptySpan.style.color = '#B8A898';
      emptySpan.style.fontSize = '13px';
      emptySpan.textContent = '输入文字后将显示识别到的情绪关键词';
      this.keywordsList.appendChild(emptySpan);
      return;
    }
    
    const seen = new Set<string>();
    const uniqueKeywords = keywords.filter(kw => {
      const key = `${kw.word}-${kw.emotion}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    for (const kw of uniqueKeywords.slice(0, 15)) {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
      
      const dot = document.createElement('span');
      dot.className = 'keyword-dot';
      dot.style.backgroundColor = getEmotionColor(kw.emotion);
      
      const text = document.createElement('span');
      text.textContent = kw.word;
      
      tag.appendChild(dot);
      tag.appendChild(text);
      this.keywordsList.appendChild(tag);
    }
  }

  private handleCanvasMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.renderer.handleMouseMove(x, y);
  }

  private handleCanvasTouchMove(e: TouchEvent): void {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.renderer.handleMouseMove(x, y);
    }
  }

  private handleExport(): void {
    if (!this.renderer.hasContent()) {
      alert('请先输入日记文字生成插画后再导出');
      return;
    }
    
    try {
      const dataUrl = this.renderer.exportPNG();
      const link = document.createElement('a');
      link.download = `情绪墨水日记_${this.getTimestamp()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    }
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  }

  private handleReset(): void {
    if (this.diaryInput.value.length > 0 || this.renderer.hasContent()) {
      if (!confirm('确定要重置吗？当前的文字和插画将被清空。')) {
        return;
      }
    }
    
    this.diaryInput.value = '';
    this.updateCharCount();
    this.renderer.reset();
    this.updateKeywordsDisplay([]);
    this.showPlaceholder(true);
  }

  private showPlaceholder(show: boolean): void {
    this.canvasPlaceholder.style.display = show ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});
