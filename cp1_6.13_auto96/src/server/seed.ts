import { v4 as uuidv4 } from 'uuid';
import type { Asset } from '../shared/types.js';
import { dataStore } from './models/DataStore.js';
import { PRESET_TAGS } from '../shared/types.js';

const SAMPLE_MODEL_URLS = [
  'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
  'https://threejs.org/examples/models/gltf/Duck/glTF/Duck.gltf',
  'https://threejs.org/examples/models/gltf/FlightHelmet/glTF/FlightHelmet.gltf',
  'https://threejs.org/examples/models/gltf/SheenChair/glTF/SheenChair.gltf',
];

const ASSET_NAMES = [
  '奇幻骑士头盔', '科幻枪械', '中世纪城堡', '现代城市建筑',
  '卡通角色模型', '写实人物', '风格化树木', '低多边形汽车',
  '高多边形雕塑', 'PBR材质套装', '动画怪物', '绑定角色',
  '自然环境', '室内家具', '装饰道具', '粒子特效',
  '游戏UI图标', '材质球Shader', '手绘纹理', '像素风格',
  '体素模型', '等距视角', '俯视视角', '第一人称道具',
  '恐怖氛围素材', 'RPG武器包', 'FPS武器', '策略游戏建筑',
  '解谜游戏道具', '平台跳跃素材', '街机风格', '休闲游戏素材',
  '独立游戏资源', 'AAA级角色', '赛博朋克城市', '末日废墟',
  '太空飞船', '水下场景', '雪山环境', '沙漠地形',
  '森林环境', '洞穴场景', '科幻道具', '魔法物品',
  '符文石刻', '古代遗迹', '未来城市', '复古蒸汽朋克',
];

const AUTHORS = [
  'PixelMaster', '3DArtistPro', 'GameDevHero', 'ArtCreator',
  'ModelKing', 'TextureWizard', 'SoundMaster', 'IndieDev'
];

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateDescription(name: string): string {
  const descriptions = [
    `高质量${name}，精心制作，适用于各类游戏项目。`,
    `专业级${name}资源，包含完整细节和优化拓扑。`,
    `精美的${name}模型，带有PBR材质。`,
    `游戏就绪的${name}，可直接导入引擎使用。`,
    `原创${name}，独特的设计风格。`,
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function getRandomCategory(): 'model' | 'texture' | 'sound' {
  const categories: ('model' | 'texture' | 'sound')[] = ['model', 'model', 'model', 'texture', 'sound'];
  return categories[Math.floor(Math.random() * categories.length)];
}

function generateAssets(count: number): Asset[] {
  const assets: Asset[] = [];
  
  for (let i = 0; i < count; i++) {
    const nameIndex = i % ASSET_NAMES.length;
    const baseName = ASSET_NAMES[nameIndex];
    const name = count > ASSET_NAMES.length ? `${baseName} #${Math.floor(i / ASSET_NAMES.length) + 1}` : baseName;
    const category = getRandomCategory();
    const author = AUTHORS[Math.floor(Math.random() * AUTHORS.length)];
    const tagsCount = Math.floor(Math.random() * 4) + 2;
    const tags = getRandomItems([...PRESET_TAGS], tagsCount);
    const price = Math.floor(Math.random() * 196) + 5;
    const modelIndex = Math.floor(Math.random() * SAMPLE_MODEL_URLS.length);
    const favorites = Math.floor(Math.random() * 500);
    const createdAt = Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);

    assets.push({
      _id: uuidv4(),
      name,
      description: generateDescription(name),
      category,
      tags,
      price,
      modelUrl: SAMPLE_MODEL_URLS[modelIndex],
      thumbnailUrl: `https://picsum.photos/seed/asset-${i}/400/300`,
      author,
      authorId: `author-${Math.floor(Math.random() * 8) + 1}`,
      favorites,
      isFavorited: false,
      createdAt,
      updatedAt: createdAt,
    });
  }
  
  return assets;
}

export async function seedDatabase(): Promise<void> {
  try {
    const count = await dataStore.count();
    
    if (count > 0) {
      console.log(`Database already has ${count} assets, skipping seed.`);
      return;
    }

    console.log('Seeding database with 500 assets...');
    const assets = generateAssets(500);
    await dataStore.insertMany(assets);
    
    const newCount = await dataStore.count();
    console.log(`Seed complete. Total assets: ${newCount}`);
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
