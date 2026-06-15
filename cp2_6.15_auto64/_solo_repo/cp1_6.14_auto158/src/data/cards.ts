export type ElementType = 'fire' | 'ice' | 'thunder' | 'dark'
export type EffectType = 'damage' | 'shield' | 'heal' | 'curse'

export interface Card {
  id: string
  name: string
  element: ElementType
  effectType: EffectType
  value: number
  description: string
  particleParams: ParticleParams
}

export interface ParticleParams {
  color: string
  secondaryColor: string
  particleCount: number
  duration: number
  intensity: number
}

export const cards: Card[] = [
  // 火系卡牌 (5张)
  {
    id: 'fire_1',
    name: '火焰弹',
    element: 'fire',
    effectType: 'damage',
    value: 15,
    description: '发射一枚灼热的火焰弹，造成15点伤害',
    particleParams: {
      color: '#ff6b35',
      secondaryColor: '#ff2e00',
      particleCount: 120,
      duration: 1000,
      intensity: 1,
    },
  },
  {
    id: 'fire_2',
    name: '烈焰风暴',
    element: 'fire',
    effectType: 'damage',
    value: 25,
    description: '召唤烈焰风暴，造成25点伤害',
    particleParams: {
      color: '#ff6b35',
      secondaryColor: '#ff2e00',
      particleCount: 200,
      duration: 1200,
      intensity: 1.5,
    },
  },
  {
    id: 'fire_3',
    name: '火焰护盾',
    element: 'fire',
    effectType: 'shield',
    value: 12,
    description: '召唤火焰护盾，获得12点护盾',
    particleParams: {
      color: '#ff6b35',
      secondaryColor: '#ffaa00',
      particleCount: 80,
      duration: 800,
      intensity: 0.8,
    },
  },
  {
    id: 'fire_4',
    name: '灼烧',
    element: 'fire',
    effectType: 'curse',
    value: 8,
    description: '施加灼烧诅咒，每回合造成8点伤害',
    particleParams: {
      color: '#ff4500',
      secondaryColor: '#ff2e00',
      particleCount: 60,
      duration: 1500,
      intensity: 0.6,
    },
  },
  {
    id: 'fire_5',
    name: '凤凰涅槃',
    element: 'fire',
    effectType: 'heal',
    value: 20,
    description: '凤凰之力治愈伤口，恢复20点生命',
    particleParams: {
      color: '#ff8c00',
      secondaryColor: '#ffd700',
      particleCount: 100,
      duration: 1000,
      intensity: 1.2,
    },
  },
  // 冰系卡牌 (5张)
  {
    id: 'ice_1',
    name: '冰锥术',
    element: 'ice',
    effectType: 'damage',
    value: 12,
    description: '发射锋利的冰锥，造成12点伤害',
    particleParams: {
      color: '#00d4ff',
      secondaryColor: '#0088cc',
      particleCount: 80,
      duration: 1500,
      intensity: 1,
    },
  },
  {
    id: 'ice_2',
    name: '暴风雪',
    element: 'ice',
    effectType: 'damage',
    value: 22,
    description: '召唤暴风雪席卷敌人，造成22点伤害',
    particleParams: {
      color: '#00d4ff',
      secondaryColor: '#0088cc',
      particleCount: 150,
      duration: 1800,
      intensity: 1.4,
    },
  },
  {
    id: 'ice_3',
    name: '冰霜护甲',
    element: 'ice',
    effectType: 'shield',
    value: 18,
    description: '凝结冰霜护甲，获得18点护盾',
    particleParams: {
      color: '#87ceeb',
      secondaryColor: '#00bfff',
      particleCount: 100,
      duration: 1200,
      intensity: 0.9,
    },
  },
  {
    id: 'ice_4',
    name: '冰冻诅咒',
    element: 'ice',
    effectType: 'curse',
    value: 6,
    description: '施加冰冻诅咒，降低敌人速度',
    particleParams: {
      color: '#4fc3f7',
      secondaryColor: '#0288d1',
      particleCount: 70,
      duration: 2000,
      intensity: 0.7,
    },
  },
  {
    id: 'ice_5',
    name: '寒冰治疗',
    element: 'ice',
    effectType: 'heal',
    value: 15,
    description: '寒冰之力治愈伤痛，恢复15点生命',
    particleParams: {
      color: '#b3e5fc',
      secondaryColor: '#4fc3f7',
      particleCount: 90,
      duration: 1300,
      intensity: 1,
    },
  },
  // 雷系卡牌 (5张)
  {
    id: 'thunder_1',
    name: '闪电箭',
    element: 'thunder',
    effectType: 'damage',
    value: 18,
    description: '释放一道闪电箭，造成18点伤害',
    particleParams: {
      color: '#ffdd00',
      secondaryColor: '#ffaa00',
      particleCount: 6,
      duration: 800,
      intensity: 1.2,
    },
  },
  {
    id: 'thunder_2',
    name: '雷霆万钧',
    element: 'thunder',
    effectType: 'damage',
    value: 30,
    description: '召唤雷霆之力，造成30点伤害',
    particleParams: {
      color: '#ffdd00',
      secondaryColor: '#ffaa00',
      particleCount: 12,
      duration: 1000,
      intensity: 2,
    },
  },
  {
    id: 'thunder_3',
    name: '雷电屏障',
    element: 'thunder',
    effectType: 'shield',
    value: 15,
    description: '生成雷电屏障，获得15点护盾',
    particleParams: {
      color: '#ffff00',
      secondaryColor: '#ffd700',
      particleCount: 8,
      duration: 900,
      intensity: 1,
    },
  },
  {
    id: 'thunder_4',
    name: '麻痹诅咒',
    element: 'thunder',
    effectType: 'curse',
    value: 10,
    description: '施加麻痹诅咒，使敌人行动迟缓',
    particleParams: {
      color: '#ffeb3b',
      secondaryColor: '#ffc107',
      particleCount: 10,
      duration: 1200,
      intensity: 0.8,
    },
  },
  {
    id: 'thunder_5',
    name: '生命脉冲',
    element: 'thunder',
    effectType: 'heal',
    value: 18,
    description: '雷电能脉刺激生命，恢复18点生命',
    particleParams: {
      color: '#fff59d',
      secondaryColor: '#ffee58',
      particleCount: 8,
      duration: 1100,
      intensity: 1.1,
    },
  },
  // 暗系卡牌 (5张)
  {
    id: 'dark_1',
    name: '暗影箭',
    element: 'dark',
    effectType: 'damage',
    value: 16,
    description: '发射暗影能量箭，造成16点伤害',
    particleParams: {
      color: '#6b2fa0',
      secondaryColor: '#1a0033',
      particleCount: 120,
      duration: 1300,
      intensity: 1.1,
    },
  },
  {
    id: 'dark_2',
    name: '深渊漩涡',
    element: 'dark',
    effectType: 'damage',
    value: 28,
    description: '召唤深渊漩涡吞噬敌人，造成28点伤害',
    particleParams: {
      color: '#6b2fa0',
      secondaryColor: '#1a0033',
      particleCount: 180,
      duration: 1600,
      intensity: 1.6,
    },
  },
  {
    id: 'dark_3',
    name: '暗影护盾',
    element: 'dark',
    effectType: 'shield',
    value: 20,
    description: '凝聚暗影护盾，获得20点护盾',
    particleParams: {
      color: '#9c27b0',
      secondaryColor: '#6a1b9a',
      particleCount: 100,
      duration: 1000,
      intensity: 0.9,
    },
  },
  {
    id: 'dark_4',
    name: '虚弱诅咒',
    element: 'dark',
    effectType: 'curse',
    value: 12,
    description: '施加虚弱诅咒，削弱敌人力量',
    particleParams: {
      color: '#7b1fa2',
      secondaryColor: '#4a148c',
      particleCount: 90,
      duration: 1800,
      intensity: 0.8,
    },
  },
  {
    id: 'dark_5',
    name: '黑暗汲取',
    element: 'dark',
    effectType: 'heal',
    value: 22,
    description: '汲取黑暗能量，恢复22点生命',
    particleParams: {
      color: '#ba68c8',
      secondaryColor: '#8e24aa',
      particleCount: 110,
      duration: 1400,
      intensity: 1.3,
    },
  },
]

export const elementColors: Record<ElementType, { start: string; end: string }> = {
  fire: { start: '#ff6b35', end: '#ff2e00' },
  ice: { start: '#00d4ff', end: '#0088cc' },
  thunder: { start: '#ffdd00', end: '#ffaa00' },
  dark: { start: '#6b2fa0', end: '#1a0033' },
}

export const elementNames: Record<ElementType, string> = {
  fire: '火',
  ice: '冰',
  thunder: '雷',
  dark: '暗',
}

export const effectTypeNames: Record<EffectType, string> = {
  damage: '伤害',
  shield: '护盾',
  heal: '治疗',
  curse: '诅咒',
}
