interface CharWave {
  char: string;
  unicode: number;
  frequency: number;
  amplitude: number;
  color: string;
  xStart: number;
  xEnd: number;
  pulseStart: number | null;
  backgroundVisible: boolean;
}

const COLOR_PALETTE = ['#FF69B4', '#00CED1', '#FFA500', '#9370DB'];
const FREQ_MIN = 200;
const FREQ_MAX = 800;
const AMP_MIN = 20;
const AMP_MAX = 80;
const CHARS_PER_SECOND_BASE = 20;
const PULSE_DURATION = 300;
const PULSE_PEAK_TIME = 200;
const TONE_DURATION = 0.15;
const GOLD_COLOR = '#FFD700';
const GLOW_SIZE = 14;
const DOT_RADIUS = 5;
const BG_CIRCLE_RADIUS = 15;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let lyricInput: HTMLInputElement;
let generateBtn: HTMLButtonElement;
let resetBtn: HTMLButtonElement;
let playBtn: HTMLButtonElement;
let charCountEl: HTMLElement;
let tipMessageEl: HTMLElement;
let speedSlider: HTMLInputElement;
let ampSlider: HTMLInputElement;
let speedValue: HTMLElement;
let ampValue: HTMLElement;
let paramsPanel: HTMLElement;
let paramsHeader: HTMLElement;
let infoCard: HTMLElement;
let infoChar: HTMLElement;
let infoDetail: HTMLElement;

let waves: CharWave[] = [];
let isPlaying = false;
let playStartTime = 0;
let currentPlayX = 0;
let animationFrameId: number | null = null;
let audioContext: AudioContext | null = null;
let lastPlayedCharIndex = -1;
let hoverCharIndex = -1;
let mouseX = 0;
let isMouseOnCanvas = false;
let speedMultiplier = 1;
let ampMultiplier = 1;

export function init(): void {
  canvas = document.getElementById('waveCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  lyricInput = document.getElementById('lyricInput') as HTMLInputElement;
  generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
  resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
  playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  charCountEl = document.getElementById('charCount') as HTMLElement;
  tipMessageEl = document.getElementById('tipMessage') as HTMLElement;
  speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
  ampSlider = document.getElementById('ampSlider') as HTMLInputElement;
  speedValue = document.getElementById('speedValue') as HTMLElement;
  ampValue = document.getElementById('ampValue') as HTMLElement;
  paramsPanel = document.getElementById('paramsPanel') as HTMLElement;
  paramsHeader = document.getElementById('paramsHeader') as HTMLElement;
  infoCard = document.getElementById('infoCard') as HTMLElement;
  infoChar = document.getElementById('infoChar') as HTMLElement;
  infoDetail = document.getElementById('infoDetail') as HTMLElement;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  lyricInput.addEventListener('input', handleInput);
  lyricInput.addEventListener('keydown', handleKeyDown);
  generateBtn.addEventListener('click', generateWaves);
  resetBtn.addEventListener('click', resetAll);
  playBtn.addEventListener('click', togglePlay);

  speedSlider.addEventListener('input', () => {
    speedMultiplier = parseFloat(speedSlider.value);
    speedValue.textContent = speedMultiplier.toFixed(1) + 'x';
  });

  ampSlider.addEventListener('input', () => {
    ampMultiplier = parseFloat(ampSlider.value);
    ampValue.textContent = ampMultiplier.toFixed(1) + 'x';
    if (waves.length > 0) {
      draw();
    }
  });

  paramsHeader.addEventListener('click', () => {
    paramsPanel.classList.toggle('collapsed');
  });

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  drawEmptyState();
}

function resizeCanvas(): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  if (waves.length > 0) {
    calculateWavePositions();
    draw();
  }
}

function handleInput(): void {
  const text = lyricInput.value;
  const validChars = getValidChars(text);
  const count = validChars.length;
  
  charCountEl.textContent = `${count} / 100`;
  charCountEl.classList.toggle('over-limit', count > 100);
  
  generateBtn.disabled = count < 10 || count > 100;
  
  if (count > 100) {
    tipMessageEl.textContent = '字符数超过100，请减少输入内容';
  } else if (text.length > 0 && count < text.length) {
    tipMessageEl.textContent = '部分字符（符号、空格）将被忽略';
  } else {
    tipMessageEl.textContent = '';
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !generateBtn.disabled) {
    generateWaves();
  }
}

function getValidChars(text: string): string[] {
  const chars: string[] = [];
  for (const ch of text) {
    if (isValidChar(ch)) {
      chars.push(ch);
    }
  }
  return chars;
}

function isValidChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  if (ch === ' ' || ch === '\t' || ch === '\n') return false;
  if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) return true;
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return true;
  if (code >= 0x4e00) return true;
  if (/[a-zA-Z\u4e00-\u9fff]/.test(ch)) return true;
  return false;
}

function generateWaves(): void {
  const text = lyricInput.value;
  const validChars = getValidChars(text);
  
  if (validChars.length < 10 || validChars.length > 100) {
    return;
  }

  stopPlay();
  
  waves = validChars.map((ch, index) => {
    const code = ch.charCodeAt(0);
    const freq = mapCodeToFreq(code);
    const amp = mapCodeToAmp(code);
    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
    
    return {
      char: ch,
      unicode: code,
      frequency: freq,
      amplitude: amp,
      color,
      xStart: 0,
      xEnd: 0,
      pulseStart: null,
      backgroundVisible: false
    };
  });

  calculateWavePositions();
  draw();
  playBtn.disabled = false;
}

function calculateWavePositions(): void {
  const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
  const padding = 20;
  const totalWidth = canvasWidth - padding * 2;
  const charWidth = totalWidth / waves.length;
  
  waves.forEach((wave, index) => {
    wave.xStart = padding + index * charWidth;
    wave.xEnd = padding + (index + 1) * charWidth;
  });
}

function mapCodeToFreq(code: number): number {
  const hash = ((code * 2654435761) >>> 0) % 1000;
  return FREQ_MIN + (hash / 1000) * (FREQ_MAX - FREQ_MIN);
}

function mapCodeToAmp(code: number): number {
  const hash = ((code * 1103515245 + 12345) >>> 0) % 1000;
  return AMP_MIN + (hash / 1000) * (AMP_MAX - AMP_MIN);
}

function drawEmptyState(): void {
  const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
  const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
  
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  ctx.fillStyle = '#333344';
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('输入歌词后点击"生成"按钮查看声波可视化', canvasWidth / 2, canvasHeight / 2);
}

