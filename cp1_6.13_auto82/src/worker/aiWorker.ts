import { GameState } from '../engine/GameEngine';
import { Card } from '../api/configApi';

export interface AiDecision {
  instanceId: string;
}

export interface AiWorkerMessage {
  state: GameState;
  hand: Card[];
}

const MAX_ENERGY = 10;

function validateCard(card: Card): boolean {
  if (!card || typeof card !== 'object') return false;
  if (typeof card.id !== 'number') return false;
  if (typeof card.name !== 'string') return false;
  if (typeof card.cost !== 'number' || card.cost < 0 || card.cost > 10) return false;
  if (typeof card.damage !== 'number' || card.damage < 0) return false;
  if (typeof card.defense !== 'number' || card.defense < 0) return false;
  if (typeof card.energy !== 'number') return false;
  if (typeof card.type !== 'string' || !['attack', 'defense', 'energy'].includes(card.type)) return false;
  if (typeof card.description !== 'string') return false;
  return true;
}

function findCardCombos(hand: Card[], energy: number): { cards: Card[]; totalDamage: number; totalDefense: number; totalEnergyGain: number; remainingEnergy: number } | null {
  const energyCards = hand.filter(c => c.type === 'energy' && c.cost <= energy && c.energy > 0);
  const attackCards = hand.filter(c => c.type === 'attack' && c.cost <= energy);
  
  let bestCombo = null;
  let bestScore = -Infinity;

  for (const energyCard of energyCards) {
    const afterEnergyCost = energy - energyCard.cost;
    const totalEnergy = Math.min(MAX_ENERGY, afterEnergyCost + energyCard.energy);
    const remainingHand = hand.filter(c => c.instanceId !== energyCard.instanceId);
    const playableAttacks = remainingHand.filter(c => c.type === 'attack' && c.cost <= totalEnergy);
    
    for (const attackCard of playableAttacks) {
      if (attackCard.cost > totalEnergy) continue;
      const totalDamage = energyCard.damage + attackCard.damage;
      const totalDefense = energyCard.defense + attackCard.defense;
      const remainingEnergy = totalEnergy - attackCard.cost;
      const score = totalDamage * 1.5 + totalDefense * 0.8 + remainingEnergy * 0.3;
      
      if (score > bestScore) {
        bestScore = score;
        bestCombo = {
          cards: [energyCard, attackCard],
          totalDamage,
          totalDefense,
          totalEnergyGain: energyCard.energy,
          remainingEnergy
        };
      }
    }
  }
  
  const defEnergy = energyCards.filter(c => c.defense > 0);
  for (const eCard of defEnergy) {
    const defCards = hand.filter(c => c.type === 'defense' && c.cost <= (energy - eCard.cost + eCard.energy) && c.instanceId !== eCard.instanceId);
    for (const dCard of defCards) {
      const totalDef = eCard.defense + dCard.defense;
      const score = totalDef * 1.2 + eCard.energy * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestCombo = {
          cards: [eCard, dCard],
          totalDamage: eCard.damage + dCard.damage,
          totalDefense: totalDef,
          totalEnergyGain: eCard.energy,
          remainingEnergy: Math.min(MAX_ENERGY, energy - eCard.cost + eCard.energy) - dCard.cost
        };
      }
    }
  }
  
  return bestCombo;
}

