import { StageManager } from './StageManager';
import { StoryBoard } from './StoryBoard';
import type { Dialog, Connection, CharacterType, CharacterPreset } from './types';

const CHARACTER_SVGS: Record<CharacterType, string> = {
  detective: `<svg viewBox="-35 -55 70 110" xmlns="http://www.w3.org/2000/svg">
    <path fill="#111" d="M-20,-32 L-25,-32 L-25,-28 L25,-28 L25,-32 L20,-32 L13,-48 L-13,-48 Z"/>
    <ellipse cx="0" cy="-20" rx="13" ry="14" fill="#111"/>
    <rect x="-9" y="-22" width="18" height="5" rx="1" fill="#111"/>
    <path fill="#111" d="M-26,-6 L-32,22 L32,22 L26,-6 Z"/>
    <rect x="-30" y="20" width="14" height="26" fill="#111"/>
    <rect x="16" y="20" width="14" height="26" fill="#111"/>
    <path fill="#111" d="M-26,-4 L-36,10 L-28,12 L-18,-1 Z"/>
    <path fill="#111" d="M26,-4 L36,10 L28,12 L18,-1 Z"/>
  </svg>`,

  owl: `<svg viewBox="-38 -43 76 86" xmlns="http://www.w3.org/2000/svg">
    <path fill="#111" d="M-28,-18 Q-34,-34 -20,-40 L-14,-36 L-10,-42 L-5,-36 L0,-44 L5,-36 L10,-42 L14,-36 L20,-40 Q34,-34 28,-18 Q34,8 22,26 Q10,36 0,32 Q-10,36 -22,26 Q-34,8 -28,-18 Z"/>
    <circle cx="-13" cy="-22" r="9" fill="#111"/>
    <circle cx="13" cy="-22" r="9" fill="#111"/>
    <path fill="#111" d="M0,-22 L-4,-12 L4,-12 Z"/>
    <rect x="-9" y="28" width="4" height="8" fill="#111"/>
    <rect x="5" y="28" width="4" height="8" fill="#111"/>
  </svg>`,

  castle: `<svg viewBox="-65 -55 130 110" xmlns="http://www.w3.org/2000/svg">
    <path fill="#111" d="M-60,50 L-60,-10
      L-60,-28 L-52,-28 L-52,-10 L-42,-10 L-42,-28 L-32,-28 L-32,-10 L-22,-10 L-22,-28 L-12,-28 L-12,-10
      L-8,-10 L-8,-30 L-2,-30 L-2,-44 L2,-44 L2,-30 L8,-30 L8,-54 L12,-30 L18,-30 L18,-46 L22,-30 L28,-30 L28,-52 L32,-30 L38,-30 L38,-42 L42,-30
      L42,-30 L42,-10 L52,-10 L52,-28 L62,-28 L62,-10
      L60,-10 L60,50 Z"/>
    <path fill="#111" d="M-12,50 L-12,12 Q-12,-4 0,-6 Q12,-4 12,12 L12,50 Z"/>
    <rect x="-46" y="0" width="7" height="14" fill="#111"/>
    <rect x="-28" y="0" width="7" height="14" fill="#111"/>
    <rect x="24" y="0" width="7" height="14" fill="#111"/>
    <rect x="42" y="0" width="7" height="14" fill="#111"/>
  </svg>`,

  key: `<svg viewBox="-45 -20 90 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="-26" cy="0" r="15" fill="#111"/>
    <circle cx="-26" cy="0" r="7" fill="transparent" stroke="#111" stroke-width="16"/>
    <rect x="-12" y="-5" width="52" height="10" fill="#111"/>
    <path fill="#111" d="M28,-5 L34,-5 L34,-16 L40,-16 L40,-5 L40,-10 L44,-10 L44,5 L28,5 Z"/>
  </svg>`,

  candle: `<svg viewBox="-20 -45 40 90" xmlns="http://www.w3.org/2000/svg">
    <path fill="#111" d="M0,-40 Q-10,-30 -4,-20 Q-2,-24 0,-20 Q2,-24 4,-20 Q10,-30 0,-40 Z"/>
    <rect x="-2" y="-22" width="4" height="8" fill="#111"/>
    <path fill="#111" d="M-10,-14 Q-14,6 -10,34 L10,34 Q14,6 10,-14 Z"/>
    <path fill="#111" d="M-14,34 L-18,40 L18,40 L14,34 Z"/>
  </svg>`,

  shadow: `<svg viewBox="-40 -55 80 110" xmlns="http://www.w3.org/2000/svg">
    <path fill="#111" d="M0,-50 Q30,-40 30,-10 Q40,15 30,35 L20,50 Q0,45 0,45 Q0,45 -20,50 L-30,35 Q-40,15 -30,-10 Q-30,-40 0,-50 Z"/>
    <circle cx="-13" cy="-20" r="6" fill="#111"/>
    <circle cx="13" cy="-20" r="6" fill="#111"/>
    <path fill="#111" d="M-10,0 Q0,10 10,0 Q0,18 -10,0 Z"/>
  </svg>`,

  tree: `<svg viewBox="-45 -65 90 130" xmlns="http://www.w3.org/2000/svg">
    <path fill="#111" d="M-5,60 L-5,10 L-18,6 L-5,-2 L-22,-12 L-5,-18 L-18,-32 L-4,-36 L-10,-52 L0,-62 L10,-52 L4,-36 L18,-32 L5,-18 L22,-12 L5,-2 L18,6 L5,10 L5,60 Z"/>
    <path fill="#111" d="M-4,8 L-30,-2 L-26,0 L-3,6 Z M-3,-8 L-30,-18 L-26,-16 L-2,-12 Z M-2,-24 L-26,-40 L-22,-38 L-1,-28 Z"/>
    <path fill="#111" d="M4,8 L30,-2 L26,0 L3,6 Z M3,-8 L30,-18 L26,-16 L2,-12 Z M2,-24 L26,-40 L22,-38 L1,-28 Z"/>
  </svg>`,

  moon: `<svg viewBox="-40 -40 80 80" xmlns="http://www.w3.org/2000/svg">
    <circle cx="0" cy="0" r="36" fill="#111"/>
    <circle cx="18" cy="0" r="29" fill="transparent"/>
    <path fill="transparent" d="M18,-29 A29,29 0 0 1 18,29 L-10,29 A36,36 0 0 0 -10,-29 Z" fill="#2a2a2a"/>
    <circle cx="-10" cy="-10" r="4" fill="#333"/>
    <circle cx="6" cy="12" r="5" fill="#333"/>
    <circle cx="-14" cy="16" r="3" fill="#333"/>
  </svg>`,
};

