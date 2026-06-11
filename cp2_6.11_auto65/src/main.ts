import type { TimelineEvent, PlaybackState, FilterRange, EncodedState } from './types';
import { TimelineManager } from './timeline';
import { ParticleSystem } from './particle';
import { CanvasRenderer } from './renderer';
import { formatDate, isSameDay, addDays, startOfDay, minDate, maxDate } from './dateUtils';
import { clamp } from './animation';

const IS_MOBILE = window.innerWidth < 600;
const CARD_WIDTH = IS_MOBILE ? 60 : 80;
const CARD_HEIGHT = IS_MOBILE ? 30 : 40;

const canvasWrapper = document.getElementById('canvasWrapper') as HTMLDivElement;
const canvas = document.getElementById('timeline-canvas') as HTMLCanvasElement;
const loadingEl = document.getElementById('loading') as HTMLDivElement;

const addEventBtn = document.getElementById('addEventBtn') as HTMLButtonElement;
const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;

const eventModal = document.getElementById('eventModal') as HTMLDivElement;
const cancelEventBtn = document.getElementById('cancelEventBtn') as HTMLButtonElement;
const submitEventBtn = document.getElementById('submitEventBtn') as HTMLButtonElement;
const eventNameInput = document.getElementById('eventName') as HTMLInputElement;
const eventDateInput = document.getElementById('eventDate') as HTMLInputElement;
const eventColorInput = document.getElementById('eventColor') as HTMLInputElement;

