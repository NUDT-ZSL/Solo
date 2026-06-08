import type { EmotionType } from './types';

const encouragements: Record<EmotionType, string[]> = {
  calm: [
    '你的宁静如湖水般澄澈，继续守护这份平和。',
    '每一次呼吸都是与内心深处的温柔对话。',
    '宁静不是远离喧嚣，而是在心中修篱种菊。',
    '你找到了属于自己的安静角落，好好珍藏。',
    '平静的心灵是最好的港湾。',
    '如山间清风，你的内心正在变得越来越清澈。',
  ],
  joy: [
    '你的喜悦如阳光般温暖，照亮了内心的每一个角落。',
    '快乐是一种力量，它让你的生命之树更加繁茂。',
    '带着这份欢喜，继续在生活中播种善意。',
    '你的微笑是最美的冥想。',
    '喜悦是灵魂的养分，你的生命之树正在茁壮成长。',
    '心中的暖阳，让一切美好如期而至。',
  ],
  anxiety: [
    '焦虑是来访的云，而你永远是那片天空。',
    '承认焦虑需要勇气，你已经迈出了重要的一步。',
    '每一朵乌云后面都有阳光，这次冥想是你在寻找光亮。',
    '你的生命之树在风雨中更加扎根，每一次呼吸都是力量。',
    '焦虑不会停留太久，你比它更强大。',
    '接纳当下的不安，就是给未来种下安宁的种子。',
  ],
};

export function getEncouragement(emotion: EmotionType): string {
  const pool = encouragements[emotion];
  return pool[Math.floor(Math.random() * pool.length)];
}
