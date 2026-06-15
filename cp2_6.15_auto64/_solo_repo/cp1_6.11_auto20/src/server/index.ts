import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const positiveWords = [
  '快乐', '幸福', '喜悦', '热爱', '希望', '光明', '温暖', '美丽', '梦想', '自由',
  '成功', '勇敢', '善良', '真诚', '微笑', '阳光', '鲜花', '彩虹', '星空', '浪漫',
  '甜蜜', '温馨', '宁静', '和谐', '繁荣', '辉煌', '奇迹', '祝福', '感激', '热情',
  '愉悦', '欢乐', '欢快', '欣喜', '满意', '自信', '乐观', '向上', '积极', '美好',
  '壮丽', '璀璨', '辉煌', '绚烂', '灿烂', '清新', '清澈', '纯净', '优雅', '高贵',
  '安宁', '安详', '平和', '顺利', '幸运', '珍惜', '感恩', '欣赏', '赞美', '鼓励',
  '温柔', '细腻', '贴心', '呵护', '陪伴', '守护', '真诚', '坚定', '执着', '信念',
  'happy', 'joy', 'love', 'hope', 'light', 'warm', 'beautiful', 'dream', 'free', 'sunshine',
  'wonderful', 'amazing', 'great', 'excellent', 'fantastic', 'brilliant', 'cheerful', 'delightful',
  'bliss', 'euphoria', 'serenity', 'gratitude', 'passion', 'courage', 'harmony', 'peaceful', 'graceful', 'splendid'
];

const negativeWords = [
  '悲伤', '痛苦', '绝望', '恐惧', '黑暗', '寒冷', '孤独', '失落', '失败', '懦弱',
  '虚伪', '哭泣', '阴影', '暴风雨', '噩梦', '焦虑', '压抑', '愤怒', '仇恨', '忧伤',
  '惆怅', '迷茫', '困惑', '疲惫', '空虚', '寂寞', '沮丧', '消沉', '悲观', '绝望',
  '凄凉', '惨淡', '荒芜', '凋零', '腐朽', '崩溃', '破碎', '撕裂', '挣扎', '煎熬',
  '恐惧', '惊慌', '惶恐', '不安', '紧张', '烦躁', '厌恶', '鄙视', '背叛', '欺骗',
  '冷漠', '无情', '残酷', '残忍', '悲伤', '哀痛', '悼念', '悔恨', '遗憾', '愧疚',
  '失望', '挫败', '沮丧', '颓废', '堕落', '沉沦', '迷茫', '彷徨', '无助', '无力',
  'sad', 'pain', 'fear', 'dark', 'cold', 'lonely', 'lost', 'fail', 'nightmare', 'anger',
  'hate', 'sorrow', 'grief', 'anxiety', 'depression', 'hopeless', 'misery', 'suffering',
  'despair', 'agony', 'torment', 'dread', 'panic', 'terror', 'rage', 'fury', 'remorse', 'gloomy'
];

type MusicStyle = 'dreamy' | 'tense' | 'healing' | 'epic';

interface ChordProgression {
  chords: number[][];
  bpm: number;
  baseVolume: number;
}

const styleChordProgressions: Record<MusicStyle, ChordProgression> = {
  dreamy: {
    chords: [
      [261.63, 329.63, 392.00],
      [293.66, 349.23, 440.00],
      [329.63, 392.00, 493.88],
      [261.63, 329.63, 392.00],
    ],
    bpm: 72,
    baseVolume: 0.15,
  },
  tense: {
    chords: [
      [277.18, 349.23, 415.30],
      [311.13, 369.99, 466.16],
      [261.63, 311.13, 392.00],
      [349.23, 415.30, 523.25],
    ],
    bpm: 120,
    baseVolume: 0.2,
  },
  healing: {
    chords: [
      [261.63, 329.63, 392.00],
      [349.23, 440.00, 523.25],
      [392.00, 493.88, 587.33],
      [440.00, 523.25, 659.25],
    ],
    bpm: 60,
    baseVolume: 0.12,
  },
  epic: {
    chords: [
      [196.00, 246.94, 293.66],
      [174.61, 220.00, 261.63],
      [220.00, 277.18, 329.63],
      [196.00, 246.94, 293.66],
    ],
    bpm: 90,
    baseVolume: 0.25,
  },
};

