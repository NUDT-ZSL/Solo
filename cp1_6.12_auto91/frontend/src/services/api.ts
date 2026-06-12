import axios from 'axios';
import type { InitialData, SentimentResult } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export async function fetchInitialData(): Promise<InitialData> {
  try {
    const response = await api.get<InitialData>('/initial_data');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn('后端API不可用，使用模拟数据:', error.message);
      return generateMockData();
    }
    throw error;
  }
}

export async function analyzeTexts(texts: string[]): Promise<SentimentResult[]> {
  const response = await api.post<{ results: SentimentResult[] }>('/sentiment_analysis', {
    texts,
  });
  return response.data.results;
}

function generateMockData(): InitialData {
  const startHour = 18;
  const slots = 10;
  const formatTime = (idx: number) => {
    const mins = startHour * 60 + idx * 30;
    return `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
  };

  const emotions = ['joy', 'surprise', 'sadness', 'anger', 'fear'] as const;

  const sampleTexts = [
    '舞台效果太震撼了！灯光和音响完美配合，简直炸裂！',
    '主唱的声音太好听了，现场比录音版更有感染力！',
    '没想到嘉宾突然登场，全场尖叫，太惊喜了！',
    '人真的超级多，挤了半天才到前排，但值了！',
    'encore环节泪目了，全场大合唱，感动到哭',
    '排队买水排了20分钟，体验有点差，希望下次改进',
    '音乐节的氛围真的太棒了，每个人都好嗨！',
    '吉他solo那段帅炸了，鸡皮疙瘩都起来了',
    '有点担心散场交通，但现场安保很到位',
    '灯光秀太惊艳了，手机根本拍不出现场的感觉',
  ];

  const timeline = Array.from({ length: slots }, (_, i) => {
    const peak = Math.sin((i / slots) * Math.PI);
    const base = 0.3 + peak * 0.4;
    const noise = (Math.random() - 0.5) * 0.3;
    return {
      time: formatTime(i),
      timestamp: i,
      avg_sentiment: Math.max(-1, Math.min(1, +(base + noise).toFixed(3))),
      comment_count: Math.floor(Math.random() * 60) + 20,
      emotion_distribution: Object.fromEntries(
        emotions.map((e) => [
          e,
          +(
            Math.random() * 6 +
            2 +
            (peak * 2 * (e === 'joy' || e === 'surprise' ? 1 : 0))
          ).toFixed(2),
        ])
      ) as Record<string, number>,
    };
  });

  const comments = timeline.flatMap((slot) => {
    const count = Math.floor(Math.random() * 5) + 3;
    return Array.from({ length: count }, (_, idx) => {
      const weights = emotions.map((e) => (slot.emotion_distribution as any)[e]);
      const totalW = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalW;
      let emoIdx = 0;
      for (let k = 0; k < weights.length; k++) {
        r -= weights[k];
        if (r <= 0) {
          emoIdx = k;
          break;
        }
      }
      const emotion = emotions[emoIdx];
      const score =
        emotion === 'joy' || emotion === 'surprise'
          ? Math.random() * 0.5 + 0.3
          : emotion === 'sadness' || emotion === 'fear' || emotion === 'anger'
          ? Math.random() * -0.5 - 0.2
          : 0;
      return {
        id: `c_${slot.timestamp}_${idx}`,
        text: sampleTexts[(slot.timestamp * 3 + idx) % sampleTexts.length],
        time: slot.time,
        timestamp: slot.timestamp,
        emotion,
        emotion_label: emotion === 'joy' ? '😊' : emotion === 'surprise' ? '😲' : emotion === 'sadness' ? '😢' : emotion === 'anger' ? '😠' : '😨',
        score: +score.toFixed(3),
        user: `用户${1000 + Math.floor(Math.random() * 9000)}`,
      };
    });
  });

  const images = [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=800&fit=crop',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=500&fit=crop',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=600&fit=crop',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=450&fit=crop',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&h=700&fit=crop',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=600&h=500&fit=crop',
  ];

  const captions = [
    '现场氛围拉满！🔥',
    '今晚的舞台太美了',
    '和最好的朋友在这里',
    '完美的夜晚，完美的演出',
    '太开心了！还想再来一次',
    '音乐让人忘记一切',
    '这一刻，永远铭记',
    '散场前的最后一首歌',
    '青春的样子',
  ];

  const media = Array.from({ length: 45 }, (_, i) => {
    const slotIdx = Math.floor(Math.random() * slots);
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    return {
      id: `m_${i}`,
      image_url: `${images[i % images.length]}&sig=${i}`,
      thumbnail_url: `${images[i % images.length]}&sig=${i}&w=300`,
      caption: captions[Math.floor(Math.random() * captions.length)],
      time: formatTime(slotIdx),
      timestamp: slotIdx,
      emotion,
      emotion_label: emotion === 'joy' ? '😊' : emotion === 'surprise' ? '😲' : emotion === 'sadness' ? '😢' : emotion === 'anger' ? '😠' : '😨',
      likes: Math.floor(Math.random() * 490) + 10,
      user: `用户${1000 + Math.floor(Math.random() * 9000)}`,
      related_comment_id: `c_${slotIdx}_0`,
    };
  }).sort((a, b) => a.timestamp - b.timestamp);

  const emotionSummary = Object.fromEntries(
    emotions.map((e) => {
      const count = Math.floor(Math.random() * 30) + 15;
      return [
        e,
        {
          count,
          ratio: +(count / (comments.length + media.length)).toFixed(3),
          score: +(Math.min(10, Math.random() * 6 + 2 + (e === 'joy' ? 1.5 : 0))).toFixed(2),
        },
      ];
    })
  ) as Record<string, any>;

  return {
    event_name: '夏日星空音乐节 2026',
    event_date: '2026-06-10',
    event_duration: `${formatTime(0)} - ${formatTime(slots)}`,
    stats: {
      total_comments: comments.length,
      total_media: media.length,
      avg_sentiment: +(comments.reduce((s, c) => s + c.score, 0) / comments.length).toFixed(3),
    },
    timeline,
    comments,
    media,
    emotion_summary: emotionSummary,
  } as InitialData;
}
