import type {
  GameState,
  Card,
  Unit,
  Action,
  Target,
  AIConfig,
} from '../../shared/types';

export class AIPlayer {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  calculateUnitThreat(unit: Unit): number {
    return unit.attack + unit.health / 2;
  }

  calculateMaxEnemyDamage(state: GameState): number {
    const playerField = state.player.field;
    const playerHand = state.player.hand;
    
    let maxDamage = 0;
    
    playerField.forEach(unit => {
      if (!unit.hasAttacked) {
        maxDamage += unit.attack;
      }
    });
    
    playerHand.forEach(card => {
      if (card.type === 'attack') {
        maxDamage += card.value;
      }
    });
    
    return maxDamage;
  }

  estimateEnemyDamage(state: GameState): number {
    return this.calculateMaxEnemyDamage(state);
  }

  shouldUseDefense(state: GameState): boolean {
    const aiHealth = state.ai.hero.health;
    const aiShield = state.ai.hero.shield;
    
    const maxEnemyDamage = this.calculateMaxEnemyDamage(state);
    
    if (aiHealth < this.config.lowHealthThreshold && aiShield === 0) {
      return true;
    }
    
    const effectiveHealth = aiHealth + aiShield;
    if (maxEnemyDamage >= effectiveHealth * 0.6) {
      return true;
    }
    
    if (aiHealth - maxEnemyDamage <= 5) {
      return true;
    }
    
    return false;
  }

  scoreAction(action: Action, state: GameState): number {
    const { card, targetType, targetId } = action;
    let score = 0;

    const aiField = state.ai.field;
    const playerField = state.player.field;
    const aiHero = state.ai.hero;
    const playerHero = state.player.hero;

    switch (card.type) {
      case 'attack': {
        if (targetType === 'unit' && targetId) {
          const targetUnit = playerField.find(u => u.id === targetId);
          if (targetUnit) {
            const threat = this.calculateUnitThreat(targetUnit);
            score += threat * this.config.attackUnitPriority;
            
            if (card.value >= targetUnit.health) {
              score += 3;
            }
            
            if (targetUnit.attack >= 3 && targetUnit.health <= 3) {
              score += 2;
            }
          }
        } else if (targetType === 'hero') {
          score += card.value * 1.0;
          
          if (playerHero.health - card.value <= 0) {
            score += 100;
          }
          
          if (playerHero.health <= this.config.lowHealthThreshold) {
            score += card.value * 0.5;
          }
          
          if (playerField.length === 0) {
            score += 1;
          }
        }
        break;
      }

      case 'defense': {
        const shouldDefend = this.shouldUseDefense(state);
        
        if (shouldDefend) {
          score += card.value * this.config.defenseUrgencyWeight;
          
          const maxEnemyDamage = this.calculateMaxEnemyDamage(state);
          const damageAbsorbed = Math.min(card.value, maxEnemyDamage);
          score += damageAbsorbed * 1.5;
          
          if (aiHero.health < this.config.lowHealthThreshold * 0.6) {
            score += 8;
          }
          
          if (maxEnemyDamage >= aiHero.health) {
            score += 15;
          }
        } else {
          score -= 20;
        }
        break;
      }

      case 'summon': {
        const unitPower = card.value + (card.value2 || 1) / 2;
        score += unitPower * 1.0;
        
        if (aiField.length === 0) {
          score += this.config.summonWhenNoUnitBonus;
        }
        
        if (aiField.length < playerField.length) {
          score += 2.5;
        }
        
        if (playerField.length === 0 && aiField.length === 0) {
          score += 4;
        }
        
        if (card.value2 && card.value2 >= 3) {
          score += 1.5;
        }
        
        if (card.value >= 2) {
          score += 1;
        }
        break;
      }
    }

    return score;
  }

