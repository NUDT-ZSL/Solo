export type ImageryCategory = '天象' | '地理' | '植物' | '时令';

export type EmotionType = '离别' | '思念' | '归乡' | '隐逸';

export type PoemType = 'five' | 'seven';

export interface CharEntry {
  pinyin: string;
  meaning: string;
}

const imageryLibrary: Record<ImageryCategory, string[]> = {
  天象: ['月', '星', '云', '雨', '风', '雪', '霞', '露'],
  地理: ['山', '水', '江', '湖', '溪', '崖', '谷', '桥'],
  植物: ['花', '柳', '松', '竹', '梅', '菊', '兰', '荷'],
  时令: ['春', '秋', '冬', '暮', '晓', '夕', '晨', '夜'],
};

const wordCategoryMap: Record<string, ImageryCategory> = {};
for (const [cat, words] of Object.entries(imageryLibrary)) {
  for (const w of words) {
    wordCategoryMap[w] = cat as ImageryCategory;
  }
}

export function getImageryCategory(word: string): ImageryCategory | undefined {
  return wordCategoryMap[word];
}

export function getAllImageryWords(): string[] {
  return Object.values(imageryLibrary).flat();
}

export function getImageryByCategory(): Record<ImageryCategory, string[]> {
  return { ...imageryLibrary };
}

