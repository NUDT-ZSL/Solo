import { v4 as uuidv4 } from 'uuid';
import type { Dialog, Connection } from './types';

const TYPE_INTERVAL = 80;

interface TypewriterState {
  targetText: string;
  displayedLength: number;
  lastTick: number;
  onComplete?: () => void;
}

export class StoryBoard {
  private subtitleEl: HTMLElement;
  private dialogs: Dialog[] = [];
  private rafId = 0;
  private running = false;

  private typewriter: TypewriterState | null = null;
  private pendingQueue: { text: string; onComplete?: () => void }[] = [];

  private onDialogAdded: ((dialog: Dialog) => void) | null = null;
  private onHistoryRequest: (() => void) | null = null;

  constructor(subtitleEl: HTMLElement) {
    this.subtitleEl = subtitleEl;
  }

  setDialogAddedHandler(cb: (dialog: Dialog) => void) {
    this.onDialogAdded = cb;
  }

  setHistoryRequestHandler(cb: () => void) {
    this.onHistoryRequest = cb;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  getDialogs(): Dialog[] {
    return this.dialogs.map(d => ({ ...d }));
  }

  addDialogFromConnection(conn: Connection, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    this.onHistoryRequest?.();

    const dialog: Dialog = {
      id: uuidv4(),
      fromId: conn.fromId,
      toId: conn.toId,
      text: trimmed,
      timestamp: Date.now(),
    };
    this.dialogs.push(dialog);

    this.queueTypewriter(trimmed);
    this.onDialogAdded?.(dialog);
  }

  clear() {
    this.dialogs = [];
    this.pendingQueue = [];
    this.typewriter = null;
    this.subtitleEl.textContent = '';
  }

  setTextInstant(text: string) {
    this.typewriter = null;
    this.pendingQueue = [];
    this.subtitleEl.textContent = text;
  }

  queueTypewriter(text: string, onComplete?: () => void) {
    this.pendingQueue.push({ text, onComplete });
    this.tryStartNext();
  }

  restoreDialogs(dialogs: Dialog[]) {
    this.dialogs = dialogs.map(d => ({ ...d }));
    if (this.dialogs.length > 0) {
      const last = this.dialogs[this.dialogs.length - 1];
      this.subtitleEl.textContent = last.text;
    } else {
      this.subtitleEl.textContent = '';
    }
    this.typewriter = null;
    this.pendingQueue = [];
  }

  snapshotDialogs(): Dialog[] {
    return this.dialogs.map(d => ({ ...d }));
  }

  private tryStartNext() {
    if (this.typewriter) return;
    const next = this.pendingQueue.shift();
    if (!next) return;
    this.typewriter = {
      targetText: next.text,
      displayedLength: 0,
      lastTick: performance.now(),
      onComplete: next.onComplete,
    };
    this.subtitleEl.textContent = '';
  }

  private loop = () => {
    if (!this.running) return;
    this.tick(performance.now());
    this.rafId = requestAnimationFrame(this.loop);
  };

  private tick(now: number) {
    if (!this.typewriter) return;
    const tw = this.typewriter;

    if (tw.displayedLength >= tw.targetText.length) {
      const cb = tw.onComplete;
      this.typewriter = null;
      cb?.();
      this.tryStartNext();
      return;
    }

    while (tw.displayedLength < tw.targetText.length && now - tw.lastTick >= TYPE_INTERVAL) {
      tw.displayedLength++;
      tw.lastTick += TYPE_INTERVAL;
    }

    this.subtitleEl.textContent = tw.targetText.slice(0, tw.displayedLength);
  }
}
