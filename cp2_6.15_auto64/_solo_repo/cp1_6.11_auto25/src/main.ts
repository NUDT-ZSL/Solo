import { parseText, updateParticlePositions, type Particle } from './parser';
import { audioController, type TimbreStyle } from './audioController';
import { initRenderer, resizeRenderer, render } from './renderer';

interface ControlState {
  text: string;
  isPlaying: boolean;
  speed: number;
  particleSize: number;
  timbreStyle: TimbreStyle;
}

interface DOMRefs {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  loading: HTMLDivElement;
  textInput: HTMLTextAreaElement;
  charCount: HTMLSpanElement;
  playBtn: HTMLButtonElement;
  mobilePlayBtn: HTMLButtonElement;
  speedSlider: HTMLInputElement;
  speedValue: HTMLSpanElement;
  sizeSlider: HTMLInputElement;
  sizeValue: HTMLSpanElement;
  timbreGroup: HTMLDivElement;
  panel: HTMLElement;
  panelToggle: HTMLButtonElement;
  panelToggleIcon: HTMLSpanElement;
  mobileDock: HTMLElement;
  statusDot: HTMLDivElement;
  statusText: HTMLSpanElement;
  fpsCounter: HTMLSpanElement;
}

let particles: Particle[] = [];
let animationFrameId: number | null = null;
let lastFrameTime: number = 0;
let frameCount: number = 0;
let fpsAccumulator: number = 0;

const controls: ControlState = {
  text: '文字是海，音节如浪，每个字符都是一次呼吸。',
  isPlaying: false,
  speed: 1.0,
  particleSize: 14,
  timbreStyle: 'soft'
};

let dom: DOMRefs;

function setupCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = dom.canvas.getBoundingClientRect();
  dom.canvas.width = Math.floor(rect.width * dpr);
  dom.canvas.height = Math.floor(rect.height * dpr);
  dom.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getCanvasSize(): { width: number; height: number } {
  const rect = dom.canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function regenerateParticles(): void {
  const { width, height } = getCanvasSize();
  particles = parseText({
    text: controls.text,
    canvasWidth: width,
    canvasHeight: height,
    particleSize: controls.particleSize
  });
}

function refreshParticlePositions(): void {
  const { width, height } = getCanvasSize();
  updateParticlePositions(particles, width, height, controls.particleSize);
}

function updateCharCount(): void {
  dom.charCount.textContent = String(controls.text.length);
}

function updatePlayUI(): void {
  const label = controls.isPlaying ? '❚❚ 暂停' : '▶ 开始';
  dom.playBtn.textContent = label;
  dom.mobilePlayBtn.innerHTML = controls.isPlaying ? '❚❚<span>暂停</span>' : '▶<span>播放</span>';
  dom.statusDot.classList.toggle('playing', controls.isPlaying);
  dom.statusText.textContent = controls.isPlaying ? `播放中 · ${audioController.bpm} BPM` : '待机';
}

function updateSpeedUI(): void {
  dom.speedValue.textContent = `${controls.speed.toFixed(1)}x`;
}

function updateSizeUI(): void {
  dom.sizeValue.textContent = `${controls.particleSize}px`;
}

function updateTimbreUI(): void {
  const btns = dom.timbreGroup.querySelectorAll('.timbre-btn');
  btns.forEach(btn => {
    const el = btn as HTMLElement;
    el.classList.toggle('active', el.dataset.style === controls.timbreStyle);
  });
}

function togglePanel(): void {
  const collapsed = dom.panel.classList.toggle('collapsed');
  dom.panelToggleIcon.textContent = collapsed ? '▶' : '◀';
}

function handleResize(): void {
  setupCanvas();
  const { width, height } = getCanvasSize();
  resizeRenderer(width, height);
  refreshParticlePositions();
}

async function togglePlay(): Promise<void> {
  if (controls.isPlaying) {
    audioController.stop();
    controls.isPlaying = false;
  } else {
    await audioController.start();
    controls.isPlaying = true;
  }
  updatePlayUI();
}

function handleTextInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement;
  controls.text = target.value.slice(0, 200);
  if (target.value.length > 200) target.value = controls.text;
  updateCharCount();
  regenerateParticles();
}

