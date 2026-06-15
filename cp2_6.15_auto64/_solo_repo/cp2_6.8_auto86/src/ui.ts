import { CONSTELLATIONS, Constellation } from './constellationData';

export class UIManager {
  private onConstellationSelect: ((id: string) => void) | null = null;
  private onReset: (() => void) | null = null;
  private onToggleMusic: (() => boolean) | null = null;
  private onExport: (() => void) | null = null;
  private currentConstellationId: string | null = null;
  private musicOn: boolean = true;

  constructor() {
    this.initializeConstellationPanel();
    this.initializeBottomBar();
    this.initializeModal();
  }

  private initializeConstellationPanel(): void {
    const grid = document.getElementById('constellation-grid');
    if (!grid) return;

    CONSTELLATIONS.forEach(constellation => {
      const item = document.createElement('div');
      item.className = 'constellation-item';

      const icon = document.createElement('div');
      icon.className = 'constellation-icon';
      icon.dataset.constellationId = constellation.id;
      icon.textContent = constellation.symbol;
      icon.title = constellation.name;

      const name = document.createElement('span');
      name.className = 'constellation-name';
      name.textContent = constellation.name;

      icon.addEventListener('click', () => {
        this.selectConstellation(constellation.id);
      });

      item.appendChild(icon);
      item.appendChild(name);
      grid.appendChild(item);
    });
  }

  private initializeBottomBar(): void {
    const btnReset = document.getElementById('btn-reset');
    const btnMusic = document.getElementById('btn-music');
    const btnExport = document.getElementById('btn-export');

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.animateButton(btnReset);
        if (this.onReset) this.onReset();
        this.currentConstellationId = null;
        this.updateConstellationIcons();
        this.updateHint('从左侧选择一个星座开始探索');
      });
    }

    if (btnMusic) {
      btnMusic.addEventListener('click', () => {
        this.animateButton(btnMusic);
        if (this.onToggleMusic) {
          this.musicOn = this.onToggleMusic();
          btnMusic.textContent = `♪ 音乐：${this.musicOn ? '开启' : '关闭'}`;
        }
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.animateButton(btnExport);
        if (this.onExport) this.onExport();
      });
    }
  }

  private initializeModal(): void {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  private animateButton(btn: HTMLElement): void {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = '';
    }, 150);
  }

  private selectConstellation(id: string): void {
    this.currentConstellationId = id;
    this.updateConstellationIcons();

    const constellation = CONSTELLATIONS.find(c => c.id === id);
    if (constellation) {
      this.updateHint(`正在连接：${constellation.name} — 依次点击相邻的亮星进行连线`);
    }

    if (this.onConstellationSelect) {
      this.onConstellationSelect(id);
    }
  }

  private updateConstellationIcons(): void {
    const icons = document.querySelectorAll<HTMLElement>('.constellation-icon');
    icons.forEach(icon => {
      const id = icon.dataset.constellationId;
      icon.classList.remove('active');
      if (id === this.currentConstellationId) {
        icon.classList.add('active');
      }
    });
  }

  public markConstellationCompleted(id: string): void {
    const icon = document.querySelector<HTMLElement>(
      `.constellation-icon[data-constellation-id="${id}"]`
    );
    if (icon) {
      icon.classList.add('completed');
      icon.classList.remove('active');
    }

    if (this.currentConstellationId === id) {
      this.currentConstellationId = null;
      const constellation = CONSTELLATIONS.find(c => c.id === id);
      if (constellation) {
        this.updateHint(`✨ ${constellation.name}连接完成！点击星座图标查看神话故事，或选择其他星座继续探索`);
      }
    }
  }

  public updateHint(text: string): void {
    const hint = document.getElementById('hint-text');
    if (hint) {
      hint.style.opacity = '0';
      setTimeout(() => {
        hint.textContent = text;
        hint.style.opacity = '1';
      }, 150);
    }
  }

  public openModal(constellation: Constellation): void {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    const illustration = document.getElementById('modal-illustration') as HTMLCanvasElement | null;

    if (overlay) {
      overlay.classList.add('visible');
      setTimeout(() => {
        overlay.style.opacity = '1';
      }, 10);
    }

    if (title) {
      title.textContent = `✦ ${constellation.name} ✦`;
    }

    if (text) {
      text.textContent = constellation.myth;
    }

    if (illustration) {
      this.drawConstellationIllustration(illustration, constellation);
    }
  }

  private closeModal(): void {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.classList.remove('visible');
      }, 300);
    }
  }

  private drawConstellationIllustration(canvas: HTMLCanvasElement, constellation: Constellation): void {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const bgGradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    bgGradient.addColorStop(0, '#1E2952');
    bgGradient.addColorStop(1, '#0A0A12');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.6 + 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#D4A853';
    ctx.fillText(constellation.symbol, w / 2, h / 2 - 10);

    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(constellation.name, w / 2, h / 2 + 30);

    ctx.strokeStyle = 'rgba(212, 168, 83, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, w - 10, h - 10);
  }

  public setOnConstellationSelect(callback: (id: string) => void): void {
    this.onConstellationSelect = callback;
  }

  public setOnReset(callback: () => void): void {
    this.onReset = callback;
  }

  public setOnToggleMusic(callback: () => boolean): void {
    this.onToggleMusic = callback;
  }

  public setOnExport(callback: () => void): void {
    this.onExport = callback;
  }

  public isMusicOn(): boolean {
    return this.musicOn;
  }
}

export class MusicPlayer {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private gainNode: GainNode | null = null;
  private nextNoteTime: number = 0;
  private schedulerTimer: number | null = null;
  private currentNoteIndex: number = 0;

  private melody: { note: number; duration: number }[] = [
    { note: 523.25, duration: 0.4 },
    { note: 587.33, duration: 0.4 },
    { note: 659.25, duration: 0.6 },
    { note: 587.33, duration: 0.4 },
    { note: 523.25, duration: 0.4 },
    { note: 440.00, duration: 0.6 },
    { note: 392.00, duration: 0.4 },
    { note: 440.00, duration: 0.4 },
    { note: 523.25, duration: 0.8 },
    { note: 440.00, duration: 0.4 },
    { note: 392.00, duration: 0.4 },
    { note: 349.23, duration: 0.6 }
  ];

  public start(): void {
    if (this.isPlaying) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.08;
    this.gainNode.connect(this.audioContext.destination);

    this.isPlaying = true;
    this.nextNoteTime = this.audioContext.currentTime;
    this.currentNoteIndex = 0;
    this.scheduler();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.gainNode) {
      this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + 0.3);
      setTimeout(() => {
        if (this.gainNode) {
          this.gainNode.disconnect();
          this.gainNode = null;
        }
      }, 300);
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public isMusicPlaying(): boolean {
    return this.isPlaying;
  }

  private scheduler(): void {
    if (!this.isPlaying || !this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + 0.2) {
      this.playNote(this.nextNoteTime);
      const noteData = this.melody[this.currentNoteIndex];
      this.nextNoteTime += noteData.duration + 0.1;
      this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;
    }

    this.schedulerTimer = window.setTimeout(() => this.scheduler(), 50);
  }

  private playNote(time: number): void {
    if (!this.audioContext || !this.gainNode) return;

    const noteData = this.melody[this.currentNoteIndex];

    const osc = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = noteData.note;

    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(0.15, time + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + noteData.duration);

    osc.connect(noteGain);
    noteGain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + noteData.duration + 0.05);
  }
}
