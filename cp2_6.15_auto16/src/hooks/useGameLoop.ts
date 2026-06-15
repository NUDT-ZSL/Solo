import { useRef, useEffect, useCallback } from 'react';
import {
  ActionType,
  AnimationType,
  GrowthStage,
  ParticleConfig,
  PetStateStats,
  getPetAiCommand,
  AiCommand,
} from '../utils/petAi';

export interface Particle extends ParticleConfig {
  life: number;
}

export interface PetFullState extends PetStateStats {
  mood: number;
  health: number;
  hunger: number;
  stage: GrowthStage;
  isWeak: boolean;
  isEndangered: boolean;
  animation: AnimationType;
  emoji: string;
}

export interface GameTime {
  day: number;
  hour: number;
  minute: number;
}

export interface GameEndState {
  ended: boolean;
  timeLeft: number;
}

export interface GameLoopSnapshot {
  pet: PetFullState;
  gameTime: GameTime;
  particles: Particle[];
  endState: GameEndState;
  animationProgress: number;
  animationElapsed: number;
  currentAnimationDuration: number;
  endangeredFlash: number;
  weakAlertPending: boolean;
}

export type ActionTrigger = (action: ActionType) => void;
export type ResetGame = () => void;

interface UseGameLoopOptions {
  onStateChange: (snap: GameLoopSnapshot) => void;
  onWeakAlert: () => void;
}

const DECAY_PER_SECOND = {
  mood: 5 / 3600,
  hunger: 10 / 3600,
  health: 3 / 3600,
};

const STAGE_DURATION_SECONDS = 18 * 60;
const ENDANGERED_TRIGGER_HOURS = 6;
const ENDANGERED_END_HOURS = 6;
const WEAK_ALERT_INTERVAL = 60;

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function upgradeStage(s: GrowthStage): GrowthStage {
  if (s === 'baby') return 'child';
  if (s === 'child') return 'teen';
  return 'adult';
}

