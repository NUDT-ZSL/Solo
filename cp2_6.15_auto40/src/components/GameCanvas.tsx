import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Difficulty } from './DifficultySelect';

interface GameCanvasProps {
  difficulty: Difficulty;
  nickname: string;
  onGameOver: (score: number) => void;
}

const difficultyConfig: Record<Difficulty, { speed: number; spawnRate: number }> = {
  easy: { speed: 2, spawnRate: 1500 },
  normal: { speed: 3.5, spawnRate: 1000 },
  hard: { speed: 5, spawnRate: 700 },
};

interface Note {
  id: number;
  lane: number;
  y: number;
  hit: boolean;
}

class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private difficulty: Difficulty;
  private notes: Note[] = [];
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private missCount = 0;
  private lastSpawnTime = 0;
  private animationId: number | null = null;
  private noteIdCounter = 0;
  private isRunning = false;
  private playerLane = 1;
  private onGameOverCallback: (score: number) => void;
  private onScoreUpdate: (score: number, combo: number, maxCombo: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    difficulty: Difficulty,
    onGameOver: (score: number) => void,
    onScoreUpdate: (score: number, combo: number, maxCombo: number) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.difficulty = difficulty;
    this.onGameOverCallback = onGameOver;
    this.onScoreUpdate = onScoreUpdate;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  private spawnNote() {
    const lane = Math.floor(Math.random() * 3);
    this.notes.push({
      id: this.noteIdCounter++,
      lane,
      y: -40,
      hit: false,
    });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isRunning) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.playerLane = Math.max(0, this.playerLane - 1);
      this.checkHit();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.playerLane = Math.min(2, this.playerLane + 1);
      this.checkHit();
    } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      this.checkHit();
    }
  };

  private handleTouch = (e: TouchEvent) => {
    if (!this.isRunning) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const laneWidth = rect.width / 3;

    if (x < laneWidth) {
      this.playerLane = 0;
    } else if (x < laneWidth * 2) {
      this.playerLane = 1;
    } else {
      this.playerLane = 2;
    }
    this.checkHit();
  };

  private checkHit() {
    const rect = this.canvas.getBoundingClientRect();
    const hitZoneY = rect.height - 100;
    const hitTolerance = 60;

    let hitAny = false;

    for (const note of this.notes) {
      if (note.hit || note.lane !== this.playerLane) continue;

      const distance = Math.abs(note.y - hitZoneY);
      if (distance < hitTolerance) {
        note.hit = true;
        hitAny = true;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);

        let points = 100;
        if (distance < 15) {
          points = 300;
        } else if (distance < 30) {
          points = 200;
        }
        this.score += points + this.combo * 5;
        this.onScoreUpdate(this.score, this.combo, this.maxCombo);
      }
    }

    if (!hitAny) {
      // missed tap, reset combo
      if (this.combo > 0) {
        this.combo = 0;
        this.onScoreUpdate(this.score, this.combo, this.maxCombo);
      }
    }
  }

  private update(timestamp: number) {
    const config = difficultyConfig[this.difficulty];
    const rect = this.canvas.getBoundingClientRect();
    const hitZoneY = rect.height - 100;

    if (timestamp - this.lastSpawnTime > config.spawnRate) {
      this.spawnNote();
      this.lastSpawnTime = timestamp;
    }

    for (const note of this.notes) {
      if (!note.hit) {
        note.y += config.speed;

        if (note.y > hitZoneY + 80) {
          note.hit = true;
          this.missCount++;
          this.combo = 0;
          this.onScoreUpdate(this.score, this.combo, this.maxCombo);
        }
      }
    }

    this.notes = this.notes.filter((n) => n.y < rect.height + 50);

    if (this.missCount >= 10) {
      this.stop();
      this.onGameOverCallback(this.score);
      return;
    }
  }

  private draw() {
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const laneWidth = w / 3;
    const gradientColors = ['rgba(0, 255, 204, 0.05)', 'rgba(255, 0, 204, 0.05)', 'rgba(0, 204, 255, 0.05)'];
    const lineColors = ['rgba(0, 255, 204, 0.5)', 'rgba(255, 0, 204, 0.5)', 'rgba(0, 204, 255, 0.5)'];

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = gradientColors[i];
      ctx.fillRect(i * laneWidth, 0, laneWidth, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, h);
      ctx.stroke();
    }

    const hitZoneY = h - 100;
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, hitZoneY);
    ctx.lineTo(w, hitZoneY);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const note of this.notes) {
      if (note.hit) continue;

      const nx = note.lane * laneWidth + laneWidth / 2;
      const noteW = laneWidth * 0.6;
      const noteH = 30;

      const noteGradient = ctx.createLinearGradient(
        nx - noteW / 2,
        note.y - noteH / 2,
        nx + noteW / 2,
        note.y + noteH / 2
      );
      noteGradient.addColorStop(0, lineColors[note.lane].replace('0.5', '1'));
      noteGradient.addColorStop(1, '#ffffff');

      ctx.fillStyle = noteGradient;
      ctx.shadowColor = lineColors[note.lane].replace('0.5', '0.8');
      ctx.shadowBlur = 20;
      this.roundRect(ctx, nx - noteW / 2, note.y - noteH / 2, noteW, noteH, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const px = this.playerLane * laneWidth + laneWidth / 2;
    const py = hitZoneY;
    const playerW = laneWidth * 0.7;
    const playerH = 40;

    const playerGradient = ctx.createLinearGradient(
      px - playerW / 2,
      py - playerH / 2,
      px + playerW / 2,
      py + playerH / 2
    );
    playerGradient.addColorStop(0, '#00ffcc');
    playerGradient.addColorStop(0.5, '#ffffff');
    playerGradient.addColorStop(1, '#ff00cc');

    ctx.fillStyle = playerGradient;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 30;
    this.roundRect(ctx, px - playerW / 2, py - playerH / 2, playerW, playerH, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.missCount}/10 失误`, w / 2, 20);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private gameLoop = (timestamp: number) => {
    if (!this.isRunning) return;

    this.update(timestamp);
    this.draw();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  start() {
    this.resize();
    this.isRunning = true;
    window.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('touchstart', this.handleTouch, { passive: false });
    window.addEventListener('resize', () => this.resize());
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('touchstart', this.handleTouch);
  }
}

const GameCanvas: React.FC<GameCanvasProps> = ({ difficulty, nickname, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const handleScoreUpdate = useCallback(
    (s: number, c: number, mc: number) => {
      setScore(s);
      setCombo(c);
      setMaxCombo(mc);
    },
    []
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, difficulty, onGameOver, handleScoreUpdate);
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, [difficulty, onGameOver, handleScoreUpdate]);

  return (
    <div className="game-canvas-container">
      <div className="game-info-bar">
        <div className="game-info-item">
          <div className="game-info-label">玩家</div>
          <div className="game-info-value">{nickname}</div>
        </div>
        <div className="game-info-item">
          <div className="game-info-label">得分</div>
          <div className="game-info-value">{score.toLocaleString()}</div>
        </div>
        <div className="game-info-item">
          <div className="game-info-label">连击</div>
          <div className="game-info-value" style={{ color: combo >= 10 ? '#ff00cc' : undefined }}>
            {combo}x
          </div>
        </div>
        <div className="game-info-item">
          <div className="game-info-label">最高连击</div>
          <div className="game-info-value" style={{ color: '#ffd700' }}>
            {maxCombo}x
          </div>
        </div>
      </div>
      <div className="game-track">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    </div>
  );
};

export default GameCanvas;
