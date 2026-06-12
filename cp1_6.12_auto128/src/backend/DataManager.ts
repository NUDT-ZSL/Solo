import Datastore from 'nedb-promises';
import path from 'path';
import { Rune, CombinationRule, ElementType, SavedConfig } from '../shared/RuneTypes';

const dbPath = path.join(process.cwd(), 'data');

const runesDb = Datastore.create(path.join(dbPath, 'runes.db'));
const configsDb = Datastore.create(path.join(dbPath, 'configs.db'));
const rulesDb = Datastore.create(path.join(dbPath, 'rules.db'));

export const PRESET_RUNES: Rune[] = [
  {
    id: 'rune_fire',
    name: '烈焰符文',
    element: ElementType.FIRE,
    baseDamage: 120,
    cooldown: 2.5,
    range: 8,
    color: '#FF5722',
    glowColor: '#FFAB40',
    description: '释放灼热火焰，造成高额单体伤害',
  },
  {
    id: 'rune_ice',
    name: '寒冰符文',
    element: ElementType.ICE,
    baseDamage: 85,
    cooldown: 2.0,
    range: 10,
    color: '#00BCD4',
    glowColor: '#80DEEA',
    description: '召唤寒冰之力，减缓敌人移动速度',
  },
  {
    id: 'rune_thunder',
    name: '雷霆符文',
    element: ElementType.THUNDER,
    baseDamage: 150,
    cooldown: 3.5,
    range: 12,
    color: '#FFEB3B',
    glowColor: '#FFF59D',
    description: '引动天雷轰击，造成范围连锁伤害',
  },
  {
    id: 'rune_shadow',
    name: '暗影符文',
    element: ElementType.SHADOW,
    baseDamage: 95,
    cooldown: 1.8,
    range: 6,
    color: '#7B1FA2',
    glowColor: '#CE93D8',
    description: '操控黑暗能量，侵蚀敌人生命力',
  },
  {
    id: 'rune_holy',
    name: '神圣符文',
    element: ElementType.HOLY,
    baseDamage: 110,
    cooldown: 3.0,
    range: 15,
    color: '#FFD700',
    glowColor: '#FFF176',
    description: '圣光审判，对黑暗生物造成额外伤害',
  },
  {
    id: 'rune_poison',
    name: '剧毒符文',
    element: ElementType.POISON,
    baseDamage: 60,
    cooldown: 1.5,
    range: 7,
    color: '#4CAF50',
    glowColor: '#A5D6A7',
    description: '蔓延剧毒，持续侵蚀敌人生命值',
  },
  {
    id: 'rune_water',
    name: '流水符文',
    element: ElementType.WATER,
    baseDamage: 70,
    cooldown: 2.2,
    range: 11,
    color: '#2196F3',
    glowColor: '#90CAF9',
    description: '召唤巨浪冲击，可与雷元素产生连锁反应',
  },
  {
    id: 'rune_earth',
    name: '大地符文',
    element: ElementType.EARTH,
    baseDamage: 140,
    cooldown: 4.0,
    range: 5,
    color: '#795548',
    glowColor: '#BCAAA4',
    description: '操控大地之力，造成毁灭性范围伤害',
  },
  {
    id: 'rune_wind',
    name: '疾风符文',
    element: ElementType.WIND,
    baseDamage: 75,
    cooldown: 1.2,
    range: 14,
    color: '#B2EBF2',
    glowColor: '#E0F7FA',
    description: '驾驭狂风，快速连击并削减冷却时间',
  },
  {
    id: 'rune_arcane',
    name: '奥术符文',
    element: ElementType.ARCANE,
    baseDamage: 130,
    cooldown: 3.2,
    range: 9,
    color: '#E040FB',
    glowColor: '#F48FB1',
    description: '纯粹奥术能量，增强其他符文效果',
  },
];

