import type { Inspiration } from '../store/useStore';

export const mockInspirations: Omit<Inspiration, 'id'>[] = [
  {
    content: '清晨的第一缕阳光穿过窗帘缝隙，像是宇宙在给你写一封情书',
    emotion: 'positive',
    resonanceCount: 12,
    createdAt: '2026-06-07T08:15:00Z',
  },
  {
    content: '如果代码能像诗歌一样优美，那debug就是给诗加注的过程',
    emotion: 'neutral',
    resonanceCount: 8,
    createdAt: '2026-06-07T10:30:00Z',
  },
  {
    content: '深夜独自走在空旷的街道上，路灯把影子拉得很长很长',
    emotion: 'negative',
    resonanceCount: 5,
    createdAt: '2026-06-07T23:45:00Z',
  },
  {
    content: '每一次跌倒都是下一次飞翔的蓄力',
    emotion: 'positive',
    resonanceCount: 23,
    createdAt: '2026-06-06T14:20:00Z',
  },
  {
    content: '也许我们都在寻找一个不会消失的信号',
    emotion: 'neutral',
    resonanceCount: 15,
    createdAt: '2026-06-06T19:00:00Z',
  },
  {
    content: '把星星收集起来放进罐子里，难过的时候就打开看一眼',
    emotion: 'positive',
    resonanceCount: 31,
    createdAt: '2026-06-05T21:30:00Z',
  },
  {
    content: '孤独是一种缓慢的侵蚀，像雨打在石头上',
    emotion: 'negative',
    resonanceCount: 9,
    createdAt: '2026-06-05T03:15:00Z',
  },
  {
    content: '世界那么大，总有一个角落为你留着光',
    emotion: 'positive',
    resonanceCount: 18,
    createdAt: '2026-06-04T16:45:00Z',
  },
  {
    content: '思考是一种奢侈，沉默是一种选择',
    emotion: 'neutral',
    resonanceCount: 7,
    createdAt: '2026-06-04T11:00:00Z',
  },
  {
    content: '旧的日历翻过去，新的故事才会开始写',
    emotion: 'positive',
    resonanceCount: 14,
    createdAt: '2026-06-03T09:30:00Z',
  },
  {
    content: '压力像潮水，退去之后沙滩上会留下贝壳',
    emotion: 'negative',
    resonanceCount: 11,
    createdAt: '2026-06-03T20:00:00Z',
  },
  {
    content: '有时候不需要答案，只需要一个愿意听你说话的人',
    emotion: 'neutral',
    resonanceCount: 20,
    createdAt: '2026-06-02T15:30:00Z',
  },
];
