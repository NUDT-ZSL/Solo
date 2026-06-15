import { GuqinRenderer, HighlightPos } from './guqin';
import { AudioPlayer } from './audio';
import { PlayLogger, PlayLog } from './logger';
import { SCORES, ScoreNote, getJianziPu, getNoteName, STRING_BASE_FREQUENCIES, HUI_POSITIONS } from './score';

function getFrequencyForPos(stringIdx: number, huiIdx: number): number {
  const baseFreq = STRING_BASE_FREQUENCIES[stringIdx];
  const hui = HUI_POSITIONS[huiIdx];
  const effectiveLength = (13 - hui) / 13;
  return baseFreq / effectiveLength;
}

function init(): void {
  const canvas = document.getElementById('guqin-canvas') as HTMLCanvasElement;
  const audioPlayer = new AudioPlayer();
  const guqin = new GuqinRenderer(canvas);
  const logger = new PlayLogger();

  const bubble = document.getElementById('note-bubble') as HTMLDivElement;
  const bubbleSymbol = document.getElementById('bubble-symbol') as HTMLDivElement;
  const bubbleNote = document.getElementById('bubble-note') as HTMLDivElement;

  const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const playbackBtn = document.getElementById('playback-btn') as HTMLButtonElement;
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
  const logContainer = document.getElementById('log-container') as HTMLDivElement;
  const logEmpty = document.getElementById('log-empty') as HTMLDivElement;
  const scoreCards = document.getElementById('score-cards') as HTMLDivElement;
  const qinWrapper = document.querySelector('.guqin-wrapper') as HTMLDivElement;

  let bubbleHideTimer: number | null = null;
  let demoTimers: number[] = [];

  function renderLogs(): void {
    const logs = logger.getLogs();
    if (logs.length === 0) {
      logContainer.innerHTML = '';
      logContainer.appendChild(logEmpty);
      logEmpty.style.display = 'block';
      playbackBtn.disabled = true;
      return;
    }
    logEmpty.style.display = 'none';
    playbackBtn.disabled = logger.isPlaybackActive;

    logContainer.innerHTML = '';
    logs.forEach((log, idx) => {
      const line = document.createElement('div');
      line.className = 'log-line';
      line.dataset.index = String(idx);
      line.textContent = `[${String(idx + 1).padStart(3, '0')}] ${logger.formatLog(log)}`;
      logContainer.appendChild(line);
    });
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  function setActiveLogIndex(index: number | null): void {
    const lines = logContainer.querySelectorAll('.log-line');
    lines.forEach(line => line.classList.remove('active'));
    if (index !== null) {
      const activeLine = logContainer.querySelector(`.log-line[data-index="${index}"]`) as HTMLElement | null;
      if (activeLine) {
        activeLine.classList.add('active');
        activeLine.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  function showBubble(pos: HighlightPos, symbol: string, note: string): void {
    const canvasRect = canvas.getBoundingClientRect();
    const wrapperRect = qinWrapper.getBoundingClientRect();
    const canvasPos = guqin.getPosition(pos.stringIdx, pos.huiIdx);

    const scale = canvasRect.width / canvas.width;
    const x = canvasPos.x * scale + (canvasRect.left - wrapperRect.left) - 60;
    const y = canvasPos.y * scale + (canvasRect.top - wrapperRect.top) - 80;

    bubbleSymbol.textContent = symbol;
    bubbleNote.textContent = note;
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    bubble.classList.add('visible');

    if (bubbleHideTimer !== null) {
      clearTimeout(bubbleHideTimer);
    }
    bubbleHideTimer = window.setTimeout(() => {
      bubble.classList.remove('visible');
      bubbleHideTimer = null;
    }, 1200);
  }

  function playNote(pos: HighlightPos, recordIt: boolean = true): void {
    const freq = getFrequencyForPos(pos.stringIdx, pos.huiIdx);
    const symbol = getJianziPu(pos.stringIdx, pos.huiIdx);
    const noteName = getNoteName(freq);

    guqin.addActiveNote(pos.stringIdx, pos.huiIdx, 600);
    audioPlayer.playFrequency(freq, 0.6);
    showBubble(pos, symbol, noteName);

    if (recordIt && logger.isRecordingActive) {
      logger.record(pos.stringIdx, pos.huiIdx);
      renderLogs();
    }
  }

  canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;

    const pos = guqin.getStringHuiAtPoint(x, y);
    if (pos) {
      playNote(pos, true);
    }
  });

  recordBtn.addEventListener('click', () => {
    if (logger.isRecordingActive) {
      logger.stopRecording();
      recordBtn.classList.remove('recording');
      recordBtn.textContent = '●';
    } else {
      logger.startRecording();
      recordBtn.classList.add('recording');
      recordBtn.textContent = '■';
    }
    renderLogs();
  });

  clearBtn.addEventListener('click', () => {
    logger.clear();
    recordBtn.classList.remove('recording');
    recordBtn.textContent = '●';
    renderLogs();
  });

  playbackBtn.addEventListener('click', () => {
    if (logger.isPlaybackActive) {
      logger.stopPlayback();
      playbackBtn.textContent = '▶';
      renderLogs();
      return;
    }
    playbackBtn.textContent = '■';
    renderLogs();
    logger.startPlayback();
  });

  speedSlider.addEventListener('input', () => {
    const speed = parseFloat(speedSlider.value);
    logger.setSpeed(speed);
    speedValue.textContent = `${speed.toFixed(1)}x`;
  });

  logger.setPlayCallback((log: PlayLog) => {
    const pos: HighlightPos = { stringIdx: log.string, huiIdx: log.hui };
    const freq = getFrequencyForPos(pos.stringIdx, pos.huiIdx);
    const symbol = getJianziPu(pos.stringIdx, pos.huiIdx);
    const noteName = getNoteName(freq);
    guqin.addActiveNote(pos.stringIdx, pos.huiIdx, 600);
    audioPlayer.playFrequency(freq, 0.6);
    showBubble(pos, symbol, noteName);
  });

  logger.setActiveIndexCallback((index: number | null) => {
    setActiveLogIndex(index);
    if (index === null) {
      playbackBtn.textContent = '▶';
      renderLogs();
    }
  });

  function buildScoreCards(): void {
    SCORES.forEach(score => {
      const card = document.createElement('div');
      card.className = 'score-card';
      card.dataset.id = score.id;

      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = score.name;

      const starsEl = document.createElement('div');
      starsEl.className = 'stars';
      starsEl.textContent = '★'.repeat(score.difficulty);

      card.appendChild(nameEl);
      card.appendChild(starsEl);

      card.addEventListener('click', () => {
        startDemo(score.notes);
      });

      scoreCards.appendChild(card);
    });
  }

  function clearDemoTimers(): void {
    for (const t of demoTimers) clearTimeout(t);
    demoTimers = [];
  }

  function startDemo(notes: ScoreNote[]): void {
    clearDemoTimers();
    guqin.clearDemoMarkers();

    const markers: HighlightPos[] = notes.map(n => ({ stringIdx: n.string, huiIdx: n.hui }));
    guqin.setDemoMarkers(markers);

    notes.forEach((note, idx) => {
      const timerId = window.setTimeout(() => {
        const pos: HighlightPos = { stringIdx: note.string, huiIdx: note.hui };
        const symbol = getJianziPu(pos.stringIdx, pos.huiIdx);
        const noteName = getNoteName(note.frequency);
        guqin.addActiveNote(pos.stringIdx, pos.huiIdx, 1200, true);
        audioPlayer.playFrequency(note.frequency, 0.6);
        showBubble(pos, symbol, noteName);
      }, idx * 1500);
      demoTimers.push(timerId);
    });

    const clearDelay = notes.length * 1500 + 3000;
    const clearTimer = window.setTimeout(() => {
      guqin.clearDemoMarkers();
    }, clearDelay);
    demoTimers.push(clearTimer);
  }

  function enableScoreDrag(): void {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    scoreCards.addEventListener('mousedown', (e) => {
      isDown = true;
      scoreCards.classList.add('dragging');
      startX = e.pageX - scoreCards.offsetLeft;
      scrollLeft = scoreCards.scrollLeft;
    });

    scoreCards.addEventListener('mouseleave', () => {
      isDown = false;
      scoreCards.classList.remove('dragging');
    });

    scoreCards.addEventListener('mouseup', () => {
      isDown = false;
      scoreCards.classList.remove('dragging');
    });

    scoreCards.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - scoreCards.offsetLeft;
      const walk = (x - startX) * 1.2;
      scoreCards.scrollLeft = scrollLeft - walk;
    });

    scoreCards.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.pageX - scoreCards.offsetLeft;
      scrollLeft = scoreCards.scrollLeft;
    });

    scoreCards.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const x = touch.pageX - scoreCards.offsetLeft;
      const walk = (x - startX) * 1.2;
      scoreCards.scrollLeft = scrollLeft - walk;
    });
  }

  renderLogs();
  buildScoreCards();
  enableScoreDrag();
}

document.addEventListener('DOMContentLoaded', init);
