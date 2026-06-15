import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { v4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_PATH = join(__dirname, "data.json");

export interface Podcast {
  id: string;
  title: string;
  author: string;
  duration: number;
  coverUrl: string;
}

export interface TranscriptSegment {
  id: string;
  podcastId: string;
  startTime: number;
  endTime: number;
  text: string;
  sentiment: number;
}

export interface Comment {
  id: string;
  podcastId: string;
  timestamp: number;
  text: string;
  author: string;
}

export interface Highlight {
  id: string;
  podcastId: string;
  text: string;
  timestamp: number;
}

interface DataStore {
  podcasts: Podcast[];
  transcriptSegments: TranscriptSegment[];
  comments: Comment[];
  highlights: Highlight[];
}

const seedData: DataStore = {
  podcasts: [
    {
      id: "podcast-1",
      title: "深度对话：AI与创造力",
      author: "李明",
      duration: 1800,
      coverUrl:
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Podcast%20cover%20art%20with%20abstract%20neural%20network%20patterns%20blending%20with%20artistic%20brushstrokes%2C%20AI%20and%20creativity%20theme%2C%20modern%20minimalist%20design%2C%20deep%20blue%20and%20purple%20gradient&image_size=landscape_4_3",
    },
    {
      id: "podcast-2",
      title: "城市声音漫步",
      author: "张薇",
      duration: 2400,
      coverUrl:
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Podcast%20cover%20art%20with%20urban%20cityscape%20at%20dusk%2C%20sound%20wave%20patterns%20overlaying%20city%20buildings%2C%20warm%20ambient%20lighting%2C%20orange%20and%20teal%20color%20palette&image_size=landscape_4_3",
    },
    {
      id: "podcast-3",
      title: "创业者的深夜食堂",
      author: "王浩",
      duration: 3600,
      coverUrl:
        "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Podcast%20cover%20art%20with%20cozy%20late%20night%20diner%20scene%2C%20warm%20lighting%2C%20steam%20rising%20from%20food%2C%20entrepreneurial%20vibes%2C%20amber%20and%20dark%20brown%20tones&image_size=landscape_4_3",
    },
  ],
  transcriptSegments: [
    {
      id: "seg-1-1",
      podcastId: "podcast-1",
      startTime: 0,
      endTime: 180,
      text: "大家好，欢迎收听深度对话。今天我们要聊一个非常有意思的话题——人工智能与人类创造力的关系。",
      sentiment: 0.6,
    },
    {
      id: "seg-1-2",
      podcastId: "podcast-1",
      startTime: 180,
      endTime: 360,
      text: "很多人担心AI会取代人类的创造力，但我认为这种担忧是多余的。AI更像是一把新的画笔，而不是画家本身。",
      sentiment: 0.4,
    },
    {
      id: "seg-1-3",
      podcastId: "podcast-1",
      startTime: 360,
      endTime: 540,
      text: "当我们看到AI生成的艺术作品时，我们会惊叹于其技术精度，但往往缺少一种灵魂深处的共鸣。",
      sentiment: -0.2,
    },
    {
      id: "seg-1-4",
      podcastId: "podcast-1",
      startTime: 540,
      endTime: 720,
      text: "举一个例子，最近有个音乐人用AI辅助作曲，他说AI帮他突破了创作瓶颈，但最终的编曲选择还是由他来做。",
      sentiment: 0.5,
    },
    {
      id: "seg-1-5",
      podcastId: "podcast-1",
      startTime: 720,
      endTime: 900,
      text: "这其实就是人机协作的最佳模式——AI提供可能性，人类做出选择。创造力本质上是选择的艺术。",
      sentiment: 0.7,
    },
    {
      id: "seg-1-6",
      podcastId: "podcast-1",
      startTime: 900,
      endTime: 1080,
      text: "不过也有反对声音。有些传统艺术家认为，依赖AI会让我们失去手艺的纯粹性，这种损失是不可逆的。",
      sentiment: -0.5,
    },
    {
      id: "seg-1-7",
      podcastId: "podcast-1",
      startTime: 1080,
      endTime: 1260,
      text: "我理解这种担忧，但历史上每次技术革新都伴随着类似的焦虑。摄影术出现时，画家们也曾恐慌。",
      sentiment: 0.3,
    },
    {
      id: "seg-1-8",
      podcastId: "podcast-1",
      startTime: 1260,
      endTime: 1440,
      text: "结果呢？摄影反而推动了印象派的诞生，绘画从写实走向了更自由的表达。AI也许会带来类似的解放。",
      sentiment: 0.8,
    },
    {
      id: "seg-1-9",
      podcastId: "podcast-1",
      startTime: 1440,
      endTime: 1620,
      text: "让我们来谈谈教育领域。如果孩子从小就依赖AI创作，他们的想象力会不会退化？这是一个严肃的问题。",
      sentiment: -0.3,
    },
    {
      id: "seg-1-10",
      podcastId: "podcast-1",
      startTime: 1620,
      endTime: 1800,
      text: "我觉得关键在于我们如何引导。AI应该是探索的工具，而不是替代思考的拐杖。好，今天的对话就到这里，感谢大家收听。",
      sentiment: 0.5,
    },
    {
      id: "seg-2-1",
      podcastId: "podcast-2",
      startTime: 0,
      endTime: 240,
      text: "欢迎来到城市声音漫步。今天我要带你们走进北京胡同里那些快要消失的声音世界。",
      sentiment: 0.5,
    },
    {
      id: "seg-2-2",
      podcastId: "podcast-2",
      startTime: 240,
      endTime: 480,
      text: "你听，这是清晨胡同口卖豆汁儿的吆喝声。这种声音在我小时候每天都能听到，现在已经很难听到了。",
      sentiment: -0.4,
    },
    {
      id: "seg-2-3",
      podcastId: "podcast-2",
      startTime: 480,
      endTime: 720,
      text: "转过弯，一阵鸽子哨声从头顶掠过。养鸽子是老北京人的传统，那哨声一响，整条胡同都安静下来仰望天空。",
      sentiment: 0.7,
    },
    {
      id: "seg-2-4",
      podcastId: "podcast-2",
      startTime: 720,
      endTime: 960,
      text: "走到胡同深处，一位老大爷正在下棋，棋子敲击棋盘的声音清脆有力。旁边围观的人不时发出惊叹。",
      sentiment: 0.6,
    },
    {
      id: "seg-2-5",
      podcastId: "podcast-2",
      startTime: 960,
      endTime: 1200,
      text: "胡同口传来自行车的铃声，叮铃叮铃，这是最朴素的交通语言。在汽车喇叭声淹没一切之前，这就是城市的旋律。",
      sentiment: 0.3,
    },
    {
      id: "seg-2-6",
      podcastId: "podcast-2",
      startTime: 1200,
      endTime: 1440,
      text: "午后，一家小饭馆传来炒菜的滋滋声和锅铲碰撞声。老板娘在门口招呼客人，那种热情让人觉得很温暖。",
      sentiment: 0.8,
    },
    {
      id: "seg-2-7",
      podcastId: "podcast-2",
      startTime: 1440,
      endTime: 1680,
      text: "但说实话，这些声音正在一年年减少。很多胡同已经被拆迁，取而代之的是商场和高楼，声音也变得千篇一律。",
      sentiment: -0.6,
    },
    {
      id: "seg-2-8",
      podcastId: "podcast-2",
      startTime: 1680,
      endTime: 1920,
      text: "我录制这些声音，就是想留住一些记忆。声音是时间的容器，当你回听时，那些画面会自然浮现。",
      sentiment: 0.4,
    },
    {
      id: "seg-2-9",
      podcastId: "podcast-2",
      startTime: 1920,
      endTime: 2160,
      text: "傍晚时分，远处传来广场舞的音乐。虽然有人觉得吵，但这也是城市声音生态的一部分。",
      sentiment: 0.1,
    },
    {
      id: "seg-2-10",
      podcastId: "podcast-2",
      startTime: 2160,
      endTime: 2400,
      text: "今天的漫步就到这里。希望你能找时间走进自己城市的角落，去听听那些被忽略的声音。下次见。",
      sentiment: 0.6,
    },
    {
      id: "seg-3-1",
      podcastId: "podcast-3",
      startTime: 0,
      endTime: 360,
      text: "深夜好，欢迎来到创业者的深夜食堂。今天凌晨两点，坐在便利店里，咱们聊聊创业那些无人诉说的时刻。",
      sentiment: 0.2,
    },
    {
      id: "seg-3-2",
      podcastId: "podcast-3",
      startTime: 360,
      endTime: 720,
      text: "先说融资吧。很多人以为拿到投资就是成功了，但其实那只是另一场焦虑的开始。投资人每个月要看数据，你喘不过气来。",
      sentiment: -0.5,
    },
    {
      id: "seg-3-3",
      podcastId: "podcast-3",
      startTime: 720,
      endTime: 1080,
      text: "我第一次创业的时候，连续三个月发不出工资。团队里有人默默走了，有人留下来说相信我。那种愧疚感至今难忘。",
      sentiment: -0.8,
    },
    {
      id: "seg-3-4",
      podcastId: "podcast-3",
      startTime: 1080,
      endTime: 1440,
      text: "后来公司活过来了，但那段经历让我明白，创业最难的不是商业逻辑，而是在最黑暗的时刻做出正确的决定。",
      sentiment: 0.3,
    },
    {
      id: "seg-3-5",
      podcastId: "podcast-3",
      startTime: 1440,
      endTime: 1800,
      text: "说到合伙人，这可能是创业中最微妙的关系。比婚姻还难经营。利益、权力、情感纠缠在一起，稍有不慎就崩盘。",
      sentiment: -0.4,
    },
    {
      id: "seg-3-6",
      podcastId: "podcast-3",
      startTime: 1800,
      endTime: 2160,
      text: "我的建议是，合伙之前一定要把最难谈的问题先谈清楚：股权怎么分，谁拍板，退出机制是什么。别碍于面子。",
      sentiment: 0.6,
    },
    {
      id: "seg-3-7",
      podcastId: "podcast-3",
      startTime: 2160,
      endTime: 2520,
      text: "现在大家都说AI创业是风口，但我看到的真实情况是，大部分AI项目只是在包装概念，真正解决问题的不多。",
      sentiment: -0.3,
    },
    {
      id: "seg-3-8",
      podcastId: "podcast-3",
      startTime: 2520,
      endTime: 2880,
      text: "判断一个AI项目是否靠谱，就看一点：它是否能让用户在10秒内感受到价值。做不到这一点，技术再强也没用。",
      sentiment: 0.5,
    },
    {
      id: "seg-3-9",
      podcastId: "podcast-3",
      startTime: 2880,
      endTime: 3240,
      text: "聊聊心理健康吧。创业者抑郁症的比例远高于常人，但很少有人公开谈论。大家都在装坚强，这很危险。",
      sentiment: -0.7,
    },
    {
      id: "seg-3-10",
      podcastId: "podcast-3",
      startTime: 3240,
      endTime: 3420,
      text: "我的做法是每周固定找心理咨询师聊一次。不是因为我有问题，而是因为创业需要一个情绪出口。",
      sentiment: 0.4,
    },
    {
      id: "seg-3-11",
      podcastId: "podcast-3",
      startTime: 3420,
      endTime: 3600,
      text: "最后想说的是，创业不是一场百米冲刺，而是一场不知道终点在哪的马拉松。照顾好自己，比跑得快更重要。晚安。",
      sentiment: 0.6,
    },
  ],
  comments: [],
  highlights: [],
};

function loadData(): DataStore {
  if (!existsSync(DATA_PATH)) {
    writeFileSync(DATA_PATH, JSON.stringify(seedData, null, 2), "utf-8");
    return JSON.parse(JSON.stringify(seedData));
  }
  return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
}

function saveData(data: DataStore): void {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getPodcasts(): Podcast[] {
  return loadData().podcasts;
}

export function getPodcastById(id: string): Podcast | undefined {
  return loadData().podcasts.find((p) => p.id === id);
}

export function getTranscript(podcastId: string): TranscriptSegment[] {
  return loadData().transcriptSegments.filter((s) => s.podcastId === podcastId);
}

export function getComments(podcastId: string): Comment[] {
  return loadData().comments.filter((c) => c.podcastId === podcastId);
}

export function addComment(
  podcastId: string,
  comment: { timestamp: number; text: string; author: string }
): Comment {
  const data = loadData();
  const newComment: Comment = {
    id: v4(),
    podcastId,
    timestamp: comment.timestamp,
    text: comment.text,
    author: comment.author,
  };
  data.comments.push(newComment);
  saveData(data);
  return newComment;
}

export function getHighlights(podcastId: string): Highlight[] {
  return loadData().highlights.filter((h) => h.podcastId === podcastId);
}

export function addHighlight(
  podcastId: string,
  highlight: { text: string; timestamp: number }
): Highlight {
  const data = loadData();
  const newHighlight: Highlight = {
    id: v4(),
    podcastId,
    text: highlight.text,
    timestamp: highlight.timestamp,
  };
  data.highlights.push(newHighlight);
  saveData(data);
  return newHighlight;
}

export function deleteHighlight(id: string): boolean {
  const data = loadData();
  const index = data.highlights.findIndex((h) => h.id === id);
  if (index === -1) return false;
  data.highlights.splice(index, 1);
  saveData(data);
  return true;
}
