export type EmotionType = "悲" | "喜" | "思" | "寂";

export interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  lines: string[];
}

export interface AnalyzedLine {
  text: string;
  emotion: EmotionType;
  intensity: number;
  tags: string[];
  music: string;
  color: { primary: string; secondary: string; glow: string };
  delay: number;
}

export interface AnalyzedPoem {
  title: string;
  author: string;
  lines: AnalyzedLine[];
}

export const EMOTION_COLOR_MAP: Record<EmotionType, { primary: string; secondary: string; glow: string }> = {
  "悲": { primary: "#4A6FA5", secondary: "#8AAED0", glow: "rgba(74,111,165,0.35)" },
  "喜": { primary: "#C84B31", secondary: "#E8927A", glow: "rgba(200,75,49,0.35)" },
  "思": { primary: "#8B6AA0", secondary: "#BFA0D1", glow: "rgba(139,106,160,0.35)" },
  "寂": { primary: "#6B6B6B", secondary: "#A0A0A0", glow: "rgba(107,107,107,0.35)" },
};

export const EMOTION_KEYWORD_MAP: Record<EmotionType, string[]> = {
  "悲": ["悲", "哀", "愁", "泪", "哭", "伤", "别", "离", "恨", "悼", "凄", "惨", "痛", "惘", "叹", "孤", "独", "凋", "零", "落", "残", "暮", "寒", "凉", "萧", "瑟", "怨", "怅", "凄"],
  "喜": ["喜", "欢", "乐", "笑", "春", "花", "晴", "明", "开", "醉", "歌", "舞", "荣", "盛", "繁", "芳", "暖", "旭", "晓", "畅", "悦", "欣", "庆", "丰", "瑞", "祥", "泰", "和", "融"],
  "思": ["思", "念", "忆", "梦", "望", "期", "盼", "想", "怀", "忆", "寻", "问", "遥", "远", "归", "期", "寄", "传", "书", "信", "鸿", "雁", "月", "星", "影", "灯", "窗"],
  "寂": ["寂", "静", "空", "幽", "清", "闲", "淡", "远", "独", "闲", "深", "暗", "冥", "漠", "茫", "旷", "寥", "虚", "隐", "微", "默", "禅", "悟", "净", "素", "简", "孤", "影"],
};

export const EMOTION_MUSIC_MAP: Record<EmotionType, string> = {
  "悲": "《二泉映月》",
  "喜": "《春江花月夜》",
  "思": "《平沙落雁》",
  "寂": "《梅花三弄》",
};

export const IMAGERY_KEYWORD_MAP: Record<string, string> = {
  "月": "月象", "花": "花卉", "风": "风物", "雨": "雨意", "雪": "雪景",
  "山": "山岳", "水": "水景", "云": "云霞", "树": "草木", "鸟": "飞禽",
  "酒": "酒事", "梦": "梦境", "舟": "舟楫", "琴": "琴韵", "剑": "剑气",
  "霜": "霜华", "露": "露珠", "烟": "烟岚", "柳": "杨柳", "梅": "梅花",
  "竹": "竹影", "兰": "兰幽", "菊": "菊韵", "荷": "荷香", "雁": "雁阵",
  "鹤": "鹤鸣", "龙": "龙腾", "凤": "凤仪", "玉": "玉质", "金": "金辉",
  "夜": "夜色", "昼": "昼光", "秋": "秋意", "春": "春韵", "冬": "冬韵",
  "夏": "夏意", "江": "江流", "河": "河川", "海": "沧海", "湖": "湖光",
  "桥": "桥影", "楼": "楼阁", "亭": "亭台", "寺": "禅寺", "灯": "灯火",
  "星": "星辰", "日": "朝阳", "影": "光影", "泪": "泪痕", "血": "碧血",
  "茶": "茶韵", "书": "书香", "画": "画意", "诗": "诗意", "笛": "笛声",
};

export const PRESET_POEMS: Poem[] = [
  {
    id: "li-bai-jing-ye-si",
    title: "静夜思",
    author: "李白",
    dynasty: "唐",
    lines: ["床前明月光", "疑是地上霜", "举头望明月", "低头思故乡"],
  },
  {
    id: "su-shi-shui-diao-ge-tou",
    title: "水调歌头·明月几时有",
    author: "苏轼",
    dynasty: "宋",
    lines: ["明月几时有", "把酒问青天", "不知天上宫阙", "今夕是何年", "我欲乘风归去", "又恐琼楼玉宇", "高处不胜寒", "起舞弄清影", "何似在人间"],
  },
  {
    id: "li-qing-zhao-sheng-sheng-man",
    title: "声声慢",
    author: "李清照",
    dynasty: "宋",
    lines: ["寻寻觅觅", "冷冷清清", "凄凄惨惨戚戚", "乍暖还寒时候", "最难将息", "三杯两盏淡酒", "怎敌他晚来风急", "雁过也", "正伤心", "却是旧时相识"],
  },
  {
    id: "wang-wei-lu-zhai",
    title: "鹿柴",
    author: "王维",
    dynasty: "唐",
    lines: ["空山不见人", "但闻人语响", "返景入深林", "复照青苔上"],
  },
  {
    id: "du-fu-chun-wang",
    title: "春望",
    author: "杜甫",
    dynasty: "唐",
    lines: ["国破山河在", "城春草木深", "感时花溅泪", "恨别鸟惊心", "烽火连三月", "家书抵万金", "白头搔更短", "浑欲不胜簪"],
  },
  {
    id: "li-bai-jiang-jin-jiu",
    title: "将进酒",
    author: "李白",
    dynasty: "唐",
    lines: ["君不见黄河之水天上来", "奔流到海不复回", "君不见高堂明镜悲白发", "朝如青丝暮成雪", "人生得意须尽欢", "莫使金樽空对月", "天生我材必有用", "千金散尽还复来"],
  },
  {
    id: "zhang-ji-feng-qiao-ye-bo",
    title: "枫桥夜泊",
    author: "张继",
    dynasty: "唐",
    lines: ["月落乌啼霜满天", "江枫渔火对愁眠", "姑苏城外寒山寺", "夜半钟声到客船"],
  },
  {
    id: "xin-qiji-qing-yu-an",
    title: "青玉案·元夕",
    author: "辛弃疾",
    dynasty: "宋",
    lines: ["东风夜放花千树", "更吹落星如雨", "宝马雕车香满路", "凤箫声动", "玉壶光转", "一夜鱼龙舞", "蛾儿雪柳黄金缕", "笑语盈盈暗香去", "众里寻他千百度", "蓦然回首", "那人却在灯火阑珊处"],
  },
];