export function useGameLoop({ onStateChange, onWeakAlert }: UseGameLoopOptions) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumSecRef = useRef<number>(0);
  const totalSecRef = useRef<number>(0);
  const gameMinuteRef = useRef<number>(0);

  const stateRef = useRef<PetFullState>({
    mood: 80,
    health: 90,
    hunger: 70,
    stage: 'baby',
    isWeak: false,
    isEndangered: false,
    animation: 'idle',
    emoji: '😊',
  });

  const particlesRef = useRef<Particle[]>([]);
  const animTimerRef = useRef(0);
  const animDurationRef = useRef(2);
  const endangeredFlashRef = useRef(0);
  const weakAlertTimerRef = useRef(0);
  const lowStateTimerRef = useRef(0);
  const noActionTimerRef = useRef(0);
  const lastStageCheckSec = useRef(0);
  const endStateRef = useRef<GameEndState>({ ended: false, timeLeft: 0 });
  const endCountdownRef = useRef(0);
  const weakAlertPendingRef = useRef(false);
  const pendingActionRef = useRef<ActionType | null>(null);

  const petCenterRef = useRef({ x: 400, y: 300 });

  const emitSnapshot = useCallback(() => {
    onStateChange({
      pet: { ...stateRef.current },
      gameTime: computeGameTime(totalSecRef.current),
      particles: particlesRef.current.slice(),
      endState: { ...endStateRef.current },
      animationProgress: animDurationRef.current > 0
        ? clamp(animTimerRef.current / animDurationRef.current, 0, 1)
        : 1,
      animationElapsed: animTimerRef.current,
      currentAnimationDuration: animDurationRef.current,
      endangeredFlash: endangeredFlashRef.current,
      weakAlertPending: weakAlertPendingRef.current,
    });
    if (weakAlertPendingRef.current) {
      weakAlertPendingRef.current = false;
    }
  }, [onStateChange]);

  function applyAiCommand(cmd: AiCommand) {
    stateRef.current.animation = cmd.animation;
    stateRef.current.emoji = cmd.emoji;
    animTimerRef.current = 0;
    animDurationRef.current = cmd.duration;
    if (cmd.particles.length && particlesRef.current.length < 50) {
      const allowed = Math.min(cmd.particles.length, 50 - particlesRef.current.length);
      for (let i = 0; i < allowed; i++) {
        const p = cmd.particles[i];
        particlesRef.current.push({ ...p, life: p.maxLife });
      }
    }
  }

  function triggerAction(action: ActionType) {
    const pet = stateRef.current;
    switch (action) {
      case 'feed':
        pet.hunger = clamp(pet.hunger + 20, 0, 100);
        break;
      case 'clean':
        pet.health = clamp(pet.health + 15, 0, 100);
        break;
      case 'play':
        pet.mood = clamp(pet.mood + 10, 0, 100);
        pet.health = clamp(pet.health + 10, 0, 100);
        break;
      case 'talk':
        pet.mood = clamp(pet.mood + 15, 0, 100);
        pet.hunger = clamp(pet.hunger - 5, 0, 100);
        break;
    }
    noActionTimerRef.current = 0;
    pendingActionRef.current = action;
  }

  const onFrame = useCallback((now: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = now;
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = now;

    if (endStateRef.current.ended) {
      endCountdownRef.current -= dt;
      endStateRef.current.timeLeft = Math.max(0, endCountdownRef.current);
      if (endCountdownRef.current <= 0) {
        resetState();
      }
      emitSnapshot();
      rafRef.current = requestAnimationFrame(onFrame);
      return;
    }

    updateParticles(dt);
    animTimerRef.current += dt;
    endangeredFlashRef.current = (endangeredFlashRef.current + dt) % 0.5;

    accumSecRef.current += dt;
    while (accumSecRef.current >= 1) {
      accumSecRef.current -= 1;
      tickSecond();
    }

    if (animTimerRef.current >= animDurationRef.current) {
      const cmd = getPetAiCommand(
        stateRef.current,
        pendingActionRef.current ?? 'tick',
        petCenterRef.current,
      );
      applyAiCommand(cmd);
      pendingActionRef.current = null;
    }

    emitSnapshot();
    rafRef.current = requestAnimationFrame(onFrame);
  }, [emitSnapshot]);

  function tickSecond() {
    totalSecRef.current += 1;
    gameMinuteRef.current += 1;

    const pet = stateRef.current;
    pet.mood = clamp(pet.mood - DECAY_PER_SECOND.mood * 1, 0, 100);
    pet.hunger = clamp(pet.hunger - DECAY_PER_SECOND.hunger * 1, 0, 100);
    pet.health = clamp(pet.health - DECAY_PER_SECOND.health * 1, 0, 100);

    pet.isWeak = pet.mood <= 0 || pet.health <= 0 || pet.hunger <= 0;
    if (pet.isWeak) {
      weakAlertTimerRef.current += 1;
      if (weakAlertTimerRef.current >= WEAK_ALERT_INTERVAL) {
        weakAlertTimerRef.current = 0;
        weakAlertPendingRef.current = true;
        onWeakAlert();
      }
    } else {
      weakAlertTimerRef.current = 0;
    }

    noActionTimerRef.current += 1;

    const lowAll = pet.mood < 30 && pet.health < 30 && pet.hunger < 30;
    if (lowAll) {
      lowStateTimerRef.current += 1;
    } else {
      lowStateTimerRef.current = 0;
      pet.isEndangered = false;
    }

    if (lowStateTimerRef.current >= ENDANGERED_TRIGGER_HOURS * 3600) {
      pet.isEndangered = true;
    }

    if (pet.isEndangered && noActionTimerRef.current >= ENDANGERED_END_HOURS * 3600) {
      triggerEnd();
    }

    const elapsed = totalSecRef.current;
    if (pet.stage !== 'adult' && elapsed - lastStageCheckSec.current >= STAGE_DURATION_SECONDS) {
      lastStageCheckSec.current = elapsed;
      pet.stage = upgradeStage(pet.stage);
    }
  }

  function updateParticles(dt: number) {
    const arr = particlesRef.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'drop') {
        p.vy += 0.02;
      }
      if (p.life <= 0) arr.splice(i, 1);
    }
  }

  function triggerEnd() {
    endStateRef.current.ended = true;
    endStateRef.current.timeLeft = 3;
    endCountdownRef.current = 3;
  }

  function resetState() {
    stateRef.current = {
      mood: 80,
      health: 90,
      hunger: 70,
      stage: 'baby',
      isWeak: false,
      isEndangered: false,
      animation: 'idle',
      emoji: '😊',
    };
    particlesRef.current = [];
    totalSecRef.current = 0;
    gameMinuteRef.current = 0;
    lowStateTimerRef.current = 0;
    noActionTimerRef.current = 0;
    lastStageCheckSec.current = 0;
    endStateRef.current = { ended: false, timeLeft: 0 };
    endCountdownRef.current = 0;
    animTimerRef.current = 0;
    animDurationRef.current = 2;
    accumSecRef.current = 0;
    weakAlertTimerRef.current = 0;
  }

  useEffect(() => {
    rafRef.current = requestAnimationFrame(onFrame);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [onFrame]);

  const trigger: ActionTrigger = useCallback((a) => {
    if (endStateRef.current.ended) return;
    triggerAction(a);
  }, []);

  const reset: ResetGame = useCallback(() => {
    resetState();
  }, []);

  const setPetCenter = useCallback((x: number, y: number) => {
    petCenterRef.current = { x, y };
  }, []);

  return { trigger, reset, setPetCenter };
}

function computeGameTime(totalSeconds: number): GameTime {
  const gameHours = totalSeconds;
  const day = Math.floor(gameHours / 24) + 1;
  const hour = Math.floor(gameHours % 24);
  const minute = Math.floor((totalSeconds % 1) * 60);
  return { day, hour, minute };
}
