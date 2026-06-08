export interface Poem {
  id: string
  title: string
  author: string
  dynasty: string
  lines: string[]
  fullText: string
}

export const poems: Poem[] = [
  {
    id: 'jingyesi',
    title: '静夜思',
    author: '李白',
    dynasty: '唐',
    lines: ['床前明月光，疑是地上霜。', '举头望明月，低头思故乡。'],
    fullText: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
  },
  {
    id: 'chunxiao',
    title: '春晓',
    author: '孟浩然',
    dynasty: '唐',
    lines: ['春眠不觉晓，处处闻啼鸟。', '夜来风雨声，花落知多少。'],
    fullText: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。',
  },
  {
    id: 'dengguanquelou',
    title: '登鹳雀楼',
    author: '王之涣',
    dynasty: '唐',
    lines: ['白日依山尽，黄河入海流。', '欲穷千里目，更上一层楼。'],
    fullText: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。',
  },
  {
    id: 'wanglushan',
    title: '望庐山瀑布',
    author: '李白',
    dynasty: '唐',
    lines: ['日照香炉生紫烟，遥看瀑布挂前川。', '飞流直下三千尺，疑是银河落九天。'],
    fullText: '日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。',
  },
  {
    id: 'jiangxue',
    title: '江雪',
    author: '柳宗元',
    dynasty: '唐',
    lines: ['千山鸟飞绝，万径人踪灭。', '孤舟蓑笠翁，独钓寒江雪。'],
    fullText: '千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。',
  },
  {
    id: 'yongliu',
    title: '咏柳',
    author: '贺知章',
    dynasty: '唐',
    lines: ['碧玉妆成一树高，万条垂下绿丝绦。', '不知细叶谁裁出，二月春风似剪刀。'],
    fullText: '碧玉妆成一树高，万条垂下绿丝绦。不知细叶谁裁出，二月春风似剪刀。'],
  },
  {
    id: 'chouwang',
    title: '酬乐天扬州初逢席上见赠',
    author: '刘禹锡',
    dynasty: '唐',
    lines: [
      '巴山楚水凄凉地，二十三年弃置身。',
      '怀旧空吟闻笛赋，到乡翻似烂柯人。',
      '沉舟侧畔千帆过，病树前头万木春。',
      '今日听君歌一曲，暂凭杯酒长精神。',
    ],
    fullText: '巴山楚水凄凉地，二十三年弃置身。怀旧空吟闻笛赋，到乡翻似烂柯人。沉舟侧畔千帆过，病树前头万木春。今日听君歌一曲，暂凭杯酒长精神。',
  },
  {
    id: 'shui diao ge tou',
    title: '水调歌头·明月几时有',
    author: '苏轼',
    dynasty: '宋',
    lines: [
      '明月几时有？把酒问青天。',
      '不知天上宫阙，今夕是何年。',
      '我欲乘风归去，又恐琼楼玉宇，高处不胜寒。',
      '起舞弄清影，何似在人间。',
      '转朱阁，低绮户，照无眠。',
      '不应有恨，何事长向别时圆？',
      '人有悲欢离合，月有阴晴圆缺，此事古难全。',
      '但愿人长久，千里共婵娟。',
    ],
    fullText: '明月几时有？把酒问青天。不知天上宫阙，今夕是何年。我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。转朱阁，低绮户，照无眠。不应有恨，何事长向别时圆？人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。',
  },
]
