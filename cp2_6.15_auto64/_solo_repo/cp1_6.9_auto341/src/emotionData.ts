import * as THREE from 'three';

export type EmotionType = 'sadness' | 'anger' | 'calm' | 'joy';

export interface EmotionData {
  type: EmotionType;
  label: string;
  intensities: Float32Array;
  primaryColor: THREE.Color;
  gradientStart: THREE.Color;
  gradientEnd: THREE.Color;
  textLength: number;
  charCount: number;
}

const EMOTION_COLORS: Record<EmotionType, {
  label: string;
  gradientStart: number;
  gradientEnd: number;
  primaryColor: number;
}> = {
  sadness: {
    label: '悲伤',
    gradientStart: 0x4a00e0,
    gradientEnd: 0x8e2de2,
    primaryColor: 0x6a11cb
  },
  anger: {
    label: '愤怒',
    gradientStart: 0xff416d,
    gradientEnd: 0xf7971e,
    primaryColor: 0xff512f
  },
  calm: {
    label: '平静',
    gradientStart: 0x11998e,
    gradientEnd: 0x38ef7d,
    primaryColor: 0x00b09b
  },
  joy: {
    label: '喜悦',
    gradientStart: 0xffd700,
    gradientEnd: 0xffa500,
    primaryColor: 0xffcc00
  }
};

const SADNESS_CHARS = '泪忧伤悲愁哀痛凄凉孤独寂寞失落空虚憔悴心碎绝望沮丧难过伤心哭叹息凋零枯萎';
const ANGER_CHARS = '怒火恨愤怒暴躁狂怒愤怒怒咆哮嘶吼抓狂气愤愤怨恨恼怒愤慨暴怒激愤';
const CALM_CHARS = '平静安宁宁静祥和温柔和静静谧恬淡悠然从容淡泊清雅素净淡雅';
const JOY_CHARS = '喜乐欢乐开心高兴愉快幸福喜悦欢欣愉悦微笑甜蜜温柔美妙希望梦想期待';

const SADNESS_EN = 'sad sorrow grief mourn cry tear lonely empty despair heartbroken';
const ANGER_EN = 'angry rage hate fury wrath furious temper outrage resent';
const CALM_EN = 'calm peaceful serene tranquil gentle quiet soft harmony still';
const JOY_EN = 'joy happy delight cheerful smile love warm hope dream sweet';

function hashChar(ch: string): number {
  let hash = 0;
  for (let i = 0; i < ch.length; i++) {
    hash = ((hash << 5) - hash) + ch.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function analyzeText(text: string, particleCount: number): EmotionData {
  const cleanText = text.slice(0, 100);
  const chars = Array.from(cleanText);
  const charCount = chars.length;

  let sadnessScore = 0, angerScore = 0, calmScore = 0, joyScore = 0;

  for (const ch of chars) {
    const lowerCh = ch.toLowerCase();
    sadnessScore += countMatches(SADNESS_CHARS, ch);
    angerScore += countMatches(ANGER_CHARS, ch);
    calmScore += countMatches(CALM_CHARS, ch);
    joyScore += countMatches(JOY_CHARS, ch);
    sadnessScore += countMatches(SADNESS_EN, lowerCh);
    angerScore += countMatches(ANGER_EN, lowerCh);
    calmScore += countMatches(CALM_EN, lowerCh);
    joyScore += countMatches(JOY_EN, lowerCh);
  }

  const baseScore = Math.max(charCount * 0.1, 1);
  sadnessScore += baseScore;
  angerScore += baseScore;
  calmScore += baseScore;
  joyScore += baseScore;

  const total = sadnessScore + angerScore + calmScore + joyScore;
  sadnessScore /= total;
  angerScore /= total;
  calmScore /= total;
  joyScore /= total;

  const maxScore = Math.max(sadnessScore, angerScore, calmScore, joyScore);
  let emotionType: EmotionType;
  if (maxScore === sadnessScore) emotionType = 'sadness';
  else if (maxScore === angerScore) emotionType = 'anger';
  else if (maxScore === calmScore) emotionType = 'calm';
  else emotionType = 'joy';

  const colors = EMOTION_COLORS[emotionType];
  const intensities = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    if (charCount > 0) {
      const charIndex = i % charCount;
      const ch = chars[charIndex];
      const charHash = hashChar(ch);
      let score = 0;
      if (emotionType === 'sadness') score = countMatches(SADNESS_CHARS, ch) / SADNESS_CHARS.length * 10;
      else if (emotionType === 'anger') score = countMatches(ANGER_CHARS, ch) / ANGER_CHARS.length * 10;
      else if (emotionType === 'calm') score = countMatches(CALM_CHARS, ch) / CALM_CHARS.length * 10;
      else score = countMatches(JOY_CHARS, ch) / JOY_CHARS.length * 10;

      const hashNorm = (charHash % 1000) / 1000;
      intensities[i] = Math.min(1, Math.max(0.1, 0.3 + score * 0.5 + hashNorm * 0.4));
    } else {
      intensities[i] = 0.3 + Math.random() * 0.5;
    }
  }

  return {
    type: emotionType,
    label: colors.label,
    intensities,
    primaryColor: new THREE.Color(colors.primaryColor),
    gradientStart: new THREE.Color(colors.gradientStart),
    gradientEnd: new THREE.Color(colors.gradientEnd),
    textLength: cleanText.length,
    charCount
  };
}

function countMatches(source: string, target: string): number {
  let count = 0;
  for (const ch of source) {
    if (target === ch) count++;
  }
  return count;
}

export function getComplementaryColor(color: THREE.Color): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.h = (hsl.h + 0.5) % 1;
  return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
}
