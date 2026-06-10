import type { Note, NoteShape, HitResult, HitType, GameStats, ReplayRecord } from './types';
import { NOTE_COLORS } from './types';

type HitCallback = (result: HitResult) => void;
type MissCallback = (note: Note) => void;

export class NoteManager {
  private notes: Note[] = [];
  private nextNoteId = 0;
  private bpm = 120;
  private beatInterval = 0.5;
  private noteSpeed = 300;
  private judgeLineX = 150;
  private perfectRange = 10;
  private goodRange = 30;
  private canvasWidth = 800;
  private canvasHeight = 600;
  private playAreaTop = 0;
  private playAreaBottom = 0;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private totalNotes = 0;
  private hitNotes = 0;
  private perfectNotes = 0;
  private goodNotes = 0;
  private missedNotes = 0;
  private hitCallbacks: HitCallback[] = [];
  private missCallbacks: MissCallback[] = [];
  private noteSize = 24;
  private notePatternIndex = 0;
  private replayRecords: ReplayRecord[] = [];
  private isReplayMode = false;
  private replayIndex = 0;
  private replayStartTime = 0;
  private gameStartTime = 0;
  private generatedNoteIds: Set<number> = new Set();

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.judgeLineX = width * 0.15;
    this.playAreaTop = height * 0.1;
    this.playAreaBottom = height * 0.9;
  }

  setBPM(bpm: number): void {
    this.bpm = bpm;
    this.beatInterval = 60 / bpm;
    this.noteSpeed = (this.canvasWidth - this.judgeLineX) / (this.beatInterval * 4);
  }

  setNoteSize(size: number): void {
    this.noteSize = size;
  }

  getJudgeLineX(): number {
    return this.judgeLineX;
  }

  getNoteSpeed(): number {
    return this.noteSpeed;
  }

  spawnNote(shape: NoteShape, time: number): Note {
    const shapes: NoteShape[] = ['circle', 'triangle', 'diamond'];
    const actualShape = shape || shapes[Math.floor(Math.random() * shapes.length)];

    const y = this.playAreaTop + this.noteSize + Math.random() * (this.playAreaBottom - this.playAreaTop - this.noteSize * 2);

    const note: Note = {
      id: this.nextNoteId++,
      shape: actualShape,
      x: this.canvasWidth + this.noteSize,
      y,
      speed: this.noteSpeed,
      color: NOTE_COLORS[actualShape],
      size: this.noteSize,
      spawnTime: time
    };

    this.notes.push(note);
    this.totalNotes++;
    return note;
  }

  spawnPatternedNote(time: number, intensity: number = 1): void {
    const basePatterns: NoteShape[][] = [
      ['circle'],
      ['triangle'],
      ['diamond'],
      ['circle', 'diamond'],
      ['triangle', 'circle'],
      ['circle', 'triangle', 'diamond']
    ];

    const difficultyIdx = Math.min(Math.floor(this.bpm / 60) - 1, basePatterns.length - 1);
    const patternIdx = this.notePatternIndex % (basePatterns.length - difficultyIdx);
    const pattern = basePatterns[Math.min(patternIdx + difficultyIdx, basePatterns.length - 1)];

    const numNotes = Math.min(pattern.length, Math.ceil(1 + intensity * 2));
    const selectedPattern = pattern.slice(0, numNotes);

    const yStep = (this.playAreaBottom - this.playAreaTop) / (selectedPattern.length + 1);

    selectedPattern.forEach((shape, i) => {
      const y = this.playAreaTop + yStep * (i + 1) + (Math.random() - 0.5) * 20;
      const note: Note = {
        id: this.nextNoteId++,
        shape,
        x: this.canvasWidth + this.noteSize,
        y,
        speed: this.noteSpeed * (0.9 + Math.random() * 0.2),
        color: NOTE_COLORS[shape],
        size: this.noteSize,
        spawnTime: time
      };
      this.notes.push(note);
      this.totalNotes++;
    });

    this.notePatternIndex++;
  }

  update(deltaTime: number): void {
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];

      if (note.falling) {
        if (note.fallVelocity) {
          note.fallVelocity.vy += 800 * deltaTime;
          note.x += note.fallVelocity.vx * deltaTime;
          note.y += note.fallVelocity.vy * deltaTime;
        }
      } else {
        note.x -= note.speed * deltaTime;
      }

      if (!note.hit && !note.missed && !note.falling && note.x < this.judgeLineX - this.goodRange) {
        note.missed = true;
        this.handleMiss(note);
      }

      if (note.x < -this.noteSize * 2 || note.y > this.canvasHeight + this.noteSize) {
        this.notes.splice(i, 1);
      }
    }

    if (this.isReplayMode) {
      this.updateReplay(deltaTime);
    }
  }

  private updateReplay(deltaTime: number): void {
    const currentTime = (performance.now() - this.replayStartTime) / 1000;

    while (this.replayIndex < this.replayRecords.length) {
      const record = this.replayRecords[this.replayIndex];
      const recordTime = (record.timestamp - this.gameStartTime) / 1000;

      if (recordTime <= currentTime) {
        if (record.hitResult && record.shape) {
          this.simulateReplayHit(record.shape);
        }
        this.replayIndex++;
      } else {
        break;
      }
    }
  }

  private simulateReplayHit(shape: NoteShape): void {
    let closestNote: Note | null = null;
    let closestDistance = Infinity;

    for (const note of this.notes) {
      if (note.hit || note.missed || note.falling) continue;
      if (note.shape !== shape) continue;

      const distance = Math.abs(note.x - this.judgeLineX);
      if (distance < this.goodRange * 1.5 && distance < closestDistance) {
        closestNote = note;
        closestDistance = distance;
      }
    }

    if (closestNote) {
      closestNote.hit = true;
      let hitType: HitType = closestDistance <= this.perfectRange ? 'perfect' : 'good';

      const result: HitResult = {
        note: closestNote,
        type: hitType,
        position: { x: closestNote.x, y: closestNote.y }
      };

      this.hitCallbacks.forEach(cb => cb(result));
    }
  }

  hitTest(shape?: NoteShape): HitResult | null {
    if (this.isReplayMode) return null;

    let closestNote: Note | null = null;
    let closestDistance = Infinity;

    for (const note of this.notes) {
      if (note.hit || note.missed || note.falling) continue;
      if (shape && note.shape !== shape) continue;

      const distance = Math.abs(note.x - this.judgeLineX);
      if (distance < this.goodRange && distance < closestDistance) {
        closestNote = note;
        closestDistance = distance;
      }
    }

    if (!closestNote) return null;

    let hitType: HitType;
    if (closestDistance <= this.perfectRange) {
      hitType = 'perfect';
    } else {
      hitType = 'good';
    }

    closestNote.hit = true;
    this.handleHit(closestNote, hitType);

    return {
      note: closestNote,
      type: hitType,
      position: { x: closestNote.x, y: closestNote.y }
    };
  }

  private handleHit(note: Note, type: HitType): void {
    this.combo++;
    this.hitNotes++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const comboMultiplier = this.combo >= 10 ? 1.5 : 1;

    if (type === 'perfect') {
      this.perfectNotes++;
      this.score += Math.floor(100 * comboMultiplier);
    } else {
      this.goodNotes++;
      this.score += Math.floor(50 * comboMultiplier);
    }

    if (!this.isReplayMode) {
      this.replayRecords.push({
        timestamp: performance.now(),
        shape: note.shape,
        hitResult: type,
        noteId: note.id
      });
    }

    const result: HitResult = {
      note,
      type,
      position: { x: note.x, y: note.y }
    };

    this.hitCallbacks.forEach(cb => cb(result));
  }

  private handleMiss(note: Note): void {
    this.missedNotes++;
    this.combo = 0;

    note.falling = true;
    note.fallVelocity = { vx: -50, vy: -100 };
    note.color = '#555555';

    if (!this.isReplayMode) {
      this.replayRecords.push({
        timestamp: performance.now(),
        shape: note.shape,
        hitResult: 'miss',
        noteId: note.id
      });
    }

    this.missCallbacks.forEach(cb => cb(note));
  }

  getNotes(): Note[] {
    return this.notes;
  }

  onHit(callback: HitCallback): void {
    this.hitCallbacks.push(callback);
  }

  onMiss(callback: MissCallback): void {
    this.missCallbacks.push(callback);
  }

  getCombo(): number {
    return this.combo;
  }

  getScore(): number {
    return this.score;
  }

  getStats(): GameStats {
    return {
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      totalNotes: this.totalNotes,
      hitNotes: this.hitNotes,
      perfectNotes: this.perfectNotes,
      goodNotes: this.goodNotes,
      missedNotes: this.missedNotes
    };
  }

  reset(): void {
    this.notes = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotes = 0;
    this.hitNotes = 0;
    this.perfectNotes = 0;
    this.goodNotes = 0;
    this.missedNotes = 0;
    this.nextNoteId = 0;
    this.notePatternIndex = 0;
    this.isReplayMode = false;
    this.replayIndex = 0;
    this.generatedNoteIds.clear();
  }

  clearReplayRecords(): void {
    this.replayRecords = [];
    this.gameStartTime = 0;
  }

  getReplayRecords(): ReplayRecord[] {
    return this.replayRecords;
  }

  setGameStartTime(time: number): void {
    this.gameStartTime = time;
  }

  setReplayMode(enabled: boolean): void {
    this.isReplayMode = enabled;
    this.replayIndex = 0;
    if (enabled) {
      this.replayStartTime = performance.now();
    }
  }

  isInCombo(): boolean {
    return this.combo >= 10;
  }

  isFullCombo(): boolean {
    return this.combo >= 20;
  }

  getPerfectRange(): number {
    return this.perfectRange;
  }

  getGoodRange(): number {
    return this.goodRange;
  }
}
