import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'improv_trainer.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    sceneId TEXT NOT NULL,
    selectedOptionId TEXT NOT NULL,
    correctOptionId TEXT NOT NULL,
    semanticScore REAL NOT NULL,
    speedScore REAL NOT NULL,
    totalScore REAL NOT NULL,
    responseTime REAL NOT NULL,
    isCorrect INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_scores_userId ON scores(userId);
  CREATE INDEX IF NOT EXISTS idx_scores_timestamp ON scores(timestamp);

  CREATE TABLE IF NOT EXISTS radar_cache (
    userId TEXT PRIMARY KEY,
    semanticUnderstanding REAL NOT NULL DEFAULT 0,
    reactionSpeed REAL NOT NULL DEFAULT 0,
    logicalCoherence REAL NOT NULL DEFAULT 0,
    emotionalPerception REAL NOT NULL DEFAULT 0,
    vocabularyRichness REAL NOT NULL DEFAULT 0,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    options TEXT NOT NULL
  );
`);

const scenesData = [
  {
    id: 'scene-001',
    category: '咖啡店',
    description: '场景：咖啡店点单\n\n咖啡师微笑着问你："您好，今天想喝点什么？我们刚上了新品海盐焦糖拿铁。"\n\n你会怎么回应？',
    options: [
      { id: 'opt-001-a', text: '听起来很特别！麻烦给我来一杯中杯的，热的，谢谢。', isCorrect: true, matchScore: 95 },
      { id: 'opt-001-b', text: '我要一杯美式，不加糖。', isCorrect: false, matchScore: 60 },
      { id: 'opt-001-c', text: '随便吧，什么都行。', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    id: 'scene-002',
    category: '图书馆',
    description: '场景：图书馆搭讪\n\n你在书架前找书时，旁边一位同学轻声对你说："这本书我看过，写得挺有意思的。"\n\n你会怎么回应？',
    options: [
      { id: 'opt-002-a', text: '真的吗？我一直想读这本！你觉得最精彩的部分是什么？', isCorrect: true, matchScore: 92 },
      { id: 'opt-002-b', text: '哦，好的，谢谢推荐。', isCorrect: false, matchScore: 45 },
      { id: 'opt-002-c', text: '（点头示意，继续找书）', isCorrect: false, matchScore: 15 }
    ]
  },
  {
    id: 'scene-003',
    category: '机场',
    description: '场景：机场告别\n\n你的好朋友即将登机出国留学，他/她有些伤感地说："不知道什么时候才能再见面了。"\n\n你会怎么回应？',
    options: [
      { id: 'opt-003-a', text: '现在视频通话这么方便，随时可以见面嘛！等你安顿好了我就来看你，一路平安！', isCorrect: true, matchScore: 94 },
      { id: 'opt-003-b', text: '是啊，保重。', isCorrect: false, matchScore: 35 },
      { id: 'opt-003-c', text: '别哭啊，又不是再也见不到了。', isCorrect: false, matchScore: 25 }
    ]
  },
  {
    id: 'scene-004',
    category: '办公室',
    description: '场景：办公室会议\n\n开会时老板突然问你："这个项目你觉得最大的风险是什么？"\n\n你会怎么回应？',
    options: [
      { id: 'opt-004-a', text: '我认为主要风险在于交付时间紧张，我们可以通过优先级排序和每日站会来把控进度。', isCorrect: true, matchScore: 93 },
      { id: 'opt-004-b', text: '我觉得没什么太大风险吧。', isCorrect: false, matchScore: 30 },
      { id: 'opt-004-c', text: '这个问题我还没想过。', isCorrect: false, matchScore: 10 }
    ]
  },
  {
    id: 'scene-005',
    category: '餐厅',
    description: '场景：餐厅约会\n\n约会对象看着菜单皱起眉头："这里的菜好贵啊，随便一个主菜都要两百多。"\n\n你会怎么回应？',
    options: [
      { id: 'opt-005-a', text: '这家评价确实不错，不过如果你觉得不合适，我们可以换一家性价比更高的，我知道附近有家很好吃的小馆。', isCorrect: true, matchScore: 91 },
      { id: 'opt-005-b', text: '还好吧，我请客。', isCorrect: false, matchScore: 55 },
      { id: 'opt-005-c', text: '嫌贵那你别看了，我点什么你吃什么。', isCorrect: false, matchScore: 5 }
    ]
  },
  {
    id: 'scene-006',
    category: '健身房',
    description: '场景：健身房\n\n旁边锻炼的人走过来对你说："你这个动作做得不太对，容易伤到膝盖。"\n\n你会怎么回应？',
    options: [
      { id: 'opt-006-a', text: '谢谢提醒！我确实感觉有点别扭，可以麻烦你示范一下正确的姿势吗？', isCorrect: true, matchScore: 94 },
      { id: 'opt-006-b', text: '没事，我一直这么练。', isCorrect: false, matchScore: 20 },
      { id: 'opt-006-c', text: '你是教练吗？不用你管。', isCorrect: false, matchScore: 5 }
    ]
  },
  {
    id: 'scene-007',
    category: '朋友聚会',
    description: '场景：朋友聚会\n\n聚会上有人讲了个很冷的笑话，全场尴尬地安静了两秒。\n\n你会怎么打破僵局？',
    options: [
      { id: 'opt-007-a', text: '（假装冻得发抖）好冷啊，谁把空调开这么低？讲真，这个笑话够我笑一个冬天了。', isCorrect: true, matchScore: 96 },
      { id: 'opt-007-b', text: '呵呵，挺好笑的。', isCorrect: false, matchScore: 30 },
      { id: 'opt-007-c', text: '（低头玩手机，装作没听见）', isCorrect: false, matchScore: 10 }
    ]
  },
  {
    id: 'scene-008',
    category: '面试',
    description: '场景：面试\n\n面试官问："你最大的缺点是什么？"\n\n你会怎么回应？',
    options: [
      { id: 'opt-008-a', text: '我以前有时候会过于追求细节完美，导致进度稍慢。现在我学会了在质量和效率之间找到平衡点，用时间管理工具来确保项目按时交付。', isCorrect: true, matchScore: 95 },
      { id: 'opt-008-b', text: '我没有什么缺点。', isCorrect: false, matchScore: 15 },
      { id: 'opt-008-c', text: '我比较懒，喜欢摸鱼。', isCorrect: false, matchScore: 5 }
    ]
  },
  {
    id: 'scene-009',
    category: '公园',
    description: '场景：公园遛狗\n\n你带着狗狗在公园散步，一位小朋友跑过来兴奋地说："阿姨/叔叔，我可以摸摸它吗？"\n\n你会怎么回应？',
    options: [
      { id: 'opt-009-a', text: '当然可以呀！它叫豆豆，性格特别温顺。来，你可以先伸手让它闻闻，然后轻轻摸它的头。', isCorrect: true, matchScore: 93 },
      { id: 'opt-009-b', text: '可以，别把它弄疼了。', isCorrect: false, matchScore: 45 },
      { id: 'opt-009-c', text: '不行，它咬人。', isCorrect: false, matchScore: 15 }
    ]
  },
  {
    id: 'scene-010',
    category: '课堂',
    description: '场景：课堂提问\n\n老师突然点你回答问题："这位同学，你来谈谈对这个问题的看法。"\n\n你完全没听讲，不知道问的是什么问题。\n\n你会怎么回应？',
    options: [
      { id: 'opt-010-a', text: '老师，这个问题我想从两个角度来分析...（同时用眼神示意同桌递小纸条）不过我想先听听其他同学的观点，可以吗？', isCorrect: true, matchScore: 85 },
      { id: 'opt-010-b', text: '老师我不会。', isCorrect: false, matchScore: 25 },
      { id: 'opt-010-c', text: '（沉默不语）', isCorrect: false, matchScore: 10 }
    ]
  },
  {
    id: 'scene-011',
    category: '超市',
    description: '场景：超市结账\n\n结账时收银员对你说："您好，一共是87.5元。"你发现手机没电了，身上只有50元现金。\n\n你会怎么回应？',
    options: [
      { id: 'opt-011-a', text: '不好意思，我手机突然没电了，现金不够。能不能先把这些东西放在这里，我回家拿充电器马上回来付款？或者您这里有充电宝吗？', isCorrect: true, matchScore: 90 },
      { id: 'opt-011-b', text: '那我不要了。', isCorrect: false, matchScore: 35 },
      { id: 'opt-011-c', text: '算了算了，下次再买。', isCorrect: false, matchScore: 25 }
    ]
  },
  {
    id: 'scene-012',
    category: '公交车',
    description: '场景：公交车上\n\n公交车急刹车，你不小心踩到了前面一位乘客的脚，他/她痛得"嘶"了一声。\n\n你会怎么回应？',
    options: [
      { id: 'opt-012-a', text: '哎呀真对不起！刚才刹车太急了，我没站稳。您没事吧？要不要我帮您看看？真的非常抱歉！', isCorrect: true, matchScore: 94 },
      { id: 'opt-012-b', text: '不好意思。', isCorrect: false, matchScore: 40 },
      { id: 'opt-012-c', text: '谁让司机刹车这么急。', isCorrect: false, matchScore: 10 }
    ]
  },
  {
    id: 'scene-013',
    category: '生日派对',
    description: '场景：生日派对\n\n朋友的生日派对上，大家都在等你切蛋糕，但你发现自己忘了买礼物。\n\n你会怎么回应？',
    options: [
      { id: 'opt-013-a', text: '等一下！在切蛋糕之前，我有个特别的礼物要送给你——（清嗓子开始唱）'Happy Birthday to you...' 开玩笑的啦，其实我给你准备的礼物正在快递路上，明天就能到！为了赔罪，这蛋糕我来切，第一块给你！', isCorrect: true, matchScore: 92 },
      { id: 'opt-013-b', text: '哎呀，我忘了买礼物了。', isCorrect: false, matchScore: 20 },
      { id: 'opt-013-c', text: '（假装不知道，赶紧切蛋糕）', isCorrect: false, matchScore: 15 }
    ]
  },
  {
    id: 'scene-014',
    category: '医院',
    description: '场景：医院探望\n\n你去医院探望生病的朋友，他/她看起来情绪很低落："我感觉自己好不了了，天天吃药打针。"\n\n你会怎么回应？',
    options: [
      { id: 'opt-014-a', text: '你别瞎想！医生都说了你这只是小问题，积极配合治疗很快就能出院。你看我给你带了你最爱吃的草莓，等你好了我们一起去吃火锅，好不好？', isCorrect: true, matchScore: 93 },
      { id: 'opt-014-b', text: '别这么想，会好起来的。', isCorrect: false, matchScore: 45 },
      { id: 'opt-014-c', text: '没事，打针吃药很正常嘛。', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    id: 'scene-015',
    category: '理发店',
    description: '场景：理发店\n\n理发师问你："想剪个什么发型？"你其实也不确定，但不想让他随便剪。\n\n你会怎么回应？',
    options: [
      { id: 'opt-015-a', text: '我想留个偏分，长度大概到耳朵下面，刘海要自然一点不要太厚。你是专业的，你觉得我脸型适合什么样的？可以给我点建议吗？', isCorrect: true, matchScore: 91 },
      { id: 'opt-015-b', text: '你看着办吧，怎么好看怎么剪。', isCorrect: false, matchScore: 35 },
      { id: 'opt-015-c', text: '随便修一下就行。', isCorrect: false, matchScore: 25 }
    ]
  },
  {
    id: 'scene-016',
    category: '网购',
    description: '场景：网购客服\n\n你收到的衣服和图片严重不符，找客服投诉。客服说："亲，图片仅供参考哦，可能有点色差呢。"\n\n你会怎么回应？',
    options: [
      { id: 'opt-016-a', text: '色差我可以理解，但这根本不是同一件衣服吧？款式和材质都完全不一样。麻烦给我一个合理的解决方案，不然我只能申请平台介入了。', isCorrect: true, matchScore: 92 },
      { id: 'opt-016-b', text: '那我退货吧。', isCorrect: false, matchScore: 55 },
      { id: 'opt-016-c', text: '你们这是诈骗！我要投诉你们！', isCorrect: false, matchScore: 30 }
    ]
  },
  {
    id: 'scene-017',
    category: '电梯',
    description: '场景：电梯偶遇\n\n电梯里只有你和公司大老板，气氛有点尴尬。他突然问你："最近工作忙不忙？"\n\n你会怎么回应？',
    options: [
      { id: 'opt-017-a', text: '谢谢张总关心！最近项目进度很顺利，团队配合得也很好。等项目上线了我给您汇报详情。您最近在忙什么呢？', isCorrect: true, matchScore: 90 },
      { id: 'opt-017-b', text: '还行吧。', isCorrect: false, matchScore: 25 },
      { id: 'opt-017-c', text: '挺忙的，天天加班。', isCorrect: false, matchScore: 15 }
    ]
  },
  {
    id: 'scene-018',
    category: '电影院',
    description: '场景：电影院\n\n你和朋友看电影，旁边有人一直在大声打电话，影响大家观影。\n\n你会怎么提醒他/她？',
    options: [
      { id: 'opt-018-a', text: '（轻声礼貌地）您好，不好意思打扰您了。这里大家都在看电影，能不能麻烦您出去接电话？谢谢您的理解！', isCorrect: true, matchScore: 93 },
      { id: 'opt-018-b', text: '喂，能不能别说话了？', isCorrect: false, matchScore: 40 },
      { id: 'opt-018-c', text: '（故意咳嗽几声）', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    id: 'scene-019',
    category: '家庭聚餐',
    description: '场景：家庭聚餐\n\n过年家庭聚餐，亲戚问你："什么时候带男/女朋友回来啊？月薪多少啊？什么时候买房啊？"\n\n你会怎么回应？',
    options: [
      { id: 'opt-019-a', text: '二姨您太关心我了！您家孩子今年考试考得怎么样啊？听说现在升学压力特别大。（巧妙转移话题）来，我敬您一杯，祝您身体健康！', isCorrect: true, matchScore: 94 },
      { id: 'opt-019-b', text: '还在找呢，工资够用，买房再等等。', isCorrect: false, matchScore: 35 },
      { id: 'opt-019-c', text: '关您什么事啊。', isCorrect: false, matchScore: 10 }
    ]
  },
  {
    id: 'scene-020',
    category: '便利店',
    description: '场景：便利店\n\n你在便利店买东西，收银员扫完码说："一共32元。"你付了50元，他/她只找了你8元。\n\n你会怎么提醒？',
    options: [
      { id: 'opt-020-a', text: '您好，我刚才付的是50元，买的东西是32元，应该找我18元哦。麻烦您再核对一下，谢谢！', isCorrect: true, matchScore: 92 },
      { id: 'opt-020-b', text: '你找错钱了吧？', isCorrect: false, matchScore: 45 },
      { id: 'opt-020-c', text: '（默默把钱收起来，心里不爽）', isCorrect: false, matchScore: 5 }
    ]
  },
  {
    id: 'scene-021',
    category: '校园',
    description: '场景：校园\n\n学弟/学妹拦住你："学长/学姐，能不能加个微信？我想请教一些问题。"你不想给，但又不好意思直接拒绝。\n\n你会怎么回应？',
    options: [
      { id: 'opt-021-a', text: '当然可以呀！不过我平时微信消息比较多，容易漏掉。这样吧，你有什么问题现在就可以问我，或者发邮件给我，我邮箱是xxx，一定及时回复你！', isCorrect: true, matchScore: 88 },
      { id: 'opt-021-b', text: '我很少用微信，算了吧。', isCorrect: false, matchScore: 30 },
      { id: 'opt-021-c', text: '不用了，我没时间。', isCorrect: false, matchScore: 15 }
    ]
  },
  {
    id: 'scene-022',
    category: '婚礼',
    description: '场景：婚礼抛捧花\n\n婚礼上新娘抛捧花，好巧不巧正好砸到你手里，全场都在起哄让你说两句。\n\n你会怎么回应？',
    options: [
      { id: 'opt-022-a', text: '哇！这捧花也太准了吧！新娘你是不是瞄准了扔的？借您的好运，希望我也能早日找到我的幸福！祝你们白头偕老，早生贵子！', isCorrect: true, matchScore: 95 },
      { id: 'opt-022-b', text: '谢谢，谢谢大家。', isCorrect: false, matchScore: 35 },
      { id: 'opt-022-c', text: '（尴尬地笑笑，赶紧下台）', isCorrect: false, matchScore: 15 }
    ]
  },
  {
    id: 'scene-023',
    category: '加班',
    description: '场景：加班\n\n周五晚上八点，你正准备下班，老板走过来说："辛苦一下，这个方案明天要用，今晚加个班吧。"\n\n你已经和朋友约好了聚会。\n\n你会怎么回应？',
    options: [
      { id: