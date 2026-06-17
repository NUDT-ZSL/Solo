import type { ActionResult, BattleStats, CharacterContribution, ICharacter, IBoss } from "./types";

export function calculateBattleStats(
  actions: ActionResult[],
  characters: ICharacter[],
  boss: IBoss,
  isVictory: boolean,
  totalRounds: number
): BattleStats {
  const contributions: Map<string, CharacterContribution> = new Map();

  for (const c of characters) {
    contributions.set(c.id, {
      characterId: c.id,
      characterName: c.name,
      class: c.class,
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
    });
  }

  let totalDamageDealt = 0;
  let totalDamageTaken = 0;
  let totalHealing = 0;

  for (const action of actions) {
    if (action.isHeal) {
      totalHealing += action.value;
      const contrib = contributions.get(action.actorId);
      if (contrib) {
        contrib.healingDone += action.value;
      }
    } else if (action.actorId === "boss") {
      totalDamageTaken += action.value;
      const contrib = contributions.get(action.targetId);
      if (contrib) {
        contrib.damageTaken += action.value;
      }
    } else {
      totalDamageDealt += action.value;
      const contrib = contributions.get(action.actorId);
      if (contrib) {
        contrib.damageDealt += action.value;
      }
    }
  }

  return {
    totalRounds,
    totalDamageDealt,
    totalDamageTaken,
    totalHealing,
    isVictory,
    characterContributions: Array.from(contributions.values()),
  };
}