export const PRESET_RULES: CombinationRule[] = [
  {
    id: 'rule_melt',
    name: '融化',
    elements: [ElementType.ICE, ElementType.FIRE],
    description: '冰与火交融，额外伤害30%',
    damageMultiplier: 1.3,
    cooldownReduction: 0.1,
    triggerTime: 1.0,
  },
  {
    id: 'rule_conduct',
    name: '导电麻痹',
    elements: [ElementType.THUNDER, ElementType.WATER],
    description: '电流通过水介质传导，麻痹2秒',
    damageMultiplier: 1.15,
    cooldownReduction: 0.05,
    statusEffect: {
      name: '麻痹',
      duration: 2,
      description: '敌人无法移动和攻击',
    },
    triggerTime: 0.5,
  },
  {
    id: 'rule_overload',
    name: '超载爆发',
    elements: [ElementType.FIRE, ElementType.THUNDER],
    description: '火雷碰撞产生超载爆炸',
    damageMultiplier: 1.5,
    cooldownReduction: 0.15,
    triggerTime: 1.5,
  },
  {
    id: 'rule_freeze',
    name: '冰封',
    elements: [ElementType.ICE, ElementType.WATER],
    description: '水流遇冷凝结，冰冻敌人',
    damageMultiplier: 1.1,
    cooldownReduction: 0.05,
    statusEffect: {
      name: '冰冻',
      duration: 3,
      description: '敌人完全冻结',
    },
    triggerTime: 0.8,
  },
  {
    id: 'rule_purify',
    name: '净化打击',
    elements: [ElementType.HOLY, ElementType.SHADOW],
    description: '圣光净化暗影，伤害翻倍',
    damageMultiplier: 2.0,
    cooldownReduction: 0.2,
    triggerTime: 2.0,
  },
  {
    id: 'rule_toxic_storm',
    name: '毒雾风暴',
    elements: [ElementType.POISON, ElementType.WIND],
    description: '剧毒随风扩散，持续伤害',
    damageMultiplier: 1.25,
    cooldownReduction: 0.1,
    statusEffect: {
      name: '中毒',
      duration: 8,
      damagePerSecond: 15,
      description: '每秒损失生命值',
    },
    triggerTime: 1.2,
  },
  {
    id: 'rule_earth_shatter',
    name: '大地碎裂',
    elements: [ElementType.EARTH, ElementType.FIRE],
    description: '熔岩喷发，范围摧毁',
    damageMultiplier: 1.45,
    cooldownReduction: 0.12,
    triggerTime: 2.5,
  },
  {
    id: 'rule_arcane_amplify',
    name: '奥术增幅',
    elements: [ElementType.ARCANE, ElementType.FIRE, ElementType.ICE],
    description: '奥术增强元素伤害，三重组合',
    damageMultiplier: 1.6,
    cooldownReduction: 0.25,
    triggerTime: 1.8,
  },
];

export class DataManager {
  static async initialize(): Promise<void> {
    const runeCount = await runesDb.count({});
    if (runeCount === 0) {
      await runesDb.insert(PRESET_RUNES);
    }

    const ruleCount = await rulesDb.count({});
    if (ruleCount === 0) {
      await rulesDb.insert(PRESET_RULES);
    }
  }

  static async getAllRunes(): Promise<Rune[]> {
    const runes = await runesDb.find({});
    if (runes.length === 0) {
      return PRESET_RUNES;
    }
    return runes as Rune[];
  }

  static async getRuneById(id: string): Promise<Rune | null> {
    const rune = await runesDb.findOne({ id });
    return (rune as Rune) || null;
  }

  static async getRunesByIds(ids: string[]): Promise<Rune[]> {
    const runes = await runesDb.find({ id: { $in: ids } });
    return runes as Rune[];
  }

  static async getAllRules(): Promise<CombinationRule[]> {
    const rules = await rulesDb.find({});
    if (rules.length === 0) {
      return PRESET_RULES;
    }
    return rules as CombinationRule[];
  }

  static async saveConfig(config: Omit<SavedConfig, '_id' | 'createdAt'>): Promise<SavedConfig> {
    const newConfig: SavedConfig = {
      ...config,
      createdAt: Date.now(),
    };
    const result = await configsDb.insert(newConfig);
    return result as SavedConfig;
  }

  static async getAllConfigs(): Promise<SavedConfig[]> {
    const configs = await configsDb.find({}).sort({ createdAt: -1 });
    return configs as SavedConfig[];
  }

  static async getConfigById(id: string): Promise<SavedConfig | null> {
    const config = await configsDb.findOne({ _id: id });
    return (config as SavedConfig) || null;
  }
}
