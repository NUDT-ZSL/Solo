import type { ActionResult, BattleStats, CharacterContribution, ICharacter, IBoss } from "./team-module";

export function calculateBattleStats(
  actions: ActionResult[],
  characters: ICharacter[],
  boss: IBoss,
  isVictory: boolean,
  totalRounds: number
): BattleStats {
  const activeCharacters = characters.filter((c) => c.maxHp > 0);
  const activeCharacterIds = new Set(activeCharacters.map((c) => c.id));

  const contributions: Map<string, CharacterContribution> = new Map();

  for (const c of activeCharacters) {
    contributions.set(c.id, {
      characterId: c.id,
      characterName: c.name,
      class: c.class,
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      damageRatio: 0,
      healRatio: 0,
      takenRatio: 0,
    });
  }

  let totalDamageDealt = 0;
  let totalDamageTaken = 0;
  let totalHealing = 0;

  for (const action of actions) {
    if (action.isHeal) {
      if (activeCharacterIds.has(action.actorId)) {
        totalHealing += action.value;
        const contrib = contributions.get(action.actorId);
        if (contrib) {
          contrib.healingDone += action.value;
        }
      }
    } else if (action.actorId === "boss") {
      if (activeCharacterIds.has(action.targetId)) {
        totalDamageTaken += action.value;
        const contrib = contributions.get(action.targetId);
        if (contrib) {
          contrib.damageTaken += action.value;
        }
      }
    } else {
      if (activeCharacterIds.has(action.actorId)) {
        totalDamageDealt += action.value;
        const contrib = contributions.get(action.actorId);
        if (contrib) {
          contrib.damageDealt += action.value;
        }
      }
    }
  }

  const resultContribs = Array.from(contributions.values());

  for (const contrib of resultContribs) {
    contrib.damageRatio = totalDamageDealt > 0 ? contrib.damageDealt / totalDamageDealt : 0;
    contrib.healRatio = totalHealing > 0 ? contrib.healingDone / totalHealing : 0;
    contrib.takenRatio = totalDamageTaken > 0 ? contrib.damageTaken / totalDamageTaken : 0;
  }

  return {
    totalRounds,
    totalDamageDealt,
    totalDamageTaken,
    totalHealing,
    isVictory,
    characterContributions: resultContribs,
  };
}