  enumerateActions(state: GameState): Action[] {
    const actions: Action[] = [];
    const aiHand = state.ai.hand;
    const playerField = state.player.field;

    aiHand.forEach(card => {
      switch (card.type) {
        case 'attack': {
          actions.push({
            card,
            targetType: 'hero',
          });
          
          playerField.forEach(unit => {
            actions.push({
              card,
              targetType: 'unit',
              targetId: unit.id,
            });
          });
          break;
        }
        
        case 'defense': {
          actions.push({
            card,
            targetType: 'hero',
          });
          break;
        }
        
        case 'summon': {
          actions.push({
            card,
            targetType: 'hero',
          });
          break;
        }
      }
    });

    if (actions.length > 50) {
      return actions.slice(0, 50);
    }

    return actions;
  }

  chooseBestAction(state: GameState): Action | null {
    const startTime = Date.now();
    const actions = this.enumerateActions(state);
    
    if (actions.length === 0) {
      return null;
    }

    let bestAction: Action | null = null;
    let bestScore = -Infinity;

    for (const action of actions) {
      const score = this.scoreAction(action, state);
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
      
      if (Date.now() - startTime > 900) {
        break;
      }
    }

    if (bestScore < 0 && bestAction?.card.type === 'defense') {
      const nonDefenseActions = actions.filter(a => a.card.type !== 'defense');
      if (nonDefenseActions.length > 0) {
        let bestNonDefense: Action | null = null;
        let bestNonDefenseScore = -Infinity;
        
        for (const action of nonDefenseActions) {
          const score = this.scoreAction(action, state);
          if (score > bestNonDefenseScore) {
            bestNonDefenseScore = score;
            bestNonDefense = action;
          }
        }
        
        if (bestNonDefenseScore > -10) {
          return bestNonDefense;
        }
      }
    }

    return bestAction;
  }

  enumerateUnitActions(state: GameState): Array<{ attackerId: string; target: Target }> {
    const actions: Array<{ attackerId: string; target: Target }> = [];
    const aiField = state.ai.field;
    const playerField = state.player.field;

    aiField.forEach(unit => {
      if (!unit.hasAttacked) {
        actions.push({
          attackerId: unit.id,
          target: { type: 'hero', owner: 'player' },
        });
        
        playerField.forEach(targetUnit => {
          actions.push({
            attackerId: unit.id,
            target: { type: 'unit', owner: 'player', id: targetUnit.id },
          });
        });
      }
    });

    return actions;
  }

  scoreUnitAction(
    attacker: Unit,
    target: Target,
    state: GameState
  ): number {
    let score = 0;
    const playerField = state.player.field;
    const playerHero = state.player.hero;

    if (target.type === 'hero') {
      score += attacker.attack * 1.0;
      
      if (playerHero.health - attacker.attack <= 0) {
        score += 100;
      }
      
      if (playerHero.health <= this.config.lowHealthThreshold) {
        score += attacker.attack * 0.5;
      }
      
      if (playerField.length === 0) {
        score += 1;
      }
    } else if (target.type === 'unit' && target.id) {
      const targetUnit = playerField.find(u => u.id === target.id);
      if (targetUnit) {
        const threat = this.calculateUnitThreat(targetUnit);
        score += threat * this.config.attackUnitPriority;
        
        if (attacker.attack >= targetUnit.health) {
          score += 4;
          
          if (targetUnit.attack >= attacker.health) {
            score -= 1.5;
          } else {
            score += 1;
          }
        }
        
        if (targetUnit.attack >= 3) {
          score += 2;
        }
      }
    }

    return score;
  }

  chooseBestUnitAction(
    state: GameState
  ): { attackerId: string; target: Target } | null {
    const startTime = Date.now();
    const actions = this.enumerateUnitActions(state);
    
    if (actions.length === 0) {
      return null;
    }

    let bestAction: { attackerId: string; target: Target } | null = null;
    let bestScore = -Infinity;

    for (const action of actions) {
      const attacker = state.ai.field.find(u => u.id === action.attackerId);
      if (!attacker) continue;
      
      const score = this.scoreUnitAction(attacker, action.target, state);
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
      
      if (Date.now() - startTime > 900) {
        break;
      }
    }

    return bestAction;
  }

  getThinkTime(): number {
    return this.config.thinkTimeMs;
  }
}