interface DialogHistorySnapshot {
  dialogs: Dialog[];
}

class App {
  private stage: StageManager;
  private storyBoard: StoryBoard;
  private canvas: HTMLCanvasElement;

  private hueSlider: HTMLInputElement;
  private glowToggle: HTMLElement;
  private glowSwitch: HTMLElement;
  private exportBtn: HTMLButtonElement;
  private undoBtn: HTMLButtonElement;
  private redoBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;

  private dialogOverlay: HTMLElement;
  private dialogInput: HTMLTextAreaElement;
  private dialogConfirm: HTMLButtonElement;
  private dialogCancel: HTMLButtonElement;
  private pendingConnection: Connection | null = null;

  private dialogHistory: DialogHistorySnapshot[] = [];
  private dialogHistoryIndex = -1;
  private awaitingDialogHistoryCommit = false;

  constructor() {
    this.canvas = document.getElementById('stage-canvas') as HTMLCanvasElement;
    this.stage = new StageManager(this.canvas);
    const subtitleEl = document.getElementById('subtitle-text') as HTMLElement;
    this.storyBoard = new StoryBoard(subtitleEl);

    this.hueSlider = document.getElementById('hue-slider') as HTMLInputElement;
    this.glowToggle = document.getElementById('glow-toggle') as HTMLElement;
    this.glowSwitch = document.getElementById('glow-switch') as HTMLElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    this.undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    this.redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;

    this.dialogOverlay = document.getElementById('dialog-overlay') as HTMLElement;
    this.dialogInput = document.getElementById('dialog-input') as HTMLTextAreaElement;
    this.dialogConfirm = document.getElementById('dialog-confirm') as HTMLButtonElement;
    this.dialogCancel = document.getElementById('dialog-cancel') as HTMLButtonElement;

    this.buildCharacterRack();
    this.bindEvents();
    this.stage.start();
    this.storyBoard.start();
    this.snapshotDialogHistory();
    this.updateButtons();
  }

  private buildCharacterRack() {
    const rack = document.getElementById('character-rack') as HTMLElement;
    const presets: CharacterPreset[] = this.stage.getPresets();
    for (const preset of presets) {
      const card = document.createElement('div');
      card.className = 'character-card';
      card.dataset.type = preset.type;
      card.draggable = true;

      const svg = CHARACTER_SVGS[preset.type];
      card.innerHTML = svg + `<span class="character-name">${preset.name}</span>`;

      card.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const type = preset.type;
        this.stage.beginExternalDrag(type, e.clientX, e.clientY);
        const move = (ev: MouseEvent) => {
          this.stage.beginExternalDrag(type, ev.clientX, ev.clientY);
        };
        const up = (ev: MouseEvent) => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
          this.stage['onMouseUp'](ev);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      });

