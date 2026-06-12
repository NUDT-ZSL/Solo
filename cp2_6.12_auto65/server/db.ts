import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'improv-trainer.db');

export interface SceneOption {
  id: string;
  text: string;
  isCorrect: boolean;
  matchScore: number;
}

export interface Scene {
  id: string;
  description: string;
  options: SceneOption[];
  category: string;
}

export interface ScoreRecord {
  id: string;
  userId: string;
  sceneId: string;
  selectedOptionId: string;
  correctOptionId: string;
  semanticScore: number;
  speedScore: number;
  totalScore: number;
  responseTime: number;
  isCorrect: number;
  timestamp: number;
}

export interface RadarData {
  semanticUnderstanding: number;
  reactionSpeed: number;
  logicalCoherence: number;
  emotionalPerception: number;
  vocabularyRichness: number;
}

export interface ErrorDetail {
  id: string;
  sceneDescription: string;
  selectedOption: string;
  correctOption: string;
  semanticScore: number;
  timestamp: number;
}

let db: Database.Database | null = null;
let dbFallbackMode = false;
const inMemoryScores: ScoreRecord[] = [];

const SCENES_DATA: Omit<Scene, 'id'>[] = [
  {
    category: '咖啡店',
    description: '咖啡店店员问："您好，请问想喝点什么？我们今天新出了一款海盐焦糖拿铁。" 你刚刚失恋想找个安静角落坐一下午，你会怎么回复？',
    options: [
      { id: '', text: '一杯热的美式，大杯，多加浓缩，谢谢。另外你们这里最角落的位置可以坐吗？', isCorrect: true, matchScore: 95 },
      { id: '', text: '好啊，那就来一杯新的焦糖拿铁吧！听起来不错。', isCorrect: false, matchScore: 60 },
      { id: '', text: '随便来一杯吧，无所谓。', isCorrect: false, matchScore: 30 }
    ]
  },
  {
    category: '图书馆',
    description: '图书馆里，坐在你对面的陌生人不小心把你的水杯碰倒了，水洒了一点在你笔记本上，对方慌张地说"对不起对不起！我帮你擦擦"，你会怎么回应？',
    options: [
      { id: '', text: '（微笑递上纸巾）没事没事，不是什么重要的本子，我自己来就好，你也别太在意。', isCorrect: true, matchScore: 92 },
      { id: '', text: '你怎么回事啊，走路不看的吗？这本子很贵的！', isCorrect: false, matchScore: 25 },
      { id: '', text: '（沉默，不理对方，自己收拾）', isCorrect: false, matchScore: 40 }
    ]
  },
  {
    category: '机场',
    description: '机场安检口，你和相恋三年的伴侣要分别去不同城市工作，至少半年才能见面。对方抱着你说："我会每天给你发消息的"，你会怎么说？',
    options: [
      { id: '', text: '（轻轻抱回去）我也是，答应我每天睡前要视频。到了那边先安顿好，有任何事都第一个告诉我。', isCorrect: true, matchScore: 94 },
      { id: '', text: '嗯，好，你注意安全。', isCorrect: false, matchScore: 50 },
      { id: '', text: '别太想我啊，说不定我在那边认识新朋友就忘了你了（开玩笑地）', isCorrect: false, matchScore: 35 }
    ]
  },
  {
    category: '面试',
    description: '求职面试时，面试官问："你觉得你最大的缺点是什么？" 这是一个压力面问题，你该如何真诚又不踩雷地回答？',
    options: [
      { id: '', text: '我以前做事会过度追求完美导致偶尔拖延，后来我学会用时间管理工具给自己设定明确的阶段性截止时间，现在已经改善很多了。', isCorrect: true, matchScore: 96 },
      { id: '', text: '我觉得我没有什么明显的缺点，我对自己的能力还是挺有信心的。', isCorrect: false, matchScore: 30 },
      { id: '', text: '我最大的缺点可能就是太喜欢摸鱼了，但我保证上班不会的。', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    category: '朋友聚会',
    description: '朋友聚会上，大家起哄让你唱歌，但你五音不全很抗拒，有个朋友说"就唱一首嘛，别扫兴"，你怎么幽默又坚定地拒绝？',
    options: [
      { id: '', text: '我唱歌那叫"沉浸式噪音艺术"，怕你们听完想把我扔出去。这样，我给大家倒酒赔罪，想听的话下次KTV我提前练三首！', isCorrect: true, matchScore: 93 },
      { id: '', text: '我真的不会唱歌，别逼我了行不行。', isCorrect: false, matchScore: 45 },
      { id: '', text: '（硬着头皮唱一首，全程跑调尴尬）', isCorrect: false, matchScore: 30 }
    ]
  },
  {
    category: '餐厅',
    description: '高级餐厅里，你点的牛排端上来发现煎过了，你要的五分熟变成了全熟，服务员过来问"请问菜品还合口味吗？"，你怎么说？',
    options: [
      { id: '', text: '您好，这块牛排我点的是五分熟，但看起来是全熟了，麻烦您帮我重新做一份可以吗？不急，我可以等。', isCorrect: true, matchScore: 95 },
      { id: '', text: '这牛排全熟了啊！你们厨师是不是看错单了？把你们经理叫过来！', isCorrect: false, matchScore: 35 },
      { id: '', text: '（虽然不满意但还是说）嗯，还行还行。', isCorrect: false, matchScore: 45 }
    ]
  },
  {
    category: '健身房',
    description: '健身房里，一个陌生人一直盯着你看，还走过来说"你动作不标准，我教你吧"，但你不确定他是不是好心还是想搭讪，你怎么回应？',
    options: [
      { id: '', text: '谢谢关心！我上周刚请了私教，他特意调整过我的动作，应该没问题的。不过还是感谢你的好意！', isCorrect: true, matchScore: 92 },
      { id: '', text: '关你什么事，我自己知道怎么练。', isCorrect: false, matchScore: 40 },
      { id: '', text: '好啊好啊，那你教教我吧。', isCorrect: false, matchScore: 55 }
    ]
  },
  {
    category: '亲戚聚会',
    description: '过年亲戚聚会，七大姑八大姨围着你问"工资多少啊？""谈恋爱了吗？""什么时候买房？"，你怎么得体地转移话题？',
    options: [
      { id: '', text: '（笑着端起茶杯）工资够吃饭，对象在找了，房子嘛慢慢攒钱。对了三姑，听说你家孙子这次期末考考了年级前十？快给我们说说怎么教的！', isCorrect: true, matchScore: 94 },
      { id: '', text: '工资还行，没对象，买不起，你们问这么多累不累？', isCorrect: false, matchScore: 25 },
      { id: '', text: '（沉默微笑，不回答）', isCorrect: false, matchScore: 45 }
    ]
  },
  {
    category: '地铁',
    description: '早高峰地铁上，有人不小心踩了你一脚，对方还没道歉就被人潮挤走了，你脚特别疼，旁边一个大爷说"小伙子忍忍吧，都不容易"，你怎么回应？',
    options: [
      { id: '', text: '（揉脚苦笑）是都不容易，我这脚也不容易啊。不过没事，应该不是故意的，就是有点疼，缓会儿就好。', isCorrect: true, matchScore: 90 },
      { id: '', text: '什么叫忍忍？踩的不是你你当然不疼！', isCorrect: false, matchScore: 20 },
      { id: '', text: '（不理大爷，自己生闷气）', isCorrect: false, matchScore: 40 }
    ]
  },
  {
    category: '课堂',
    description: '大学课堂上，老师突然点你回答一个你完全没听懂的问题，全班都转过头看你，你怎么办？',
    options: [
      { id: '', text: '老师不好意思，这个问题我刚才正好在思考另一个角度，还没想清楚，要不您先点其他同学，我想好了下课找您讨论？', isCorrect: true, matchScore: 93 },
      { id: '', text: '（随便瞎扯一个答案）', isCorrect: false, matchScore: 25 },
      { id: '', text: '我不会。（坐下）', isCorrect: false, matchScore: 35 }
    ]
  },
  {
    category: '超市',
    description: '超市结账时，收银员多扫了你一件商品，多出50块，你回家才发现小票不对，你回超市怎么说？',
    options: [
      { id: '', text: '您好，这是我昨天购物的小票和商品，核对后发现多扫了一件我没买的东西，麻烦您帮我处理一下退款？', isCorrect: true, matchScore: 96 },
      { id: '', text: '你们怎么回事啊，乱扫商品骗钱是吧？我要投诉！', isCorrect: false, matchScore: 30 },
      { id: '', text: '算了，五十块钱懒得跑了。', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    category: '同事',
    description: '同事经常把他自己的工作推给你做，今天又发消息说"这个我不太会，你帮我弄一下呗，很快的"，你这次想拒绝，怎么说比较得体？',
    options: [
      { id: '', text: '我手头这两个方案今天下班前必须交，实在腾不出手。要不我把上次查的教程链接发你，你照着做，有不会的具体问题我可以帮你看一下？', isCorrect: true, matchScore: 94 },
      { id: '', text: '你自己的工作你自己做啊，每次都找我。', isCorrect: false, matchScore: 35 },
      { id: '', text: '（心里不爽但还是答应了）好吧好吧。', isCorrect: false, matchScore: 30 }
    ]
  },
  {
    category: '医院',
    description: '医院候诊时，一个大妈直接插队站你前面，后面有人小声议论但没人出声，你怎么礼貌又坚定地提醒她？',
    options: [
      { id: '', text: '阿姨您好，大家都是按号排队的，您的号在前面几位的话可以叫号再过去，不然这样其他人也不太方便，您看可以吗？', isCorrect: true, matchScore: 93 },
      { id: '', text: '排队！没看见后面这么多人吗？有没有素质！', isCorrect: false, matchScore: 30 },
      { id: '', text: '（忍了，不说什么）', isCorrect: false, matchScore: 25 }
    ]
  },
  {
    category: '约会',
    description: '第一次约会吃饭，对方全程玩手机刷短视频，偶尔抬头敷衍你两句，你觉得不太被尊重，怎么表达比较好？',
    options: [
      { id: '', text: '（轻松地）你今天是有什么要紧事吗？如果忙的话其实我们可以改时间的，我本来还挺期待和你好好聊聊的。', isCorrect: true, matchScore: 95 },
      { id: '', text: '你能不能别玩手机了，跟你说话呢！', isCorrect: false, matchScore: 40 },
      { id: '', text: '（也掏出自己的手机，各玩各的）', isCorrect: false, matchScore: 25 }
    ]
  },
  {
    category: '酒店',
    description: '你入住酒店半夜两点，隔壁房间一直在大声喧哗开派对，你打电话到前台没解决，现在直接过去敲门，怎么说最有效？',
    options: [
      { id: '', text: '您好打扰了，我是隔壁房间的客人，你们的声音有点大我实在睡不着。麻烦你们小声一点可以吗？大家明天都有行程，互相体谅一下。', isCorrect: true, matchScore: 94 },
      { id: '', text: '能不能安静点！吵死了！再吵我报警了！', isCorrect: false, matchScore: 45 },
      { id: '', text: '（敲完门直接回去，等他们自己停）', isCorrect: false, matchScore: 35 }
    ]
  },
  {
    category: '网购',
    description: '网购衣服收到后发现质量和图片严重不符，你联系客服，对方说"我们图片仅供参考哦，亲"，你怎么据理力争？',
    options: [
      { id: '', text: '商品页写了"所见即所得"，我收到的实物面料、颜色都和图片差别很大，这已经是虚假宣传了。我这边有对比图，要么全额退货运费你们出，要么我就平台介入+12315投诉，你们选一个吧。', isCorrect: true, matchScore: 96 },
      { id: '', text: '你们这是欺骗消费者！我要给你们一万条差评！', isCorrect: false, matchScore: 40 },
      { id: '', text: '（自认倒霉，算了）', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    category: '合租',
    description: '合租室友经常用你的零食、日用品也不跟你说，你藏在冰箱里的蛋糕被他吃了，这次你想把话说清楚，怎么说不尴尬？',
    options: [
      { id: '', text: '我想跟你说个小事，你用我东西其实也没什么，但最好跟我说一声对吧？昨天我那蛋糕是给朋友过生日准备的，今天找不着有点急。以后我的东西我都贴个标签，咱们各自放各自区域，这样都方便。', isCorrect: true, matchScore: 94 },
      { id: '', text: '你是不是又偷吃我东西了？你买不起不会自己买吗？', isCorrect: false, matchScore: 30 },
      { id: '', text: '（默默把自己东西全部锁起来，什么也不说）', isCorrect: false, matchScore: 40 }
    ]
  },
  {
    category: '演讲',
    description: '你正在台上做演讲，PPT突然卡住了，现场很安静，大家都在等，你怎么化解尴尬？',
    options: [
      { id: '', text: '（笑着对观众）看来我的PPT也觉得这个话题值得多停两秒让大家消化一下。趁这个时间，有没有朋友对前面的内容有问题？可以先交流。（同时示意工作人员处理）', isCorrect: true, matchScore: 97 },
      { id: '', text: '（慌乱地按鼠标）怎么回事啊，刚才还好好的...等一下啊...', isCorrect: false, matchScore: 35 },
      { id: '', text: '（沉默站在台上，等PPT恢复）', isCorrect: false, matchScore: 30 }
    ]
  },
  {
    category: '借钱',
    description: '一个很久没联系的小学同学突然找你借5000块说急用，你不想借也不想得罪人，怎么婉拒？',
    options: [
      { id: '', text: '哎呀不巧，我上个月刚把存款都拿去买理财了，提前取出来手续费很高。我手头现金也就够吃饭的，帮不上你真不好意思，你问问其他人？', isCorrect: true, matchScore: 93 },
      { id: '', text: '不借，我们又不熟。', isCorrect: false, matchScore: 35 },
      { id: '', text: '（犹豫半天还是借了，后来果然没还）', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    category: '求婚',
    description: '朋友的求婚现场，他要求婚的对象突然说"我还没准备好"，全场尴尬到空气凝固，你作为朋友怎么救场？',
    options: [
      { id: '', text: '（上前拍一下朋友的肩膀，笑着对两人和大家）看来这场面太突然了，那就当提前演练好不好？等你准备好我们再来一次，那时候一定更惊喜！大家先吃饭吃饭，菜都凉了！', isCorrect: true, matchScore: 96 },
      { id: '', text: '（小声嘀咕）拒绝了还办什么求婚啊...', isCorrect: false, matchScore: 20 },
      { id: '', text: '（假装看手机，不说话）', isCorrect: false, matchScore: 25 }
    ]
  },
  {
    category: '客服',
    description: '你打客服电话投诉宽带断网两天，客服一直念话术不解决问题，说"非常抱歉给您带来不便，我们会在72小时内处理"，你怎么推进度？',
    options: [
      { id: '', text: '抱歉，72小时我不能接受。我已经报故障两天了，工作会议都受影响了。请你把你们主管的电话给我，或者帮我登记加急工单，今天下午之前必须上门，否则我就投诉到工信部，工号我已经记下来了。', isCorrect: true, matchScore: 95 },
      { id: '', text: '你们什么破公司！我要投诉你！（挂电话）', isCorrect: false, matchScore: 40 },
      { id: '', text: '好吧好吧，那就再等三天吧。', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    category: '理发店',
    description: '理发店，你跟Tony老师说只剪两厘米修个层次，结果他剪短了十厘米还打薄了，你看着镜子快哭了，怎么处理？',
    options: [
      { id: '', text: '（冷静地）我刚才明确说的是只剪两厘米修层次，您这个长度差太多了，我没法接受。你们店长在吗？我想商量一下怎么处理，是接发补偿还是退款，或者有别的方案？', isCorrect: true, matchScore: 94 },
      { id: '', text: '你会不会剪头发啊！我要的两厘米你剪这么短！你赔我头发！', isCorrect: false, matchScore: 40 },
      { id: '', text: '（心里滴血但嘴上说）剪都剪了就这样吧。', isCorrect: false, matchScore: 25 }
    ]
  },
  {
    category: '班级群',
    description: '家长群里，有个家长一直发广告刷屏，老师也不说话，群消息已经100+条了，你怎么公开说又不伤和气？',
    options: [
      { id: '', text: '@这位家长您好，这个群是用来接收学校通知和讨论孩子学习的，您的广告信息不太合适发在这里。如果您有需要我们可以私下联系，或者您可以发到其他相关的群里，谢谢您的理解~', isCorrect: true, matchScore: 94 },
      { id: '', text: '能不能别发广告了，烦不烦！', isCorrect: false, matchScore: 30 },
      { id: '', text: '（默默把群设为免打扰，不说话）', isCorrect: false, matchScore: 30 }
    ]
  },
  {
    category: '外卖',
    description: '外卖送错了，你点的海鲜炒饭变成了别人的素菜沙拉，骑手说他已经点送达了没法改，你怎么快速解决？',
    options: [
      { id: '', text: '师傅我理解你忙也不容易，这样，你先帮我跟商家沟通一下重新做一份，我这边也联系客服登记。如果商家那边确认重做，你顺路再帮我带过来就行，实在不行我让商家安排别的骑手，咱们都别耽误时间。', isCorrect: true, matchScore: 93 },
      { id: '', text: '你送错餐了关我什么事，我要投诉你！', isCorrect: false, matchScore: 30 },
      { id: '', text: '（自认倒霉，吃沙拉）', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    category: '加班',
    description: '周五下班前10分钟，领导突然说"大家等一下，开个紧急会议"，但你早就约好和多年未见的老朋友吃饭，怎么请假？',
    options: [
      { id: '', text: '领导不好意思，我上周就约了一个从国外回来的老朋友，就今晚见面明天他就走了，确实推不了。会议我不参与有影响吗？如果有重要内容我让同事录音+会后整理纪要给我，周末有问题随时找我处理。', isCorrect: true, matchScore: 95 },
      { id: '', text: '领导我约了朋友，先走了啊。', isCorrect: false, matchScore: 40 },
      { id: '', text: '（无奈取消约会，留下开会）', isCorrect: false, matchScore: 30 }
    ]
  },
  {
    category: '电影院',
    description: '看电影时你后排的小孩一直踢你椅背，家长也不管，你转头提醒一次家长说"小孩子嘛没办法"，你怎么回应？',
    options: [
      { id: '', text: '小孩活泼确实正常，但电影我买了票也是来认真看的，您麻烦稍微管一下可以吗？实在不行我可以帮您叫工作人员换一个靠边的位置，对您对小孩对大家都方便。', isCorrect: true, matchScore: 94 },
      { id: '', text: '小孩子不懂事你大人也不懂事？有没有素质！', isCorrect: false, matchScore: 30 },
      { id: '', text: '（忍一整场，回家生闷气）', isCorrect: false, matchScore: 20 }
    ]
  },
  {
    category: '相亲',
    description: '相亲饭桌上，对方聊了半小时一直在炫富吹牛逼，你实在听不下去了，饭局怎么优雅地结束？',
    options: [
      { id: '', text: '（看表+微笑）跟你聊天挺有意思的，但我突然想起家里还有点事要处理，今天这顿我请了。咱们加个微信，下次有机会再聊？', isCorrect: true, matchScore: 92 },
      { id: '', text: '你别吹了行不行，真的很尴尬。', isCorrect: false, matchScore: 30 },
      { id: '', text: '（假装接电话，找借口跑了）', isCorrect: false, matchScore: 50 }
    ]
  },
  {
    category: '电梯',
    description: '电梯里，你戴着耳机，旁边的人对着你说话你没听见，对方突然大声说"跟你说话呢，聋了吗？"，你摘下耳机怎么回应？',
    options: [
      { id: '', text: '（歉意外加平静）啊抱歉抱歉，我刚才戴耳机没听到，您刚才说什么？', isCorrect: true, matchScore: 95 },
      { id: '', text: '你说话这么冲干嘛，我戴耳机听不到很正常啊。', isCorrect: false, matchScore: 40 },
      { id: '', text: '（翻个白眼，不说话）', isCorrect: false, matchScore: 25 }
    ]
  },
  {
    category: '宠物店',
    description: '你去宠物店看猫，店员把猫从笼子里抱给你撸，结果猫紧张抓了你一道红印，店员说"我们家猫从来不抓人的"，你怎么回应？',
    options: [
      { id: '', text: '猫紧张了抓人其实挺正常的，我也不怪它。但我这个抓痕还是有点深，我担心感染，你们这边有没有消毒的？另外这个事你们最好有个记录，万一后续我有什么问题也好联系。', isCorrect: true, matchScore: 94 },
      { id: '', text: '你们家猫抓我！我要打狂犬疫苗！你们赔钱！', isCorrect: false, matchScore: 40 },
      { id: '', text: '（没事没事，继续撸猫）', isCorrect: false, matchScore: 25 }
    ]
  },
  {
    category: '生日',
    description: '你生日，一群朋友给你惊喜，但你今天特别累心情也不好，脸上笑不出来，朋友们看出你不对劲问你"怎么了，不高兴吗"，你怎么说？',
    options: [
      { id: '', text: '（勉强笑，拉住朋友的手）没有没有！真的特别开心你们给我准备这些！就是今天上班开了一天会脑子有点懵，让我缓两分钟就好了，你们千万别多想！蛋糕在哪，快给我切！', isCorrect: true, matchScore: 95 },
      { id: '', text: '嗯，今天有点累。（冷场）', isCorrect: false, matchScore: 40 },
      { id: '', text: '（硬撑着假装开心，整晚强颜欢笑）', isCorrect: false, matchScore: 45 }
    ]
  }
];

export function initDatabase(): void {
  try {
    db = new Database(DB_PATH);
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
    `);
    dbFallbackMode = false;
    console.log('[DB] SQLite initialized successfully at', DB_PATH);
  } catch (err) {
    console.error('[DB] Failed to initialize SQLite, falling back to in-memory mode:', err);
    dbFallbackMode = true;
    db = null;
  }
}

export function isDbHealthy(): boolean {
  return db !== null && !dbFallbackMode;
}

export function getAllScenes(): Scene[] {
  const scenes: Scene[] = SCENES_DATA.map((scene, idx) => ({
    id: `scene_${String(idx + 1).padStart(3, '0')}`,
    description: scene.description,
    category: scene.category,
    options: scene.options.map((opt, oidx) => ({
      ...opt,
      id: `scene_${String(idx + 1).padStart(3, '0')}_opt_${oidx}`
    }))
  }));
  return scenes;
}

export function getSceneById(id: string): Scene | undefined {
  return getAllScenes().find(s => s.id === id);
}

export function getRandomScenes(count?: number, category?: string): Scene[] {
  let pool = getAllScenes();
  if (category) {
    pool = pool.filter(s => s.category === category);
  }
  if (typeof count === 'number' && count > 0 && count < pool.length) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  return pool;
}

export function insertScore(record: Omit<ScoreRecord, 'id'> & { id?: string }): boolean {
  const id = record.id || crypto.randomUUID();
  const fullRecord: ScoreRecord = {
    ...record,
    id,
    isCorrect: record.isCorrect ? 1 : 0
  } as ScoreRecord;

  if (!db || dbFallbackMode) {
    inMemoryScores.push(fullRecord);
    return true;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO scores (id, userId, sceneId, selectedOptionId, correctOptionId,
        semanticScore, speedScore, totalScore, responseTime, isCorrect, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      fullRecord.id,
      fullRecord.userId,
      fullRecord.sceneId,
      fullRecord.selectedOptionId,
      fullRecord.correctOptionId,
      fullRecord.semanticScore,
      fullRecord.speedScore,
      fullRecord.totalScore,
      fullRecord.responseTime,
      fullRecord.isCorrect,
      fullRecord.timestamp
    );
    return true;
  } catch (e) {
    console.error('[DB] insertScore error, fallback to memory:', e);
    inMemoryScores.push(fullRecord);
    dbFallbackMode = true;
    return true;
  }
}

export function getUserScores(userId: string): ScoreRecord[] {
  if (!db || dbFallbackMode) {
    return inMemoryScores
      .filter(r => r.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  try {
    const stmt = db.prepare('SELECT * FROM scores WHERE userId = ? ORDER BY timestamp DESC');
    return stmt.all(userId) as ScoreRecord[];
  } catch (e) {
    console.error('[DB] getUserScores error:', e);
    return [];
  }
}

function calculateRadar(userId: string): RadarData {
  const records = getUserScores(userId);
  if (records.length === 0) {
    return {
      semanticUnderstanding: 0,
      reactionSpeed: 0,
      logicalCoherence: 0,
      emotionalPerception: 0,
      vocabularyRichness: 0
    };
  }

  const correctRecords = records.filter(r => r.isCorrect === 1);
  const correctRate = correctRecords.length / records.length;

  const avgSemantic = records.reduce((s, r) => s + r.semanticScore, 0) / records.length;
  const avgSpeed = records.reduce((s, r) => s + r.speedScore, 0) / records.length;
  const avgTotal = records.reduce((s, r) => s + r.totalScore, 0) / records.length;
  const avgResponseTime = records.reduce((s, r) => s + r.responseTime, 0) / records.length;
  const recent5 = records.slice(0, Math.min(5, records.length));
  const consistencyCorrect = recent5.filter(r => r.isCorrect === 1).length / recent5.length;

  const semanticUnderstanding = Math.min(100, avgSemantic);
  const reactionSpeed = Math.min(100, avgSpeed);
  const logicalCoherence = Math.min(100, (avgTotal * 0.6) + (correctRate * 40));
  const emotionalPerception = Math.min(100, (avgSemantic * 0.7) + (consistencyCorrect * 30));
  const vocabularyRichness = Math.min(100, (avgSemantic * 0.5) + (avgResponseTime < 2 ? 50 : avgResponseTime < 3.5 ? 30 : 10) + correctRate * 20);

  return {
    semanticUnderstanding: Math.round(semanticUnderstanding),
    reactionSpeed: Math.round(reactionSpeed),
    logicalCoherence: Math.round(logicalCoherence),
    emotionalPerception: Math.round(emotionalPerception),
    vocabularyRichness: Math.round(vocabularyRichness)
  };
}

export function getRadarData(userId: string): { radar: RadarData; recentErrors: ErrorDetail[] } {
  const radar = calculateRadar(userId);
  const scenes = getAllScenes();
  const sceneMap = new Map(scenes.map(s => [s.id, s]));

  let errorRecords: ScoreRecord[] = [];

  if (!db || dbFallbackMode) {
    errorRecords = inMemoryScores
      .filter(r => r.userId === userId && r.isCorrect === 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  } else {
    try {
      const errorStmt = db.prepare(`
        SELECT * FROM scores
        WHERE userId = ? AND isCorrect = 0
        ORDER BY timestamp DESC
        LIMIT 5
      `);
      errorRecords = errorStmt.all(userId) as ScoreRecord[];
    } catch (e) {
      console.error('[DB] getRadarData error records failed:', e);
    }
  }

  const recentErrors: ErrorDetail[] = errorRecords.map(rec => {
    const scene = sceneMap.get(rec.sceneId);
    const selectedOpt = scene?.options.find(o => o.id === rec.selectedOptionId);
    const correctOpt = scene?.options.find(o => o.id === rec.correctOptionId);
    return {
      id: rec.id,
      sceneDescription: scene?.description || '场景已删除',
      selectedOption: selectedOpt?.text || '未知选项',
      correctOption: correctOpt?.text || '未知选项',
      semanticScore: rec.semanticScore,
      timestamp: rec.timestamp
    };
  });

  if (db && !dbFallbackMode) {
    try {
      const now = Date.now();
      db.prepare(`
        INSERT INTO radar_cache (userId, semanticUnderstanding, reactionSpeed, logicalCoherence, emotionalPerception, vocabularyRichness, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(userId) DO UPDATE SET
          semanticUnderstanding = excluded.semanticUnderstanding,
          reactionSpeed = excluded.reactionSpeed,
          logicalCoherence = excluded.logicalCoherence,
          emotionalPerception = excluded.emotionalPerception,
          vocabularyRichness = excluded.vocabularyRichness,
          updatedAt = excluded.updatedAt
      `).run(
        userId,
        radar.semanticUnderstanding,
        radar.reactionSpeed,
        radar.logicalCoherence,
        radar.emotionalPerception,
        radar.vocabularyRichness,
        now
      );
    } catch (e) {
      console.error('[DB] radar_cache update failed:', e);
    }
  }

  return { radar, recentErrors };
}

export function getDb(): Database.Database | null {
  return db;
}

export default {
  initDatabase,
  getAllScenes,
  getSceneById,
  insertScore,
  getUserScores,
  getRadarData
};
