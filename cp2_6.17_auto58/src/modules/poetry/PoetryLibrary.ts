export interface Poetry {
  id: string;
  title: string;
  author: string;
  dynasty: '唐' | '宋';
  content: string;
  charCount: number;
}

const POETRY_DATA: Poetry[] = [
  {
    id: '1',
    title: '静夜思',
    author: '李白',
    dynasty: '唐',
    content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
    charCount: 20,
  },
  {
    id: '2',
    title: '春晓',
    author: '孟浩然',
    dynasty: '唐',
    content: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。',
    charCount: 20,
  },
  {
    id: '3',
    title: '登鹳雀楼',
    author: '王之涣',
    dynasty: '唐',
    content: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。',
    charCount: 20,
  },
  {
    id: '4',
    title: '相思',
    author: '王维',
    dynasty: '唐',
    content: '红豆生南国，春来发几枝。愿君多采撷，此物最相思。',
    charCount: 20,
  },
  {
    id: '5',
    title: '江雪',
    author: '柳宗元',
    dynasty: '唐',
    content: '千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。',
    charCount: 20,
  },
  {
    id: '6',
    title: '悯农',
    author: '李绅',
    dynasty: '唐',
    content: '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。',
    charCount: 20,
  },
  {
    id: '7',
    title: '咏鹅',
    author: '骆宾王',
    dynasty: '唐',
    content: '鹅鹅鹅，曲项向天歌。白毛浮绿水，红掌拨清波。',
    charCount: 18,
  },
  {
    id: '8',
    title: '望庐山瀑布',
    author: '李白',
    dynasty: '唐',
    content: '日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。',
    charCount: 28,
  },
  {
    id: '9',
    title: '早发白帝城',
    author: '李白',
    dynasty: '唐',
    content: '朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。',
    charCount: 28,
  },
  {
    id: '10',
    title: '赠汪伦',
    author: '李白',
    dynasty: '唐',
    content: '李白乘舟将欲行，忽闻岸上踏歌声。桃花潭水深千尺，不及汪伦送我情。',
    charCount: 28,
  },
  {
    id: '11',
    title: '黄鹤楼送孟浩然',
    author: '李白',
    dynasty: '唐',
    content: '故人西辞黄鹤楼，烟花三月下扬州。孤帆远影碧空尽，唯见长江天际流。',
    charCount: 28,
  },
  {
    id: '12',
    title: '绝句',
    author: '杜甫',
    dynasty: '唐',
    content: '两个黄鹂鸣翠柳，一行白鹭上青天。窗含西岭千秋雪，门泊东吴万里船。',
    charCount: 28,
  },
  {
    id: '13',
    title: '春夜喜雨',
    author: '杜甫',
    dynasty: '唐',
    content: '好雨知时节，当春乃发生。随风潜入夜，润物细无声。野径云俱黑，江船火独明。晓看红湿处，花重锦官城。',
    charCount: 40,
  },
  {
    id: '14',
    title: '出塞',
    author: '王昌龄',
    dynasty: '唐',
    content: '秦时明月汉时关，万里长征人未还。但使龙城飞将在，不教胡马度阴山。',
    charCount: 28,
  },
  {
    id: '15',
    title: '九月九日忆山东兄弟',
    author: '王维',
    dynasty: '唐',
    content: '独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。',
    charCount: 28,
  },
  {
    id: '16',
    title: '枫桥夜泊',
    author: '张继',
    dynasty: '唐',
    content: '月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。',
    charCount: 28,
  },
  {
    id: '17',
    title: '游子吟',
    author: '孟郊',
    dynasty: '唐',
    content: '慈母手中线，游子身上衣。临行密密缝，意恐迟迟归。谁言寸草心，报得三春晖。',
    charCount: 30,
  },
  {
    id: '18',
    title: '凉州词',
    author: '王翰',
    dynasty: '唐',
    content: '葡萄美酒夜光杯，欲饮琵琶马上催。醉卧沙场君莫笑，古来征战几人回。',
    charCount: 28,
  },
  {
    id: '19',
    title: '回乡偶书',
    author: '贺知章',
    dynasty: '唐',
    content: '少小离家老大回，乡音无改鬓毛衰。儿童相见不相识，笑问客从何处来。',
    charCount: 28,
  },
  {
    id: '20',
    title: '竹里馆',
    author: '王维',
    dynasty: '唐',
    content: '独坐幽篁里，弹琴复长啸。深林人不知，明月来相照。',
    charCount: 20,
  },
  {
    id: '21',
    title: '水调歌头',
    author: '苏轼',
    dynasty: '宋',
    content: '明月几时有？把酒问青天。不知天上宫阙，今夕是何年。我欲乘风归去，又恐琼楼玉宇，高处不胜寒。起舞弄清影，何似在人间。',
    charCount: 54,
  },
  {
    id: '22',
    title: '念奴娇·赤壁怀古',
    author: '苏轼',
    dynasty: '宋',
    content: '大江东去，浪淘尽，千古风流人物。故垒西边，人道是，三国周郎赤壁。乱石穿空，惊涛拍岸，卷起千堆雪。江山如画，一时多少豪杰。',
    charCount: 60,
  },
  {
    id: '23',
    title: '江城子·密州出猎',
    author: '苏轼',
    dynasty: '宋',
    content: '老夫聊发少年狂，左牵黄，右擎苍，锦帽貂裘，千骑卷平冈。为报倾城随太守，亲射虎，看孙郎。',
    charCount: 42,
  },
  {
    id: '24',
    title: '浣溪沙',
    author: '苏轼',
    dynasty: '宋',
    content: '山下兰芽短浸溪，松间沙路净无泥，潇潇暮雨子规啼。谁道人生无再少？门前流水尚能西！休将白发唱黄鸡。',
    charCount: 42,
  },
  {
    id: '25',
    title: '题西林壁',
    author: '苏轼',
    dynasty: '宋',
    content: '横看成岭侧成峰，远近高低各不同。不识庐山真面目，只缘身在此山中。',
    charCount: 28,
  },
  {
    id: '26',
    title: '如梦令',
    author: '李清照',
    dynasty: '宋',
    content: '常记溪亭日暮，沉醉不知归路。兴尽晚回舟，误入藕花深处。争渡，争渡，惊起一滩鸥鹭。',
    charCount: 33,
  },
  {
    id: '27',
    title: '声声慢',
    author: '李清照',
    dynasty: '宋',
    content: '寻寻觅觅，冷冷清清，凄凄惨惨戚戚。乍暖还寒时候，最难将息。三杯两盏淡酒，怎敌他、晚来风急？',
    charCount: 48,
  },
  {
    id: '28',
    title: '醉花阴',
    author: '李清照',
    dynasty: '宋',
    content: '薄雾浓云愁永昼，瑞脑消金兽。佳节又重阳，玉枕纱橱，半夜凉初透。东篱把酒黄昏后，有暗香盈袖。莫道不消魂，帘卷西风，人比黄花瘦。',
    charCount: 52,
  },
  {
    id: '29',
    title: '一剪梅',
    author: '李清照',
    dynasty: '宋',
    content: '红藕香残玉簟秋，轻解罗裳，独上兰舟。云中谁寄锦书来？雁字回时，月满西楼。花自飘零水自流，一种相思，两处闲愁。',
    charCount: 48,
  },
  {
    id: '30',
    title: '武陵春',
    author: '李清照',
    dynasty: '宋',
    content: '风住尘香花已尽，日晚倦梳头。物是人非事事休，欲语泪先流。闻说双溪春尚好，也拟泛轻舟。只恐双溪舴艋舟，载不动许多愁。',
    charCount: 48,
  },
  {
    id: '31',
    title: '满江红',
    author: '岳飞',
    dynasty: '宋',
    content: '怒发冲冠，凭栏处、潇潇雨歇。抬望眼、仰天长啸，壮怀激烈。三十功名尘与土，八千里路云和月。莫等闲、白了少年头，空悲切。',
    charCount: 51,
  },
  {
    id: '32',
    title: '小重山',
    author: '岳飞',
    dynasty: '宋',
    content: '昨夜寒蛩不住鸣。惊回千里梦，已三更。起来独自绕阶行。人悄悄，帘外月胧明。白首为功名。旧山松竹老，阻归程。欲将心事付瑶琴。知音少，弦断有谁听。',
    charCount: 58,
  },
  {
    id: '33',
    title: '破阵子',
    author: '辛弃疾',
    dynasty: '宋',
    content: '醉里挑灯看剑，梦回吹角连营。八百里分麾下炙，五十弦翻塞外声，沙场秋点兵。马作的卢飞快，弓如霹雳弦惊。了却君王天下事，赢得生前身后名。可怜白发生！',
    charCount: 60,
  },
  {
    id: '34',
    title: '青玉案·元夕',
    author: '辛弃疾',
    dynasty: '宋',
    content: '东风夜放花千树，更吹落、星如雨。宝马雕车香满路。凤箫声动，玉壶光转，一夜鱼龙舞。蛾儿雪柳黄金缕，笑语盈盈暗香去。众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。',
    charCount: 68,
  },
  {
    id: '35',
    title: '永遇乐·京口北固亭怀古',
    author: '辛弃疾',
    dynasty: '宋',
    content: '千古江山，英雄无觅孙仲谋处。舞榭歌台，风流总被雨打风吹去。斜阳草树，寻常巷陌，人道寄奴曾住。想当年，金戈铁马，气吞万里如虎。',
    charCount: 60,
  },
  {
    id: '36',
    title: '西江月·夜行黄沙道中',
    author: '辛弃疾',
    dynasty: '宋',
    content: '明月别枝惊鹊，清风半夜鸣蝉。稻花香里说丰年，听取蛙声一片。七八个星天外，两三点雨山前。旧时茅店社林边，路转溪桥忽见。',
    charCount: 50,
  },
  {
    id: '37',
    title: '雨霖铃',
    author: '柳永',
    dynasty: '宋',
    content: '寒蝉凄切，对长亭晚，骤雨初歇。都门帐饮无绪，留恋处，兰舟催发。执手相看泪眼，竟无语凝噎。念去去，千里烟波，暮霭沉沉楚天阔。',
    charCount: 55,
  },
  {
    id: '38',
    title: '蝶恋花',
    author: '柳永',
    dynasty: '宋',
    content: '伫倚危楼风细细，望极春愁，黯黯生天际。草色烟光残照里，无言谁会凭阑意。拟把疏狂图一醉，对酒当歌，强乐还无味。衣带渐宽终不悔，为伊消得人憔悴。',
    charCount: 62,
  },
  {
    id: '39',
    title: '望海潮',
    author: '柳永',
    dynasty: '宋',
    content: '东南形胜，三吴都会，钱塘自古繁华。烟柳画桥，风帘翠幕，参差十万人家。云树绕堤沙，怒涛卷霜雪，天堑无涯。',
    charCount: 50,
  },
  {
    id: '40',
    title: '鹊桥仙',
    author: '秦观',
    dynasty: '宋',
    content: '纤云弄巧，飞星传恨，银汉迢迢暗度。金风玉露一相逢，便胜却人间无数。柔情似水，佳期如梦，忍顾鹊桥归路。两情若是久长时，又岂在朝朝暮暮。',
    charCount: 56,
  },
  {
    id: '41',
    title: '浣溪沙',
    author: '晏殊',
    dynasty: '宋',
    content: '一曲新词酒一杯，去年天气旧亭台。夕阳西下几时回？无可奈何花落去，似曾相识燕归来。小园香径独徘徊。',
    charCount: 42,
  },
  {
    id: '42',
    title: '蝶恋花',
    author: '晏殊',
    dynasty: '宋',
    content: '槛菊愁烟兰泣露，罗幕轻寒，燕子双飞去。明月不谙离恨苦，斜光到晓穿朱户。昨夜西风凋碧树，独上高楼，望尽天涯路。欲寄彩笺兼尺素，山长水阔知何处。',
    charCount: 62,
  },
  {
    id: '43',
    title: '玉楼春',
    author: '宋祁',
    dynasty: '宋',
    content: '东城渐觉风光好，縠皱波纹迎客棹。绿杨烟外晓寒轻，红杏枝头春意闹。浮生长恨欢娱少，肯爱千金轻一笑。为君持酒劝斜阳，且向花间留晚照。',
    charCount: 56,
  },
  {
    id: '44',
    title: '苏幕遮',
    author: '范仲淹',
    dynasty: '宋',
    content: '碧云天，黄叶地，秋色连波，波上寒烟翠。山映斜阳天接水，芳草无情，更在斜阳外。黯乡魂，追旅思，夜夜除非，好梦留人睡。明月楼高休独倚，酒入愁肠，化作相思泪。',
    charCount: 62,
  },
  {
    id: '45',
    title: '渔家傲·秋思',
    author: '范仲淹',
    dynasty: '宋',
    content: '塞下秋来风景异，衡阳雁去无留意。四面边声连角起，千嶂里，长烟落日孤城闭。浊酒一杯家万里，燕然未勒归无计。羌管悠悠霜满地，人不寐，将军白发征夫泪。',
    charCount: 62,
  },
  {
    id: '46',
    title: '卜算子·咏梅',
    author: '陆游',
    dynasty: '宋',
    content: '驿外断桥边，寂寞开无主。已是黄昏独自愁，更著风和雨。无意苦争春，一任群芳妒。零落成泥碾作尘，只有香如故。',
    charCount: 44,
  },
  {
    id: '47',
    title: '钗头凤',
    author: '陆游',
    dynasty: '宋',
    content: '红酥手，黄縢酒，满城春色宫墙柳。东风恶，欢情薄。一怀愁绪，几年离索。错、错、错。春如旧，人空瘦，泪痕红浥鲛绡透。桃花落，闲池阁。山盟虽在，锦书难托。莫、莫、莫！',
    charCount: 60,
  },
  {
    id: '48',
    title: '游山西村',
    author: '陆游',
    dynasty: '宋',
    content: '莫笑农家腊酒浑，丰年留客足鸡豚。山重水复疑无路，柳暗花明又一村。箫鼓追随春社近，衣冠简朴古风存。从今若许闲乘月，拄杖无时夜叩门。',
    charCount: 56,
  },
  {
    id: '49',
    title: '临江仙',
    author: '杨慎',
    dynasty: '宋',
    content: '滚滚长江东逝水，浪花淘尽英雄。是非成败转头空。青山依旧在，几度夕阳红。白发渔樵江渚上，惯看秋月春风。一壶浊酒喜相逢。古今多少事，都付笑谈中。',
    charCount: 60,
  },
  {
    id: '50',
    title: '春宵',
    author: '苏轼',
    dynasty: '宋',
    content: '春宵一刻值千金，花有清香月有阴。歌管楼台声细细，秋千院落夜沉沉。',
    charCount: 28,
  },
];

