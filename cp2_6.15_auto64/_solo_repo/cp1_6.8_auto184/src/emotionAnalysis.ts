import type { Emotion, AnalysisResult } from './BottleData';

const EMOTION_KEYWORDS: Record<Emotion, string[]> = {
  happy: ['阳光', '希望', '笑容', '温暖', '幸福', '喜悦', '灿烂', '美好', '期待', '欢笑', '快乐', '开心', '满足', '甜蜜', '感恩', '欢喜', '欣慰', '舒畅', '畅快', '振奋'],
  sad: ['孤独', '失落', '思念', '眼泪', '寂寞', '遗憾', '离别', '沉默', '彷徨', '无奈', '忧伤', '悲伤', '难过', '低落', '消沉', '心酸', '惆怅', '落寞', '苦涩', '心碎'],
  angry: ['不公', '愤怒', '委屈', '不甘', '抗议', '抗争', '愤慨', '怒火', '压迫', '反抗', '生气', '恼怒', '暴躁', '愤恨', '不平', '恼火', '怒气', '愤懑', '激愤', '怨恨'],
  calm: ['安宁', '宁静', '释然', '从容', '淡然', '自在', '恬静', '悠然', '清澈', '舒展', '平静', '安详', '祥和', '闲适', '安逸', '静谧', '幽静', '清幽', '安定', '安宁'],
  fear: ['迷茫', '害怕', '未知', '黑暗', '不安', '焦虑', '忐忑', '慌张', '无助', '惶恐', '恐惧', '畏惧', '担忧', '恐慌', '惊恐', '忧虑', '战栗', '颤抖', '心慌', '胆怯'],
};

const EMOTION_POEMS: Record<Emotion, string[]> = {
  happy: [
    '愿你心中的阳光，照亮每一个平凡的日子。',
    '快乐如潮水般涌来，将你的世界染成金色。',
    '此刻的欢喜，是宇宙送给你最温柔的礼物。',
    '你的笑容，是这片海洋上最亮的光。',
    '幸福的涟漪正在扩散，每一圈都是美好。',
    '愿这份快乐，像海风一样永远伴你左右。',
    '阳光正好，微风不燥，一切都刚刚好。',
    '你值得拥有此刻所有的美好与欢愉。',
    '让快乐在心底生根，开出灿烂的花。',
    '世界因你的笑而温暖，请一直笑下去。',
  ],
  sad: [
    '大海会收下你的眼泪，在远方化作温柔的浪花。',
    '忧伤是灵魂的雨季，雨后必有彩虹等候。',
    '每一滴泪水都被大海珍藏，终会化为星光。',
    '允许自己难过，海洋从不拒绝任何一滴水。',
    '悲伤终会如潮水般退去，留下平静的沙滩。',
    '你的忧伤如此珍贵，它证明你认真地活过。',
    '夜再长，天亮之后海面依然会泛起金光。',
    '此刻的低谷，是为了让你看清更高处的风景。',
    '大海懂得你的沉默，它正用浪花为你轻唱。',
    '别怕，每一场雨都有停的时候。',
  ],
  angry: [
    '风暴过后，大地会更加坚强，你也是。',
    '愤怒是内心的火，让它照亮前行的路，而非烧毁自己。',
    '你的不平，是正义最真诚的声音。',
    '海浪拍打礁石，不是破坏，而是雕刻力量。',
    '怒火是变革的起点，愿你将之化为前行的勇气。',
    '暴风终会平息，而你的力量将永远留下。',
    '海面上的风暴，正在为你开辟新的航道。',
    '你的愤怒值得被听见，这片海正在倾听。',
    '勇敢地表达，就像海浪勇敢地拍打岸边。',
    '怒潮之中蕴藏着巨大的力量，请善用它。',
  ],
  calm: [
    '在宁静中，你找到了最真实的自己。',
    '心如止水，映照出世间最美的倒影。',
    '这份平静是海赠予你的礼物，请好好珍藏。',
    '平静是内心深处最温柔的力量。',
    '当世界喧嚣，你选择了宁静，这是勇气。',
    '你的从容，像这片海一样深邃而安宁。',
    '在平静的海面上，你能看见最远的远方。',
    '宁静不是无声，而是万物和谐的韵律。',
    '愿你的内心，永远如这片海一般辽阔安宁。',
    '此刻的安宁，是你送给自己最好的礼物。',
  ],
  fear: [
    '黑暗中总有一束光，在等你勇敢地走向它。',
    '恐惧是成长的路标，跨过去就是全新的世界。',
    '你并不孤单，这片海上的每一颗星都在为你闪烁。',
    '未知的深处，或许藏着意想不到的惊喜。',
    '即使风浪再大，海面终会归于平静，你也会。',
    '害怕是正常的，勇敢不是不恐惧，而是继续前行。',
    '当你穿过迷雾，会发现前方的海比想象更美。',
    '每一颗恐惧的种子，都可能长出勇敢的花。',
    '你比自己以为的更强大，大海会证明这一点。',
    '请相信，黎明前的黑暗最浓，但光终会到来。',
  ],
};

export function analyzeEmotion(content: string, emotion: Emotion): AnalysisResult {
  const keywords: string[] = [];
  const emotionKeywords = EMOTION_KEYWORDS[emotion];

  for (const keyword of emotionKeywords) {
    if (content.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  if (keywords.length === 0) {
    const randomIndex = Math.floor(Math.random() * emotionKeywords.length);
    keywords.push(emotionKeywords[randomIndex]);
  }

  if (keywords.length < 2) {
    const remaining = emotionKeywords.filter(k => !keywords.includes(k));
    if (remaining.length > 0) {
      keywords.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }
  }

  const poems = EMOTION_POEMS[emotion];
  const poem = poems[Math.floor(Math.random() * poems.length)];

  return {
    keywords: keywords.slice(0, 5),
    poem,
    emotion,
  };
}

export { EMOTION_KEYWORDS, EMOTION_POEMS };
