export type ElementType = 'fire' | 'water' | 'wind' | 'thunder';

export type EffectType = 'fire' | 'water' | 'wind' | 'thunder' | 'steam' | 'storm' | 'blizzard' | 'plasma' | 'electromagnetic';

export interface Spell {
  name: string;
  type: string;
  baseDamage: number;
  effectType: EffectType;
  effectColor: string;
  description: string;
}

export interface ElementInfo {
  id: ElementType;
  name: string;
  color: string;
  icon: string;
}

export const ELEMENTS: ElementInfo[] = [
  { id: 'fire', name: '火', color: '#FF4500', icon: '🔥' },
  { id: 'water', name: '水', color: '#1E90FF', icon: '💧' },
  { id: 'wind', name: '风', color: '#32CD32', icon: '🌪️' },
  { id: 'thunder', name: '雷', color: '#FFD700', icon: '⚡' },
];

interface CombinationRule {
  elements: ElementType[];
  spell: Spell;
}

const COMBINATION_RULES: CombinationRule[] = [
  {
    elements: ['fire', 'water'],
    spell: {
      name: '蒸汽云',
      type: 'steam',
      baseDamage: 25,
      effectType: 'steam',
      effectColor: '#B0C4DE',
      description: '火与水交融，产生炽热的蒸汽云雾，持续灼烧敌人。',
    },
  },
  {
    elements: ['wind', 'thunder'],
    spell: {
      name: '电磁场',
      type: 'electromagnetic',
      baseDamage: 30,
      effectType: 'electromagnetic',
      effectColor: '#9370DB',
      description: '风与雷交织，形成强力电磁场，麻痹并电击目标。',
    },
  },
  {
    elements: ['fire', 'wind'],
    spell: {
      name: '烈焰风暴',
      type: 'firestorm',
      baseDamage: 35,
      effectType: 'fire',
      effectColor: '#FF6347',
      description: '烈火借疾风之势，形成席卷一切的火焰风暴。',
    },
  },
  {
    elements: ['water', 'thunder'],
    spell: {
      name: '雷电风暴',
      type: 'thunderstorm',
      baseDamage: 40,
      effectType: 'storm',
      effectColor: '#4169E1',
      description: '暴雨倾盆，雷霆万钧，水雷合一毁天灭地。',
    },
  },
  {
    elements: ['fire', 'thunder'],
    spell: {
      name: '等离子爆发',
      type: 'plasma',
      baseDamage: 45,
      effectType: 'plasma',
      effectColor: '#FF1493',
      description: '火焰与雷电融合，产生超高温等离子体，瞬间蒸发一切。',
    },
  },
  {
    elements: ['water', 'wind'],
    spell: {
      name: '冰霜漩涡',
      type: 'frost',
      baseDamage: 28,
      effectType: 'water',
      effectColor: '#00CED1',
      description: '寒风与冷水交汇，形成冰冷的漩涡，冻结敌人行动。',
    },
  },
  {
    elements: ['water', 'wind', 'thunder'],
    spell: {
      name: '暴风雪',
      type: 'blizzard',
      baseDamage: 55,
      effectType: 'blizzard',
      effectColor: '#E0FFFF',
      description: '三元素合一，召唤毁天灭地的暴风雪，冰封万物。',
    },
  },
  {
    elements: ['fire', 'wind', 'thunder'],
    spell: {
      name: '雷炎风暴',
      type: 'thunderfire',
      baseDamage: 60,
      effectType: 'fire',
      effectColor: '#FF8C00',
      description: '火风雷三元素融合，产生附带雷电的火焰风暴，威力无穷。',
    },
  },
  {
    elements: ['fire', 'water', 'wind'],
    spell: {
      name: '元素潮汐',
      type: 'elemental',
      baseDamage: 50,
      effectType: 'steam',
      effectColor: '#DDA0DD',
      description: '火水风三元素平衡，形成元素潮汐，造成混合伤害。',
    },
  },
];

function sortElements(elements: ElementType[]): ElementType[] {
  const order: ElementType[] = ['fire', 'water', 'wind', 'thunder'];
  return [...elements].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function arraysEqual(a: ElementType[], b: ElementType[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function combineElements(elements: ElementType[]): Spell | null {
  if (elements.length < 2 || elements.length > 3) {
    return null;
  }

  const sorted = sortElements(elements);
  
  for (const rule of COMBINATION_RULES) {
    const sortedRule = sortElements(rule.elements);
    if (arraysEqual(sorted, sortedRule)) {
      return { ...rule.spell };
    }
  }

  return null;
}

export function getSingleElementSpell(element: ElementType): Spell {
  const elementInfo = ELEMENTS.find(e => e.id === element);
  if (!elementInfo) {
    throw new Error(`Unknown element: ${element}`);
  }

  const baseDamages: Record<ElementType, number> = {
    fire: 15,
    water: 12,
    wind: 10,
    thunder: 18,
  };

  const names: Record<ElementType, string> = {
    fire: '火球术',
    water: '水箭',
    wind: '风刃',
    thunder: '雷击',
  };

  const descriptions: Record<ElementType, string> = {
    fire: '基础火元素魔法，召唤灼热的火球攻击敌人。',
    water: '基础水元素魔法，射出高压水箭穿透目标。',
    wind: '基础风元素魔法，凝聚锋利风刃切割敌人。',
    thunder: '基础雷元素魔法，召唤雷霆从天而降。',
  };

  return {
    name: names[element],
    type: element,
    baseDamage: baseDamages[element],
    effectType: element as EffectType,
    effectColor: elementInfo.color,
    description: descriptions[element],
  };
}