const exportModal = document.getElementById('exportModal') as HTMLDivElement;
const closeExportBtn = document.getElementById('closeExportBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const previewImg = document.getElementById('previewImg') as HTMLImageElement;
const shareLinkInput = document.getElementById('shareLink') as HTMLInputElement;
const copyLinkBtn = document.getElementById('copyLinkBtn') as HTMLButtonElement;
const copyToast = document.getElementById('copyToast') as HTMLDivElement;

const minRangeInput = document.getElementById('minRange') as HTMLInputElement;
const maxRangeInput = document.getElementById('maxRange') as HTMLInputElement;

let cssWidth = Math.max(canvasWrapper.clientWidth, 600);
let cssHeight = 500;

const timeline = new TimelineManager(cssWidth, CARD_WIDTH);
const particles = new ParticleSystem(IS_MOBILE);
const renderer = new CanvasRenderer(canvas, CARD_WIDTH, IS_MOBILE);

(renderer as any).setupCanvasSize(cssWidth, cssHeight);

const playback: PlaybackState = {
  isPlaying: false,
  currentDate: new Date(),
  startDate: new Date(),
  daysPerStep: 1,
  stepIntervalMs: 2000,
  lastStepTime: 0,
  boostEventId: null,
  boostRemaining: 0,
};

let draggingEventId: string | null = null;
let prevTargetPositions: Map<string, number> = new Map();
let lastFrameTime = performance.now();
let rafId = 0;
let pendingDataUrl = '';

function updateSize() {
  cssWidth = Math.max(canvasWrapper.clientWidth, IS_MOBILE ? 320 : 600);
  cssHeight = canvasWrapper.clientHeight || 500;
  (renderer as any).setupCanvasSize(cssWidth, cssHeight);
  timeline.setCanvasWidth(cssWidth);
}

function snapshotTargetPositions() {
  prevTargetPositions.clear();
  for (const ev of timeline.getEvents()) {
    prevTargetPositions.set(ev.id, ev.targetPosition);
  }
}

function notifyChangedTargetPositions() {
  for (const ev of timeline.getEvents()) {
    const prev = prevTargetPositions.get(ev.id);
    if (prev !== undefined && Math.abs(prev - ev.targetPosition) > 0.01) {
      particles.notifyEventPositionChanged(ev.id, ev.targetPosition, CARD_WIDTH);
      prevTargetPositions.set(ev.id, ev.targetPosition);
    }
  }
}

function hitTestCard(px: number, py: number): TimelineEvent | null {
  const rect = canvas.getBoundingClientRect();
  const x = (px - rect.left) * (cssWidth / rect.width);
  const y = (py - rect.top) * (cssHeight / rect.height);
  const cardY = 40;
  for (const ev of timeline.getSortedEvents()) {
    if (ev.visibility < 0.1) continue;
    const w = CARD_WIDTH * ev.cardScale;
    const h = CARD_HEIGHT * ev.cardScale;
    const cx = ev.position + (CARD_WIDTH - w) / 2;
    const cy = cardY + (CARD_HEIGHT - h) / 2;
    if (x >= cx && x <= cx + w && y >= cy && y <= cy + h) {
      return ev;
    }
  }
  return null;
}

canvas.addEventListener('pointerdown', (e) => {
  const hit = hitTestCard(e.clientX, e.clientY);
  if (!hit) return;
  canvas.setPointerCapture(e.pointerId);
  draggingEventId = hit.id;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (cssWidth / rect.width);
  snapshotTargetPositions();
  timeline.startDrag(hit.id, x);
});

canvas.addEventListener('pointermove', (e) => {
  if (!draggingEventId) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (cssWidth / rect.width);
  timeline.onDragMove(draggingEventId, x);
  notifyChangedTargetPositions();
});

function endDrag(ev: PointerEvent) {
  if (!draggingEventId) return;
  try { canvas.releasePointerCapture(ev.pointerId); } catch (_) { /* noop */ }
  timeline.endDrag(draggingEventId);
  notifyChangedTargetPositions();
  draggingEventId = null;
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function openEventModal() {
  eventNameInput.value = '';
  eventDateInput.value = formatDate(startOfDay(new Date()));
  const palette = ['#58A6FF', '#F78166', '#7BC4C4', '#D14C8B', '#3FB950'];
  eventColorInput.value = palette[Math.floor(Math.random() * palette.length)];
  eventModal.classList.add('active');
  setTimeout(() => eventNameInput.focus(), 50);
}
function closeEventModal() {
  eventModal.classList.remove('active');
}

addEventBtn.addEventListener('click', openEventModal);
cancelEventBtn.addEventListener('click', closeEventModal);
eventModal.addEventListener('click', (e) => {
  if (e.target === eventModal) closeEventModal();
});

submitEventBtn.addEventListener('click', () => {
  const name = eventNameInput.value.trim();
  const dateStr = eventDateInput.value;
  const color = eventColorInput.value;
  if (!name || !dateStr) return;
  const date = startOfDay(new Date(dateStr));
  snapshotTargetPositions();
  const ev = timeline.addEvent(name, date, color);
  prevTargetPositions.set(ev.id, ev.targetPosition);
  closeEventModal();
  refreshSliderRange();
});

function togglePlayback() {
  const range = timeline.getMinMaxDates();
  if (!range) return;
  if (!playback.isPlaying) {
    playback.startDate = range.min;
    if (playback.currentDate < range.min || playback.currentDate > range.max) {
      playback.currentDate = new Date(range.min);
    }
    playback.lastStepTime = performance.now();
    playback.isPlaying = true;
    playBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="4" width="4" height="16" style="fill:currentColor;stroke:none"/>
        <rect x="14" y="4" width="4" height="16" style="fill:currentColor;stroke:none"/>
      </svg>暂停`;
  } else {
    playback.isPlaying = false;
    playBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5,3 19,12 5,21" style="fill:currentColor;stroke:none"/>
      </svg>播放`;
  }
}
playBtn.addEventListener('click', togglePlayback);

resetBtn.addEventListener('click', () => {
  const range = timeline.getMinMaxDates();
  if (range) {
    playback.currentDate = new Date(range.min);
  }
  playback.isPlaying = false;
  playback.boostEventId = null;
  playback.boostRemaining = 0;
  playBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    </svg>重置`;
});

function updatePlaybackStep(nowMs: number) {
  if (!playback.isPlaying) return;
  const range = timeline.getMinMaxDates();
  if (!range) return;

  if (playback.boostRemaining > 0) {
    playback.boostRemaining -= (nowMs - lastFrameTime) / 1000;
    if (playback.boostRemaining <= 0) {
      playback.boostEventId = null;
      playback.boostRemaining = 0;
    }
  }

  while (playback.isPlaying && nowMs - playback.lastStepTime >= playback.stepIntervalMs) {
    playback.lastStepTime += playback.stepIntervalMs;
    playback.currentDate = addDays(playback.currentDate, playback.daysPerStep);

    if (playback.currentDate > range.max) {
      playback.isPlaying = false;
      playback.currentDate = new Date(range.max);
      playBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5,3 19,12 5,21" style="fill:currentColor;stroke:none"/>
        </svg>播放`;
      break;
    }

    for (const ev of timeline.getEvents()) {
      if (isSameDay(ev.date, playback.currentDate)) {
        ev.flashProgress = 1;
        playback.boostEventId = ev.id;
        playback.boostRemaining = 3;
      }
    }
  }
}

let sliderMinPct = 0;
let sliderMaxPct = 100;
let filterRange: FilterRange | null = null;

function refreshSliderRange() {
  const range = timeline.getMinMaxDates();
  if (!range) {
    minRangeInput.value = '0';
    maxRangeInput.value = '100';
    sliderMinPct = 0;
    sliderMaxPct = 100;
    timeline.setFilterRange(null);
    filterRange = null;
    return;
  }
  const total = range.max.getTime() - range.min.getTime();
  let a = parseInt(minRangeInput.value, 10);
  let b = parseInt(maxRangeInput.value, 10);
  if (a > b) [a, b] = [b, a];
  sliderMinPct = a;
  sliderMaxPct = b;

  if (a === 0 && b === 100) {
    timeline.setFilterRange(null);
    filterRange = null;
  } else {
    const ratioA = a / 100;
    const ratioB = b / 100;
    filterRange = {
      minDate: new Date(range.min.getTime() + total * ratioA),
      maxDate: new Date(range.min.getTime() + total * ratioB),
    };
    timeline.setFilterRange(filterRange);
  }
}

function onSliderInput() {
  refreshSliderRange();
}
minRangeInput.addEventListener('input', onSliderInput);
maxRangeInput.addEventListener('input', onSliderInput);

function computeFilterMarkers(): { minX: number; maxX: number } | undefined {
  if (!filterRange) return undefined;
  const range = timeline.getMinMaxDates();
  if (!range) return undefined;
  const paddingL = 80;
  const paddingR = 40;
  const usable = cssWidth - paddingL - paddingR;
  const span = range.max.getTime() - range.min.getTime();
  if (span <= 0) return undefined;
  const minX = paddingL + clamp((filterRange.minDate.getTime() - range.min.getTime()) / span, 0, 1) * usable;
  const maxX = paddingL + clamp((filterRange.maxDate.getTime() - range.min.getTime()) / span, 0, 1) * usable;
  return { minX, maxX };
}

function encodeState(): string {
  const state: EncodedState = {
    v: 1,
    events: timeline.getSortedEvents().map((e) => ({
      n: e.name,
      d: formatDate(e.date),
      c: e.color,
    })),
  };
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json)));
}

