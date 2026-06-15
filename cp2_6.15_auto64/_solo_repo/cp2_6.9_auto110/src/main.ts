import {
  generateNetwork,
  applyCommand,
  updateNetwork,
  type Difficulty,
  type NetworkState
} from './network';

import {
  createEffectsState,
  updateEffects,
  render,
  spawnExplosion,
  spawnDisruptFragments,
  type EffectsState
} from './effects';

type LogType = 'user' | 'system' | 'warning' | 'alert';

interface LogEntry {
  id: number;
  timestamp: string;
  text: string;
  type: LogType;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MAX_LOG_ENTRIES = 30;
const TYPING_INTERVAL = 80;

let networkState: NetworkState;
let effectsState: EffectsState;
let logEntries: LogEntry[] = [];
let logIdCounter = 0;
let lastFrameTime = 0;
let isTyping = false;
let typingTimer: number | null = null;

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
const commandInput = document.getElementById('commandInput') as HTMLInputElement;
const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
const logContainer = document.getElementById('logContainer') as HTMLDivElement;
const flashOverlay = document.getElementById('flashOverlay') as HTMLDivElement;
const difficultyRadios = document.querySelectorAll<HTMLInputElement>('input[name="difficulty"]');

function getTimestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function logEntry(text: string, type: LogType): void {
  const entry: LogEntry = {
    id: logIdCounter++,
    timestamp: getTimestamp(),
    text,
    type
  };

  logEntries.unshift(entry);

  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries = logEntries.slice(0, MAX_LOG_ENTRIES);
  }

  renderLogs();
}

function renderLogs(): void {
  const frag = document.createDocumentFragment();

  for (const entry of logEntries) {
    const div = document.createElement('div');
    div.className = `log-entry log-${entry.type}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${entry.timestamp}]`;

    const textSpan = document.createElement('span');
    textSpan.className = 'typing-text';
    textSpan.textContent = entry.text;

    div.appendChild(timeSpan);
    div.appendChild(textSpan);
    frag.appendChild(div);
  }

  while (logContainer.firstChild) {
    logContainer.removeChild(logContainer.firstChild);
  }

  logContainer.appendChild(frag);
}

function flashScreen(): void {
  flashOverlay.classList.add('active');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flashOverlay.classList.remove('active');
    });
  });
}

function resetGame(difficulty: Difficulty): void {
  networkState = generateNetwork(difficulty);
  effectsState = createEffectsState();
  logEntries = [];
  logIdCounter = 0;
  renderLogs();
  commandInput.value = '';
  flashScreen();
  logEntry(`Network initialized. ${networkState.nodes.length} nodes online.`, 'system');
  logEntry(`Difficulty: ${difficulty.toUpperCase()}`, 'system');
}

function parseCommand(raw: string): { command: string; nodeId: number } | null {
  const trimmed = raw.trim().toUpperCase();
  const match = trimmed.match(/^(CONNECT|DISRUPT|SCAN)\s+(\d+)$/);
  if (!match) return null;
  return {
    command: match[1],
    nodeId: parseInt(match[2], 10)
  };
}

function typeLog(text: string, finalText: string, type: LogType, onComplete?: () => void): void {
  if (isTyping) return;
  isTyping = true;

  const entry: LogEntry = {
    id: logIdCounter++,
    timestamp: getTimestamp(),
    text: '',
    type
  };
  logEntries.unshift(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries = logEntries.slice(0, MAX_LOG_ENTRIES);
  }

  let i = 0;
  const fullText = finalText;
  const displayText = text;

  function typeNext(): void {
    if (i <= displayText.length) {
      entry.text = displayText.slice(0, i);
      renderLogs();
      i++;
      typingTimer = window.setTimeout(typeNext, TYPING_INTERVAL);
    } else {
      entry.text = fullText;
      renderLogs();
      isTyping = false;
      onComplete?.();
    }
  }
  typeNext();
}

function executeCommand(): void {
  if (isTyping) return;

  const raw = commandInput.value;
  if (!raw.trim()) return;

  const parsed = parseCommand(raw);

  typeLog(`> ${raw}`, `> ${raw}`, 'user', () => {
    if (!parsed) {
      logEntry(`Invalid command format. Use: CONNECT/DISRUPT/SCAN [ID]`, 'warning');
      return;
    } else {
      const result = applyCommand(networkState, parsed.command, parsed.nodeId);

      if (result.success) {
        const node = networkState.nodes.find(n => n.id === parsed.nodeId);

        if (parsed.command === 'DISRUPT' && node) {
          spawnDisruptFragments(effectsState, node.x, node.y);
        }

        if (result.nodeHacked && node) {
          spawnExplosion(effectsState, node.x, node.y, '#00FF41');
          logEntry(`[ALERT] INTRUSION DETECTED - Node ${parsed.nodeId} COMPROMISED`, 'alert');
        }

        logEntry(result.message, 'system');
      } else {
        logEntry(result.message, 'warning');
      }
    }
  });

  commandInput.value = '';
  commandInput.focus();
}

function gameLoop(timestamp: number): void {
  const deltaTime = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.1) : 0;
  lastFrameTime = timestamp;

  const now = performance.now();
  const { newlyHacked } = updateNetwork(networkState, deltaTime, now);

  for (const nodeId of newlyHacked) {
    const node = networkState.nodes[nodeId];
    if (node) {
      spawnExplosion(effectsState, node.x, node.y, '#00FF41');
      logEntry(`[ALERT] WORM PROPAGATION - Node ${nodeId} INFECTED`, 'alert');
    }
  }

  updateEffects(effectsState, deltaTime);

  if (ctx) {
    render(ctx, networkState, effectsState, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  requestAnimationFrame(gameLoop);
}

function setupEventListeners(): void {
  submitBtn.addEventListener('click', executeCommand);

  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeCommand();
    }
  });

  for (const radio of difficultyRadios) {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        if (typingTimer) {
          clearTimeout(typingTimer);
          isTyping = false;
        }
        resetGame(target.value as Difficulty);
      }
    });
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const node of networkState.nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.abs(dx) <= 8 && Math.abs(dy) <= 8) {
        commandInput.value = `SCAN ${node.id}`;
        commandInput.focus();
        break;
      }
    }
  });
}

function init(): void {
  setupEventListeners();
  resetGame('normal');
  lastFrameTime = 0;
  requestAnimationFrame(gameLoop);
  commandInput.focus();
}

init();