const charDictionary: Record<string, CharEntry> = {
  月: { pinyin: 'yuè', meaning: '月亮。诗中常象征思念、团圆与孤独' },
  星: { pinyin: 'xīng', meaning: '星辰。常喻永恒与渺远' },
  云: { pinyin: 'yún', meaning: '云彩。象征飘忽、闲逸与超脱' },
  雨: { pinyin: 'yǔ', meaning: '雨水。常寄托愁绪与离思' },
  风: { pinyin: 'fēng', meaning: '风。可喻变故、消息或自在' },
  雪: { pinyin: 'xuě', meaning: '白雪。象征高洁、寒冷与孤寂' },
  霞: { pinyin: 'xiá', meaning: '彩霞。常写壮美与短暂之景' },
  露: { pinyin: 'lù', meaning: '露水。喻短暂与哀愁' },
  山: { pinyin: 'shān', meaning: '山岳。象征崇高、隐逸与永恒' },
  水: { pinyin: 'shuǐ', meaning: '流水。常写时光与离愁' },
  江: { pinyin: 'jiāng', meaning: '江河。象征辽远与别离' },
  湖: { pinyin: 'hú', meaning: '湖泊。喻宁静与归隐' },
  溪: { pinyin: 'xī', meaning: '溪流。常写幽静与清逸' },
  崖: { pinyin: 'yá', meaning: '山崖。象征险峻与孤高' },
  谷: { pinyin: 'gǔ', meaning: '山谷。喻深远与幽僻' },
  桥: { pinyin: 'qiáo', meaning: '桥梁。常写离别与相逢' },
  花: { pinyin: 'huā', meaning: '花朵。象征美好、短暂与易逝' },
  柳: { pinyin: 'liǔ', meaning: '柳树。折柳赠别，象征离别' },
  松: { pinyin: 'sōng', meaning: '松树。象征坚贞与高洁' },
  竹: { pinyin: 'zhú', meaning: '竹子。喻气节与虚心' },
  梅: { pinyin: 'méi', meaning: '梅花。象征傲骨与早春' },
  菊: { pinyin: 'jú', meaning: '菊花。喻隐逸与晚节' },
  兰: { pinyin: 'lán', meaning: '兰花。象征高洁与淡泊' },
  荷: { pinyin: 'hé', meaning: '荷花。喻清雅与出尘' },
  春: { pinyin: 'chūn', meaning: '春天。象征生机与希望' },
  秋: { pinyin: 'qiū', meaning: '秋天。常寄托萧瑟与思念' },
  冬: { pinyin: 'dōng', meaning: '冬天。象征肃杀与坚忍' },
  暮: { pinyin: 'mù', meaning: '日暮。喻时光将尽与归思' },
  晓: { pinyin: 'xiǎo', meaning: '拂晓。象征希望与新生' },
  夕: { pinyin: 'xī', meaning: '傍晚。常写落日与怀远' },
  晨: { pinyin: 'chén', meaning: '清晨。喻清新与初醒' },
  夜: { pinyin: 'yè', meaning: '夜晚。象征静谧与深沉' },
  明: { pinyin: 'míng', meaning: '明亮。常写月光、灯火之明' },
  落: { pinyin: 'luò', meaning: '落下。常写花落、月落，喻衰谢' },
  飞: { pinyin: 'fēi', meaning: '飞舞。写花飞雪舞之态' },
  寒: { pinyin: 'hán', meaning: '寒冷。喻凄凉与孤寂' },
  残: { pinyin: 'cán', meaning: '残缺。喻凋零与衰败' },
  远: { pinyin: 'yuǎn', meaning: '遥远。常写离人与归路' },
  深: { pinyin: 'shēn', meaning: '深邃。喻幽远与深切' },
  清: { pinyin: 'qīng', meaning: '清澄。象征高洁与澄明' },
  空: { pinyin: 'kōng', meaning: '空寂。喻虚无与禅意' },
  长: { pinyin: 'cháng', meaning: '长远。常写江水、思念之长' },
  归: { pinyin: 'guī', meaning: '归来。常写归乡与归隐' },
  送: { pinyin: 'sòng', meaning: '送别。折柳送行之义' },
  愁: { pinyin: 'chóu', meaning: '忧愁。诗中常见情感' },
  梦: { pinyin: 'mèng', meaning: '梦境。常写虚幻与思念' },
  泪: { pinyin: 'lèi', meaning: '泪水。喻悲伤与深情' },
  人: { pinyin: 'rén', meaning: '人。诗中常指故人或远行者' },
  客: { pinyin: 'kè', meaning: '旅客。常写漂泊与思乡' },
  独: { pinyin: 'dú', meaning: '独自。喻孤独与清高' },
  自: { pinyin: 'zì', meaning: '自然。喻自在与无为' },
  不: { pinyin: 'bù', meaning: '否定词。常写"不见""不知"等' },
  何: { pinyin: 'hé', meaning: '何处。常写疑问与寻觅' },
  无: { pinyin: 'wú', meaning: '没有。常写空无与禅境' },
  已: { pinyin: 'yǐ', meaning: '已经。常写时光之逝' },
  未: { pinyin: 'wèi', meaning: '未曾。常写"未干""未还"等' },
  照: { pinyin: 'zhào', meaning: '照耀。常写月光、日光普照' },
  畔: { pinyin: 'pàn', meaning: '水畔。常写临水之景' },
  庭: { pinyin: 'tíng', meaning: '庭院。常写家居与幽静' },
  衣: { pinyin: 'yī', meaning: '衣裳。常写泪沾衣之态' },
  舟: { pinyin: 'zhōu', meaning: '舟船。常写水上之行与漂泊' },
  枝: { pinyin: 'zhī', meaning: '枝条。常写花枝与春色' },
  楼: { pinyin: 'lóu', meaning: '楼阁。常写登高与望远' },
  窗: { pinyin: 'chuāng', meaning: '窗户。常写月入窗、风入窗之景' },
  茶: { pinyin: 'chá', meaning: '茶。象征清雅与闲适' },
  纱: { pinyin: 'shā', meaning: '纱帘。常写朦胧之景' },
  红: { pinyin: 'hóng', meaning: '红色。常写花色与暮色' },
  香: { pinyin: 'xiāng', meaning: '香气。常写花香与幽韵' },
  处: { pinyin: 'chù', meaning: '处所。常写"何处""无处"等' },
  干: { pinyin: 'gān', meaning: '干燥。常写"泪未干"等' },
  悠: { pinyin: 'yōu', meaning: '悠远。常写江水悠悠' },
  柔: { pinyin: 'róu', meaning: '柔和。常写春风之柔' },
  芳: { pinyin: 'fāng', meaning: '芬芳。常写花草之香' },
  幽: { pinyin: 'yōu', meaning: '幽深。象征清幽与隐逸' },
  疏: { pinyin: 'shū', meaning: '稀疏。常写竹影疏淡' },
  静: { pinyin: 'jìng', meaning: '安静。常写山水之静' },
  汀: { pinyin: 'tīng', meaning: '水边平地。常写"汀洲"之景' },
  洲: { pinyin: 'zhōu', meaning: '水中陆地。常写"汀洲"之景' },
  初: { pinyin: 'chū', meaning: '当初。常写追忆之思' },
  如: { pinyin: 'rú', meaning: '如同。常写"自如""不如"等' },
  行: { pinyin: 'xíng', meaning: '行走。常写自在行走之态' },
  家: { pinyin: 'jiā', meaning: '家。象征归属与安宁' },
  流: { pinyin: 'liú', meaning: '流水。常写时光与离愁' },
  满: { pinyin: 'mǎn', meaning: '充满。常写花满、风满之景' },
  急: { pinyin: 'jí', meaning: '急切。常写归心之急' },
  好: { pinyin: 'hǎo', meaning: '美好。常写"春好""秋好"等' },
  通: { pinyin: 'tōng', meaning: '通达。常写路途通达' },
  求: { pinyin: 'qiú', meaning: '追求。常写"不待人求"之态' },
  游: { pinyin: 'yóu', meaning: '游历。常写自在游赏' },
  迟: { pinyin: ' chí', meaning: '迟缓。常写"归迟"之态' },
  微: { pinyin: 'wēi', meaning: '微弱。常写月色微、灯火微' },
  定: { pinyin: 'dìng', meaning: '安定。常写禅心之定' },
  繁: { pinyin: 'fán', meaning: '繁盛。常写花木之盛' },
  颜: { pinyin: 'yán', meaning: '容颜。常写思人之颜' },
  近: { pinyin: 'jìn', meaning: '接近。常写归路之近' },
  望: { pinyin: 'wàng', meaning: '远望。常写登高望远' },
  停: { pinyin: 'tíng', meaning: '停步。常写不舍之态' },
  还: { pinyin: 'huán', meaning: '归还。常写归乡与归隐' },
  映: { pinyin: 'yìng', meaning: '映照。常写水中倒影' },
  清: { pinyin: 'qīng', meaning: '清澄。常写水清、月清' },
  绝: { pinyin: 'jué', meaning: '断绝。常写"人迹绝"之境' },
  偏: { pinyin: 'piān', meaning: '偏僻。常写山水之幽僻' },
  新: { pinyin: 'xīn', meaning: '新。常写"新月""新春"等' },
  浅: { pinyin: 'qiǎn', meaning: '浅淡。常写"浅酌""浅笑"等' },
};

