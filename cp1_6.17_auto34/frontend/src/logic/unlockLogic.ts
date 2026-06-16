import { HiddenMenu } from '../types';

const UNLOCKED_COUNT_KEY = 'cc_unlocked_count';
const UNLOCKED_IDS_KEY = 'cc_unlocked_ids';
const FAVORITES_KEY = 'cc_favorites';

const PRESET_HIDDEN_MENUS: HiddenMenu[] = [
  { id: 'h1', name: '月光协奏曲', story: '传说在满月之夜调制的咖啡，融合了牙买加蓝山与香草豆荚，入口如银色月光般温柔，尾韵带着淡淡的紫罗兰花香。', imageSvg: '' },
  { id: 'h2', name: '星空玛奇朵', story: '灵感来自夏夜银河，蝶豆花染成的蓝色奶泡覆盖在浓缩之上，搅拌后呈现梦幻紫渐层，酸甜交织。', imageSvg: '' },
  { id: 'h3', name: '森林漫步', story: '加入了松木熏制的糖浆和榛果碎，仿佛置身清晨的北欧森林，每一口都是大地的馈赠。', imageSvg: '' },
  { id: 'h4', name: '海风吹拂', story: '海盐焦糖与冷萃的碰撞，咸甜之间是夏日海边的记忆，顶部点缀一片风干柠檬。', imageSvg: '' },
  { id: 'h5', name: '玫瑰密语', story: '大马士革玫瑰露与埃塞俄比亚耶加雪菲的完美融合，花香与果酸在舌尖绽放，像一封情书。', imageSvg: '' },
  { id: 'h6', name: '熔岩可可', story: '70%黑巧克力融化在浓缩咖啡中，撒上辣椒粉带来惊喜的微辣，是冬天最温暖的拥抱。', imageSvg: '' },
  { id: 'h7', name: '柚子清风', story: '日式柚子茶与手冲咖啡的跨界合作，清新的柑橘调让每个午后都变得轻盈。', imageSvg: '' },
  { id: 'h8', name: '伯爵之梦', story: '伯爵茶的佛手柑香气浸润咖啡，加入薰衣草蜂蜜，适合在慵懒的午后慢慢品味。', imageSvg: '' },
  { id: 'h9', name: '琥珀时光', story: '陈年朗姆酒浸泡的咖啡豆与焦糖的结合，像一杯液态的时间，醇厚而有故事。', imageSvg: '' },
  { id: 'h10', name: '薄荷奇缘', story: '新鲜薄荷叶捣出的汁液与冰美式相遇，清凉透顶的夏日限定，让人念念不忘。', imageSvg: '' }
];

export function getHiddenMenus(): HiddenMenu[] {
  return PRESET_HIDDEN_MENUS;
}

export function checkUnlock(userId: string, orderCount: number): HiddenMenu | null {
  if (orderCount <= 0 || orderCount % 5 !== 0) {
    return null;
  }
  const countKey = `${UNLOCKED_COUNT_KEY}_${userId}`;
  const idsKey = `${UNLOCKED_IDS_KEY}_${userId}`;
  const milestone = orderCount / 5;
  const lastMilestone = parseInt(localStorage.getItem(countKey) || '0', 10);
  if (milestone <= lastMilestone) {
    return null;
  }
  let unlockedIds: string[] = [];
  try {
    unlockedIds = JSON.parse(localStorage.getItem(idsKey) || '[]');
  } catch {
    unlockedIds = [];
  }
  const available = PRESET_HIDDEN_MENUS.filter((m) => !unlockedIds.includes(m.id));
  if (available.length === 0) {
    localStorage.setItem(countKey, String(milestone));
    return null;
  }
  const random = available[Math.floor(Math.random() * available.length)];
  unlockedIds.push(random.id);
  localStorage.setItem(idsKey, JSON.stringify(unlockedIds));
  localStorage.setItem(countKey, String(milestone));
  return random;
}

export function getUnlockedIds(userId: string): string[] {
  const idsKey = `${UNLOCKED_IDS_KEY}_${userId}`;
  try {
    return JSON.parse(localStorage.getItem(idsKey) || '[]');
  } catch {
    return [];
  }
}

export function getFavorites(userId: string): HiddenMenu[] {
  const key = `${FAVORITES_KEY}_${userId}`;
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

export function addFavorite(userId: string, menu: HiddenMenu): boolean {
  const key = `${FAVORITES_KEY}_${userId}`;
  const favs = getFavorites(userId);
  if (favs.some((f) => f.id === menu.id)) {
    return false;
  }
  favs.push(menu);
  localStorage.setItem(key, JSON.stringify(favs));
  return true;
}

export function removeFavorite(userId: string, menuId: string): void {
  const key = `${FAVORITES_KEY}_${userId}`;
  const favs = getFavorites(userId).filter((f) => f.id !== menuId);
  localStorage.setItem(key, JSON.stringify(favs));
}
