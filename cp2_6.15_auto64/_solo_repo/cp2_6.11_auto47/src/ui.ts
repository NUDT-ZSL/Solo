import { ParticleMemorySystem, EmotionType } from './particleMemory';

const EMOTION_LABELS: Record<EmotionType, string> = {
  joy: '喜悦',
  sadness: '忧伤',
  nostalgia: '怀念',
  calm: '平静',
  expectation: '期待',
};

const EMOTION_CSS_COLORS: Record<EmotionType, [string, string]> = {
  joy: ['#FF8C00', '#FFD700'],
  sadness: ['#00BFFF', '#DDA0DD'],
  nostalgia: ['#8B4513', '#FFBF00'],
  calm: ['#98FF98', '#87CEEB'],
  expectation: ['#FF69B4', '#DDA0DD'],
};

let selectedEmotion: EmotionType = 'joy';
let particleSystem: ParticleMemorySystem;
let timelineContainer: HTMLElement;
let idCounter = 0;

export function initUI(system: ParticleMemorySystem): void {
  particleSystem = system;

  const inputPanel = document.createElement('div');
  inputPanel.id = 'input-panel';
  inputPanel.innerHTML = `
    <div class="input-section">
      <input type="text" id="memory-input" placeholder="输入一段记忆..." maxlength="50" />
    </div>
    <div class="emotion-section" id="emotion-buttons"></div>
    <div class="button-section">
      <button id="add-btn">添加记忆</button>
    </div>
  `;

  const timelinePanel = document.createElement('div');
  timelinePanel.id = 'timeline-panel';
  timelinePanel.innerHTML = `
    <div class="timeline-title">记忆时间轴</div>
    <div class="timeline-list" id="timeline-list"></div>
  `;

  document.body.appendChild(inputPanel);
  document.body.appendChild(timelinePanel);

  timelineContainer = document.getElementById('timeline-list')!;

  createEmotionButtons();
  bindEvents();
  injectStyles();
}

function createEmotionButtons(): void {
  const container = document.getElementById('emotion-buttons')!;
  const emotions: EmotionType[] = ['joy', 'sadness', 'nostalgia', 'calm', 'expectation'];

  emotions.forEach(emotion => {
    const btn = document.createElement('button');
    btn.className = 'emotion-btn';
    btn.dataset.emotion = emotion;
    btn.title = EMOTION_LABELS[emotion];
    btn.setAttribute('aria-label', EMOTION_LABELS[emotion]);

    const [c1, c2] = EMOTION_CSS_COLORS[emotion];
    const dot = document.createElement('span');
    dot.className = 'emotion-dot';
    dot.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
    btn.appendChild(dot);

    if (emotion === selectedEmotion) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
      selectedEmotion = emotion;
      document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      btn.classList.add('bounce');
      setTimeout(() => btn.classList.remove('bounce'), 200);
      updateAddBtnGradient();
    });

    container.appendChild(btn);
  });

  updateAddBtnGradient();
}

function updateAddBtnGradient(): void {
  const btn = document.getElementById('add-btn') as HTMLButtonElement;
  const [c1, c2] = EMOTION_CSS_COLORS[selectedEmotion];
  btn.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
}

function bindEvents(): void {
  const input = document.getElementById('memory-input') as HTMLInputElement;
  const addBtn = document.getElementById('add-btn') as HTMLButtonElement;

  addBtn.addEventListener('click', () => {
    addMemory(input);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addMemory(input);
    }
  });
}

function addMemory(input: HTMLInputElement): void {
  const text = input.value.trim();
  if (!text) return;
  if (text.length > 50) return;

  const id = `memory_${Date.now()}_${idCounter++}`;
  const cluster = particleSystem.addMemory(id, text, selectedEmotion);

  addTimelineItem(cluster.id, selectedEmotion, text);

  input.value = '';
}

function addTimelineItem(id: string, emotion: EmotionType, text: string): void {
  const item = document.createElement('div');
  item.className = 'timeline-item';
  item.dataset.clusterId = id;

  const [c1, c2] = EMOTION_CSS_COLORS[emotion];

  const thumb = document.createElement('div');
  thumb.className = 'timeline-thumb';
  thumb.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
  thumb.title = text;

  const label = document.createElement('div');
  label.className = 'timeline-label';
  label.textContent = EMOTION_LABELS[emotion];

  item.appendChild(thumb);
  item.appendChild(label);

  item.addEventListener('click', () => {
    thumb.classList.add('flash');
    setTimeout(() => thumb.classList.remove('flash'), 200);

    const onNavigate = (window as any).__crystalMemoryNavigate;
    if (onNavigate) onNavigate(id);
  });

  timelineContainer.appendChild(item);
  timelineContainer.scrollTop = timelineContainer.scrollHeight;
}

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    #input-panel {
      position: fixed;
      left: 24px;
      bottom: 24px;
      background: rgba(15, 15, 35, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 14px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    #memory-input {
      width: 250px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      font-size: 14px;
      padding: 0 14px;
      outline: none;
      transition: all 0.1s ease;
      font-family: inherit;
    }

    #memory-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    #memory-input:focus {
      border-color: rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.15);
    }

    .emotion-section {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .emotion-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.05);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.1s ease;
      padding: 0;
    }

    .emotion-btn:hover {
      border-color: rgba(255, 255, 255, 0.4);
      transform: scale(1.1);
    }

    .emotion-btn.active {
      border-color: rgba(255, 255, 255, 0.7);
      box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
    }

    .emotion-btn.bounce {
      animation: btnBounce 0.2s ease;
    }

    @keyframes btnBounce {
      0% { transform: scale(1); }
      50% { transform: scale(0.85); }
      100% { transform: scale(1); }
    }

    .emotion-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: block;
    }

    #add-btn {
      width: 120px;
      height: 40px;
      border-radius: 20px;
      border: none;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.1s ease;
      font-family: inherit;
      letter-spacing: 1px;
      position: relative;
      overflow: hidden;
    }

    #add-btn:hover {
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }

    #add-btn:active {
      transform: scale(0.98);
    }

    #timeline-panel {
      position: fixed;
      right: 0;
      top: 0;
      width: 200px;
      height: 100%;
      background: rgba(15, 15, 35, 0.7);
      border-left: 1px solid rgba(255, 255, 255, 0.05);
      z-index: 100;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .timeline-title {
      padding: 16px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      letter-spacing: 2px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .timeline-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .timeline-list::-webkit-scrollbar {
      width: 4px;
    }

    .timeline-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .timeline-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
    }

    .timeline-item {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      transition: all 0.1s ease;
    }

    .timeline-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .timeline-thumb {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: all 0.1s ease;
    }

    .timeline-thumb.flash {
      animation: thumbFlash 0.2s ease;
    }

    @keyframes thumbFlash {
      0% { box-shadow: none; }
      50% { box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.6); }
      100% { box-shadow: none; }
    }

    .timeline-label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

export function getSelectedEmotion(): EmotionType {
  return selectedEmotion;
}