export function getCharEntry(char: string): CharEntry | undefined {
  return charDictionary[char];
}

type SlotMap = Record<string, string[]>;

interface PoemTemplateDef {
  lines: [string, string, string, string];
  slots: SlotMap;
}

const fiveCharTemplates: Record<EmotionType, PoemTemplateDef[]> = {
  离别: [
    {
      lines: ['{a}明{b}水远', '{c}风{d}已残', '{a}落人何处', '{d}飞泪未干'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '溪', '湖'], c: ['秋', '暮', '夜', '晨'], d: ['花', '柳', '梅', '菊'] },
    },
    {
      lines: ['{c}{b}送客去', '{a}{b}两茫茫', '{a}明人不返', '{d}落断肠回'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '溪', '湖'], c: ['春', '秋', '暮', '晓'], d: ['花', '柳', '梅', '荷'] },
    },
    {
      lines: ['{a}落{b}无语', '{c}风{d}自飞', '{a}明谁共赏', '{d}残独忆归'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '水', '溪', '谷'], c: ['秋', '暮', '夜', '夕'], d: ['花', '柳', '竹', '兰'] },
    },
    {
      lines: ['{c}{b}人去远', '{a}{d}影渐微', '{a}明千{b}外', '{d}残独未归'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '水', '江', '湖'], c: ['春', '秋', '暮', '冬'], d: ['花', '柳', '松', '竹'] },
    },
  ],
  思念: [
    {
      lines: ['{a}明{b}水静', '{d}开{c}风柔', '{a}落思君远', '{d}香入梦留'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '江', '湖', '溪'], c: ['春', '秋', '晨', '晓'], d: ['花', '梅', '兰', '荷'] },
    },
    {
      lines: ['{a}照{b}长夜', '{c}风{d}正繁', '{a}明千里外', '{d}落忆君颜'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '水', '江', '湖'], c: ['春', '秋', '暮', '夜'], d: ['花', '柳', '梅', '菊'] },
    },
    {
      lines: ['{c}{b}思故人', '{a}明{d}影深', '{a}落愁无尽', '{d}开念更深'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '水', '江', '谷'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '兰', '竹'] },
    },
    {
      lines: ['{a}明{b}水映', '{c}风{d}满衣', '{a}落人何处', '{d}香入梦归'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '江', '溪', '湖'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '兰', '荷'] },
    },
  ],
  归乡: [
    {
      lines: ['{a}明{b}路远', '{c}风{d}正芳', '{a}落归心切', '{d}开是故乡'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '水', '江', '溪'], c: ['春', '秋', '晨', '晓'], d: ['花', '梅', '兰', '菊'] },
    },
    {
      lines: ['{c}{b}归路近', '{a}{d}映溪清', '{a}明人已望', '{d}落步难停'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '水', '江', '谷'], c: ['春', '秋', '暮', '晓'], d: ['花', '柳', '梅', '竹'] },
    },
    {
      lines: ['{a}照{b}流水', '{c}风{d}满山', '{a}落乡关望', '{d}开客梦还'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '水', '江', '溪'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '菊', '兰'] },
    },
    {
      lines: ['{c}{b}云深处', '{a}明{d}影疏', '{a}落乡心切', '{d}香满旧居'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '水', '谷', '溪'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '兰', '竹'] },
    },
  ],
  隐逸: [
    {
      lines: ['{a}明{b}水静', '{d}开{c}风清', '{a}落无人径', '{d}香自在行'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '水', '溪', '谷'], c: ['春', '秋', '晨', '夜'], d: ['花', '梅', '兰', '菊'] },
    },
    {
      lines: ['{c}{b}云深处', '{a}明{d}影疏', '{a}落禅心定', '{d}开道自如'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '谷', '溪', '崖'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '竹', '兰'] },
    },
    {
      lines: ['{a}照{b}林下', '{c}风{d}自香', '{a}明人不见', '{d}落满衣裳'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '水', '溪', '谷'], c: ['春', '秋', '晨', '夜'], d: ['花', '梅', '兰', '荷'] },
    },
    {
      lines: ['{c}{b}偏居处', '{a}明{d}影长', '{a}落无人到', '{d}香自在香'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '谷', '崖', '溪'], c: ['春', '秋', '暮', '冬'], d: ['花', '梅', '兰', '竹'] },
    },
  ],
};

