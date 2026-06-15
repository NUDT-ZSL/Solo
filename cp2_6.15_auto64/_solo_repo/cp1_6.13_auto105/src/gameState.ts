import * as THREE from 'three';
import * as sceneManager from './scene';
import * as effects from './effects';
import { CollisionEvent } from './ship';

enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

const MAX_LIVES = 3;
const SCORE_PER_ORB = 10;
const HEART_ACTIVE_COLOR = '#ef4444';
const HEART_LOST_COLOR = '#6b7280';

let currentState: GameState = GameState.MENU;
let score = 0;
let lives = MAX_LIVES;
let highScore = 0;

let scoreDisplay: HTMLElement | null = null;
let healthDisplay: HTMLElement | null = null;
let pauseOverlay: HTMLElement | null = null;
let menuOverlay: HTMLElement | null = null;
let gameOverOverlay: HTMLElement | null = null;
let finalScoreDisplay: HTMLElement | null = null;
let highScoreDisplay: HTMLElement | null = null;
let startBtn: HTMLElement | null = null;
let restartBtn: HTMLElement | null = null;

export function init(): void {
  scoreDisplay = document.getElementById('score-display');
  healthDisplay = document.getElementById('health-display');
  pauseOverlay = document.getElementById('pause-overlay');
  menuOverlay = document.getElementById('menu-overlay');
  gameOverOverlay = document.getElementById('game-over-overlay');
  finalScoreDisplay = document.getElementById('final-score');
  highScoreDisplay = document.getElementById('high-score');
  startBtn = document.getElementById('start-btn');
  restartBtn = document.getElementById('restart-btn');

  if (startBtn) {
    startBtn.addEventListener('click', startGame);
  }
  if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'KeyP') {
      togglePause();
    }
  });

  fetchHighScore();
  updateHealthDisplay();
  updateScoreDisplay();
}

async function fetchHighScore(): Promise<void> {
  try {
    const response = await fetch('/api/highscore');
    if (response.ok) {
      const data = await response.json();
      highScore = data.score || 0;
      if (highScoreDisplay) {
        highScoreDisplay.textContent = `最高分: ${highScore}`;
      }
    }
  } catch {
    highScore = 0;
  }
}

async function saveHighScore(): Promise<void> {
  try {
    if (score > highScore) {
      highScore = score;
      await fetch('/api/highscore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, name: 'Player' }),
      });
    }
  } catch {
    // silently fail
  }
}

function startGame(): void {
  currentState = GameState.PLAYING;
  score = 0;
  lives = MAX_LIVES;

  sceneManager.spawnAsteroids();
  updateScoreDisplay();
  updateHealthDisplay();

  if (menuOverlay) menuOverlay.classList.add('hidden');
  if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
  if (pauseOverlay) pauseOverlay.classList.remove('active');
}

function restartGame(): void {
  sceneManager.reset();
  startGame();
}

function togglePause(): void {
  if (currentState === GameState.PLAYING) {
    currentState = GameState.PAUSED;
    if (pauseOverlay) pauseOverlay.classList.add('active');
  } else if (currentState === GameState.PAUSED) {
    currentState = GameState.PLAYING;
    if (pauseOverlay) pauseOverlay.classList.remove('active');
  }
}

function gameOver(): void {
  currentState = GameState.GAME_OVER;

  saveHighScore();

  if (finalScoreDisplay) {
    finalScoreDisplay.textContent = `最终得分: ${score}`;
  }
  if (highScoreDisplay) {
    highScoreDisplay.textContent = `最高分: ${Math.max(highScore, score)}`;
  }
  if (gameOverOverlay) {
    gameOverOverlay.classList.remove('hidden');
  }
}

function updateScoreDisplay(): void {
  if (scoreDisplay) {
    scoreDisplay.textContent = `分数: ${score}`;
  }
}

function updateHealthDisplay(): void {
  if (!healthDisplay) return;

  const hearts = healthDisplay.querySelectorAll('.heart');
  hearts.forEach((heart: Element, index: number) => {
    const htmlHeart = heart as HTMLElement;
    if (index < lives) {
      htmlHeart.classList.remove('lost');
      htmlHeart.style.setProperty('--heart-color', HEART_ACTIVE_COLOR);
    } else {
      htmlHeart.classList.add('lost');
      htmlHeart.style.setProperty('--heart-color', HEART_LOST_COLOR);
    }
  });
}

export function handleCollision(event: CollisionEvent): void {
  if (currentState !== GameState.PLAYING) return;

  if (event.type === 'asteroid') {
    lives = Math.max(0, lives - 1);
    updateHealthDisplay();

    effects.triggerExplosion(event.position);

    if (lives <= 0) {
      gameOver();
    }
  } else if (event.type === 'orb') {
    const orbs = sceneManager.getEnergyOrbs();
    if (event.objectIndex >= 0 && event.objectIndex < orbs.length) {
      const orb = orbs[event.objectIndex];
      if (orb.active) {
        sceneManager.removeEnergyOrb(orb);
      }
    }

    score += SCORE_PER_ORB;
    lives = Math.min(MAX_LIVES, lives + 1);
    updateScoreDisplay();
    updateHealthDisplay();

    playCollectSound();
  }
}

let audioContext: AudioContext | null = null;

function playCollectSound(): void {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
  oscillator.frequency.linearRampToValueAtTime(1046.50, audioContext.currentTime + 0.15);

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.0, audioContext.currentTime + 0.2);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
}

export function isPlaying(): boolean {
  return currentState === GameState.PLAYING;
}

export function isPaused(): boolean {
  return currentState === GameState.PAUSED;
}

export function isMenu(): boolean {
  return currentState === GameState.MENU;
}

export function isGameOver(): boolean {
  return currentState === GameState.GAME_OVER;
}

export function getState(): string {
  return currentState;
}

export function getScore(): number {
  return score;
}

export function getLives(): number {
  return lives;
}