function chooseBestCard(state: GameState, playedThisTurn: Card[]): Card | null {
  const hand = state.ai.hand;
  const energy = state.ai.energy;
  
  if (energy < 0 || hand.length === 0) return null;
  
  const validHand = hand.filter(validateCard);
  if (validHand.length === 0) return null;
  
  const playable = validHand.filter(c => c.cost <= energy && c.cost >= 0);
  
  if (playable.length === 0) {
    return null;
  }

  const playerLowHp = state.player.hp <= 15;
  const playerCritical = state.player.hp <= 8;
  const aiLowHp = state.ai.hp <= 20;
  const aiCritical = state.ai.hp <= 12;
  const playerHasShield = state.player.shield > 0;
  const aiHasShield = state.ai.shield > 0;
  const turnCount = state.turnCount;
  
  const playedEnergyCards = playedThisTurn.filter(c => c.type === 'energy').length;
  const playedAttackCards = playedThisTurn.filter(c => c.type === 'attack').length;
  const playedDefenseCards = playedThisTurn.filter(c => c.type === 'defense').length;

  if (energy >= 2 && playedEnergyCards === 0 && turnCount <= 3) {
    const energyCards = playable.filter(c => c.type === 'energy' && c.energy > 0 && c.cost <= 2);
    if (energyCards.length > 0) {
      energyCards.sort((a, b) => b.energy - a.energy);
      return energyCards[0];
    }
  }

  if (aiCritical && !aiHasShield) {
    const defenseCards = playable.filter(c => c.type === 'defense' && c.defense >= 6);
    if (defenseCards.length > 0) {
      defenseCards.sort((a, b) => b.defense - a.defense);
      return defenseCards[0];
    }
  }

  if (playerCritical && !playerHasShield) {
    const attackCards = playable.filter(c => c.type === 'attack');
    if (attackCards.length > 0) {
      const lethal = attackCards.find(c => c.damage >= state.player.hp);
      if (lethal) return lethal;
      attackCards.sort((a, b) => b.damage - a.damage);
      return attackCards[0];
    }
  }

  if (energy >= 3 && playedThisTurn.length === 0) {
    const combo = findCardCombos(playable, energy);
    if (combo && combo.cards.length >= 2) {
      return combo.cards[0];
    }
  }

  let scored = playable.map(card => {
    let score = 0;
    
    score += card.damage * 1.2;
    score += card.defense * 1.0;
    score += card.energy * 0.9;
    
    if (card.type === 'attack') {
      if (playerCritical) score += 10;
      else if (playerLowHp) score += 5;
      
      if (playerHasShield && card.damage > state.player.shield) {
        score += (card.damage - state.player.shield) * 0.5;
      }
      
      if (playedAttackCards === 0 && energy >= card.cost + 2) {
        score += 2;
      }
    }
    
    if (card.type === 'defense') {
      if (aiCritical) score += 12;
      else if (aiLowHp) score += 6;
      
      if (!aiHasShield && card.defense >= 5) score += 3;
      
      if (playedDefenseCards === 0 && aiLowHp) score += 4;
    }
    
    if (card.type === 'energy') {
      if (card.energy > 0) {
        const potentialGain = Math.min(MAX_ENERGY, energy + card.energy) - energy;
        score += potentialGain * 1.5;
        
        if (playedEnergyCards === 0 && energy < 5) score += 3;
      }
    }
    
    if (card.cost > 0) {
      const efficiency = (card.damage + card.defense + card.energy * 0.7) / card.cost;
      score += efficiency * 2;
    }
    
    if (card.cost <= energy * 0.7) {
      score += 1.5;
    }
    
    if (card.damage > 0 && card.defense > 0) {
      score += 2;
    }
    
    if (card.energy > 0 && (card.damage > 0 || card.defense > 0)) {
      score += 3;
    }
    
    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 1 && scored[0].score - scored[1].score < 3 && Math.random() < 0.25) {
    return scored[Math.floor(Math.random() * Math.min(3, scored.length))].card;
  }
  
  if (scored[0].score < 0) {
    return null;
  }
  
  return scored[0].card;
}

function applyCardEffects(state: GameState, card: Card): void {
  const attacker = state.ai;
  const defender = state.player;
  
  if (card.cost < 0 || card.cost > attacker.energy) return;
  
  attacker.energy = Math.max(0, attacker.energy - card.cost);
  
  if (card.damage > 0) {
    let dmg = card.damage;
    if (defender.shield > 0) {
      const abs = Math.min(defender.shield, dmg);
      defender.shield -= abs;
      dmg -= abs;
    }
    defender.hp = Math.max(0, defender.hp - dmg);
  }
  if (card.defense > 0) {
    attacker.shield += card.defense;
  }
  if (card.energy !== 0) {
    const newEnergy = attacker.energy + card.energy;
    attacker.energy = Math.max(0, Math.min(MAX_ENERGY, Math.min(attacker.maxEnergy, newEnergy)));
  }
}

self.onmessage = (e: MessageEvent<AiWorkerMessage>) => {
  const { state } = e.data;
  const delay = 200 + Math.random() * 300;

  setTimeout(() => {
    const decisions: AiDecision[] = [];
    const playedCards: Card[] = [];
    let tempState = JSON.parse(JSON.stringify(state)) as GameState;
    
    const maxPlays = Math.min(5, tempState.ai.hand.length);
    
    for (let i = 0; i < maxPlays; i++) {
      if (tempState.ai.energy <= 0) break;
      if (tempState.player.hp <= 0 || tempState.ai.hp <= 0) break;
      
      const card = chooseBestCard(tempState, playedCards);
      if (!card) break;
      
      if (!validateCard(card)) continue;
      
      const cid = card.instanceId;
      if (!cid) continue;
      
      const idx = tempState.ai.hand.findIndex(c => c.instanceId === cid);
      if (idx === -1) break;
      
      const actualCard = tempState.ai.hand[idx];
      if (actualCard.cost > tempState.ai.energy) break;
      
      decisions.push({ instanceId: cid });
      playedCards.push(actualCard);
      
      tempState.ai.hand.splice(idx, 1);
      applyCardEffects(tempState, actualCard);
    }

    (self as any).postMessage(decisions);
  }, delay);
};