const sevenCharTemplates: Record<EmotionType, PoemTemplateDef[]> = {
  离别: [
    {
      lines: ['{a}明{b}畔送君去', '{c}风吹{d}落空庭', '{a}落{b}长人不见', '{d}残{a}冷泪沾衣'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '溪', '湖'], c: ['秋', '暮', '夜', '晨'], d: ['花', '柳', '梅', '菊'] },
    },
    {
      lines: ['{c}{b}{a}下送行舟', '{a}明{b}远水悠悠', '{d}落{c}风人去后', '{a}明{b}水两悠悠'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '溪', '湖'], c: ['春', '秋', '暮', '晓'], d: ['花', '柳', '梅', '荷'] },
    },
    {
      lines: ['{a}明{b}水映离愁', '{c}风{d}落满汀洲', '{a}落{b}长归路远', '{d}残{a}冷夜行舟'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '江', '溪', '湖'], c: ['秋', '暮', '夜', '夕'], d: ['花', '柳', '竹', '兰'] },
    },
    {
      lines: ['{c}{b}{a}下别君时', '{a}明{b}水映{d}枝', '{a}落{b}长人去远', '{d}残{c}暮又相思'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '湖', '溪'], c: ['春', '秋', '暮', '晓'], d: ['花', '柳', '梅', '竹'] },
    },
  ],
  思念: [
    {
      lines: ['{a}明{b}水照人归', '{c}风{d}开正满枝', '{a}落{b}长思不绝', '{d}香{a}下梦中时'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '江', '湖', '溪'], c: ['春', '秋', '晨', '晓'], d: ['花', '梅', '兰', '荷'] },
    },
    {
      lines: ['{c}{b}{a}下忆君颜', '{a}明{b}水映{d}间', '{a}落{b}长人去远', '{d}开{c}风又一年'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '湖', '溪'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '兰', '竹'] },
    },
    {
      lines: ['{a}照{b}流水映{d}', '{c}风{a}下忆当初', '{a}明{b}远人何处', '{d}落{c}风信不如'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '湖', '溪'], c: ['春', '秋', '暮', '夜'], d: ['花', '柳', '梅', '兰'] },
    },
    {
      lines: ['{c}{b}{a}明忆旧游', '{d}开{a}下思悠悠', '{a}落{b}长人去远', '{d}香{c}暮入层楼'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '湖', '溪'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '兰', '荷'] },
    },
  ],
  归乡: [
    {
      lines: ['{a}明{b}路远山长', '{c}风{d}开是故乡', '{a}落{b}头人已望', '{d}香{a}下客归乡'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '溪', '湖'], c: ['春', '秋', '晨', '晓'], d: ['花', '梅', '兰', '菊'] },
    },
    {
      lines: ['{c}{b}归路{a}明中', '{a}明{b}水映{d}红', '{a}落{b}长归步急', '{d}开{c}风满路通'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '湖', '溪'], c: ['春', '秋', '暮', '晓'], d: ['花', '柳', '梅', '竹'] },
    },
    {
      lines: ['{a}照{b}流水向家流', '{c}风{d}香满旧时楼', '{a}落{b}长人渐近', '{d}开{c}好正归舟'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '江', '湖', '溪'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '兰', '荷'] },
    },
    {
      lines: ['{c}{b}云深{a}影微', '{a}明{b}水映{d}枝', '{a}落{b}长乡路近', '{d}开{c}好待归时'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '江', '湖', '溪'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '兰', '竹'] },
    },
  ],
  隐逸: [
    {
      lines: ['{a}明{b}水自清幽', '{c}风{d}开不待人求', '{a}落{b}深无客到', '{d}香{a}下自由游'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '溪', '谷', '崖'], c: ['春', '秋', '晨', '夜'], d: ['花', '梅', '兰', '菊'] },
    },
    {
      lines: ['{c}{b}云深{a}影微', '{a}明{b}水映{d}枝', '{a}落{b}长人迹绝', '{d}开{c}好自归迟'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '谷', '溪', '崖'], c: ['春', '秋', '暮', '夜'], d: ['花', '梅', '竹', '兰'] },
    },
    {
      lines: ['{a}照{b}林下自煎茶', '{c}风{d}影入窗纱', '{a}明{b}远无人到', '{d}落{c}深自在家'],
      slots: { a: ['月', '星', '云', '霞'], b: ['山', '溪', '谷', '崖'], c: ['春', '秋', '晨', '夜'], d: ['花', '梅', '兰', '竹'] },
    },
    {
      lines: ['{c}{b}深处有人家', '{a}明{d}影映窗纱', '{a}落{b}长人不见', '{d}香{c}好自在家'],
      slots: { a: ['月', '星', '云', '露'], b: ['山', '谷', '崖', '溪'], c: ['春', '秋', '暮', '冬'], d: ['花', '梅', '兰', '竹'] },
    },
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resolveSlots(
  template: PoemTemplateDef,
  selectedImagery: string[]
): Record<string, string> {
  const resolved: Record<string, string> = {};
  const usedWords = new Set<string>();

  const selectedByCategory: Record<string, string[]> = {};
  for (const word of selectedImagery) {
    const cat = wordCategoryMap[word];
    if (cat) {
      if (!selectedByCategory[cat]) selectedByCategory[cat] = [];
      selectedByCategory[cat].push(word);
    }
  }

  for (const [slotKey, defaults] of Object.entries(template.slots)) {
    let chosen = '';

    for (const defaultWord of defaults) {
      if (selectedImagery.includes(defaultWord) && !usedWords.has(defaultWord)) {
        chosen = defaultWord;
        usedWords.add(defaultWord);
        break;
      }
    }

    if (!chosen) {
      const catOfFirst = wordCategoryMap[defaults[0]];
      if (catOfFirst && selectedByCategory[catOfFirst]) {
        const available = selectedByCategory[catOfFirst].filter(w => !usedWords.has(w));
        if (available.length > 0) {
          chosen = available[0];
          usedWords.add(chosen);
        }
      }
    }

    if (!chosen) {
      chosen = pickRandom(defaults);
    }

    resolved[slotKey] = chosen;
  }

  return resolved;
}

function fillTemplate(
  lines: [string, string, string, string],
  resolved: Record<string, string>
): string[] {
  return lines.map(line => {
    let result = line;
    for (const [key, value] of Object.entries(resolved)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  });
}

export function generatePoem(
  selectedImagery: string[],
  emotion: EmotionType,
  poemType: PoemType
): string[] {
  const templates = poemType === 'five' ? fiveCharTemplates[emotion] : sevenCharTemplates[emotion];
  const template = pickRandom(templates);
  const resolved = resolveSlots(template, selectedImagery);
  return fillTemplate(template.lines, resolved);
}
