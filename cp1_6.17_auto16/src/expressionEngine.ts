import type {
  SelectedParts,
  PartsCollection,
  ExpressionResult,
  ExpressionTag,
  MoodLevel,
  PartConfig
} from '../data/partsConfig';
import { MOOD_PRESETS } from '../data/partsConfig';
import { getRandomItem } from './domHelpers';

const EXPRESSION_META: Record<ExpressionTag, { emoji: string; label: string; cssClass: string }> = {
  happy: { emoji: '😊', label: '开心', cssClass: 'expr-happy' },
  sad: { emoji: '😢', label: '悲伤', cssClass: 'expr-sad' },
  angry: { emoji: '😠', label: '愤怒', cssClass: 'expr-angry' },
  surprised: { emoji: '😮', label: '惊讶', cssClass: 'expr-surprised' },
  neutral: { emoji: '😐', label: '平静', cssClass: 'expr-neutral' },
  confused: { emoji: '🤔', label: '疑惑', cssClass: 'expr-confused' }
};

const EXPRESSION_WEIGHTS: Record<ExpressionTag, { hair: number; eyes: number; mouth: number; arm: number }> = {
  happy: { hair: 0.15, eyes: 0.35, mouth: 0.35, arm: 0.15 },
  sad: { hair: 0.15, eyes: 0.35, mouth: 0.35, arm: 0.15 },
  angry: { hair: 0.2, eyes: 0.35, mouth: 0.3, arm: 0.15 },
  surprised: { hair: 0.15, eyes: 0.3, mouth: 0.35, arm: 0.2 },
  neutral: { hair: 0.25, eyes: 0.25, mouth: 0.25, arm: 0.25 },
  confused: { hair: 0.2, eyes: 0.3, mouth: 0.3, arm: 0.2 }
};

export function getExpressionScore(
  partIds: string[],
  targetTag: ExpressionTag,
  parts: PartsCollection
): number {
  let totalScore = 0;
  let matchCount = 0;

  partIds.forEach((partId) => {
    const part = findPartById(partId, parts);
    if (part) {
      matchCount++;
      if (part.expressionTags.includes(targetTag)) {
        const weights = EXPRESSION_WEIGHTS[targetTag];
        const typeWeight = weights[part.type] || 0.25;
        totalScore += typeWeight;
      }
    }
  });

  return matchCount > 0 ? totalScore : 0;
}

export function calculateExpression(
  selected: SelectedParts,
  parts: PartsCollection
): ExpressionResult {
  const partIds = [selected.hair, selected.eyes, selected.mouth, selected.arm];
  const allTags: ExpressionTag[] = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'confused'];

  let bestTag: ExpressionTag = 'neutral';
  let bestScore = -1;

  allTags.forEach((tag) => {
    const score = getExpressionScore(partIds, tag, parts);
    if (score > bestScore) {
      bestScore = score;
      bestTag = tag;
    } else if (score === bestScore && Math.random() > 0.5) {
      bestTag = tag;
    }
  });

  if (bestScore < 0.15) {
    bestTag = 'confused';
  }

  const meta = EXPRESSION_META[bestTag];
  return {
    type: bestTag,
    emoji: meta.emoji,
    cssClass: meta.cssClass,
    label: meta.label
  };
}

export function matchPartsForMood(
  mood: MoodLevel,
  parts: PartsCollection
): SelectedParts {
  const preset = MOOD_PRESETS[mood];
  
  if (preset) {
    const allHairIds = parts.hair.map(p => p.id);
    const allEyesIds = parts.eyes.map(p => p.id);
    const allMouthIds = parts.mouth.map(p => p.id);
    const allArmIds = parts.arm.map(p => p.id);

    const moodTag = mood as unknown as ExpressionTag;

    const matchingHair = parts.hair.filter(p => p.expressionTags.includes(moodTag)).map(p => p.id);
    const matchingEyes = parts.eyes.filter(p => p.expressionTags.includes(moodTag)).map(p => p.id);
    const matchingMouth = parts.mouth.filter(p => p.expressionTags.includes(moodTag)).map(p => p.id);
    const matchingArm = parts.arm.filter(p => p.expressionTags.includes(moodTag)).map(p => p.id);

    return {
      hair: matchingHair.length > 0 ? getRandomItem(matchingHair) : getRandomItem(allHairIds),
      eyes: matchingEyes.length > 0 ? getRandomItem(matchingEyes) : getRandomItem(allEyesIds),
      mouth: matchingMouth.length > 0 ? getRandomItem(matchingMouth) : getRandomItem(allMouthIds),
      arm: matchingArm.length > 0 ? getRandomItem(matchingArm) : getRandomItem(allArmIds)
    };
  }

  return {
    hair: getRandomItem(parts.hair.map(p => p.id)),
    eyes: getRandomItem(parts.eyes.map(p => p.id)),
    mouth: getRandomItem(parts.mouth.map(p => p.id)),
    arm: getRandomItem(parts.arm.map(p => p.id))
  };
}

function findPartById(partId: string, parts: PartsCollection): PartConfig | undefined {
  return (
    parts.hair.find(p => p.id === partId) ||
    parts.eyes.find(p => p.id === partId) ||
    parts.mouth.find(p => p.id === partId) ||
    parts.arm.find(p => p.id === partId)
  );
}

export function getPartConfigById(partId: string, parts: PartsCollection): PartConfig | undefined {
  return findPartById(partId, parts);
}

export function getAllPartIds(parts: PartsCollection): string[] {
  return [
    ...parts.hair.map(p => p.id),
    ...parts.eyes.map(p => p.id),
    ...parts.mouth.map(p => p.id),
    ...parts.arm.map(p => p.id)
  ];
}

export function getRandomParts(parts: PartsCollection): SelectedParts {
  return {
    hair: getRandomItem(parts.hair).id,
    eyes: getRandomItem(parts.eyes).id,
    mouth: getRandomItem(parts.mouth).id,
    arm: getRandomItem(parts.arm).id
  };
}

export function getPartsByType(type: keyof PartsCollection, parts: PartsCollection): PartConfig[] {
  return parts[type];
}

export function getMoodFromKnobValue(value: number): MoodLevel {
  if (value < 25) return 'angry';
  if (value < 50) return 'sad';
  if (value < 75) return 'happy';
  return 'surprised';
}

export function getKnobValueFromMood(mood: MoodLevel): number {
  switch (mood) {
    case 'angry': return 12.5;
    case 'sad': return 37.5;
    case 'happy': return 62.5;
    case 'surprised': return 87.5;
  }
}