async function copyShareLink() {
  try {
    const url = window.location.origin + window.location.pathname + '#s=' + encodeState();
    await navigator.clipboard.writeText(url);
    shareLinkInput.value = url;
  } catch (_) {
    const url = window.location.origin + window.location.pathname + '#s=' + encodeState();
    shareLinkInput.value = url;
    shareLinkInput.select();
    try { document.execCommand('copy'); } catch (__) { /* noop */ }
  }
  copyToast.classList.add('show');
  setTimeout(() => copyToast.classList.remove('show'), 3000);
}

copyLinkBtn.addEventListener('click', copyShareLink);

function openExportModal() {
  snapshotTargetPositions();
  notifyChangedTargetPositions();
  pendingDataUrl = renderer.exportHiRes(timeline.getSortedEvents(), particles.getPool());
  previewImg.src = pendingDataUrl;
  previewImg.alt = '时间涟漪预览';
  const url = window.location.origin + window.location.pathname + '#s=' + encodeState();
  shareLinkInput.value = url;
  exportModal.classList.add('active');
}

closeExportBtn.addEventListener('click', () => exportModal.classList.remove('active'));
exportModal.addEventListener('click', (e) => {
  if (e.target === exportModal) exportModal.classList.remove('active');
});
exportBtn.addEventListener('click', openExportModal);

downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = pendingDataUrl;
  a.download = `time-ripples-${formatDate(new Date())}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

function decodeStateFromHash(): EncodedState | null {
  const hash = window.location.hash;
  const match = hash.match(/#s=(.+)/);
  if (!match) return null;
  try {
    const json = decodeURIComponent(escape(atob(match[1])));
    return JSON.parse(json) as EncodedState;
  } catch (_) {
    return null;
  }
}

function mainLoop(now: number) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  updatePlaybackStep(now);
  timeline.updatePositions(dt);
  notifyChangedTargetPositions();

  const eventsById = new Map<string, TimelineEvent>();
  for (const ev of timeline.getEvents()) eventsById.set(ev.id, ev);

  particles.update(dt, timeline.getSortedEvents(), playback);
  particles.updateParticleFade(dt, eventsById);

  const markers = computeFilterMarkers();
  const playbackCursorDate = playback.isPlaying || (playback.currentDate && timeline.getMinMaxDates() !== null)
    ? playback.currentDate
    : null;
  renderer.render(
    timeline.getSortedEvents(),
    particles.getPool(),
    playbackCursorDate,
    markers
  );

  rafId = requestAnimationFrame(mainLoop);
}

function init() {
  const decoded = decodeStateFromHash();
  if (decoded && Array.isArray(decoded.events)) {
    snapshotTargetPositions();
    for (const item of decoded.events) {
      if (!item.n || !item.d || !item.c) continue;
      const ev = timeline.addEvent(item.n, startOfDay(new Date(item.d)), item.c);
      prevTargetPositions.set(ev.id, ev.targetPosition);
    }
  } else {
    snapshotTargetPositions();
    timeline.initializeWithSampleData();
    for (const ev of timeline.getEvents()) {
      prevTargetPositions.set(ev.id, ev.targetPosition);
    }
  }

  const range = timeline.getMinMaxDates();
  if (range) {
    playback.currentDate = new Date(range.min);
    playback.startDate = new Date(range.min);
  }

  window.addEventListener('resize', () => {
    updateSize();
  });
  updateSize();

  setTimeout(() => {
    loadingEl.classList.add('fade-out');
    setTimeout(() => loadingEl.remove(), 700);
  }, 900);

  lastFrameTime = performance.now();
  rafId = requestAnimationFrame(mainLoop);
}

init();
