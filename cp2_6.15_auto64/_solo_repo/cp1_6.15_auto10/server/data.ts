import { v4 as uuidv4 } from 'uuid'

export interface Movie {
  id: string
  title: string
  year: number
  poster: string
  synopsis: string
  cast: string[]
  director: string
  genre: string[]
  duration: number
}

export interface ScoreRecord {
  id: string
  movieId: string
  score: number
  timestamp: number
}

export const initialMovies: Movie[] = [
  {
    id: uuidv4(),
    title: '肖申克的救赎',
    year: 1994,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=shawshank%20redemption%20movie%20poster%20prison%20dramatic&image_size=portrait_4_3',
    synopsis: '银行家安迪因被诬陷谋杀妻子及其情人而入狱，在肖申克监狱中，他结识了瑞德，并用智慧和勇气诠释了希望的力量。',
    cast: ['蒂姆·罗宾斯', '摩根·弗里曼', '鲍勃·冈顿'],
    director: '弗兰克·德拉邦特',
    genre: ['剧情', '犯罪'],
    duration: 142
  },
  {
    id: uuidv4(),
    title: '阿甘正传',
    year: 1994,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=forrest%20gump%20movie%20poster%20bench%20feather&image_size=portrait_4_3',
    synopsis: '智商只有75的阿甘，用他简单纯粹的方式经历了美国数十年的重大历史事件，也收获了真挚的爱情。',
    cast: ['汤姆·汉克斯', '罗宾·怀特', '加里·西尼斯'],
    director: '罗伯特·泽米吉斯',
    genre: ['剧情', '爱情'],
    duration: 142
  },
  {
    id: uuidv4(),
    title: '霸王别姬',
    year: 1993,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=farewell%20my%20concubine%20chinese%20opera%20movie%20poster&image_size=portrait_4_3',
    synopsis: '段小楼与程蝶衣是一对京剧搭档，两人半个世纪的悲欢离合，折射出中国近代历史的沧桑巨变。',
    cast: ['张国荣', '张丰毅', '巩俐'],
    director: '陈凯歌',
    genre: ['剧情', '爱情', '同性'],
    duration: 171
  },
  {
    id: uuidv4(),
    title: '泰坦尼克号',
    year: 1997,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=titanic%20movie%20poster%20ship%20ocean%20romantic&image_size=portrait_4_3',
    synopsis: '1912年，豪华邮轮泰坦尼克号首航撞上冰山沉没，穷画家杰克与贵族少女露丝在灾难中谱写了不朽的爱情篇章。',
    cast: ['莱昂纳多·迪卡普里奥', '凯特·温斯莱特', '比利·赞恩'],
    director: '詹姆斯·卡梅隆',
    genre: ['剧情', '爱情', '灾难'],
    duration: 194
  },
  {
    id: uuidv4(),
    title: '盗梦空间',
    year: 2010,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=inception%20movie%20poster%20folding%20city%20surreal&image_size=portrait_4_3',
    synopsis: '道姆·柯布是一名经验老道的盗贼，擅长在人们梦境中盗取机密。他接受了一项几乎不可能完成的任务——植入意念。',
    cast: ['莱昂纳多·迪卡普里奥', '约瑟夫·高登-莱维特', '艾伦·佩吉'],
    director: '克里斯托弗·诺兰',
    genre: ['剧情', '科幻', '悬疑'],
    duration: 148
  },
  {
    id: uuidv4(),
    title: '千与千寻',
    year: 2001,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spirited%20away%20anime%20movie%20poster%20bathhouse%20fantasy&image_size=portrait_4_3',
    synopsis: '10岁的千寻意外闯入神灵世界，为了拯救变成猪的父母，她必须在汤婆婆的澡堂里工作，学会独立与勇敢。',
    cast: ['柊瑠美', '入野自由', '夏木真理'],
    director: '宫崎骏',
    genre: ['动画', '奇幻', '冒险'],
    duration: 125
  },
  {
    id: uuidv4(),
    title: '星际穿越',
    year: 2014,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=interstellar%20movie%20poster%20black%20hole%20space&image_size=portrait_4_3',
    synopsis: '在地球即将毁灭的未来，一群探险家穿越虫洞寻找人类新家园，爱与时间成为最强大的武器。',
    cast: ['马修·麦康纳', '安妮·海瑟薇', '杰西卡·查斯坦'],
    director: '克里斯托弗·诺兰',
    genre: ['剧情', '科幻', '冒险'],
    duration: 169
  },
  {
    id: uuidv4(),
    title: '教父',
    year: 1972,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=the%20godfather%20movie%20poster%20mafia%20dark%20classic&image_size=portrait_4_3',
    synopsis: '柯里昂家族是美国最有权势的黑手党家族，老教父维托去世后，小儿子迈克尔接掌家族，开启了一个新的时代。',
    cast: ['马龙·白兰度', '阿尔·帕西诺', '詹姆斯·凯恩'],
    director: '弗朗西斯·福特·科波拉',
    genre: ['剧情', '犯罪'],
    duration: 175
  },
  {
    id: uuidv4(),
    title: '当幸福来敲门',
    year: 2006,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pursuit%20of%20happyness%20movie%20poster%20father%20son&image_size=portrait_4_3',
    synopsis: '克里斯·加德纳是一个落魄的推销员，妻子离他而去，他带着儿子无家可归，却从未放弃追逐幸福的梦想。',
    cast: ['威尔·史密斯', '贾登·史密斯', '坦迪·牛顿'],
    director: '加布里尔·穆奇诺',
    genre: ['剧情', '传记'],
    duration: 117
  },
  {
    id: uuidv4(),
    title: '哈尔的移动城堡',
    year: 2004,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=howls%20moving%20castle%20anime%20movie%20poster%20steampunk&image_size=portrait_4_3',
    synopsis: '少女苏菲被女巫诅咒变成老婆婆，她逃进了魔法师哈尔的移动城堡，在那里展开了一段奇妙的冒险。',
    cast: ['倍赏千惠子', '木村拓哉', '美轮明宏'],
    director: '宫崎骏',
    genre: ['动画', '奇幻', '冒险'],
    duration: 119
  },
  {
    id: uuidv4(),
    title: '黑暗骑士',
    year: 2008,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20knight%20movie%20poster%20batman%20joker%20gotham&image_size=portrait_4_3',
    synopsis: '蝙蝠侠面对最棘手的敌人——小丑，这个疯狂的犯罪天才誓要将哥谭市拖入混乱的深渊。',
    cast: ['克里斯蒂安·贝尔', '希斯·莱杰', '艾伦·艾克哈特'],
    director: '克里斯托弗·诺兰',
    genre: ['剧情', '动作', '犯罪'],
    duration: 152
  },
  {
    id: uuidv4(),
    title: '让子弹飞',
    year: 2010,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=let%20the%20bullets%20fly%20chinese%20movie%20poster%20western&image_size=portrait_4_3',
    synopsis: '民国年间，土匪张麻子冒充县长来到鹅城，与当地恶霸黄四郎展开了一场斗智斗勇的较量。',
    cast: ['姜文', '周润发', '葛优'],
    director: '姜文',
    genre: ['剧情', '喜剧', '动作'],
    duration: 132
  },
  {
    id: uuidv4(),
    title: '无间道',
    year: 2002,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=infernal%20affairs%20hong%20kong%20movie%20poster%20thriller&image_size=portrait_4_3',
    synopsis: '警方与黑帮各派出一名卧底潜伏在对方阵营，在正邪交锋中，两人都面临着身份认同的危机。',
    cast: ['刘德华', '梁朝伟', '黄秋生'],
    director: '刘伟强',
    genre: ['剧情', '悬疑', '犯罪'],
    duration: 101
  },
  {
    id: uuidv4(),
    title: '阿凡达',
    year: 2009,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=avatar%20movie%20poster%20pandora%20navi%20alien&image_size=portrait_4_3',
    synopsis: '双腿瘫痪的前海军陆战队员杰克·萨利接受实验，用意识驾驭纳美人的身体，深入潘多拉星球执行任务。',
    cast: ['萨姆·沃辛顿', '佐伊·索尔达娜', '西格妮·韦弗'],
    director: '詹姆斯·卡梅隆',
    genre: ['动作', '科幻', '冒险'],
    duration: 162
  },
  {
    id: uuidv4(),
    title: '活着',
    year: 1994,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=to%20live%20chinese%20movie%20poster%20historical%20drama&image_size=portrait_4_3',
    synopsis: '富家少爷福贵嗜赌成性，败光家产，一生经历中国近半个世纪的风云变幻，却始终顽强地活着。',
    cast: ['葛优', '巩俐', '姜武'],
    director: '张艺谋',
    genre: ['剧情', '历史'],
    duration: 132
  },
  {
    id: uuidv4(),
    title: '哈利·波特与魔法石',
    year: 2001,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=harry%20potter%20philosophers%20stone%20movie%20poster%20wizard&image_size=portrait_4_3',
    synopsis: '孤儿哈利·波特在11岁生日时得知自己是一名巫师，进入霍格沃茨魔法学校，开启了一段神奇的魔法之旅。',
    cast: ['丹尼尔·雷德克里夫', '艾玛·沃特森', '鲁伯特·格林特'],
    director: '克里斯·哥伦布',
    genre: ['奇幻', '冒险'],
    duration: 152
  },
  {
    id: uuidv4(),
    title: '疯狂动物城',
    year: 2016,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=zootopia%20movie%20poster%20bunny%20fox%20animated&image_size=portrait_4_3',
    synopsis: '在所有动物和平共处的动物城，兔子朱迪成为第一位兔子警官，与狐狸尼克搭档调查一起失踪案。',
    cast: ['金妮弗·古德温', '杰森·贝特曼', '伊德里斯·艾尔巴'],
    director: '拜伦·霍华德',
    genre: ['动画', '喜剧', '冒险'],
    duration: 109
  },
  {
    id: uuidv4(),
    title: '寻梦环游记',
    year: 2017,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=coco%20movie%20poster%20mexican%20day%20of%20the%20dead%20animated&image_size=portrait_4_3',
    synopsis: '小男孩米格尔梦想成为音乐家，却遭到家族反对。在亡灵节当天，他意外进入亡灵世界，揭开了家族的秘密。',
    cast: ['安东尼·冈萨雷斯', '盖尔·加西亚·贝纳尔', '本杰明·布拉特'],
    director: '李·昂克里奇',
    genre: ['动画', '喜剧', '音乐'],
    duration: 105
  },
  {
    id: uuidv4(),
    title: '蝙蝠侠：黑暗骑士的崛起',
    year: 2012,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20knight%20rises%20movie%20poster%20batman%20bane&image_size=portrait_4_3',
    synopsis: '时隔八年，哥谭市再次面临危机，蝙蝠侠必须重出江湖，对抗恐怖分子贝恩，拯救这座城市。',
    cast: ['克里斯蒂安·贝尔', '汤姆·哈迪', '安妮·海瑟薇'],
    director: '克里斯托弗·诺兰',
    genre: ['剧情', '动作', '犯罪'],
    duration: 165
  },
  {
    id: uuidv4(),
    title: '三傻大闹宝莱坞',
    year: 2009,
    poster: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=three%20idiots%20bollywood%20movie%20poster%20comedy&image_size=portrait_4_3',
    synopsis: '兰乔是一个与众不同的大学生，他用智慧和幽默影响着身边的人，也改变了大家对教育和人生的看法。',
    cast: ['阿米尔·汗', '卡琳娜·卡普尔', '马德哈万'],
    director: '拉库马·希拉尼',
    genre: ['剧情', '喜剧', '爱情'],
    duration: 171
  }
]

export const scoreRecords: ScoreRecord[] = []

function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

initialMovies.forEach((movie, index) => {
  const baseScore = 7 + seededRandom(index + 1) * 2.5
  const voteCount = 50 + Math.floor(seededRandom(index + 100) * 200)
  for (let i = 0; i < voteCount; i++) {
    const variation = (seededRandom(index * 1000 + i) - 0.5) * 4
    let score = Math.round((baseScore + variation) * 10) / 10
    score = Math.max(1, Math.min(10, score))
    scoreRecords.push({
      id: uuidv4(),
      movieId: movie.id,
      score,
      timestamp: Date.now() - i * 60000
    })
  }
})