const SAMPLE_RATE = 22050;
const DURATION_SECONDS = 30;

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function generateWavBuffer(chords: number[][], bpm: number, baseVolume: number): ArrayBuffer {
  const beatDuration = 60 / bpm;
  const noteDuration = beatDuration * 2;
  const totalSamples = SAMPLE_RATE * DURATION_SECONDS;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = totalSamples * numChannels * (bitsPerSample / 8);
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const waveforms = ['sine', 'triangle', 'sawtooth', 'square'] as const;
  let offset = 44;

  for (let sampleIdx = 0; sampleIdx < totalSamples; sampleIdx++) {
    const time = sampleIdx / SAMPLE_RATE;
    const loopDuration = noteDuration * 8;
    const timeInLoop = time % loopDuration;
    const barIndex = Math.floor(timeInLoop / noteDuration);
    const chord = chords[barIndex % chords.length];
    const timeInNote = timeInLoop - barIndex * noteDuration;

    const attack = 0.05;
    const release = 0.1;
    let envelope = 0;
    if (timeInNote < attack) {
      envelope = timeInNote / attack;
    } else if (timeInNote > noteDuration - release) {
      envelope = Math.max(0, (noteDuration - timeInNote) / release);
    } else {
      envelope = 1;
    }

    let sampleMono = 0;

    chord.forEach((freq, noteIdx) => {
      const waveform = waveforms[noteIdx % waveforms.length];
      const phase = (time * freq) % 1;
      let waveSample = 0;

      switch (waveform) {
        case 'sine':
          waveSample = Math.sin(phase * Math.PI * 2);
          break;
        case 'triangle':
          waveSample = 4 * Math.abs(phase - 0.5) - 1;
          break;
        case 'sawtooth':
          waveSample = 2 * phase - 1;
          break;
        case 'square':
          waveSample = phase < 0.5 ? 1 : -1;
          break;
      }

      const volume = baseVolume * 0.3 * envelope;
      sampleMono += waveSample * volume;
    });

    sampleMono = Math.max(-1, Math.min(1, sampleMono));

    view.setInt16(offset, Math.round(sampleMono * 32767), true);
    offset += 2;
  }

  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function analyzeSentiment(text: string): { polarity: number; wordFreq: Map<string, number> } {
  let positiveCount = 0;
  let negativeCount = 0;
  const wordFreq = new Map<string, number>();

  const tokens = text.split(/[\s，。！？、；：""''（）【】《》,.!?;:\'\"\(\)\[\]<>]+/).filter(t => t.length > 0);

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();

    if (wordFreq.has(token)) {
      wordFreq.set(token, wordFreq.get(token)! + 1);
    } else {
      wordFreq.set(token, 1);
    }

    for (const pw of positiveWords) {
      if (lowerToken.includes(pw.toLowerCase()) || pw.toLowerCase().includes(lowerToken)) {
        positiveCount++;
        break;
      }
    }
    for (const nw of negativeWords) {
      if (lowerToken.includes(nw.toLowerCase()) || nw.toLowerCase().includes(lowerToken)) {
        negativeCount++;
        break;
      }
    }
  }

  const total = positiveCount + negativeCount;
  let polarity = 0;
  if (total > 0) {
    polarity = (positiveCount - negativeCount) / total;
  }

  return { polarity, wordFreq };
}

function extractKeywords(text: string, wordFreq: Map<string, number>, polarity: number, count: number = 5): string[] {
  const scored: { word: string; score: number }[] = [];

  wordFreq.forEach((freq, word) => {
    if (word.length < 1) return;

    let score = freq * 2;
    const lowerWord = word.toLowerCase();

    for (const pw of positiveWords) {
      if (lowerWord.includes(pw.toLowerCase()) || pw.toLowerCase().includes(lowerWord)) {
        score += polarity > 0 ? 10 : 5;
        break;
      }
    }
    for (const nw of negativeWords) {
      if (lowerWord.includes(nw.toLowerCase()) || nw.toLowerCase().includes(lowerWord)) {
        score += polarity < 0 ? 10 : 5;
        break;
      }
    }

    if (word.length >= 2) score += 3;
    if (word.length >= 4) score += 2;

    scored.push({ word, score });
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.min(count, scored.length)).map(s => s.word);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(c1.r + (c2.r - c1.r) * t, c1.g + (c2.g - c1.g) * t, c1.b + (c2.b - c1.b) * t);
}

function getColorForPolarity(polarity: number): string {
  if (polarity > 0.2) {
    return interpolateColor('#FFD700', '#FF69B4', (polarity - 0.2) / 0.8);
  } else if (polarity < -0.2) {
    return interpolateColor('#1E3A5F', '#7B2D8E', (Math.abs(polarity) - 0.2) / 0.8);
  }
  return '#E0E0E0';
}

function generateParticleColors(polarity: number, count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const variation = (Math.random() - 0.5) * 0.4;
    const adjustedPolarity = Math.max(-1, Math.min(1, polarity + variation));
    colors.push(getColorForPolarity(adjustedPolarity));
  }
  return colors;
}

app.post('/api/generate', (req, res) => {
  try {
    const { text, style } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '缺少文字内容' });
    }
    if (text.length < 50 || text.length > 300) {
      return res.status(400).json({ error: '文字长度需在50-300字之间' });
    }

    const validStyles: MusicStyle[] = ['dreamy', 'tense', 'healing', 'epic'];
    const musicStyle: MusicStyle = validStyles.includes(style) ? style : 'healing';

    const { polarity, wordFreq } = analyzeSentiment(text);
    const keywords = extractKeywords(text, wordFreq, polarity);
    const particleCount = Math.floor(300 + Math.random() * 50);

    const chordProgression = styleChordProgressions[musicStyle];
    const bpmAdjustment = 1 + polarity * 0.3;
    const adjustedBpm = Math.max(60, Math.min(140, Math.round(chordProgression.bpm * bpmAdjustment)));

    console.log('开始生成WAV音频...');
    const wavBuffer = generateWavBuffer(chordProgression.chords, adjustedBpm, chordProgression.baseVolume);
    const wavBase64 = arrayBufferToBase64(wavBuffer);
    console.log('WAV音频生成完成，大小:', Math.round(wavBase64.length / 1024), 'KB');

    const response = {
      id: uuidv4(),
      polarity,
      keywords,
      particleCount,
      particleColors: generateParticleColors(polarity, particleCount),
      primaryColor: getColorForPolarity(polarity),
      music: {
        style: musicStyle,
        chords: chordProgression.chords,
        bpm: adjustedBpm,
        baseVolume: chordProgression.baseVolume,
        audioDataUrl: `data:audio/wav;base64,${wavBase64}`,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('生成失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), positiveWords: positiveWords.length, negativeWords: negativeWords.length });
});

app.listen(PORT, () => {
  console.log(`余音织梦服务端运行在 http://localhost:${PORT}`);
  console.log(`情感词库: 积极词 ${positiveWords.length} 个, 消极词 ${negativeWords.length} 个`);
});

export default app;
