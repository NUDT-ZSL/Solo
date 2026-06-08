export interface Sentence {
  text: string;
  delay: number;
}

export interface Page {
  sentences: Sentence[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverAccent: string;
  description: string;
  pages: Page[];
}

export const books: Book[] = [
  {
    id: "silent-night",
    title: "静夜诗抄",
    author: "佚名",
    coverColor: "#1a1a3e",
    coverAccent: "#6b7fdb",
    description: "五首关于夜色与孤寂的短诗",
    pages: [
      {
        sentences: [
          { text: "月色如霜铺满窗，", delay: 0 },
          { text: "孤灯一盏照空房。", delay: 1200 },
          { text: "夜风不语穿庭过，", delay: 2400 },
          { text: "只落花影在墙旁。", delay: 3600 },
        ],
      },
      {
        sentences: [
          { text: "长夜漫漫星河远，", delay: 0 },
          { text: "寒鸦栖尽旧枝寒。", delay: 1200 },
          { text: "谁家灯火迟迟灭，", delay: 2400 },
          { text: "独坐窗前忆往年。", delay: 3600 },
        ],
      },
      {
        sentences: [
          { text: "夜深露重无人语，", delay: 0 },
          { text: "唯有虫鸣伴月明。", delay: 1200 },
          { text: "偶有清风翻书页，", delay: 2400 },
          { text: "一行诗句到天明。", delay: 3600 },
        ],
      },
      {
        sentences: [
          { text: "黑云压城城欲摧，", delay: 0 },
          { text: "万家灯火渐式微。", delay: 1200 },
          { text: "唯有心中一点亮，", delay: 2400 },
          { text: "照我行过夜如灰。", delay: 3600 },
        ],
      },
      {
        sentences: [
          { text: "夜半钟声到客船，", delay: 0 },
          { text: "江枫渔火对愁眠。", delay: 1200 },
          { text: "此身如寄苍茫里，", delay: 2400 },
          { text: "一梦千年不还乡。", delay: 3600 },
        ],
      },
    ],
  },
  {
    id: "alley-stories",
    title: "巷尾故事",
    author: "路拾遗",
    coverColor: "#3e2a1a",
    coverAccent: "#d4915c",
    description: "三个市井生活的微型故事",
    pages: [
      {
        sentences: [
          { text: "巷子尽头的老王头，", delay: 0 },
          { text: "每天清晨五点准时开门，", delay: 1000 },
          { text: "蒸笼里升起的第一缕白气，", delay: 2000 },
          { text: "比闹钟还准。", delay: 3200 },
        ],
      },
      {
        sentences: [
          { text: "修鞋的李婶说，", delay: 0 },
          { text: "她这辈子修过三千双鞋，", delay: 1000 },
          { text: "每一双都带着一个人的故事，", delay: 2000 },
          { text: "有些鞋底磨偏了，是走了太多弯路。", delay: 3200 },
        ],
      },
      {
        sentences: [
          { text: "理发店的小陈总爱哼歌，", delay: 0 },
          { text: "剪刀在发间穿梭如飞，", delay: 1000 },
          { text: "他说剪掉的不是头发，", delay: 2000 },
          { text: "是那些不再需要的过去。", delay: 3200 },
        ],
      },
    ],
  },
  {
    id: "mountain-letters",
    title: "山间信笺",
    author: "林深见",
    coverColor: "#1a3e2a",
    coverAccent: "#7fdb9a",
    description: "四封山居感悟的书信体散文",
    pages: [
      {
        sentences: [
          { text: "山中来信第一封：", delay: 0 },
          { text: "今日入山，雾气未散，", delay: 1000 },
          { text: "松针上挂着昨夜的雨，", delay: 2000 },
          { text: "每一滴都映着整片天空。", delay: 3200 },
        ],
      },
      {
        sentences: [
          { text: "山中来信第二封：", delay: 0 },
          { text: "溪水绕过石头的时候，", delay: 1000 },
          { text: "从不抱怨路途曲折，", delay: 2000 },
          { text: "它只是继续流淌，继续清澈。", delay: 3200 },
        ],
      },
      {
        sentences: [
          { text: "山中来信第三封：", delay: 0 },
          { text: "鸟鸣从树冠传来，", delay: 1000 },
          { text: "像是谁在远方念诗，", delay: 2000 },
          { text: "声音穿过层林，到我耳边只剩温柔。", delay: 3200 },
        ],
      },
      {
        sentences: [
          { text: "山中来信第四封：", delay: 0 },
          { text: "月光洒在雪地上，", delay: 1000 },
          { text: "整个山谷安静得像一本合上的书，", delay: 2000 },
          { text: "我站在中间，是唯一翻页的手指。", delay: 3200 },
        ],
      },
    ],
  },
  {
    id: "stardust-whispers",
    title: "星尘低语",
    author: "辰河",
    coverColor: "#1a1a3e",
    coverAccent: "#db6b7f",
    description: "四首关于星空与宇宙的诗",
    pages: [
      {
        sentences: [
          { text: "我拾起一粒星尘，", delay: 0 },
          { text: "它在掌心微弱地亮着，", delay: 1200 },
          { text: "像是亿年前某颗星的遗言，", delay: 2400 },
          { text: "至今仍在赶路。", delay: 3600 },
        ],
      },
      {
        sentences: [
          { text: "银河倒映在湖面，", delay: 0 },
          { text: "我伸手去捞，", delay: 1200 },
          { text: "捞起的却是一捧月光，", delay: 2400 },
          { text: "碎成无数条银鱼。", delay: 3600 },
        ],
      },
      {
        sentences: [
          { text: "如果宇宙有声音，", delay: 0 },
          { text: "那一定是某种低频的嗡鸣，", delay: 1200 },
          { text: "像心跳，像潮汐，", delay: 2400 },
          { text: "像所有生命共同的节拍。", delay: 3600 },
        ],
      },
      {
        sentences: [
          { text: "每颗星都是一个远方，", delay: 0 },
          { text: "每道光都是一封信，", delay: 1200 },
          { text: "寄出的年代太久远，", delay: 2400 },
          { text: "收信人已化为星尘。", delay: 3600 },
        ],
      },
    ],
  },
  {
    id: "old-times",
    title: "旧时光书",
    author: "忆舟",
    coverColor: "#3e3a1a",
    coverAccent: "#dbc46b",
    description: "两篇怀旧题材的短篇小说",
    pages: [
      {
        sentences: [
          { text: "阁楼上的樟木箱，", delay: 0 },
          { text: "装着外婆的嫁衣，", delay: 1000 },
          { text: "丝绸上的牡丹已经褪色，", delay: 2000 },
          { text: "但针脚依旧细密如初。", delay: 3200 },
        ],
      },
      {
        sentences: [
          { text: "老街口的梧桐树还在，", delay: 0 },
          { text: "只是秋天的落叶，", delay: 1000 },
          { text: "再也等不到那个扫叶的老人，", delay: 2000 },
          { text: "和他的那把竹扫帚。", delay: 3200 },
        ],
      },
      {
        sentences: [
          { text: "翻开发黄的相册，", delay: 0 },
          { text: "黑白照片里的笑容那么年轻，", delay: 1000 },
          { text: "那时候的风很慢，", delay: 2000 },
          { text: "日子也跟着慢慢走。", delay: 3200 },
        ],
      },
      {
        sentences: [
          { text: "墙角的旧收音机，", delay: 0 },
          { text: "偶尔还能收到一两个频道，", delay: 1000 },
          { text: "滋滋啦啦的声音里，", delay: 2000 },
          { text: "藏着整个八十年代的回声。", delay: 3200 },
        ],
      },
    ],
  },
];
