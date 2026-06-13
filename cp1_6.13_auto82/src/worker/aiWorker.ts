import { GameState } from '../engine/GameEngine';
import { Card } from '../api/configApi';

export interface AiDecision {
  instanceId: string;
}

export interface AiWorkerMessage {
  state: GameState;
  hand: Card[];
}

function chooseBestCard(state: GameState): Card | null {
  const hand = state.ai.hand;
  const energy = state.ai.energy;
  const playable = hand.filter(c => c.cost <= energy);
  if (playable.length === 0) return null;

  const playerLowHp = state.player.hp <= 15;
  const aiLowHp = state.ai.hp <= 20;

  let scored = playable.map(card => {
    let score = 0;
    score += card.damage * 1.2;
    score += card.defense * 1.0;
    score += card.energy * 0.8;
    if (card.type === 'attack' && playerLowHp) score += 5;
    if (card.type === 'defense' && aiLowHp) score += 5;
    if (card.cost > 0) score += (card.cost / energy) * 2;
    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 1 && Math.random() < 0.2) {
    return scored[Math.floor(Math.random() * Math.min(3, scored.length))].card;
  }
  return scored[0].card;
}

self.onmessage = (e: MessageEvent<AiWorkerMessage>) => {
  const { state } = e.data;
  const delay = 200 + Math.random() * 300;

  setTimeout(() => {
    const decisions: AiDecision[] = [];
    let tempState = JSON.parse(JSON.stringify(state)) as GameState;

    for (let i = 0; i < 5; i++) {
      const card = chooseBestCard(tempState);
      if (!card) break;

      const cid = card.instanceId!;
      decisions.push({ instanceId: cid });

      const attacker = tempState.ai;
      const defender = tempState.player;
      const idx = attacker.hand.findIndex(c => c.instanceId === cid);
      if (idx === -1) break;
      const c = attacker.hand[idx];
      attacker.energy -= c.cost;
      attacker.hand.splice(idx, 1);
      if (c.damage > 0) {
        let dmg = c.damage;
        if (defender.shield > 0) {
          const abs = Math.min(defender.shield, dmg);
          defender.shield -= abs;
          dmg -= abs;
        }
        defender.hp = Math.max(0, defender.hp - dmg);
      }
      if (c.defense > 0) attacker.shield += c.defense;
      if (c.energy > 0) attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + c.energy);

      if (tempState.player.hp <= 0 || tempState.ai.hp <= 0) break;
    }

    (self as any).postMessage(decisions);
  }, delay);
};
