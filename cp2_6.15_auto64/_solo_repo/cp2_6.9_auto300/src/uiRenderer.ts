import type { FragmentData, Poem } from './poemEngine';

export interface FragmentPosition {
  id: string;
  x: number;
  y: number;
}

export interface GroupState {
  id: string;
  fragmentIds: string[];
  x: number;
  y: number;
  poemId: number;
}

interface InkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
}

type AnimationType = 'idle' | 'moon' | 'water' | 'mountain' | 'birds' | 'scroll';

export class UIRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fragmentsLayer: HTMLElement;
  private fragmentElements: Map<string, HTMLElement> = new Map();
  private groupElements: Map<string, HTMLElement> = new Map();
  private poemCardElements: Map<number, HTMLElement> = new Map();
  private draggingId: string | null = null;
  private isDraggingGroup: boolean = false;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private animationId: number = 0;
  private inkParticles: InkParticle[] = [];
  private animationType: AnimationType = 'idle';
  private animationStartTime: number = 0;
  private animationDuration: number = 5000;
  private scrollOffset: number = 0;
  private noiseData: { x: number; y: number; size: number; opacity: number }[] = [];
  private audioContext: AudioContext | null = null;
  private baseFragmentSize: number = 40;
  private fragmentSize: number = 40;

  constructor(canvas: HTMLCanvasElement, fragmentsLayer: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    this.ctx = ctx;
    this.fragmentsLayer = fragmentsLayer;
    this.resizeCanvas();
    this.generateNoise();
    this.initAudio();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private playSnapSound(): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.08);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  private playCompleteSound(): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const ctx = this.audioContext;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.25);
    });
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    const width = Math.min(window.innerWidth, 1440);
    const scale = Math.max(0.8, Math.min(1, width / 1440));
    this.fragmentSize = this.baseFragmentSize * scale;
  }

  private generateNoise(): void {
    this.noiseData = [];
    const rect = this.canvas.getBoundingClientRect();
    const count = Math.floor((rect.width * rect.height) / 15000);
    for (let i = 0; i < count; i++) {
      this.noiseData.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.08 + 0.02
      });
    }
  }

  getFragmentSize(): number {
    return this.fragmentSize;
  }

  renderIdleBackground(): void {
    this.animationType = 'idle';
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, '#D0D8E0');
    gradient.addColorStop(1, '#B8C5D0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);
    this.drawInkNoise();
    this.drawFaintMountains(rect.width, rect.height);
  }

  private drawInkNoise(): void {
    const ctx = this.ctx;
    for (const dot of this.noiseData) {
      ctx.fillStyle = `rgba(60, 60, 60, ${dot.opacity})`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFaintMountains(w: number, h: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(120, 130, 140, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.quadraticCurveTo(w * 0.15, h * 0.4, w * 0.3, h * 0.55);
    ctx.quadraticCurveTo(w * 0.45, h * 0.35, w * 0.6, h * 0.5);
    ctx.quadraticCurveTo(w * 0.75, h * 0.3, w * 0.9, h * 0.5);
    ctx.lineTo(w, h * 0.45);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  startPoemAnimation(poem: Poem): void {
    this.animationType = this.getAnimationTypeForPoem(poem);
    this.animationStartTime = performance.now();
    this.animationDuration = 5000;
    this.inkParticles = [];
    this.playCompleteSound();
    this.spawnInkParticles(this.animationType);
  }

  private getAnimationTypeForPoem(poem: Poem): AnimationType {
    const text = poem.text;
    if (text.includes('月')) return 'moon';
    if (text.includes('河') || text.includes('海') || text.includes('流')) return 'water';
    if (text.includes('山') || text.includes('楼')) return 'mountain';
    if (text.includes('鸟') || text.includes('春')) return 'birds';
    return 'moon';
  }

  private spawnInkParticles(type: AnimationType): void {
    const rect = this.canvas.getBoundingClientRect();
    const count = Math.min(100, 60);
    for (let i = 0; i < count; i++) {
      let x: number, y: number, vx: number, vy: number;
      switch (type) {
        case 'moon':
          x = rect.width * 0.75 + (Math.random() - 0.5) * 80;
          y = rect.height * 0.25 + (Math.random() - 0.5) * 80;
          vx = (Math.random() - 0.5) * 0.3;
          vy = (Math.random() - 0.5) * 0.3;
          break;
        case 'water':
          x = rect.width + Math.random() * rect.width;
          y = rect.height * (0.4 + Math.random() * 0.4);
          vx = -(1 + Math.random() * 1.5);
          vy = (Math.random() - 0.5) * 0.2;
          break;
        case 'mountain':
          x = Math.random() * rect.width;
          y = rect.height + Math.random() * 100;
          vx = (Math.random() - 0.5) * 0.2;
          vy = -(0.5 + Math.random() * 0.5);
          break;
        case 'birds':
          x = Math.random() * rect.width;
          y = Math.random() * rect.height * 0.6;
          vx = (Math.random() * 2 - 0.5);
          vy = (Math.random() - 0.5) * 0.5;
          break;
        default:
          x = Math.random() * rect.width;
          y = Math.random() * rect.height;
          vx = (Math.random() - 0.5) * 0.5;
          vy = (Math.random() - 0.5) * 0.5;
      }
      this.inkParticles.push({
        x, y, vx, vy,
        life: 1,
        maxLife: 3000 + Math.random() * 2000,
        size: 2 + Math.random() * 4,
        opacity: 0.3 + Math.random() * 0.4
      });
    }
  }

  startScrollAnimation(): void {
    this.animationType = 'scroll';
    this.scrollOffset = 0;
  }

  private drawAnimationFrame(now: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;
    
    this.renderIdleBackground();
    
    const elapsed = now - this.animationStartTime;
    const progress = Math.min(1, elapsed / this.animationDuration);
    
    if (this.animationType === 'scroll') {
      this.drawScroll(now);
      return;
    }
    
    if (this.animationType === 'moon') {
      const moonOpacity = Math.min(1, progress * 2);
      ctx.save();
      ctx.globalAlpha = moonOpacity * 0.8;
      const moonX = rect.width * 0.75;
      const moonY = rect.height * 0.25;
      const moonR = Math.min(rect.width, rect.height) * 0.08;
      const moonGrad = ctx.createRadialGradient(moonX, moonY, moonR * 0.2, moonX, moonY, moonR);
      moonGrad.addColorStop(0, 'rgba(255, 252, 240, 1)');
      moonGrad.addColorStop(0.7, 'rgba(255, 248, 220, 0.6)');
      moonGrad.addColorStop(1, 'rgba(200, 190, 170, 0)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    if (this.animationType === 'water') {
      ctx.save();
      ctx.strokeStyle = `rgba(60, 70, 80, ${0.4 * (1 - progress * 0.5)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const yBase = rect.height * (0.5 + i * 0.05);
        const offset = (now / 20 + i * 50) % rect.width;
        ctx.moveTo(rect.width - offset, yBase);
        for (let x = rect.width - offset; x > -100; x -= 20) {
          const wave = Math.sin((x + now / 15) / 60) * 8;
          ctx.lineTo(x, yBase + wave);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    
    if (this.animationType === 'mountain') {
      const mountainOpacity = Math.min(1, progress * 1.5);
      ctx.save();
      ctx.fillStyle = `rgba(70, 75, 85, ${0.35 * mountainOpacity})`;
      ctx.beginPath();
      ctx.moveTo(0, rect.height * 0.7);
      const peaks = 6;
      for (let i = 0; i <= peaks; i++) {
        const x = (i / peaks) * rect.width;
        const peakHeight = rect.height * (0.3 + (i % 2 === 0 ? 0.15 : 0.25));
        const peakY = rect.height * 0.7 - peakHeight * mountainOpacity;
        if (i === 0) ctx.lineTo(x, peakY + peakHeight * mountainOpacity);
        else ctx.quadraticCurveTo(x - rect.width / peaks / 2, peakY - 10, x, peakY + peakHeight * mountainOpacity * 0.3);
      }
      ctx.lineTo(rect.width, rect.height);
      ctx.lineTo(0, rect.height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    
    if (this.animationType === 'birds') {
      ctx.save();
      ctx.strokeStyle = `rgba(40, 40, 40, ${0.6 * (1 - progress * 0.5)})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const bx = (rect.width * 0.1 + (now / 30 + i * 120) % (rect.width * 0.8));
        const by = rect.height * (0.15 + i * 0.06) + Math.sin(now / 300 + i) * 10;
        ctx.beginPath();
        const wingSize = 6 + Math.sin(now / 100 + i) * 3;
        ctx.moveTo(bx - wingSize, by + wingSize / 2);
        ctx.quadraticCurveTo(bx, by - wingSize / 2, bx + wingSize, by + wingSize / 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    
    this.updateAndDrawParticles(now);
  }

  private updateAndDrawParticles(now: number): void {
    const ctx = this.ctx;
    this.inkParticles = this.inkParticles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 16;
      const opacity = Math.max(0, (p.life / p.maxLife)) * p.opacity;
      if (opacity <= 0) return false;
      ctx.fillStyle = `rgba(50, 55, 65, ${opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
  }

  private drawScroll(now: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;
    this.scrollOffset = (now / 1000) * 1;
    
    ctx.fillStyle = '#F5F0E0';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    const sceneWidth = rect.width * 0.8;
    const sceneHeight = rect.height * 0.7;
    const sceneY = (rect.height - sceneHeight) / 2;
    
    const totalWidth = sceneWidth * 5;
    const startX = -this.scrollOffset % totalWidth;
    
    for (let scene = 0; scene < 5; scene++) {
      const baseX = startX + scene * sceneWidth;
      const gradient = ctx.createLinearGradient(baseX, sceneY, baseX, sceneY + sceneHeight);
      gradient.addColorStop(0, '#D0D8E0');
      gradient.addColorStop(1, '#B8C5D0');
      ctx.fillStyle = gradient;
      ctx.fillRect(baseX, sceneY, sceneWidth - 10, sceneHeight);
      
      ctx.fillStyle = 'rgba(70, 80, 90, 0.4)';
      ctx.beginPath();
      ctx.moveTo(baseX, sceneY + sceneHeight * 0.7);
      for (let i = 0; i <= 4; i++) {
        const px = baseX + (i / 4) * sceneWidth;
        const py = sceneY + sceneHeight * (0.7 - (scene + i) % 3 * 0.15 - 0.1);
        ctx.quadraticCurveTo(px - sceneWidth / 8, py - sceneHeight * 0.1, px, py + sceneHeight * 0.05);
      }
      ctx.lineTo(baseX + sceneWidth, sceneY + sceneHeight);
      ctx.lineTo(baseX, sceneY + sceneHeight);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, sceneY - 8, rect.width, 8);
    ctx.fillRect(0, sceneY + sceneHeight, rect.width, 8);
  }

  startRenderLoop(): void {
    const loop = (now: number) => {
      if (this.animationType === 'idle') {
        this.renderIdleBackground();
      } else {
        this.drawAnimationFrame(now);
      }
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stopRenderLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  createFragments(
    fragments: FragmentData[],
    positions: Map<string, { x: number; y: number }>,
    onDragStart: (id: string, e: PointerEvent) => void,
    onDragMove: (e: PointerEvent) => void,
    onDragEnd: (e: PointerEvent) => void
  ): void {
    this.clearFragments();
    const fragmentSize = this.fragmentSize;
    
    for (const frag of fragments) {
      const pos = positions.get(frag.id) || { x: 100, y: 100 };
      const el = document.createElement('div');
      el.className = 'fragment';
      el.dataset.id = frag.id;
      el.textContent = frag.char;
      el.style.width = fragmentSize + 'px';
      el.style.height = fragmentSize + 'px';
      el.style.fontSize = (fragmentSize * 0.6) + 'px';
      el.style.left = pos.x + 'px';
      el.style.top = pos.y + 'px';
      
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        onDragStart(frag.id, e as PointerEvent);
      });
      
      this.fragmentsLayer.appendChild(el);
      this.fragmentElements.set(frag.id, el);
    }
    
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  }

  clearFragments(): void {
    for (const el of this.fragmentElements.values()) {
      el.remove();
    }
    for (const el of this.groupElements.values()) {
      el.remove();
    }
    this.fragmentElements.clear();
    this.groupElements.clear();
  }

  setDragging(id: string, offsetX: number, offsetY: number, isGroup: boolean = false): void {
    this.draggingId = id;
    this.dragOffsetX = offsetX;
    this.dragOffsetY = offsetY;
    this.isDraggingGroup = isGroup;
    if (isGroup) {
      const el = this.groupElements.get(id);
      if (el) el.classList.add('dragging');
    } else {
      const el = this.fragmentElements.get(id);
      if (el) el.classList.add('dragging');
    }
  }

  updateFragmentPosition(id: string, x: number, y: number): void {
    const el = this.fragmentElements.get(id);
    if (el) {
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }
  }

  updateGroupPosition(id: string, x: number, y: number): void {
    const el = this.groupElements.get(id);
    if (el) {
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }
  }

  getFragmentPosition(id: string): { x: number; y: number } | null {
    const el = this.fragmentElements.get(id);
    if (!el) return null;
    return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
  }

  getGroupPosition(id: string): { x: number; y: number } | null {
    const el = this.groupElements.get(id);
    if (!el) return null;
    return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
  }

  clearDragging(): void {
    if (this.draggingId) {
      if (this.isDraggingGroup) {
        const el = this.groupElements.get(this.draggingId);
        if (el) el.classList.remove('dragging');
      } else {
        const el = this.fragmentElements.get(this.draggingId);
        if (el) el.classList.remove('dragging');
      }
    }
    this.draggingId = null;
    this.isDraggingGroup = false;
  }

  isDragging(): boolean {
    return this.draggingId !== null;
  }

  getDragOffset(): { x: number; y: number } {
    return { x: this.dragOffsetX, y: this.dragOffsetY };
  }

  createGroup(groupId: string, fragments: FragmentData[], x: number, y: number): void {
    const fragmentSize = this.fragmentSize;
    const groupEl = document.createElement('div');
    groupEl.className = 'fragment-group';
    groupEl.dataset.id = groupId;
    groupEl.style.left = x + 'px';
    groupEl.style.top = y + 'px';
    
    for (const frag of fragments) {
      const charEl = document.createElement('div');
      charEl.className = 'fragment';
      charEl.textContent = frag.char;
      charEl.style.width = fragmentSize + 'px';
      charEl.style.height = fragmentSize + 'px';
      charEl.style.fontSize = (fragmentSize * 0.6) + 'px';
      charEl.style.pointerEvents = 'none';
      groupEl.appendChild(charEl);
    }
    
    this.fragmentsLayer.appendChild(groupEl);
    this.groupElements.set(groupId, groupEl);
    this.playSnapSound();
  }

  removeGroup(groupId: string): void {
    const el = this.groupElements.get(groupId);
    if (el) {
      el.remove();
      this.groupElements.delete(groupId);
    }
  }

  removeFragments(ids: string[]): void {
    for (const id of ids) {
      const el = this.fragmentElements.get(id);
      if (el) {
        el.remove();
        this.fragmentElements.delete(id);
      }
    }
  }

  createPoemCard(poem: Poem, x: number, y: number, completedPoems: Poem[]): void {
    const card = document.createElement('div');
    card.className = 'poem-card';
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8)';
    
    for (const char of poem.text) {
      const charEl = document.createElement('span');
      charEl.className = 'char';
      charEl.textContent = char;
      card.appendChild(charEl);
    }
    
    this.fragmentsLayer.appendChild(card);
    this.poemCardElements.set(poem.id, card);
    
    requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
    });
    
    setTimeout(() => {
      this.arrangePoemCards(completedPoems);
    }, 600);
  }

  private arrangePoemCards(completedPoems: Poem[]): void {
    const rect = this.canvas.getBoundingClientRect();
    const padding = 20;
    const cardWidth = 200;
    const cardHeight = 50;
    const gap = 12;
    const perRow = Math.max(1, Math.floor((rect.width - padding * 2) / (cardWidth + gap)));
    
    completedPoems.forEach((poem, idx) => {
      const card = this.poemCardElements.get(poem.id);
      if (!card) return;
      const row = Math.floor(idx / perRow);
      const col = idx % perRow;
      const x = padding + col * (cardWidth + gap);
      const y = padding + row * (cardHeight + gap);
      card.style.left = x + 'px';
      card.style.top = y + 'px';
    });
  }

  hideAllPoemCards(): void {
    for (const el of this.poemCardElements.values()) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }
    this.poemCardElements.clear();
  }

  getCanvasRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }
}
