import type { GameState, EnergyOrb } from './game';
import {
  sonarScan,
  summonCreature,
  autoAttackOnSummon,
  nextPhase,
} from './game';
import type { RenderResult } from './renderer';

interface EventContext {
  state: GameState;
  canvas: HTMLCanvasElement;
  setRenderResult: (r: RenderResult) => void;
  getRenderResult: () => RenderResult | null;
}

function getCanvasPos(canvas: HTMLCanvasElement, e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function hitTestOrb(orb: EnergyOrb, x: number, y: number): boolean {
  if (orb.consumed) return false;
  const dx = orb.x - x;
  const dy = orb.y - y;
  return Math.hypot(dx, dy) <= orb.size + 4;
}

export function setupEventHandlers(ctx: EventContext) {
  const { state, canvas, getRenderResult } = ctx;

  canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(canvas, e);
    state.sonarX = pos.x;
    state.sonarY = pos.y;
    state.sonarActive = true;

    const rr = getRenderResult();
    state.hoverCardId = null;
    if (rr) {
      for (const r of rr.cardRects) {
        if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
          state.hoverCardId = r.id;
          break;
        }
      }
    }

    if (state.phase === 'sonar' && state.currentPlayer === 'player' && !state.inEndPhase) {
      const enemyHalf = pos.y < state.canvasH * 0.5;
      if (enemyHalf) {
        const dist = Math.hypot(pos.x - state.canvasW * 0.85, pos.y - state.canvasH * 0.18);
        if (dist < 250) {
          if (!state.sonarUsed) {
            state.sonarUsed = true;
            sonarScan(state);
          }
        }
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    state.sonarActive = false;
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (state.selectedCardId) {
      state.selectedCardId = null;
      for (const c of state.playerHand) c.selected = false;
    }
  });

  canvas.addEventListener('click', (e) => {
    if (state.gameOver) return;
    if (state.currentPlayer !== 'player' || state.inEndPhase) return;

    const pos = getCanvasPos(canvas, e);
    const rr = getRenderResult();

    if (rr) {
      const btn = rr.endBtn;
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        if (state.phase === 'sonar') nextPhase(state);
        else if (state.phase === 'battle') nextPhase(state);
        return;
      }
    }

    if (state.phase === 'sonar') {
      nextPhase(state);
      return;
    }

    if (state.phase !== 'battle') return;

    let clickedCard: string | null = null;
    if (rr) {
      for (const r of rr.cardRects) {
        if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
          clickedCard = r.id;
          break;
        }
      }
    }

    if (clickedCard) {
      for (const c of state.playerHand) c.selected = false;
      const card = state.playerHand.find(c => c.id === clickedCard);
      if (card) {
        card.selected = true;
        state.selectedCardId = clickedCard;
      }
      return;
    }

    let clickedOrb: EnergyOrb | null = null;
    for (const orb of state.playerOrbs) {
      if (hitTestOrb(orb, pos.x, pos.y)) {
        clickedOrb = orb;
        break;
      }
    }

    if (clickedOrb && state.selectedCardId) {
      clickedOrb.pulseCount = 2;
      clickedOrb.pulseTimer = 0.25;
      clickedOrb.ripple = 1;
      const ok = summonCreature(state, state.selectedCardId, clickedOrb.id, 'player');
      if (ok) {
        for (const c of state.playerHand) c.selected = false;
        autoAttackOnSummon(state, 'player');
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.selectedCardId) {
        state.selectedCardId = null;
        for (const c of state.playerHand) c.selected = false;
      }
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (state.gameOver) return;
      if (state.currentPlayer !== 'player' || state.inEndPhase) return;
      if (state.phase === 'sonar' || state.phase === 'battle') {
        nextPhase(state);
      }
    }
  });
}
