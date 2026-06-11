import { useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { PitchData } from './PitchTracker';
import { BeatEvent } from './Metronome';

export interface VisualizerHandle {
  addBeat: (event: BeatEvent) => void;
  startPlayback: (data: PitchData[], audioStartTime?: number) => void;
  stopPlayback: () => void;
  syncPlaybackTime: (currentPlaybackTime: number) => void;
}

export interface VisualizerProps {
  pitchData: PitchData[];
  scaleName: string;
  scaleNotes: number[];
  activeBeats: BeatEvent[];
  isRecording: boolean;
  recordedData: PitchData[];
  isPlayingBack: boolean;
  playbackAudioStartOffset?: number;
}

interface ScaleNoteInfo {
  freq: number;
  name: string;
  octave: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIN_FREQ = 130.81;
const MAX_FREQ = 1046.50;
const WINDOW_SECONDS = 2;
const MAX_DISPLAY_POINTS = 1000;

const SCALE_COLORS: Record<string, { highlight: string; line: string }> = {
  'C Major': { highlight: '#e94560', line: 'rgba(233, 69, 96, 0.6)' },
  'A Minor': { highlight: '#16c79a', line: 'rgba(22, 199, 154, 0.6)' },
  'G Major': { highlight: '#f39c12', line: 'rgba(243, 156, 18, 0.6)' },
  'D Major': { highlight: '#9b59b6', line: 'rgba(155, 89, 182, 0.6)' },
  'Chromatic': { highlight: '#0f3460', line: 'rgba(15, 52, 96, 0.6)' }
};

const GHOST_TRAIL_ALPHA = 0.35;

function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiToNoteName(midi: number): { name: string; octave: number } {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { name: NOTE_NAMES[noteIndex], octave };
}

function getAllScaleNotes(scaleNotes: number[]): ScaleNoteInfo[] {
  const notes: ScaleNoteInfo[] = [];
  const minMidi = Math.floor(freqToMidi(MIN_FREQ));
  const maxMidi = Math.ceil(freqToMidi(MAX_FREQ));

  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const noteClass = midi % 12;
    if (scaleNotes.includes(noteClass)) {
      const freq = midiToFreq(midi);
      if (freq >= MIN_FREQ && freq <= MAX_FREQ) {
        const { name, octave } = midiToNoteName(midi);
        notes.push({ freq, name, octave });
      }
    }
  }
  return notes;
}

function centsDiff(freq1: number, freq2: number): number {
  return 1200 * Math.log2(freq1 / freq2);
}

function getClosestScaleNote(freq: number, scaleNotes: ScaleNoteInfo[]): { note: ScaleNoteInfo; cents: number } | null {
  if (scaleNotes.length === 0) return null;
  let closest = scaleNotes[0];
  let minCents = Math.abs(centsDiff(freq, closest.freq));
  for (let i = 1; i < scaleNotes.length; i++) {
    const c = Math.abs(centsDiff(freq, scaleNotes[i].freq));
    if (c < minCents) {
      minCents = c;
      closest = scaleNotes[i];
    }
  }
  return { note: closest, cents: minCents };
}

function getPitchColor(cents: number): string {
  if (cents <= 10) return '#16c79a';
  if (cents >= 50) return '#e94560';
  const t = (cents - 10) / 40;
  const r = Math.round(22 + (233 - 22) * t);
  const g = Math.round(199 + (69 - 199) * t);
  const b = Math.round(154 + (96 - 154) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function rgbToRgba(rgb: string, alpha: number): string {
  if (rgb.startsWith('rgba')) return rgb;
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  }
  return rgb;
}

function findSegmentData(
  data: PitchData[],
  viewStartTime: number,
  viewEndTime: number
): PitchData[] {
  if (data.length === 0) return [];

  let left = 0;
  let right = data.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (data[mid].time < viewStartTime) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  const startIdx = Math.max(0, left - 1);
  const result: PitchData[] = [];

  for (let i = startIdx; i < data.length; i++) {
    if (data[i].time > viewEndTime + 0.1) break;
    if (data[i].time >= viewStartTime - 0.1) {
      result.push(data[i]);
    }
  }

  return result;
}

const Visualizer = forwardRef<VisualizerHandle, VisualizerProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const localBeatsRef = useRef<BeatEvent[]>([]);
  const highlightedNotesRef = useRef<Map<string, number>>(new Map());
  const playbackDataRef = useRef<PitchData[]>([]);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackAudioOffsetRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameInterval = 1000 / 30;
  const propsRef = useRef(props);

  propsRef.current = props;

  const chromaticNotes = useMemo(() => {
    return getAllScaleNotes([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  }, []);

  useImperativeHandle(ref, () => ({
    addBeat: (event: BeatEvent) => {
      localBeatsRef.current.push(event);
      const now = performance.now() / 1000;
      localBeatsRef.current = localBeatsRef.current.filter(b => now - b.time < WINDOW_SECONDS + 2);
      if (localBeatsRef.current.length > 100) {
        localBeatsRef.current = localBeatsRef.current.slice(-100);
      }
    },
    startPlayback: (data: PitchData[], audioStartTime?: number) => {
      playbackDataRef.current = [...data];
      playbackStartTimeRef.current = performance.now() / 1000;
      playbackAudioOffsetRef.current = audioStartTime ?? 0;
    },
    stopPlayback: () => {
      playbackDataRef.current = [];
      playbackAudioOffsetRef.current = 0;
    },
    syncPlaybackTime: (currentPlaybackTime: number) => {
      playbackStartTimeRef.current = performance.now() / 1000 - currentPlaybackTime;
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const backCanvas = document.createElement('canvas');
    backCanvasRef.current = backCanvas;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      backCanvas.width = rect.width * dpr;
      backCanvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      const bctx = backCanvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      if (bctx) {
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        bctx.imageSmoothingEnabled = true;
        bctx.imageSmoothingQuality = 'high';
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= frameInterval) {
        lastFrameTimeRef.current = timestamp;
        draw();
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      const backCanvas = backCanvasRef.current;
      if (!canvas || !backCanvas) return;

      const ctx = backCanvas.getContext('2d');
      const frontCtx = canvas.getContext('2d');
      if (!ctx || !frontCtx) return;

      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const beatIndicatorHeight = 50;
      const graphHeight = H - beatIndicatorHeight;

      if (W === 0 || H === 0) return;

      ctx.save();
      ctx.clearRect(0, 0, W, H);

      const bgGradient = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) / 1.5);
      bgGradient.addColorStop(0, '#1a1a2e');
      bgGradient.addColorStop(1, '#12121f');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = (graphHeight / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      for (let i = 1; i < WINDOW_SECONDS * 2; i++) {
        const x = (W / (WINDOW_SECONDS * 2)) * i;
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, graphHeight);
        ctx.stroke();
      }

      const freqToY = (freq: number): number => {
        const logMin = Math.log2(MIN_FREQ);
        const logMax = Math.log2(MAX_FREQ);
        const logF = Math.log2(Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq)));
        return graphHeight - ((logF - logMin) / (logMax - logMin)) * graphHeight;
      };

      const now = performance.now() / 1000;
      const currentProps = propsRef.current;

      highlightedNotesRef.current.forEach((highlightUntil, key) => {
        if (now > highlightUntil) highlightedNotesRef.current.delete(key);
      });

      const currentScaleNotes = getAllScaleNotes(currentProps.scaleNotes);
      const currentScaleColor = SCALE_COLORS[currentProps.scaleName] || SCALE_COLORS['C Major'];

      chromaticNotes.forEach(info => {
        const y = freqToY(info.freq);
        if (y > 0 && y < graphHeight) {
          const noteIdx = NOTE_NAMES.indexOf(info.name.replace('#', ''));
          const isInScale = currentProps.scaleNotes.includes(noteIdx);
          const key = `${info.name}${info.octave}`;
          const isHighlighted = highlightedNotesRef.current.has(key);

          if (isInScale) {
            ctx.strokeStyle = isHighlighted ? currentScaleColor.highlight : currentScaleColor.line;
            ctx.setLineDash([8, 4]);
            ctx.lineWidth = isHighlighted ? 2 : 1.5;
          } else {
            ctx.strokeStyle = 'rgba(128,128,128,0.12)';
            ctx.setLineDash([4, 6]);
            ctx.lineWidth = 1;
          }

          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
          ctx.setLineDash([]);

          if (isInScale && (isHighlighted || info.name === 'C')) {
            ctx.fillStyle = isHighlighted ? currentScaleColor.highlight : 'rgba(255,255,255,0.4)';
            ctx.font = isHighlighted ? 'bold 12px sans-serif' : '10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${info.name}${info.octave}`, 8, y - 4);
          }
        }
      });

      let currentDisplayData: PitchData[] = [];
      let viewStartTime = 0;
      let playbackCursorTime = -1;

      if (currentProps.isPlayingBack && playbackDataRef.current.length > 0) {
        const playbackElapsed = now - playbackStartTimeRef.current - playbackAudioOffsetRef.current;
        playbackCursorTime = playbackElapsed;
        viewStartTime = Math.max(0, playbackElapsed - WINDOW_SECONDS / 2);

        const maxPlaybackTime = playbackDataRef.current[playbackDataRef.current.length - 1].time;
        if (viewStartTime + WINDOW_SECONDS > maxPlaybackTime + 0.5) {
          viewStartTime = Math.max(0, maxPlaybackTime - WINDOW_SECONDS + 0.5);
        }

        const viewEndTime = viewStartTime + WINDOW_SECONDS;
        currentDisplayData = findSegmentData(playbackDataRef.current, viewStartTime, viewEndTime);
      } else {
        const liveData = currentProps.pitchData;
        const latestTime = liveData.length > 0 ? liveData[liveData.length - 1].time : 0;
        viewStartTime = Math.max(0, latestTime - WINDOW_SECONDS);
        const viewEndTime = viewStartTime + WINDOW_SECONDS;
        currentDisplayData = findSegmentData(liveData, viewStartTime, viewEndTime);
      }

      if (currentDisplayData.length > MAX_DISPLAY_POINTS) {
        const stride = Math.ceil(currentDisplayData.length / MAX_DISPLAY_POINTS);
        currentDisplayData = currentDisplayData.filter((_, i) => i % stride === 0);
      }

      if (currentProps.recordedData.length > 0 && !currentProps.isPlayingBack) {
        const ghostData = findSegmentData(
          currentProps.recordedData,
          viewStartTime,
          viewStartTime + WINDOW_SECONDS
        );

        if (ghostData.length > MAX_DISPLAY_POINTS) {
          const stride = Math.ceil(ghostData.length / MAX_DISPLAY_POINTS);
          const sampled = ghostData.filter((_, i) => i % stride === 0);
          drawSmoothCurve(ctx, sampled, viewStartTime, W, freqToY, currentScaleNotes, true);
        } else {
          drawSmoothCurve(ctx, ghostData, viewStartTime, W, freqToY, currentScaleNotes, true);
        }
      }

      if (currentDisplayData.length > 0) {
        drawSmoothCurve(ctx, currentDisplayData, viewStartTime, W, freqToY, currentScaleNotes, false);

        currentDisplayData.forEach(d => {
          const closest = getClosestScaleNote(d.pitch, currentScaleNotes);
          if (closest && closest.cents < 30) {
            const key = `${closest.note.name}${closest.note.octave}`;
            highlightedNotesRef.current.set(key, now + 0.5);
          }
        });
      }

      const timeToX = (t: number): number => ((t - viewStartTime) / WINDOW_SECONDS) * W;

      if (!currentProps.isPlayingBack) {
        const allBeats = [...localBeatsRef.current, ...currentProps.activeBeats];
        const recentBeats = allBeats.filter(
          b => b.time >= viewStartTime && b.time <= viewStartTime + WINDOW_SECONDS
        );

        recentBeats.forEach(beat => {
          const x = timeToX(beat.time);
          if (x >= 0 && x <= W) {
            ctx.strokeStyle = beat.isDownbeat ? '#e94560' : 'rgba(233,69,96,0.5)';
            ctx.lineWidth = beat.isDownbeat ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, graphHeight);
            ctx.stroke();
          }
        });
      }

      const beatsY = H - beatIndicatorHeight / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H - beatIndicatorHeight);
      ctx.lineTo(W, H - beatIndicatorHeight);
      ctx.stroke();

      if (!currentProps.isPlayingBack) {
        const allBeats = [...localBeatsRef.current, ...currentProps.activeBeats];
        const recentBeats = allBeats.filter(b => now - b.time < 0.8);
        recentBeats.forEach(beat => {
          const age = now - beat.time;
          const alpha = Math.max(0, 1 - age / 0.8);
          const pulse = 1 + age * 2;
          const x = timeToX(beat.time);
          if (x >= 0 && x <= W) {
            ctx.beginPath();
            ctx.arc(x, beatsY, 10 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = beat.isDownbeat
              ? `rgba(233,69,96,${alpha * 0.8})`
              : `rgba(22,199,154,${alpha * 0.6})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, beatsY, 6, 0, Math.PI * 2);
            ctx.fillStyle = beat.isDownbeat ? '#e94560' : '#16c79a';
            ctx.fill();
          }
        });
      }

      if (currentProps.isPlayingBack && playbackCursorTime >= 0) {
        const cursorX = timeToX(playbackCursorTime);
        if (cursorX >= 0 && cursorX <= W) {
          const gradient = ctx.createLinearGradient(cursorX, 0, cursorX, graphHeight);
          gradient.addColorStop(0, 'rgba(233, 69, 96, 0)');
          gradient.addColorStop(0.5, 'rgba(233, 69, 96, 0.8)');
          gradient.addColorStop(1, 'rgba(233, 69, 96, 0)');
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cursorX, 0);
          ctx.lineTo(cursorX, graphHeight);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cursorX, beatsY, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#e94560';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cursorX, beatsY, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
        }
      }

      if (currentProps.isRecording) {
        const blink = Math.sin(now * 6) > 0;
        ctx.fillStyle = blink ? '#e94560' : 'rgba(233,69,96,0.5)';
        ctx.beginPath();
        ctx.arc(W - 30, 30, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('REC', W - 45, 34);
      }

      ctx.restore();

      frontCtx.save();
      frontCtx.clearRect(0, 0, W, H);
      frontCtx.drawImage(backCanvas, 0, 0, W, H, 0, 0, W, H);
      frontCtx.restore();
    };

    const drawSmoothCurve = (
      ctx: CanvasRenderingContext2D,
      data: PitchData[],
      viewStartTime: number,
      W: number,
      freqToY: (f: number) => number,
      allNotes: ScaleNoteInfo[],
      isGhost: boolean
    ) => {
      if (data.length < 2) return;

      const timeToX = (t: number): number => ((t - viewStartTime) / WINDOW_SECONDS) * W;
      const alpha = isGhost ? GHOST_TRAIL_ALPHA : 1;

      ctx.beginPath();
      let started = false;

      for (let i = 0; i < data.length; i++) {
        const p = data[i];
        const x = timeToX(p.time);
        const y = freqToY(p.pitch);

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else if (i === data.length - 1) {
          ctx.lineTo(x, y);
        } else {
          const pNext = data[i + 1];
          const xNext = timeToX(pNext.time);
          const yNext = freqToY(pNext.pitch);
          const cpx = (x + xNext) / 2;
          const cpy = (y + yNext) / 2;
          ctx.quadraticCurveTo(x, y, cpx, cpy);
        }
      }

      ctx.lineWidth = isGhost ? 2 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = isGhost
        ? `rgba(255, 255, 255, ${alpha * 0.5})`
        : 'rgba(255, 255, 255, 0)';
      ctx.globalCompositeOperation = 'source-over';
      ctx.stroke();

      for (let i = 1; i < data.length; i++) {
        const p0 = data[i - 1];
        const p1 = data[i];

        const x0 = timeToX(p0.time);
        const x1 = timeToX(p1.time);
        const y0 = freqToY(p0.pitch);
        const y1 = freqToY(p1.pitch);

        const avgPitch = (p0.pitch + p1.pitch) / 2;
        const closest = getClosestScaleNote(avgPitch, allNotes);
        const cents = closest ? closest.cents : 60;
        const baseColor = getPitchColor(cents);
        const color = isGhost ? rgbToRgba(baseColor, GHOST_TRAIL_ALPHA) : baseColor;

        const cpx = (x0 + x1) / 2;
        const cpy = (y0 + y1) / 2;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = isGhost ? 1.5 : 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cpx, cpy, x1, y1);
        ctx.stroke();
      }

      if (!isGhost && data.length > 0) {
        const last = data[data.length - 1];
        const x = timeToX(last.time);
        const y = freqToY(last.pitch);
        const closest = getClosestScaleNote(last.pitch, allNotes);
        const cents = closest ? closest.cents : 60;

        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = rgbToRgba(getPitchColor(cents), 0.2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = getPitchColor(cents);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (closest) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'left';
          const centsStr = cents.toFixed(0);
          const label = `${closest.note.name}${closest.note.octave} ${last.pitch.toFixed(0)}Hz ±${centsStr}¢`;
          const labelX = Math.min(W - 160, x + 14);
          const labelY = Math.max(20, y - 10);

          const metrics = ctx.measureText(label);
          const boxW = metrics.width + 12;
          const boxH = 18;

          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.beginPath();
          ctx.roundRect(labelX - 6, labelY - 14, boxW, boxH, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.fillText(label, labelX, labelY);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        borderRadius: '16px',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3)',
        background: '#1a1a2e'
      }}
    />
  );
});

Visualizer.displayName = 'Visualizer';

export default Visualizer;
