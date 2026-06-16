import { PARTS, DEFAULT_PARTS } from '../data/partsConfig';
import type { SelectedParts, PartType, PartConfig, MoodLevel } from '../data/partsConfig';
import {
  createSVGElement,
  createPartSVG,
  applyAnimation,
  toggleClass,
  createCoffeeStainTexture,
  createGridPattern,
  createStarSVG,
  createLightningSVG,
  getRandomInt,
  clamp,
  raf,
  cancelRaf
} from './domHelpers';
import {
  calculateExpression,
  matchPartsForMood,
  getRandomParts,
  getMoodFromKnobValue,
  getKnobValueFromMood,
  getPartConfigById
} from './expressionEngine';

interface AnimationState {
  isDragging: boolean;
  dragPartType: PartType | null;
  dragPartId: string | null;
  ghostElement: SVGGElement | null;
  animationFrameId: number | null;
  defaultAnimationTimeout: ReturnType<typeof setTimeout> | null;
  blinkTimeout: ReturnType<typeof setTimeout> | null;
}

interface ThemeColors {
  bg: string;
  paper: string;
  skin: string;
  accent: string;
  primary: string;
  border: string;
  selected: string;
}

const THEMES: Record<string, ThemeColors> = {
  light: {
    bg: '#FFF8E7',
    paper: '#FFFFFF',
    skin: '#FFE0B2',
    accent: '#FF7043',
    primary: '#29B6F6',
    border: '#BDBDBD',
    selected: '#FF7043'
  },
  dark: {
    bg: '#2D2D2D',
    paper: '#3D3D3D',
    skin: '#FFCCBC',
    accent: '#FF8A65',
    primary: '#4FC3F7',
    border: '#616161',
    selected: '#FF8A65'
  }
};

let currentTheme = 'light';
let currentParts: SelectedParts = { ...DEFAULT_PARTS };
let currentMood: MoodLevel = 'happy';
let knobValue = getKnobValueFromMood(currentMood);
let isAnimating = false;
let partElements: Record<string, SVGGElement | null> = {
  hair: null,
  eyes: null,
  mouth: null,
  arm: null
};

const animationState: AnimationState = {
  isDragging: false,
  dragPartType: null,
  dragPartId: null,
  ghostElement: null,
  animationFrameId: null,
  defaultAnimationTimeout: null,
  blinkTimeout: null
};

let characterSVG: SVGSVGElement | null = null;
let previewArea: HTMLElement | null = null;
let partsPanel: HTMLElement | null = null;
let expressionDisplay: HTMLElement | null = null;
let knobHandle: HTMLElement | null = null;
let isDraggingKnob = false;

const coffeeStainUrl = createCoffeeStainTexture();
const gridPatternUrl = createGridPattern();

function init(): void {
  const app = document.getElementById('app');
  if (!app) return;

  injectStyles();
  buildUI(app);
  bindEvents();
  updateCharacter(false);
  startDefaultAnimation();
}

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --bg: ${THEMES[currentTheme].bg};
      --paper: ${THEMES[currentTheme].paper};
      --skin: ${THEMES[currentTheme].skin};
      --accent: ${THEMES[currentTheme].accent};
      --primary: ${THEMES[currentTheme].primary};
      --border: ${THEMES[currentTheme].border};
      --selected: ${THEMES[currentTheme].selected};
      --star: #FFD54F;
    }

    * {
      box-sizing: border-box;
    }

    .app-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: var(--bg);
      background-image: url('${gridPatternUrl}');
      font-family: system-ui, -apple-system, sans-serif;
      position: relative;
      overflow: hidden;
    }

    .app-title {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Indie Flower', cursive;
      font-size: 32px;
      color: #424242;
      z-index: 100;
      pointer-events: none;
    }

    .main-content {
      display: flex;
      flex: 1;
      padding: 80px 20px 80px 20px;
      gap: 20px;
      height: 100%;
    }

    .preview-area {
      width: 60%;
      position: relative;
      background: var(--paper);
      border: 3px dashed var(--border);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .preview-area::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, transparent 50%, #E0E0E0 50%);
      border-bottom-left-radius: 8px;
      pointer-events: none;
    }

    .preview-area::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, transparent 50%, var(--bg) 50%);
      pointer-events: none;
    }

    .mood-knob-container {
      position: absolute;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      z-index: 10;
    }

    .mood-label {
      font-family: 'Indie Flower', cursive;
      font-size: 16px;
      color: #616161;
    }

    .mood-knob {
      width: 80px;
      height: 80px;
      position: relative;
      cursor: pointer;
    }

    .knob-track {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: conic-gradient(from 180deg, #FFCDD2 0deg, #FFF3E0 90deg, #E8F5E9 180deg, #E3F2FD 270deg, #FFCDD2 360deg);
      padding: 6px;
      box-sizing: border-box;
    }

    .knob-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: var(--paper);
      border: 2px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }

    .knob-handle {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
      border: 2px solid #fff;
      top: 50%;
      left: 50%;
      transform-origin: center center;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .knob-pulse {
      animation: knobPulse 1s ease-out infinite;
    }

    @keyframes knobPulse {
      0% { box-shadow: 0 0 0 0 rgba(41, 182, 246, 0.4); }
      70% { box-shadow: 0 0 0 15px rgba(41, 182, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(41, 182, 246, 0); }
    }

    .character-svg {
      width: 100%;
      height: 100%;
      max-width: 500px;
      max-height: 500px;
      overflow: visible;
    }

    .character-breath-wrapper {
      transform-origin: center center;
      will-change: transform;
    }

    .character-breath {
      animation: breath 2s ease-in-out infinite;
    }

    .character-breath-paused {
      animation-play-state: paused;
    }

    @keyframes breath {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .character-group {
      transform-origin: center center;
      will-change: transform;
    }

    .character-sway {
      animation: sway 3s ease-in-out infinite;
    }

    @keyframes sway {
      0%, 100% { transform: rotate(-2deg); }
      50% { transform: rotate(2deg); }
    }

    .part {
      will-change: transform, opacity;
      transform-origin: center center;
    }

    .part-eyes .part-path {
      transform-origin: center center;
    }

    .blink {
      animation: blink 4s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 90%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }

    .reassemble {
      animation: reassemble 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes reassemble {
      0% { transform: translate(0, 0) rotate(var(--base-rotate)); opacity: 1; }
      50% { transform: translate(var(--scatter-x), var(--scatter-y)) rotate(calc(var(--base-rotate) + 15deg)); opacity: 0.3; }
      100% { transform: translate(0, 0) rotate(var(--base-rotate)); opacity: 1; }
    }

    .domino-out {
      animation: dominoOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes dominoOut {
      0% { transform: scale(1) rotate(var(--base-rotate)); opacity: 1; }
      100% { transform: scale(0) rotate(calc(var(--base-rotate) + 90deg)); opacity: 0; }
    }

    .domino-in {
      animation: dominoIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    }

    @keyframes dominoIn {
      0% { transform: scale(0) rotate(calc(var(--base-rotate) - 90deg)); opacity: 0; }
      100% { transform: scale(1) rotate(var(--base-rotate)); opacity: 1; }
    }

    .star-pop {
      animation: starPop 1s ease-out forwards;
    }

    @keyframes starPop {
      0% { transform: scale(0) translateY(0); opacity: 0; }
      30% { transform: scale(1.2) translateY(-20px); opacity: 1; }
      100% { transform: scale(1) translateY(-40px); opacity: 0; }
    }

    .poof-text {
      animation: poofText 1s ease-out forwards;
      font-family: 'Indie Flower', cursive;
      font-size: 24px;
      fill: var(--accent);
      font-weight: bold;
    }

    @keyframes poofText {
      0% { transform: scale(0.5); opacity: 0; }
      40% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 0; }
    }

    .expression-display {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      font-size: 18px;
    }

    .expression-emoji {
      font-size: 24px;
    }

    .expression-label {
      font-family: 'Indie Flower', cursive;
      color: #424242;
    }

    .parts-panel {
      width: 35%;
      position: relative;
      background: var(--paper);
      border: 3px dashed var(--border);
      border-radius: 8px;
      padding: 20px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .parts-panel::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, transparent 50%, #E0E0E0 50%);
      border-bottom-left-radius: 8px;
      pointer-events: none;
    }

    .parts-panel::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, transparent 50%, var(--bg) 50%);
      pointer-events: none;
    }

    .parts-section {
      margin-bottom: 24px;
    }

    .section-title {
      font-family: 'Indie Flower', cursive;
      font-size: 20px;
      color: #424242;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 2px solid var(--border);
    }

    .parts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .part-card {
      width: 100%;
      aspect-ratio: 1;
      max-width: 128px;
      background: var(--paper);
      background-image: url('${coffeeStainUrl}');
      background-size: cover;
      border: 2px solid var(--border);
      border-radius: 16px;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      position: relative;
      overflow: hidden;
    }

    .part-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .part-card.selected {
      border-color: var(--selected);
      border-width: 3px;
      animation: cardBounce 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    @keyframes cardBounce {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .part-card:active {
      cursor: grabbing;
    }

    .part-card svg {
      width: 70%;
      height: 70%;
      overflow: visible;
    }

    .part-card-name {
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Indie Flower', cursive;
      font-size: 12px;
      color: #757575;
      white-space: nowrap;
    }

    .drag-ghost {
      position: fixed;
      pointer-events: none;
      opacity: 0.5;
      z-index: 1000;
      will-change: transform;
    }

    .random-btn {
      position: fixed;
      bottom: 100px;
      right: 30px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(41, 182, 246, 0.4);
      transition: all 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      z-index: 50;
    }

    .random-btn:hover {
      transform: rotate(15deg) scale(1.1);
      box-shadow: 0 6px 20px rgba(41, 182, 246, 0.5);
    }

    .random-btn:active {
      transform: rotate(15deg) scale(1.05);
    }

    .toolbar {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      padding: 12px 24px;
      background: rgba(250, 250, 250, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 28px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      z-index: 50;
    }

    .toolbar-btn {
      padding: 8px 20px;
      border: 2px solid var(--border);
      border-radius: 20px;
      background: var(--paper);
      font-family: 'Indie Flower', cursive;
      font-size: 16px;
      color: #424242;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .toolbar-btn:hover {
      border-color: var(--accent);
      background: var(--accent);
      color: white;
      transform: translateY(-2px);
    }

    .toolbar-btn:active {
      transform: translateY(0);
    }

    .feedback-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 20;
    }

    @media (max-width: 768px) {
      .main-content {
        flex-direction: column;
        padding: 70px 10px 100px 10px;
      }
      .preview-area {
        width: 100%;
        height: 50%;
      }
      .parts-panel {
        width: 100%;
        height: 50%;
      }
      .app-title {
        font-size: 24px;
      }
    }
  `;
  document.head.appendChild(style);
}

function buildUI(app: HTMLElement): void {
  const container = document.createElement('div');
  container.className = 'app-container';

  const title = document.createElement('div');
  title.className = 'app-title';
  title.textContent = '涂鸦角色工坊';
  container.appendChild(title);

  const mainContent = document.createElement('div');
  mainContent.className = 'main-content';

  previewArea = document.createElement('div');
  previewArea.className = 'preview-area';

  const knobContainer = document.createElement('div');
  knobContainer.className = 'mood-knob-container';
  const knobLabel = document.createElement('div');
  knobLabel.className = 'mood-label';
  knobLabel.textContent = '心情旋钮';
  const knob = document.createElement('div');
  knob.className = 'mood-knob';
  knob.id = 'moodKnob';
  const knobTrack = document.createElement('div');
  knobTrack.className = 'knob-track';
  const knobInner = document.createElement('div');
  knobInner.className = 'knob-inner';
  knobInner.id = 'knobInner';
  knobInner.textContent = '😊';
  knobHandle = document.createElement('div');
  knobHandle.className = 'knob-handle';
  knobTrack.appendChild(knobInner);
  knob.appendChild(knobTrack);
  knob.appendChild(knobHandle);
  knobContainer.appendChild(knobLabel);
  knobContainer.appendChild(knob);
  previewArea.appendChild(knobContainer);

  characterSVG = createSVGElement('svg', {
    class: 'character-svg',
    viewBox: '0 0 300 400',
    preserveAspectRatio: 'xMidYMid meet'
  });

  const breathWrapper = createSVGElement('g', {
    class: 'character-breath-wrapper character-breath',
    transform: 'translate(150, 200)',
    id: 'breath-wrapper'
  });

  const characterGroup = createSVGElement('g', {
    class: 'character-group character-sway'
  });

  const head = createSVGElement('circle', {
    cx: '0',
    cy: '0',
    r: '55',
    fill: 'var(--skin)',
    stroke: '#212121',
    'stroke-width': '1'
  });
  characterGroup.appendChild(head);

  const body = createSVGElement('rect', {
    x: '-35',
    y: '50',
    width: '70',
    height: '80',
    rx: '10',
    fill: '#42A5F5',
    stroke: '#212121',
    'stroke-width': '1'
  });
  characterGroup.appendChild(body);

  const leftLeg = createSVGElement('line', {
    x1: '-20',
    y1: '130',
    x2: '-25',
    y2: '190',
    stroke: '#212121',
    'stroke-width': '4',
    'stroke-linecap': 'round'
  });
  characterGroup.appendChild(leftLeg);

  const rightLeg = createSVGElement('line', {
    x1: '20',
    y1: '130',
    x2: '25',
    y2: '190',
    stroke: '#212121',
    'stroke-width': '4',
    'stroke-linecap': 'round'
  });
  characterGroup.appendChild(rightLeg);

  const hairGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hairGroup.id = 'hair-group';
  characterGroup.appendChild(hairGroup);

  const armGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  armGroup.id = 'arm-group';
  characterGroup.appendChild(armGroup);

  const eyesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  eyesGroup.id = 'eyes-group';
  eyesGroup.classList.add('blink');
  characterGroup.appendChild(eyesGroup);

  const mouthGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  mouthGroup.id = 'mouth-group';
  characterGroup.appendChild(mouthGroup);

  breathWrapper.appendChild(characterGroup);
  characterSVG.appendChild(breathWrapper);
  previewArea.appendChild(characterSVG);

  const feedbackContainer = document.createElement('div');
  feedbackContainer.className = 'feedback-container';
  feedbackContainer.id = 'feedbackContainer';
  previewArea.appendChild(feedbackContainer);

  expressionDisplay = document.createElement('div');
  expressionDisplay.className = 'expression-display';
  const exprEmoji = document.createElement('span');
  exprEmoji.className = 'expression-emoji';
  exprEmoji.id = 'expressionEmoji';
  exprEmoji.textContent = '😊';
  const exprLabel = document.createElement('span');
  exprLabel.className = 'expression-label';
  exprLabel.id = 'expressionLabel';
  exprLabel.textContent = '开心';
  expressionDisplay.appendChild(exprEmoji);
  expressionDisplay.appendChild(exprLabel);
  previewArea.appendChild(expressionDisplay);

  mainContent.appendChild(previewArea);

  partsPanel = document.createElement('div');
  partsPanel.className = 'parts-panel';
  partsPanel.id = 'partsPanel';

  const partTypes: { key: PartType; label: string }[] = [
    { key: 'hair', label: '发型' },
    { key: 'eyes', label: '眼睛' },
    { key: 'mouth', label: '嘴巴' },
    { key: 'arm', label: '手臂' }
  ];

  partTypes.forEach(({ key, label }) => {
    const section = document.createElement('div');
    section.className = 'parts-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = label;
    section.appendChild(sectionTitle);

    const grid = document.createElement('div');
    grid.className = 'parts-grid';
    grid.dataset.partType = key;

    PARTS[key].forEach((part) => {
      const card = createPartCard(part);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    partsPanel!.appendChild(section);
  });

  mainContent.appendChild(partsPanel);
  container.appendChild(mainContent);

  const randomBtn = document.createElement('button');
  randomBtn.className = 'random-btn';
  randomBtn.id = 'randomBtn';
  randomBtn.title = '随机角色';
  randomBtn.appendChild(createLightningSVG(28));
  container.appendChild(randomBtn);

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'toolbar-btn';
  saveBtn.id = 'saveBtn';
  saveBtn.textContent = '保存为PNG';
  toolbar.appendChild(saveBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'toolbar-btn';
  resetBtn.id = 'resetBtn';
  resetBtn.textContent = '重置角色';
  toolbar.appendChild(resetBtn);

  const themeBtn = document.createElement('button');
  themeBtn.className = 'toolbar-btn';
  themeBtn.id = 'themeBtn';
  themeBtn.textContent = '切换主题';
  toolbar.appendChild(themeBtn);

  container.appendChild(toolbar);
  app.appendChild(container);

  updateKnobPosition();
}

function createPartCard(part: PartConfig): HTMLElement {
  const card = document.createElement('div');
  card.className = 'part-card';
  card.dataset.partId = part.id;
  card.dataset.partType = part.type;
  card.draggable = true;

  if (currentParts[part.type] === part.id) {
    card.classList.add('selected');
  }

  const svg = createSVGElement('svg', {
    viewBox: '-100 -100 200 200',
    class: 'card-preview'
  });

  const previewGroup = createPartSVG(part);
  svg.appendChild(previewGroup);

  card.appendChild(svg);

  const nameLabel = document.createElement('div');
  nameLabel.className = 'part-card-name';
  nameLabel.textContent = part.name;
  card.appendChild(nameLabel);

  return card;
}

function bindEvents(): void {
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);

  document.getElementById('randomBtn')?.addEventListener('click', triggerRandomCharacter);
  document.getElementById('saveBtn')?.addEventListener('click', saveAsPNG);
  document.getElementById('resetBtn')?.addEventListener('click', resetCharacter);
  document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);

  document.getElementById('moodKnob')?.addEventListener('mousedown', startKnobDrag);
  document.getElementById('moodKnob')?.addEventListener('touchstart', startKnobDrag, { passive: false });

  partsPanel?.addEventListener('click', handlePanelClick);
  partsPanel?.addEventListener('dragstart', handleDragStart);
  partsPanel?.addEventListener('dragend', handleDragEnd);
}

function handleMouseDown(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const card = target.closest('.part-card') as HTMLElement;
  if (card) {
    startDrag(card, e.clientX, e.clientY);
  }
}

function handleMouseMove(e: MouseEvent): void {
  if (animationState.isDragging && animationState.ghostElement) {
    updateGhostPosition(e.clientX, e.clientY);
  }
  if (isDraggingKnob) {
    updateKnobFromPointer(e.clientX, e.clientY);
  }
}

function handleMouseUp(e: MouseEvent): void {
  if (animationState.isDragging) {
    endDrag(e.clientX, e.clientY);
  }
  if (isDraggingKnob) {
    endKnobDrag();
  }
}

function handleTouchStart(e: TouchEvent): void {
  const target = e.target as HTMLElement;
  const card = target.closest('.part-card') as HTMLElement;
  if (card && e.touches.length === 1) {
    e.preventDefault();
    startDrag(card, e.touches[0].clientX, e.touches[0].clientY);
  }
}

function handleTouchMove(e: TouchEvent): void {
  if (animationState.isDragging && animationState.ghostElement && e.touches.length === 1) {
    e.preventDefault();
    updateGhostPosition(e.touches[0].clientX, e.touches[0].clientY);
  }
  if (isDraggingKnob && e.touches.length === 1) {
    e.preventDefault();
    updateKnobFromPointer(e.touches[0].clientX, e.touches[0].clientY);
  }
}

function handleTouchEnd(e: TouchEvent): void {
  if (animationState.isDragging) {
    const touch = e.changedTouches[0];
    endDrag(touch.clientX, touch.clientY);
  }
  if (isDraggingKnob) {
    endKnobDrag();
  }
}

function startDrag(card: HTMLElement, clientX: number, clientY: number): void {
  const partId = card.dataset.partId;
  const partType = card.dataset.partType as PartType;
  if (!partId || !partType) return;

  const part = getPartConfigById(partId, PARTS);
  if (!part) return;

  animationState.isDragging = true;
  animationState.dragPartType = partType;
  animationState.dragPartId = partId;
  setBreathing(true);

  const ghostSVGWrapper = createSVGElement('svg', {
    width: '100',
    height: '100',
    viewBox: '-100 -100 200 200',
    class: 'drag-ghost'
  });
  ghostSVGWrapper.style.position = 'fixed';
  ghostSVGWrapper.style.pointerEvents = 'none';
  ghostSVGWrapper.style.zIndex = '1000';
  ghostSVGWrapper.style.opacity = '0.5';
  ghostSVGWrapper.style.willChange = 'transform';
  ghostSVGWrapper.style.overflow = 'visible';

  const ghost = createPartSVG(part);
  ghostSVGWrapper.appendChild(ghost);
  document.body.appendChild(ghostSVGWrapper);
  animationState.ghostElement = ghostSVGWrapper as unknown as SVGGElement;

  updateGhostPosition(clientX, clientY);
}

function updateGhostPosition(clientX: number, clientY: number): void {
  if (animationState.ghostElement) {
    const targetX = clientX - 50;
    const targetY = clientY - 50;
    if (!animationState.animationFrameId) {
      animationState.animationFrameId = raf(() => {
        if (animationState.ghostElement) {
          animationState.ghostElement.style.transform = `translate(${targetX}px, ${targetY}px)`;
        }
        animationState.animationFrameId = null;
      });
    }
  }
}

function endDrag(clientX: number, clientY: number): void {
  if (animationState.animationFrameId) {
    cancelRaf(animationState.animationFrameId);
    animationState.animationFrameId = null;
  }

  if (animationState.ghostElement) {
    animationState.ghostElement.remove();
    animationState.ghostElement = null;
  }

  const isOnPreview = previewArea && isPointInElement(clientX, clientY, previewArea);

  if (isOnPreview && animationState.dragPartId && animationState.dragPartType) {
    const partType = animationState.dragPartType;
    const partId = animationState.dragPartId;
    
    if (currentParts[partType] !== partId) {
      currentParts[partType] = partId;
      updateCharacter(true);
      showFeedback();
      updateCardSelection();
    }
  }

  animationState.isDragging = false;
  animationState.dragPartType = null;
  animationState.dragPartId = null;

  setTimeout(() => {
    if (!isAnimating) {
      setBreathing(false);
    }
  }, 500);
}

function handleDragStart(e: DragEvent): void {
  e.preventDefault();
}

function handleDragEnd(e: DragEvent): void {
  e.preventDefault();
}

function handlePanelClick(e: Event): void {
  const target = e.target as HTMLElement;
  const card = target.closest('.part-card') as HTMLElement;
  if (card && !animationState.isDragging) {
    const partId = card.dataset.partId;
    const partType = card.dataset.partType as PartType;
    if (partId && partType && currentParts[partType] !== partId) {
      currentParts[partType] = partId;
      updateCharacter(true);
      showFeedback();
      updateCardSelection();
    }
  }
}

function startKnobDrag(e: Event): void {
  e.preventDefault();
  isDraggingKnob = true;
  knobHandle?.classList.add('knob-pulse');
  setBreathing(true);
}

let lastKnobMoodUpdate = 0;
function updateKnobFromPointer(clientX: number, clientY: number): void {
  const knob = document.getElementById('moodKnob');
  if (!knob) return;

  const rect = knob.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  angle = (angle + 90 + 360) % 360;
  
  knobValue = clamp((angle / 360) * 100, 0, 100);
  updateKnobPosition();

  const newMood = getMoodFromKnobValue(knobValue);
  if (newMood !== currentMood) {
    const now = Date.now();
    if (now - lastKnobMoodUpdate > 150) {
      lastKnobMoodUpdate = now;
      currentMood = newMood;
      currentParts = matchPartsForMood(currentMood, PARTS);
      updateCharacter(true);
      updateCardSelection();
      showFeedback();
    }
  }
}

function endKnobDrag(): void {
  isDraggingKnob = false;
  knobHandle?.classList.remove('knob-pulse');
  setTimeout(() => {
    if (!isAnimating) {
      setBreathing(false);
    }
  }, 500);
}

function updateKnobPosition(): void {
  if (!knobHandle) return;
  const angle = (knobValue / 100) * 360 - 90;
  const radius = 30;
  const x = Math.cos(angle * Math.PI / 180) * radius;
  const y = Math.sin(angle * Math.PI / 180) * radius;
  knobHandle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

  const knobInner = document.getElementById('knobInner');
  if (knobInner) {
    const moodEmojis: Record<MoodLevel, string> = {
      angry: '😠',
      sad: '😢',
      happy: '😊',
      surprised: '😮'
    };
    knobInner.textContent = moodEmojis[currentMood];
  }
}

function updateCharacter(withAnimation: boolean = true): void {
  if (!characterSVG) return;

  const hairGroup = document.getElementById('hair-group') as unknown as SVGGElement;
  const eyesGroup = document.getElementById('eyes-group') as unknown as SVGGElement;
  const mouthGroup = document.getElementById('mouth-group') as unknown as SVGGElement;
  const armGroup = document.getElementById('arm-group') as unknown as SVGGElement;

  const groupMap: Record<PartType, SVGGElement> = {
    hair: hairGroup,
    eyes: eyesGroup,
    mouth: mouthGroup,
    arm: armGroup
  };

  const partTypes: PartType[] = ['hair', 'eyes', 'mouth', 'arm'];

  partTypes.forEach((type) => {
    const partId = currentParts[type];
    const part = getPartConfigById(partId, PARTS);
    const group = groupMap[type];

    if (part && group) {
      while (group.firstChild) {
        group.removeChild(group.firstChild);
      }

      const partElement = createPartSVG(part);
      group.appendChild(partElement);
      partElements[type] = partElement;

      if (withAnimation && !isAnimating) {
        const scatterX = (Math.random() - 0.5) * 40;
        const scatterY = (Math.random() - 0.5) * 40;
        partElement.style.setProperty('--scatter-x', `${scatterX}px`);
        partElement.style.setProperty('--scatter-y', `${scatterY}px`);
      }
    }
  });

  if (withAnimation) {
    triggerReassembleAnimation();
  }

  updateExpressionDisplay();
}

function triggerReassembleAnimation(): void {
  if (isAnimating) return;
  isAnimating = true;
  setBreathing(true);

  const partTypes: PartType[] = ['hair', 'eyes', 'mouth', 'arm'];
  const delays = [0, 80, 160, 240];

  partTypes.forEach((type, index) => {
    const element = partElements[type];
    if (element) {
      const scatterX = (Math.random() - 0.5) * 80;
      const scatterY = (Math.random() - 0.5) * 80;
      element.style.setProperty('--scatter-x', `${scatterX}px`);
      element.style.setProperty('--scatter-y', `${scatterY}px`);
      
      setTimeout(() => {
        element.classList.remove('reassemble');
        void (element as unknown as HTMLElement).offsetWidth;
        applyAnimation(element, 'reassemble', 400);
      }, delays[index]);
    }
  });

  setTimeout(() => {
    isAnimating = false;
    if (!animationState.isDragging) {
      setBreathing(false);
    }
  }, 700);
}

function triggerRandomCharacter(): void {
  if (isAnimating) return;
  isAnimating = true;
  setBreathing(true);

  const partTypes: PartType[] = ['hair', 'eyes', 'mouth', 'arm'];
  const newParts = getRandomParts(PARTS);
  let totalOutTime = 0;
  partTypes.forEach((type) => {
    const element = partElements[type];
    if (element) {
      const outDelay = getRandomInt(300, 600);
      totalOutTime = Math.max(totalOutTime, outDelay + 300);
      
      setTimeout(() => {
        applyAnimation(element, 'domino-out', 300);
      }, outDelay);
    }
  });

  partTypes.forEach((type, index) => {
    const inDelay = totalOutTime + getRandomInt(300, 600);

    setTimeout(() => {
      currentParts[type] = newParts[type];
      const part = getPartConfigById(newParts[type], PARTS);
      const groupId = `${type}-group`;
      const group = document.getElementById(groupId) as unknown as SVGGElement;
      
      if (part && group) {
        while (group.firstChild) {
          group.removeChild(group.firstChild);
        }
        const newElement = createPartSVG(part);
        group.appendChild(newElement);
        partElements[type] = newElement;
        applyAnimation(newElement, 'domino-in', 300);
      }

      if (index === partTypes.length - 1) {
        setTimeout(() => {
          isAnimating = false;
          updateExpressionDisplay();
          updateCardSelection();
          showFeedback();
          if (!animationState.isDragging) {
            setBreathing(false);
          }
        }, 400);
      }
    }, inDelay);
  });
}

function updateExpressionDisplay(): void {
  const result = calculateExpression(currentParts, PARTS);
  const emojiEl = document.getElementById('expressionEmoji');
  const labelEl = document.getElementById('expressionLabel');
  
  if (emojiEl) emojiEl.textContent = result.emoji;
  if (labelEl) labelEl.textContent = result.label;
}

function updateCardSelection(): void {
  const cards = document.querySelectorAll('.part-card');
  cards.forEach((card) => {
    const partId = (card as HTMLElement).dataset.partId;
    const partType = (card as HTMLElement).dataset.partType as PartType;
    if (partId && partType) {
      toggleClass(card as HTMLElement, 'selected', currentParts[partType] === partId);
    }
  });
}

function showFeedback(): void {
  const container = document.getElementById('feedbackContainer');
  if (!container) return;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const starSvg = createStarSVG(32);
  starSvg.classList.add('star-pop');
  starSvg.style.position = 'absolute';
  starSvg.style.left = `${(Math.random() - 0.5) * 60}px`;
  starSvg.style.top = '-60px';
  container.appendChild(starSvg);

  const poofSvg = createSVGElement('svg', {
    width: '60',
    height: '30',
    viewBox: '0 0 60 30',
    class: 'poof-text'
  });
  const poofText = createSVGElement('text', {
    x: '30',
    y: '22',
    'text-anchor': 'middle',
    class: 'poof-text'
  });
  poofText.textContent = '噗~';
  poofSvg.appendChild(poofText);
  poofSvg.style.position = 'absolute';
  poofSvg.style.left = '30px';
  poofSvg.style.top = '-30px';
  container.appendChild(poofSvg);

  setTimeout(() => {
    if (container.contains(starSvg)) container.removeChild(starSvg);
    if (container.contains(poofSvg)) container.removeChild(poofSvg);
  }, 1100);
}

function setBreathing(paused: boolean): void {
  const breathWrapper = document.getElementById('breath-wrapper');
  if (!breathWrapper) return;
  if (paused) {
    breathWrapper.classList.add('character-breath-paused');
  } else {
    breathWrapper.classList.remove('character-breath-paused');
  }
}

function startDefaultAnimation(): void {
  scheduleBlink();
  setBreathing(false);
}

function scheduleBlink(): void {
  if (animationState.blinkTimeout) {
    clearTimeout(animationState.blinkTimeout);
  }
  
  const nextBlink = getRandomInt(3000, 6000);
  animationState.blinkTimeout = setTimeout(() => {
    const eyesGroup = document.getElementById('eyes-group');
    if (eyesGroup) {
      eyesGroup.classList.remove('blink');
      void eyesGroup.offsetWidth;
      eyesGroup.classList.add('blink');
    }
    scheduleBlink();
  }, nextBlink);
}

function isPointInElement(x: number, y: number, element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function saveAsPNG(): void {
  if (!characterSVG) return;

  const svgData = new XMLSerializer().serializeToString(characterSVG);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 800;
  canvas.height = 800;

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx.fillStyle = THEMES[currentTheme].paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 100, 100, 600, 600);
    
    const link = document.createElement('a');
    link.download = `doodle-character-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function resetCharacter(): void {
  currentParts = { ...DEFAULT_PARTS };
  currentMood = 'happy';
  knobValue = getKnobValueFromMood(currentMood);
  updateKnobPosition();
  updateCharacter(true);
  updateCardSelection();
}

function toggleTheme(): void {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  const root = document.documentElement;
  root.style.setProperty('--bg', THEMES[currentTheme].bg);
  root.style.setProperty('--paper', THEMES[currentTheme].paper);
  root.style.setProperty('--skin', THEMES[currentTheme].skin);
  root.style.setProperty('--accent', THEMES[currentTheme].accent);
  root.style.setProperty('--primary', THEMES[currentTheme].primary);
  root.style.setProperty('--border', THEMES[currentTheme].border);
  root.style.setProperty('--selected', THEMES[currentTheme].selected);
}

document.addEventListener('DOMContentLoaded', init);
