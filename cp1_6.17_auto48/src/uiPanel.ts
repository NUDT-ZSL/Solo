import * as THREE from 'three';
import { ZodiacManager } from './zodiacManager';
import constellationsData from './data/constellations';

export class UIPanel {
  private container: HTMLElement;
  private panel: HTMLElement | null = null;
  private dateOverlay: HTMLElement | null = null;
  private isVisible = false;
  private zodiacManager: ZodiacManager;
  private onCollect: ((id: string) => void) | null = null;

  private isSpeaking = false;
  private speechUtterance: SpeechSynthesisUtterance | null = null;
  private cnSentences: string[] = [];
  private enSentences: string[] = [];
  private currentSentenceIndex = 0;
  private mythCnEl: HTMLElement | null = null;
  private mythEnEl: HTMLElement | null = null;
  private readBtn: HTMLElement | null = null;
  private useChineseVoice = true;

  private toastEl: HTMLElement | null = null;

  constructor(container: HTMLElement, zodiacManager: ZodiacManager) {
    this.container = container;
    this.zodiacManager = zodiacManager;
  }

  setOnCollect(cb: (id: string) => void) {
    this.onCollect = cb;
  }

  show(constellationId: string) {
    this.stopSpeaking();
    this.hide();

    const data = this.zodiacManager.getConstellationData(constellationId);
    if (!data) return;

    this.cnSentences = this.splitSentences(data.mythology.chinese);
    this.enSentences = this.splitSentences(data.mythology.greek);
    this.currentSentenceIndex = 0;

    this.panel = document.createElement('div');
    this.panel.className = 'info-panel';
    this.panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title-group">
          <h2 class="panel-title">${data.nameCN}</h2>
          <span class="panel-subtitle">${data.nameEN}</span>
        </div>
        <button class="panel-close" aria-label="关闭">&times;</button>
      </div>
      <div class="panel-body">
        <div class="panel-section">
          <h3 class="section-title">主星信息</h3>
          <div class="star-info">
            <div class="star-info-row">
              <span class="info-label">星名</span>
              <span class="info-value">${data.brightestStar.nameCN} (${data.brightestStar.nameEN})</span>
            </div>
            <div class="star-info-row">
              <span class="info-label">光谱类型</span>
              <span class="info-value">${data.brightestStar.spectralType}</span>
            </div>
            <div class="star-info-row">
              <span class="info-label">视星等</span>
              <span class="info-value">${data.brightestStar.magnitude}</span>
            </div>
          </div>
        </div>
        <div class="panel-section">
          <h3 class="section-title">星座线稿</h3>
          <canvas class="line-art-canvas" width="280" height="200"></canvas>
        </div>
        <div class="panel-section">
          <div class="section-header">
            <h3 class="section-title">神话传说</h3>
            <button class="btn-read" aria-label="朗读">
              <span class="read-icon">🔊</span>
              <span class="read-text">朗读</span>
            </button>
          </div>
          <div class="mythology-text">
            <p class="myth-cn">${this.buildSentenceHtml(this.cnSentences, 'cn')}</p>
            <hr class="myth-divider">
            <p class="myth-en">${this.buildSentenceHtml(this.enSentences, 'en')}</p>
          </div>
        </div>
        <div class="panel-actions">
          <button class="btn btn-collect" data-id="${data.id}">
            ${this.zodiacManager.isCollected(data.id) ? '✓ 已收集' : '收集星图碎片'}
          </button>
          <button class="btn btn-anim">播放今日视运动</button>
          <button class="btn btn-share">
            <span style="margin-right: 6px;">📤</span>分享
          </button>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .info-panel {
        position: absolute;
        top: 0;
        right: 0;
        width: 380px;
        height: 100%;
        background: rgba(20, 20, 40, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-left: 1px solid rgba(255,255,255,0.1);
        color: #B0C4DE;
        font-family: 'Noto Sans SC', sans-serif;
        overflow-y: auto;
        padding: 24px;
        animation: panelSlideIn 0.4s ease-out;
        z-index: 100;
      }
      @keyframes panelSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      .panel-title {
        font-family: 'Noto Serif SC', 'Cinzel', serif;
        font-size: 28px;
        font-weight: 700;
        color: #FFFFFF;
        margin: 0;
        line-height: 1.3;
      }
      .panel-subtitle {
        font-size: 14px;
        color: #81D4FA;
        font-style: italic;
      }
      .panel-close {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: #B0C4DE;
        font-size: 20px;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .panel-close:hover {
        background: rgba(255,255,255,0.2);
        border-color: #81D4FA;
      }
      .panel-body { display: flex; flex-direction: column; gap: 20px; }
      .panel-section { }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(129, 212, 250, 0.3);
      }
      .section-title {
        font-family: 'Noto Serif SC', serif;
        font-size: 16px;
        font-weight: 700;
        color: #FFFFFF;
        margin: 0;
        padding: 0;
        border: none;
      }
      .section-header .section-title {
        margin: 0;
        padding: 0;
        border: none;
      }
      .btn-read {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: #B0C4DE;
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
        font-family: 'Noto Sans SC', sans-serif;
      }
      .btn-read:hover {
        background: rgba(255,255,255,0.2);
        border-color: #81D4FA;
        color: #FFFFFF;
      }
      .btn-read.speaking {
        background: rgba(255, 215, 0, 0.15);
        border-color: rgba(255, 215, 0, 0.5);
        color: #FFD700;
      }
      .read-icon { font-size: 14px; }
      .read-text { font-size: 12px; }
      .star-info { display: flex; flex-direction: column; gap: 8px; }
      .star-info-row { display: flex; justify-content: space-between; align-items: center; }
      .info-label { color: #81D4FA; font-size: 13px; }
      .info-value { color: #E0E0E0; font-size: 14px; font-weight: 500; }
      .line-art-canvas {
        width: 100%;
        height: 180px;
        border-radius: 8px;
        background: rgba(10, 10, 30, 0.5);
        border: 1px solid rgba(255,255,255,0.1);
      }
      .mythology-text { line-height: 1.6; font-size: 14px; }
      .myth-cn { color: #B0C4DE; margin: 0 0 12px 0; }
      .myth-en { color: #8899AA; margin: 0; font-style: italic; }
      .myth-divider {
        border: none;
        border-top: 1px solid rgba(129,212,250,0.2);
        margin: 12px 0;
      }
      .sentence {
        transition: background-color 0.3s, color 0.3s;
        border-radius: 3px;
        padding: 0 2px;
      }
      .sentence.highlight {
        background-color: rgba(255, 215, 0, 0.15);
        color: #FFD700;
        text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
      }
      .panel-actions { display: flex; flex-direction: column; gap: 10px; }
      .btn {
        padding: 10px 16px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.1);
        color: #B0C4DE;
        font-family: 'Noto Sans SC', sans-serif;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      }
      .btn:hover {
        background: rgba(255,255,255,0.2);
        border-color: #81D4FA;
        color: #FFFFFF;
      }
      .btn-collect.collected {
        background: rgba(255, 213, 79, 0.15);
        border-color: rgba(255, 213, 79, 0.4);
        color: #FFD54F;
      }
      .btn-share { }
      .toast {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(20, 20, 40, 0.9);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 215, 0, 0.4);
        color: #FFD700;
        padding: 16px 28px;
        border-radius: 10px;
        font-family: 'Noto Sans SC', sans-serif;
        font-size: 14px;
        z-index: 1000;
        animation: toastIn 0.3s ease-out;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      }
      @keyframes toastIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      .toast.out {
        animation: toastOut 0.3s ease-in forwards;
      }
      @keyframes toastOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      }
      @media (max-width: 768px) {
        .info-panel {
          width: 100%;
          height: 100%;
          border-left: none;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
      }
    `;
    this.panel.prepend(style);

    this.drawLineArt(constellationId);

    this.mythCnEl = this.panel.querySelector('.myth-cn');
    this.mythEnEl = this.panel.querySelector('.myth-en');

    const closeBtn = this.panel.querySelector('.panel-close');
    closeBtn?.addEventListener('click', () => this.hide());

    const collectBtn = this.panel.querySelector('.btn-collect');
    collectBtn?.addEventListener('click', () => {
      if (this.zodiacManager.isCollected(constellationId)) return;
      this.zodiacManager.collectConstellation(constellationId);
      if (this.onCollect) this.onCollect(constellationId);
      (collectBtn as HTMLElement).textContent = '✓ 已收集';
      (collectBtn as HTMLElement).classList.add('collected');
    });

    const animBtn = this.panel.querySelector('.btn-anim');
    animBtn?.addEventListener('click', () => {
      this.dispatchEvent('startApparentMotion');
    });

    this.readBtn = this.panel.querySelector('.btn-read');
    this.readBtn?.addEventListener('click', () => {
      if (this.isSpeaking) {
        this.stopSpeaking();
      } else {
        this.startSpeaking();
      }
    });

    const shareBtn = this.panel.querySelector('.btn-share');
    shareBtn?.addEventListener('click', () => {
      this.shareConstellation(constellationId);
    });

    this.container.appendChild(this.panel);
    this.isVisible = true;

    const panelEl = this.panel;
    setTimeout(() => {
      const onClickOutside = (e: MouseEvent) => {
        if (panelEl && !panelEl.contains(e.target as Node)) {
          this.hide();
          document.removeEventListener('click', onClickOutside);
        }
      };
      document.addEventListener('click', onClickOutside);
    }, 100);
  }

  private buildSentenceHtml(sentences: string[], lang: string): string {
    return sentences.map((s, i) =>
      `<span class="sentence" data-lang="${lang}" data-index="${i}">${s}</span>`
    ).join('');
  }

  private splitSentences(text: string): string[] {
    const result: string[] = [];
    let current = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      current += char;
      if (char === '。' || char === '！' || char === '？' || char === '.' || char === '!' || char === '?') {
        if (current.trim()) {
          result.push(current.trim());
        }
        current = '';
      }
    }
    if (current.trim()) {
      result.push(current.trim());
    }
    return result;
  }

  private startSpeaking() {
    if (!window.speechSynthesis) return;

    const text = this.cnSentences.join(' ');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    let zhVoice = voices.find(v => v.lang.includes('zh'));
    if (!zhVoice) {
      zhVoice = voices.find(v => v.lang.includes('en'));
      this.useChineseVoice = false;
    } else {
      this.useChineseVoice = true;
    }
    if (zhVoice) {
      utterance.voice = zhVoice;
      utterance.lang = zhVoice.lang;
    }

    this.currentSentenceIndex = 0;
    this.highlightSentence(0);

    utterance.onboundary = (event) => {
      if (event.name === 'sentence') {
        this.updateHighlightByCharIndex(event.charIndex);
      }
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.clearHighlights();
      this.updateReadButton();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.clearHighlights();
      this.updateReadButton();
    };

    this.speechUtterance = utterance;
    this.isSpeaking = true;
    this.updateReadButton();
    window.speechSynthesis.speak(utterance);

    this.startSentenceTimer();
  }

  private sentenceTimer: number | null = null;
  private sentenceStartTime = 0;
  private totalEstimatedTime = 0;
  private sentenceDurations: number[] = [];

  private startSentenceTimer() {
    if (this.sentenceTimer) {
      clearInterval(this.sentenceTimer);
    }

    const sentences = this.useChineseVoice ? this.cnSentences : this.enSentences;
    const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
    const estimatedTotal = totalChars * 200;
    this.sentenceDurations = sentences.map(s => s.length * 200);

    this.sentenceStartTime = Date.now();
    let elapsed = 0;

    this.sentenceTimer = window.setInterval(() => {
      if (!this.isSpeaking) {
        if (this.sentenceTimer) clearInterval(this.sentenceTimer);
        return;
      }

      elapsed = Date.now() - this.sentenceStartTime;
      let cumulative = 0;
      for (let i = 0; i < sentences.length; i++) {
        cumulative += this.sentenceDurations[i];
        if (elapsed < cumulative) {
          if (this.currentSentenceIndex !== i) {
            this.currentSentenceIndex = i;
            this.highlightSentence(i);
          }
          break;
        }
      }

      if (elapsed > estimatedTotal + 1000) {
        if (this.sentenceTimer) clearInterval(this.sentenceTimer);
      }
    }, 100);
  }

  private updateHighlightByCharIndex(charIndex: number) {
    const sentences = this.useChineseVoice ? this.cnSentences : this.enSentences;
    let cumulative = 0;
    for (let i = 0; i < sentences.length; i++) {
      const sentenceLen = sentences[i].length;
      if (charIndex >= cumulative && charIndex < cumulative + sentenceLen) {
        if (this.currentSentenceIndex !== i) {
          this.currentSentenceIndex = i;
          this.highlightSentence(i);
        }
        break;
      }
      cumulative += sentenceLen + 1;
    }
  }

  private highlightSentence(index: number) {
    if (!this.mythCnEl || !this.mythEnEl) return;

    const cnSpans = this.mythCnEl.querySelectorAll('.sentence');
    const enSpans = this.mythEnEl.querySelectorAll('.sentence');

    cnSpans.forEach(s => s.classList.remove('highlight'));
    enSpans.forEach(s => s.classList.remove('highlight'));

    if (cnSpans[index]) {
      cnSpans[index].classList.add('highlight');
      cnSpans[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (enSpans[index]) {
      enSpans[index].classList.add('highlight');
    }
  }

  private clearHighlights() {
    if (!this.mythCnEl || !this.mythEnEl) return;
    this.mythCnEl.querySelectorAll('.sentence').forEach(s => s.classList.remove('highlight'));
    this.mythEnEl.querySelectorAll('.sentence').forEach(s => s.classList.remove('highlight'));
  }

  private stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.sentenceTimer) {
      clearInterval(this.sentenceTimer);
      this.sentenceTimer = null;
    }
    this.isSpeaking = false;
    this.speechUtterance = null;
    this.clearHighlights();
    this.updateReadButton();
  }

  private updateReadButton() {
    if (!this.readBtn) return;
    const textSpan = this.readBtn.querySelector('.read-text');
    const iconSpan = this.readBtn.querySelector('.read-icon');
    if (this.isSpeaking) {
      this.readBtn.classList.add('speaking');
      if (textSpan) textSpan.textContent = '停止';
      if (iconSpan) iconSpan.textContent = '⏹';
    } else {
      this.readBtn.classList.remove('speaking');
      if (textSpan) textSpan.textContent = '朗读';
      if (iconSpan) iconSpan.textContent = '🔊';
    }
  }

  private shareConstellation(constellationId: string) {
    const data = this.zodiacManager.getConstellationData(constellationId);
    if (!data) return;

    const shareText = `${data.nameCN} (${data.nameEN})\n\n【神话传说】\n${data.mythology.chinese}\n\n—— 星图传说 · 探索星空的奥秘`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(() => {
        this.showToast('✓ 已复制到剪贴板');
      }).catch(() => {
        this.fallbackCopy(shareText);
      });
    } else {
      this.fallbackCopy(shareText);
    }
  }

  private fallbackCopy(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.showToast('✓ 已复制到剪贴板');
    } catch {
      this.showToast('✗ 复制失败');
    }
    document.body.removeChild(textarea);
  }

  private showToast(message: string) {
    if (this.toastEl) {
      this.toastEl.remove();
      this.toastEl = null;
    }

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast';
    this.toastEl.textContent = message;
    document.body.appendChild(this.toastEl);

    setTimeout(() => {
      if (this.toastEl) {
        this.toastEl.classList.add('out');
        setTimeout(() => {
          if (this.toastEl) {
            this.toastEl.remove();
            this.toastEl = null;
          }
        }, 300);
      }
    }, 2000);
  }

  private drawLineArt(constellationId: string) {
    const canvas = this.panel?.querySelector('.line-art-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const data = this.zodiacManager.getConstellationData(constellationId);
    if (!data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (data.sketchPath) {
      ctx.save();
      const tokens = data.sketchPath.split(/\s+/);

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < tokens.length; i++) {
        const cmd = tokens[i];
        if (cmd === 'M' || cmd === 'L') {
          const x = parseFloat(tokens[++i]);
          const y = parseFloat(tokens[++i]);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        } else if (cmd === 'C') {
          for (let k = 0; k < 3; k++) {
            const x = parseFloat(tokens[++i]);
            const y = parseFloat(tokens[++i]);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }

      const padding = 20;
      const rw = maxX - minX;
      const rh = maxY - minY;
      const scale = Math.min((w - padding * 2) / rw, (h - padding * 2) / rh);
      const tx = padding - minX * scale + (w - padding * 2 - rw * scale) / 2;
      const ty = padding - minY * scale + (h - padding * 2 - rh * scale) / 2;

      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      ctx.strokeStyle = '#81D4FA';
      ctx.lineWidth = 1.5 / scale;
      ctx.shadowColor = '#81D4FA';
      ctx.shadowBlur = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let i = 0; i < tokens.length; i++) {
        const cmd = tokens[i];
        if (cmd === 'M') {
          const x = parseFloat(tokens[++i]);
          const y = parseFloat(tokens[++i]);
          ctx.moveTo(x, y);
        } else if (cmd === 'L') {
          const x = parseFloat(tokens[++i]);
          const y = parseFloat(tokens[++i]);
          ctx.lineTo(x, y);
        } else if (cmd === 'C') {
          const cp1x = parseFloat(tokens[++i]); const cp1y = parseFloat(tokens[++i]);
          const cp2x = parseFloat(tokens[++i]); const cp2y = parseFloat(tokens[++i]);
          const x = parseFloat(tokens[++i]); const y = parseFloat(tokens[++i]);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      for (let i = 0; i < 30; i++) {
        const px = 20 + Math.random() * (w - 40);
        const py = 20 + Math.random() * (h - 40);
        const r = 0.8 + Math.random() * 1.5;
        ctx.fillStyle = 'rgba(255, 224, 130,' + (0.3 + Math.random() * 0.4) + ')';
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  showDateOverlay(dateStr: string, constellationName: string) {
    this.hideDateOverlay();
    this.dateOverlay = document.createElement('div');
    this.dateOverlay.className = 'date-overlay';
    this.dateOverlay.innerHTML = `
      <div class="date-text">${dateStr}</div>
      <div class="constellation-text">☀ ${constellationName}</div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .date-overlay {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(20,20,40,0.8);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 12px;
        padding: 12px 20px;
        z-index: 200;
        animation: fadeIn 0.3s ease-out;
      }
      .date-text {
        color: #FFD54F;
        font-size: 16px;
        font-weight: 600;
        font-family: 'Noto Sans SC', sans-serif;
      }
      .constellation-text {
        color: #81D4FA;
        font-size: 14px;
        margin-top: 4px;
        font-family: 'Noto Sans SC', sans-serif;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    this.dateOverlay.prepend(style);
    this.container.appendChild(this.dateOverlay);
  }

  hideDateOverlay() {
    if (this.dateOverlay) {
      this.dateOverlay.remove();
      this.dateOverlay = null;
    }
  }

  hide() {
    this.stopSpeaking();
    if (this.panel) {
      this.panel.style.animation = 'panelSlideOut 0.3s ease-in forwards';
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        @keyframes panelSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      this.panel.appendChild(styleEl);
      setTimeout(() => {
        this.panel?.remove();
        this.panel = null;
      }, 300);
    }
    this.isVisible = false;
  }

  private eventListeners: Map<string, Function[]> = new Map();

  on(event: string, cb: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(cb);
  }

  private dispatchEvent(event: string, data?: any) {
    const listeners = this.eventListeners.get(event) || [];
    for (const cb of listeners) {
      cb(data);
    }
  }
}
