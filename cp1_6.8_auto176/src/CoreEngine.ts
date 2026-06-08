import {
  EmotionType,
  AnalyzedPoem,
  AnalyzedLine,
  EMOTION_KEYWORD_MAP,
  EMOTION_COLOR_MAP,
  EMOTION_MUSIC_MAP,
  IMAGERY_KEYWORD_MAP,
} from "./PoemData";

const MAX_LINES = 12;
const LINE_DELAY_MS = 800;

function detectEmotion(line: string): { emotion: EmotionType; intensity: number } {
  const scores: Record<EmotionType, number> = { "悲": 0, "喜": 0, "思": 0, "寂": 0 };

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (line.includes(kw)) {
        scores[emotion as EmotionType] += 1;
      }
    }
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { emotion: "寂", intensity: 0.2 };
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topEmotion = sorted[0][0] as EmotionType;
  const rawIntensity = scores[topEmotion] / total;
  const intensity = Math.min(0.3 + rawIntensity * 0.7, 1.0);

  return { emotion: topEmotion, intensity };
}

function extractImageryTags(line: string): string[] {
  const tags: string[] = [];
  for (const [keyword, label] of Object.entries(IMAGERY_KEYWORD_MAP)) {
    if (line.includes(keyword) && !tags.includes(label)) {
      tags.push(label);
    }
  }
  return tags.length > 0 ? tags.slice(0, 3) : ["意境"];
}

export function parseLines(raw: string): string[] {
  return raw
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, MAX_LINES);
}

export function analyzePoem(lines: string[], title?: string, author?: string): AnalyzedPoem {
  const analyzedLines: AnalyzedLine[] = lines.map((text, index) => {
    const { emotion, intensity } = detectEmotion(text);
    const tags = extractImageryTags(text);
    const color = EMOTION_COLOR_MAP[emotion];
    const music = EMOTION_MUSIC_MAP[emotion];

    return {
      text,
      emotion,
      intensity,
      tags,
      music,
      color,
      delay: index * LINE_DELAY_MS,
    };
  });

  return {
    title: title ?? "自题诗",
    author: author ?? "佚名",
    lines: analyzedLines,
  };
}