function handleSpeedChange(e: Event): void {
  controls.speed = parseFloat((e.target as HTMLInputElement).value);
  updateSpeedUI();
}

function handleSizeChange(e: Event): void {
  controls.particleSize = parseInt((e.target as HTMLInputElement).value, 10);
  updateSizeUI();
  refreshParticlePositions();
}

function handleTimbreClick(e: Event): void {
  const target = e.target as HTMLElement;
  const style = target.dataset.style as TimbreStyle;
  if (!style) return;
  controls.timbreStyle = style;
  audioController.setTimbre(style);
  updateTimbreUI();
}

function handleMobileDock(e: Event): void {
  const target = e.target as HTMLElement;
  const btn = target.closest('[data-action]') as HTMLElement | null;
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'toggle' || action === 'input') {
    togglePanel();
  }
}

function animationLoop(timestamp: number): void {
  if (lastFrameTime === 0) lastFrameTime = timestamp;
  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  frameCount++;
  fpsAccumulator += delta;
  if (fpsAccumulator >= 500) {
    const fps = Math.round(1000 / (fpsAccumulator / frameCount));
    dom.fpsCounter.textContent = `${fps} FPS`;
    frameCount = 0;
    fpsAccumulator = 0;
  }

  const audioData = audioController.getAudioData();

  render(
    dom.ctx,
    particles,
    audioData,
    {
      isPlaying: controls.isPlaying,
      speed: controls.speed,
      particleSize: controls.particleSize
    },
    timestamp
  );

  if (controls.isPlaying && audioData.bpm !== audioController.bpm) {
    dom.statusText.textContent = `播放中 · ${audioController.bpm} BPM`;
  }

  animationFrameId = requestAnimationFrame(animationLoop);
}

function collectDOMRefs(): DOMRefs {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  return {
    canvas,
    ctx,
    loading: document.getElementById('loading') as HTMLDivElement,
    textInput: document.getElementById('textInput') as HTMLTextAreaElement,
    charCount: document.getElementById('charCount') as HTMLSpanElement,
    playBtn: document.getElementById('playBtn') as HTMLButtonElement,
    mobilePlayBtn: document.getElementById('mobilePlayBtn') as HTMLButtonElement,
    speedSlider: document.getElementById('speedSlider') as HTMLInputElement,
    speedValue: document.getElementById('speedValue') as HTMLSpanElement,
    sizeSlider: document.getElementById('sizeSlider') as HTMLInputElement,
    sizeValue: document.getElementById('sizeValue') as HTMLSpanElement,
    timbreGroup: document.getElementById('timbreGroup') as HTMLDivElement,
    panel: document.getElementById('panel') as HTMLElement,
    panelToggle: document.getElementById('panelToggle') as HTMLButtonElement,
    panelToggleIcon: document.getElementById('panelToggleIcon') as HTMLSpanElement,
    mobileDock: document.getElementById('mobileDock') as HTMLElement,
    statusDot: document.getElementById('statusDot') as HTMLDivElement,
    statusText: document.getElementById('statusText') as HTMLSpanElement,
    fpsCounter: document.getElementById('fpsCounter') as HTMLSpanElement
  };
}

function bindEvents(): void {
  dom.textInput.addEventListener('input', handleTextInput);
  dom.playBtn.addEventListener('click', togglePlay);
  dom.mobilePlayBtn.addEventListener('click', togglePlay);
  dom.speedSlider.addEventListener('input', handleSpeedChange);
  dom.sizeSlider.addEventListener('input', handleSizeChange);
  dom.timbreGroup.addEventListener('click', handleTimbreClick);
  dom.panelToggle.addEventListener('click', togglePanel);
  dom.mobileDock.addEventListener('click', handleMobileDock);
  window.addEventListener('resize', handleResize);

  window.addEventListener('beforeunload', () => {
    audioController.destroy();
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  });
}

function init(): void {
  dom = collectDOMRefs();
  bindEvents();

  setupCanvas();
  const { width, height } = getCanvasSize();
  initRenderer(width, height);
  regenerateParticles();

  updateCharCount();
  updateSpeedUI();
  updateSizeUI();
  updateTimbreUI();
  updatePlayUI();

  animationFrameId = requestAnimationFrame(animationLoop);

  setTimeout(() => {
    dom.loading.classList.add('hidden');
  }, 600);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