export class PoetryLibrary {
  private poems: Poetry[];

  constructor() {
    this.poems = POETRY_DATA;
  }

  public getAll(): Poetry[] {
    return [...this.poems];
  }

  public getById(id: string): Poetry | undefined {
    return this.poems.find(p => p.id === id);
  }

  public filterByDynasty(dynasty: '唐' | '宋' | '全部'): Poetry[] {
    if (dynasty === '全部') return [...this.poems];
    return this.poems.filter(p => p.dynasty === dynasty);
  }

  public filterByAuthor(author: string): Poetry[] {
    if (!author || author === '全部') return [...this.poems];
    return this.poems.filter(p => p.author === author);
  }

  public filterByCharCount(min: number, max: number): Poetry[] {
    return this.poems.filter(p => p.charCount >= min && p.charCount <= max);
  }

  public search(keyword: string): Poetry[] {
    const lower = keyword.toLowerCase();
    return this.poems.filter(p =>
      p.title.toLowerCase().includes(lower) ||
      p.author.toLowerCase().includes(lower) ||
      p.content.includes(keyword)
    );
  }

  public getAuthors(dynasty?: '唐' | '宋'): string[] {
    let poems = this.poems;
    if (dynasty) {
      poems = poems.filter(p => p.dynasty === dynasty);
    }
    return [...new Set(poems.map(p => p.author))].sort();
  }

  public getDynasties(): ('唐' | '宋')[] {
    return ['唐', '宋'];
  }
}

export const poetryLibrary = new PoetryLibrary();
