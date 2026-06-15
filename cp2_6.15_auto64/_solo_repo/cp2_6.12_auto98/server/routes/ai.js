import { Router } from 'express';
import { queryAll } from '../database.js';

const KEYWORD_TEMPLATES = {
  '星球': ['远处的星球开始闪烁着奇异的光芒，似乎在向他们发出信号', '星球表面的裂缝中涌出一种未知的液体，散发着蓝绿色的微光', '这颗星球似乎有某种呼吸，每一次脉动都带动地面的震颤'],
  '门': ['那扇门缓缓打开，门后是一条向下延伸的螺旋阶梯', '门上刻着他们从未见过的符文，触碰后符文开始发光', '门后传来一阵低沉的吟唱声，似乎有什么在召唤他们'],
  '森林': ['森林深处传来鸟鸣般的歌声，但这里不该有鸟', '树木开始移动，缓慢地为他们让出一条通道', '雾气中隐约可见一条小径，两旁的树上有发光的果实'],
  '海洋': ['海水突然变得透明，他们可以看到海底的古老建筑', '一个巨大的影子在水面下移动，掀起温柔的浪花', '海水开始逆流而上，违背了所有物理定律'],
  '城市': ['废弃的城市里，路灯突然一盏接一盏地亮了起来', '建筑物的墙壁上开始显现出移动的壁画', '城市广场中央的喷泉开始喷出金色的水柱'],
  '龙': ['天空中出现了巨大的翼影，云层被撕裂成两半', '地面上发现了一片比人还大的鳞片，依然温热', '远处传来龙吟，地面上的碎石开始悬浮'],
  '魔法': ['空气中的魔力浓度急剧上升，每个人的指尖都开始冒出火花', '一道魔法屏障出现在他们周围，外面的世界变得扭曲', '古老的魔法阵在他们脚下自动激活，发出耀眼的光芒'],
  '黑暗': ['黑暗中有一双双眼睛在注视着他们，但并非充满敌意', '他们点燃的火焰变成了黑色，但依然提供着温暖', '黑暗开始凝聚成实体，仿佛有什么东西正从中诞生'],
  '光明': ['一束光从天而降，照亮了一片隐藏的花园', '光明中传来悦耳的钟声，每个人心中都涌起勇气', '光与影的交界处，出现了一座悬浮的桥梁'],
  '时间': ['时间仿佛在这里凝固，飘落的花瓣停在了半空', '他们看到了过去和未来的影像在同一空间交织', '时钟的指针开始倒转，周围的一切都在快速倒退'],
  '山': ['山峰开始移动，露出藏在其后的巨大入口', '山顶的积雪变成了彩色，如同彩虹倾泻而下', '山体内部的洞穴发出低沉的共鸣，似乎在与某种频率同步'],
  '河': ['河水逆流而上，带着发光的鱼群游向天空', '河流分叉成无数条细流，每条都通向不同的世界', '河底显现出一条由宝石铺就的道路'],
  '钥匙': ['钥匙插入虚空中，旋转后打开了一道看不见的门', '钥匙开始发光变热，周围的空间开始扭曲', '这把钥匙似乎能打开任何锁，包括人心中的锁'],
  '镜子': ['镜中的倒影开始独立行动，朝他们微笑', '镜面变成了一个通往另一个世界的窗口', '每面镜子都映射出不同的时空，他们看到了无数个自己'],
  '城堡': ['城堡的墙壁开始呼吸，城砖间长出了奇异的花朵', '城堡大门自动开启，红地毯从门内铺到了他们脚下', '城堡在月光下变换着形状，每个角度看起来都不同'],
  '书': ['书页自动翻开，文字从纸上飘起在空中组成一幅画', '这本书似乎在记录他们的一举一动，甚至包括尚未发生的事', '翻开新的一页，他们发现自己站在了书中描写的场景里'],
  '影': ['影子脱离了主人，开始独自在墙壁上起舞', '他们的影子变得比实际体型大三倍，动作却更加敏捷', '影子在地上组成了一幅地图，标注着一个隐藏的位置'],
};

const DEFAULT_SUGGESTIONS = [
  '一阵突如其来的风暴改变了一切，他们不得不寻找庇护所',
  '远处传来了悠扬的笛声，引领他们走向未知的方向',
  '脚下的地面开始震动，一道裂缝朝他们蔓延过来',
];

function extractKeywords(text) {
  const allKeywords = Object.keys(KEYWORD_TEMPLATES);
  const found = [];
  for (const kw of allKeywords) {
    if (text.includes(kw)) {
      found.push(kw);
    }
  }
  return found;
}

function generateSuggestions(content) {
  const keywords = extractKeywords(content);
  const suggestions = [];

  if (keywords.length > 0) {
    for (const kw of keywords) {
      const templates = KEYWORD_TEMPLATES[kw];
      const idx = Math.floor(Math.random() * templates.length);
      suggestions.push(templates[idx]);
    }
  }

  while (suggestions.length < 3) {
    let candidate;
    if (keywords.length === 0) {
      candidate = DEFAULT_SUGGESTIONS[suggestions.length] || DEFAULT_SUGGESTIONS[0];
    } else {
      const allTemplates = Object.values(KEYWORD_TEMPLATES).flat();
      candidate = allTemplates[Math.floor(Math.random() * allTemplates.length)];
    }
    if (!suggestions.includes(candidate)) {
      suggestions.push(candidate);
    }
  }

  return suggestions.slice(0, 3);
}

export function createAiRouter(db) {
  const router = Router();

  router.post('/suggest', (req, res) => {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }
    const suggestions = generateSuggestions(content);
    res.json({ suggestions });
  });

  return router;
}
