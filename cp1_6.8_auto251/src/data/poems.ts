export interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  lines: string[];
}

export const poems: Poem[] = [
  {
    id: "jingyesi",
    title: "静夜思",
    author: "李白",
    dynasty: "唐",
    lines: ["床前明月光", "疑是地上霜", "举头望明月", "低头思故乡"],
  },
  {
    id: "chunxiao",
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    lines: ["春眠不觉晓", "处处闻啼鸟", "夜来风雨声", "花落知多少"],
  },
  {
    id: "dengguanquelou",
    title: "登鹳雀楼",
    author: "王之涣",
    dynasty: "唐",
    lines: ["白日依山尽", "黄河入海流", "欲穷千里目", "更上一层楼"],
  },
  {
    id: "wanglushan",
    title: "望庐山瀑布",
    author: "李白",
    dynasty: "唐",
    lines: ["日照香炉生紫烟", "遥看瀑布挂前川", "飞流直下三千尺", "疑是银河落九天"],
  },
  {
    id: "jueju",
    title: "绝句",
    author: "杜甫",
    dynasty: "唐",
    lines: ["两个黄鹂鸣翠柳", "一行白鹭上青天", "窗含西岭千秋雪", "门泊东吴万里船"],
  },
  {
    id: "yongliu",
    title: "咏柳",
    author: "贺知章",
    dynasty: "唐",
    lines: ["碧玉妆成一树高", "万条垂下绿丝绦", "不知细叶谁裁出", "二月春风似剪刀"],
  },
  {
    id: "shanxing",
    title: "山行",
    author: "杜牧",
    dynasty: "唐",
    lines: ["远上寒山石径斜", "白云深处有人家", "停车坐爱枫林晚", "霜叶红于二月花"],
  },
  {
    id: "qiusi",
    title: "秋思",
    author: "张籍",
    dynasty: "唐",
    lines: ["洛阳城里见秋风", "欲作家书意万重", "复恐匆匆说不尽", "行人临发又开封"],
  },
  {
    id: "yinjiu",
    title: "饮酒·其五",
    author: "陶渊明",
    dynasty: "晋",
    lines: ["结庐在人境", "而无车马喧", "问君何能尔", "心远地自偏", "采菊东篱下", "悠然见南山", "山气日夕佳", "飞鸟相与还"],
  },
  {
    id: "ti linan",
    title: "题临安邸",
    author: "林升",
    dynasty: "宋",
    lines: ["山外青山楼外楼", "西湖歌舞几时休", "暖风熏得游人醉", "直把杭州作汴州"],
  },
];
