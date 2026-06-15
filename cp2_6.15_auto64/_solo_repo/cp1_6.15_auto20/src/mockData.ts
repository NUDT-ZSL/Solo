import { Score, createEmptyNotes } from './types';

function makeScore(title: string, noteData: [number, number, boolean, 'whole' | 'half' | 'quarter' | 'eighth'][][]): Score {
  const notes = createEmptyNotes();
  noteData.forEach((measure, mi) => {
    measure.forEach((n, bi) => {
      if (n) {
        notes[mi][bi] = { pitch: n[0], octave: n[1], sharp: n[2], duration: n[3] };
      }
    });
  });
  return {
    id: `mock-${Math.random().toString(36).slice(2, 10)}`,
    title,
    notes,
    createdAt: Date.now() - Math.floor(Math.random() * 86400000 * 30),
    updatedAt: Date.now() - Math.floor(Math.random() * 86400000 * 10),
  };
}

export const mockScores: Score[] = [
  makeScore('小星星', [
    [[1,1,false,'quarter'],[1,1,false,'quarter'],[5,1,false,'quarter'],[5,1,false,'quarter']],
    [[6,1,false,'quarter'],[6,1,false,'quarter'],[5,1,false,'half']],
    [[4,1,false,'quarter'],[4,1,false,'quarter'],[3,1,false,'quarter'],[3,1,false,'quarter']],
    [[2,1,false,'quarter'],[2,1,false,'quarter'],[1,1,false,'half']],
    [[5,1,false,'quarter'],[5,1,false,'quarter'],[4,1,false,'quarter'],[4,1,false,'quarter']],
    [[3,1,false,'quarter'],[3,1,false,'quarter'],[2,1,false,'half']],
  ]),
  makeScore('欢乐颂', [
    [[3,1,false,'quarter'],[3,1,false,'quarter'],[4,1,false,'quarter'],[5,1,false,'quarter']],
    [[5,1,false,'quarter'],[4,1,false,'quarter'],[3,1,false,'quarter'],[2,1,false,'quarter']],
    [[1,1,false,'quarter'],[1,1,false,'quarter'],[2,1,false,'quarter'],[3,1,false,'quarter']],
    [[3,1,false,'eighth'],[2,1,false,'eighth'],[2,1,false,'half']],
    [[3,1,false,'quarter'],[3,1,false,'quarter'],[4,1,false,'quarter'],[5,1,false,'quarter']],
    [[5,1,false,'quarter'],[4,1,false,'quarter'],[3,1,false,'quarter'],[2,1,false,'quarter']],
    [[1,1,false,'quarter'],[1,1,false,'quarter'],[2,1,false,'quarter'],[3,1,false,'quarter']],
    [[2,1,false,'eighth'],[1,1,false,'eighth'],[1,1,false,'half']],
  ]),
  makeScore('生日快乐', [
    [[5,1,false,'eighth'],[5,1,false,'eighth'],[6,1,false,'quarter'],[5,1,false,'quarter']],
    [[1,2,false,'quarter'],[7,1,false,'half']],
    [[5,1,false,'eighth'],[5,1,false,'eighth'],[6,1,false,'quarter'],[5,1,false,'quarter']],
    [[2,2,false,'quarter'],[1,2,false,'half']],
    [[5,1,false,'eighth'],[5,1,false,'eighth'],[5,2,false,'quarter'],[3,2,false,'quarter']],
    [[1,2,false,'quarter'],[7,1,false,'quarter'],[6,1,false,'quarter']],
    [[4,2,false,'eighth'],[4,2,false,'eighth'],[3,2,false,'quarter'],[1,2,false,'quarter']],
    [[2,2,false,'quarter'],[1,2,false,'half']],
  ]),
  makeScore('两只老虎', [
    [[1,1,false,'quarter'],[2,1,false,'quarter'],[3,1,false,'quarter'],[1,1,false,'quarter']],
    [[1,1,false,'quarter'],[2,1,false,'quarter'],[3,1,false,'quarter'],[1,1,false,'quarter']],
    [[3,1,false,'quarter'],[4,1,false,'quarter'],[5,1,false,'half']],
    [[3,1,false,'quarter'],[4,1,false,'quarter'],[5,1,false,'half']],
    [[5,1,false,'eighth'],[6,1,false,'eighth'],[5,1,false,'eighth'],[4,1,false,'eighth'],[3,1,false,'quarter'],[1,1,false,'quarter']],
    [[5,1,false,'eighth'],[6,1,false,'eighth'],[5,1,false,'eighth'],[4,1,false,'eighth'],[3,1,false,'quarter'],[1,1,false,'quarter']],
    [[1,1,false,'quarter'],[5,0,false,'quarter'],[1,1,false,'half']],
    [[1,1,false,'quarter'],[5,0,false,'quarter'],[1,1,false,'half']],
  ]),
  makeScore('茉莉花', [
    [[3,1,false,'quarter'],[3,1,false,'quarter'],[5,1,false,'eighth'],[6,1,false,'eighth'],[5,1,false,'quarter']],
    [[3,1,false,'eighth'],[5,1,false,'eighth'],[3,1,false,'quarter'],[2,1,false,'quarter']],
    [[1,1,false,'quarter'],[2,1,false,'eighth'],[3,1,false,'eighth'],[5,1,false,'quarter'],[3,1,false,'eighth'],[2,1,false,'eighth']],
    [[1,1,false,'quarter'],[2,1,false,'eighth'],[3,1,false,'eighth'],[1,1,false,'half']],
  ]),
  makeScore('送别', [
    [[5,1,false,'quarter'],[3,1,false,'eighth'],[4,1,false,'eighth'],[5,1,false,'quarter'],[6,1,false,'quarter']],
    [[5,1,false,'eighth'],[3,1,false,'eighth'],[2,1,false,'quarter'],[1,1,false,'half']],
    [[6,1,false,'quarter'],[6,1,false,'quarter'],[5,1,false,'eighth'],[3,1,false,'eighth'],[2,1,false,'quarter']],
    [[1,1,false,'quarter'],[2,1,false,'quarter'],[3,1,false,'half']],
    [[5,1,false,'quarter'],[3,1,false,'eighth'],[4,1,false,'eighth'],[5,1,false,'quarter'],[6,1,false,'quarter']],
    [[5,1,false,'eighth'],[3,1,false,'eighth'],[2,1,false,'quarter'],[1,1,false,'half']],
  ]),
  makeScore('青花瓷 主旋律', [
    [[5,1,false,'eighth'],[6,1,false,'eighth'],[1,2,false,'quarter'],[6,1,false,'eighth'],[5,1,false,'eighth']],
    [[3,1,false,'quarter'],[5,1,false,'quarter']],
    [[6,1,false,'eighth'],[1,2,false,'eighth'],[2,2,false,'quarter'],[1,2,false,'eighth'],[6,1,false,'eighth']],
    [[5,1,false,'quarter'],[3,1,false,'quarter']],
    [[5,1,false,'eighth'],[3,1,false,'eighth'],[2,1,false,'quarter'],[3,1,false,'eighth'],[5,1,false,'eighth']],
    [[6,1,false,'quarter'],[5,1,false,'half']],
  ]),
  makeScore('天空之城', [
    [[6,1,false,'quarter'],[7,1,false,'quarter'],[1,2,false,'half']],
    [[7,1,false,'quarter'],[6,1,false,'quarter'],[7,1,false,'eighth'],[1,2,false,'eighth'],[7,1,false,'quarter']],
    [[6,1,false,'quarter'],[3,1,false,'quarter'],[5,1,false,'half']],
    [[3,1,false,'quarter'],[5,1,false,'eighth'],[6,1,false,'eighth'],[5,1,false,'half']],
    [[3,1,false,'eighth'],[5,1,false,'eighth'],[6,1,false,'quarter'],[5,1,false,'quarter']],
    [[3,1,false,'quarter'],[2,1,false,'half']],
  ]),
  makeScore('卡农 简化版', [
    [[5,0,false,'quarter'],[3,1,false,'quarter'],[3,1,false,'quarter'],[3,1,false,'quarter']],
    [[6,0,false,'quarter'],[1,1,false,'quarter'],[6,0,false,'quarter'],[1,1,false,'quarter']],
    [[7,0,false,'quarter'],[7,0,false,'quarter'],[7,0,false,'quarter'],[7,0,false,'quarter']],
    [[3,1,false,'quarter'],[5,1,false,'quarter'],[3,1,false,'quarter'],[5,1,false,'quarter']],
    [[1,1,false,'quarter'],[3,1,false,'quarter'],[1,1,false,'quarter'],[3,1,false,'quarter']],
    [[5,0,false,'quarter'],[5,1,false,'quarter'],[5,0,false,'quarter'],[5,1,false,'quarter']],
  ]),
  makeScore('渔舟唱晚 片段', [
    [[5,1,false,'quarter'],[3,1,false,'eighth'],[2,1,false,'eighth'],[1,1,false,'quarter'],[6,0,false,'quarter']],
    [[5,0,false,'quarter'],[1,1,false,'eighth'],[2,1,false,'eighth'],[3,1,false,'quarter'],[5,1,false,'quarter']],
    [[6,1,false,'quarter'],[5,1,false,'eighth'],[3,1,false,'eighth'],[5,1,false,'half']],
    [[3,1,false,'quarter'],[2,1,false,'eighth'],[1,1,false,'eighth'],[2,1,false,'quarter'],[3,1,false,'quarter']],
    [[5,1,false,'eighth'],[6,1,false,'eighth'],[5,1,false,'quarter'],[3,1,false,'quarter']],
    [[1,1,false,'half'],[1,1,false,'half']],
  ]),
];