      rack.appendChild(card);
    }
  }

  private bindEvents() {
    this.stage.setDialogRequestHandler((conn) => {
      this.openDialog(conn);
    });

    this.stage.setStateChangeHandler(() => {
      this.updateButtons();
    });

    this.storyBoard.setHistoryRequestHandler(() => {
      this.awaitingDialogHistoryCommit = true;
    });

    this.storyBoard.setDialogAddedHandler(() => {
      if (this.awaitingDialogHistoryCommit) {
        this.awaitingDialogHistoryCommit = false;
        this.snapshotDialogHistory();
      }
      this.updateButtons();
    });

    this.hueSlider.addEventListener('input', () => {
      const hue = parseInt(this.hueSlider.value, 10);
      this.stage.setOptions({ hue });
    });

    this.glowToggle.addEventListener('click', () => {
      const active = !this.glowSwitch.classList.contains('active');
      this.glowSwitch.classList.toggle('active', active);
      this.stage.setOptions({ glowMode: active });
    });

    this.exportBtn.addEventListener('click', () => {
      this.exportStoryboard();
    });

    this.undoBtn.addEventListener('click', () => {
      this.undo();
    });

    this.redoBtn.addEventListener('click', () => {
      this.redo();
    });

    this.clearBtn.addEventListener('click', () => {
      if (confirm('确定清空整个舞台吗？此操作可撤销。')) {
        this.storyBoard.clear();
        this.stage.clearAll();
        this.snapshotDialogHistory();
        this.updateButtons();
      }
    });

    this.dialogCancel.addEventListener('click', () => {
      this.closeDialog();
    });

    this.dialogConfirm.addEventListener('click', () => {
      this.submitDialog();
    });

    this.dialogInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.submitDialog();
      } else if (e.key === 'Escape') {
        this.closeDialog();
      }
    });

    this.dialogOverlay.addEventListener('click', (e) => {
      if (e.target === this.dialogOverlay) {
        this.closeDialog();
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        this.redo();
      }
    });
  }

  private openDialog(conn: Connection) {
    this.pendingConnection = conn;
    this.dialogInput.value = '';
    this.dialogOverlay.classList.add('visible');
    setTimeout(() => {
      this.dialogInput.focus();
    }, 100);
  }

  private closeDialog() {
    this.dialogOverlay.classList.remove('visible');
    this.pendingConnection = null;
    this.dialogInput.blur();
  }

  private submitDialog() {
    if (!this.pendingConnection) return;
    const text = this.dialogInput.value;
    if (!text.trim()) {
      this.closeDialog();
      return;
    }
    const conn = this.pendingConnection;
    this.storyBoard.addDialogFromConnection(conn, text);
    this.stage.markConnectionGold(conn.fromId, conn.toId);
    this.closeDialog();
  }

  private undo() {
    this.stage.undo();
    if (this.dialogHistoryIndex > 0) {
      this.dialogHistoryIndex--;
      const snap = this.dialogHistory[this.dialogHistoryIndex];
      this.storyBoard.restoreDialogs(snap.dialogs);
    }
    this.updateButtons();
  }

  private redo() {
    this.stage.redo();
    if (this.dialogHistoryIndex < this.dialogHistory.length - 1) {
      this.dialogHistoryIndex++;
      const snap = this.dialogHistory[this.dialogHistoryIndex];
      this.storyBoard.restoreDialogs(snap.dialogs);
    }
    this.updateButtons();
  }

  private snapshotDialogHistory() {
    const snap: DialogHistorySnapshot = {
      dialogs: this.storyBoard.snapshotDialogs(),
    };
    this.dialogHistory = this.dialogHistory.slice(0, this.dialogHistoryIndex + 1);
    this.dialogHistory.push(snap);
    if (this.dialogHistory.length > 20) {
      const remove = this.dialogHistory.length - 20;
      this.dialogHistory = this.dialogHistory.slice(remove);
      this.dialogHistoryIndex -= remove;
    } else {
      this.dialogHistoryIndex++;
    }
  }

  private updateButtons() {
    const canUndo = this.stage.canUndo() || this.dialogHistoryIndex > 0;
    const canRedo = this.stage.canRedo() || this.dialogHistoryIndex < this.dialogHistory.length - 1;
    this.undoBtn.style.opacity = canUndo ? '1' : '0.45';
    this.undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
    this.redoBtn.style.opacity = canRedo ? '1' : '0.45';
    this.redoBtn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
  }

  private exportStoryboard() {
    const dialogs = this.storyBoard.getDialogs();
    const data = this.stage.exportStoryboard(dialogs);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `纸影迷踪_故事板_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
