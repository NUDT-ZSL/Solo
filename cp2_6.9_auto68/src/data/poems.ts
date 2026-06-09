export interface Poem {
  id: string;
  title: string;
  author: string;
  content: string[];
}

export const POEMS: Poem[] = [
  {
    id: 'jingyesi',
    title: '静夜思',
    author: '李白',
    content: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡']
  },
  {
    id: 'chunxiao',
    title: '春晓',
    author: '孟浩然',
    content: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少']
  },
  {
    id: 'denggaunquelou',
    title: '登鹳雀楼',
    author: '王之涣',
    content: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼']
  },
  {
    id: 'xiangsi',
    title: '相思',
    author: '王维',
    content: ['红豆生南国', '春来发几枝', '愿君多采撷', '此物最相思']
  }
];

export const getAllChars = (poem: Poem): string[] => {
  return poem.content.flatMap(line => line.split(''));
};