function draw(): void {
  const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
  const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
  const centerY = canvasHeight / 2;
  const now = performance.now();

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  waves.forEach((wave, index) => {
    const pulseScale = getPulseScale(wave, now);
    const isHovered = index === hoverCharIndex;
    const charWidth = wave.xEnd - wave.xStart;
    const waveWidth = charWidth - 2;
    const baseAmp = wave.amplitude * ampMultiplier * pulseScale;

    if (wave.backgroundVisible) {
      const bgX = (wave.xStart + wave.xEnd) / 2;
      const bgY = centerY + AMP_MAX * ampMultiplier + BG_CIRCLE_RADIUS + 10;
      
      ctx.beginPath();
      ctx.arc(bgX, bgY, BG_CIRCLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = wave.color + '4D';
      ctx.fill();
    }

    ctx.beginPath();
    
    const samples = Math.max(30, Math.floor(waveWidth / 2));
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = wave.xStart + 1 + t * waveWidth;
      const phase = t * wave.frequency * 0.1;
      const y = centerY + Math.sin(phase * Math.PI * 2) * baseAmp;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = isHovered ? '#FFFFFF' : wave.color;
    
    if (isHovered) {
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowBlur = 0;
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (index < waves.length - 1) {
      ctx.beginPath();
      ctx.moveTo(wave.xEnd, centerY - AMP_MAX * ampMultiplier * 1.5);
      ctx.lineTo(wave.xEnd, centerY + AMP_MAX * ampMultiplier * 1.5);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  if (isMouseOnCanvas && hoverCharIndex >= 0) {
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(mouseX, 0);
    ctx.lineTo(mouseX, canvasHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (isPlaying) {
    drawPlayhead(currentPlayX, centerY);
  }
}

function getPulseScale(wave: CharWave, now: number): number {
  if (wave.pulseStart === null) return 1;
  
  const elapsed = now - wave.pulseStart;
  
  if (elapsed >= PULSE_DURATION) {
    wave.pulseStart = null;
    return 1;
  }
  
  if (elapsed <= PULSE_PEAK_TIME) {
    return 1 + (elapsed / PULSE_PEAK_TIME) * 0.5;
  } else {
    const decayTime = PULSE_DURATION - PULSE_PEAK_TIME;
    const decayElapsed = elapsed - PULSE_PEAK_TIME;
    return 1.5 - (decayElapsed / decayTime) * 0.5;
  }
}

function drawPlayhead(x: number, centerY: number): void {
  const gradient = ctx.createRadialGradient(x, centerY, DOT_RADIUS, x, centerY, DOT_RADIUS + GLOW_SIZE);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.beginPath();
  ctx.arc(x, centerY, DOT_RADIUS + GLOW_SIZE, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, centerY, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = GOLD_COLOR;
  ctx.fill();
}

function togglePlay(): void {
  if (waves.length === 0) return;
  
  if (isPlaying) {
    stopPlay();
  } else {
    startPlay();
  }
}

function startPlay(): void {
  isPlaying = true;
  playBtn.textContent = '暂停';
  playStartTime = performance.now();
  currentPlayX = waves[0].xStart;
  lastPlayedCharIndex = -1;
  
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  animate();
}

function stopPlay(): void {
  isPlaying = false;
  playBtn.textContent = '播放';
  
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  waves.forEach(wave => {
    wave.pulseStart = null;
    wave.backgroundVisible = false;
  });
  
  currentPlayX = 0;
  lastPlayedCharIndex = -1;
  
  if (waves.length > 0) {
    draw();
  }
}

function animate(): void {
  if (!isPlaying) return;
  
  const now = performance.now();
  const elapsed = (now - playStartTime) / 1000;
  const charsPerSecond = CHARS_PER_SECOND_BASE * speedMultiplier;
  const totalChars = waves.length;
  const totalDuration = totalChars / charsPerSecond;
  const progress = Math.min(elapsed / totalDuration, 1);
  
  if (waves.length > 0) {
    const startX = waves[0].xStart;
    const endX = waves[waves.length - 1].xEnd;
    currentPlayX = startX + progress * (endX - startX);
    
    const currentCharIndex = Math.min(
      Math.floor(progress * totalChars),
      totalChars - 1
    );
    
    if (currentCharIndex !== lastPlayedCharIndex && currentCharIndex >= 0) {
      triggerCharPulse(currentCharIndex);
      playTone(waves[currentCharIndex].frequency);
      lastPlayedCharIndex = currentCharIndex;
    }
    
    waves.forEach((wave, idx) => {
      wave.backgroundVisible = idx === currentCharIndex;
    });
  }
  
  draw();
  
  if (progress >= 1) {
    stopPlay();
    return;
  }
  
  animationFrameId = requestAnimationFrame(animate);
}

function triggerCharPulse(index: number): void {
  if (index >= 0 && index < waves.length) {
    waves[index].pulseStart = performance.now();
  }
}

function playTone(frequency: number): void {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + TONE_DURATION);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + TONE_DURATION);
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  isMouseOnCanvas = true;
  
  hoverCharIndex = getCharIndexAtX(mouseX);
  
  updateInfoCard();
  
  if (waves.length > 0) {
    draw();
  }
}

function handleMouseLeave(): void {
  isMouseOnCanvas = false;
  hoverCharIndex = -1;
  infoCard.classList.remove('visible');
  
  if (waves.length > 0) {
    draw();
  }
}

function getCharIndexAtX(x: number): number {
  for (let i = 0; i < waves.length; i++) {
    if (x >= waves[i].xStart && x < waves[i].xEnd) {
      return i;
    }
  }
  return -1;
}

function updateInfoCard(): void {
  if (hoverCharIndex < 0 || hoverCharIndex >= waves.length) {
    infoCard.classList.remove('visible');
    return;
  }
  
  const wave = waves[hoverCharIndex];
  
  infoChar.textContent = wave.char;
  infoDetail.innerHTML = `
    Unicode: ${wave.unicode}<br>
    音高: ${Math.round(wave.frequency)} Hz
  `;
  
  const canvasRect = canvas.getBoundingClientRect();
  const cardWidth = infoCard.offsetWidth;
  const cardHeight = infoCard.offsetHeight;
  
  let cardX = mouseX - cardWidth / 2;
  let cardY = canvasRect.height - cardHeight - 10;
  
  if (cardX < 10) cardX = 10;
  if (cardX + cardWidth > canvasRect.width - 10) {
    cardX = canvasRect.width - cardWidth - 10;
  }
  
  infoCard.style.left = `${cardX}px`;
  infoCard.style.top = `${cardY}px`;
  infoCard.classList.add('visible');
}

function resetAll(): void {
  stopPlay();
  lyricInput.value = '';
  waves = [];
  hoverCharIndex = -1;
  isMouseOnCanvas = false;
  
  charCountEl.textContent = '0 / 100';
  charCountEl.classList.remove('over-limit');
  tipMessageEl.textContent = '';
  generateBtn.disabled = true;
  playBtn.disabled = true;
  infoCard.classList.remove('visible');
  
  drawEmptyState();
}

document.addEventListener('DOMContentLoaded', init);
