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

export interface RadarData {
  semanticUnderstanding: number;
  reactionSpeed: number;
  logicalCoherence: number;
  emotionalPerception: number;
  vocabularyRichness: number;
}

export interface RoundResult {
  sceneId: string;
  selectedOptionId: string;
  correctOptionId: string;
  semanticScore: number;
  speedScore: number;
  totalScore: number;
  responseTime: number;
  isCorrect: boolean;
  timestamp: number;
}

export interface RoundFeedback {
  semanticScore: number;
  speedScore: number;
  totalScore: number;
  isCorrect: boolean;
  correctOptionId: string;
  selectedOptionId: string;
  comboCount: number;
  triggerComboEffect: boolean;
  wrongStreak: number;
  enterCooldown: boolean;
}

const TOTAL_DURATION_MS = 5000;
const COMBO_TRIGGER_COUNT = 3;
const COOLDOWN_WRONG_THRESHOLD = 3;

function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const dp: number[][] = Array.from({ length: s1.length + 1 }, () => new Array(s2.length + 1).fill(0));
  for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[s1.length][s2.length];
}

function normalizedSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return Math.max(0, 1 - distance / maxLen);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0)
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const s1 = tokenize(a);
  const s2 = tokenize(b);
  if (s1.size === 0 && s2.size === 0) return 1;
  if (s1.size === 0 || s2.size === 0) return 0;
  let intersect = 0;
  s1.forEach(token => { if (s2.has(token)) intersect++; });
  const union = s1.size + s2.size - intersect;
  return intersect / union;
}

function computeSemanticSimilarity(selectedText: string, correctText: string): number {
  const editSim = normalizedSimilarity(selectedText, correctText);
  const jaccardSim = jaccardSimilarity(selectedText, correctText);
  return Math.round((editSim * 0.4 + jaccardSim * 0.6) * 100);
}

export class ScoringSystem {
  private comboCount: number = 0;
  private wrongStreak: number = 0;
  private roundResults: RoundResult[] = [];
  private roundStartTimestamp: number = 0;

  startRound(): void {
    this.roundStartTimestamp = performance.now();
  }

  evaluateChoice(
    scene: Scene,
    selectedOptionId: string,
    remainingTimeRatio: number
  ): RoundFeedback {
    const selectedOption = scene.options.find(o => o.id === selectedOptionId);
    const correctOption = scene.options.find(o => o.isCorrect);

    const now = performance.now();
    const responseTimeMs = now - this.roundStartTimestamp;
    const responseTimeSeconds = Math.min(5, Math.max(0, responseTimeMs / 1000));

    let semanticScore = 0;
    let isCorrect = false;

    if (selectedOption && correctOption) {
      isCorrect = selectedOption.id === correctOption.id;
      const presetScore = Math.min(100, Math.max(0, selectedOption.matchScore));
      const textSimScore = computeSemanticSimilarity(selectedOption.text, correctOption.text);
      semanticScore = Math.round(presetScore * 0.55 + textSimScore * 0.45);
      semanticScore = Math.min(100, Math.max(0, semanticScore));
    }

    const speedScore = Math.round(Math.max(0, Math.min(100, remainingTimeRatio * 100)));
    const totalScore = Math.round(semanticScore * 0.7 + speedScore * 0.3);

    if (isCorrect) {
      this.comboCount += 1;
      this.wrongStreak = 0;
    } else {
      this.comboCount = 0;
      this.wrongStreak += 1;
    }

    const triggerComboEffect = isCorrect && this.comboCount >= COMBO_TRIGGER_COUNT && this.comboCount % COMBO_TRIGGER_COUNT === 0;
    const enterCooldown = this.wrongStreak >= COOLDOWN_WRONG_THRESHOLD;
    if (enterCooldown) {
      this.wrongStreak = 0;
    }

    const result: RoundResult = {
      sceneId: scene.id,
      selectedOptionId: selectedOptionId || '',
      correctOptionId: correctOption?.id || '',
      semanticScore,
      speedScore,
      totalScore,
      responseTime: responseTimeSeconds,
      isCorrect,
      timestamp: Date.now()
    };
    this.roundResults.push(result);

    return {
      semanticScore,
      speedScore,
      totalScore,
      isCorrect,
      correctOptionId: correctOption?.id || '',
      selectedOptionId: selectedOptionId || '',
      comboCount: this.comboCount,
      triggerComboEffect,
      wrongStreak: this.wrongStreak,
      enterCooldown
    };
  }

  handleTimeout(scene: Scene): RoundFeedback {
    return this.evaluateChoice(scene, '', 0);
  }

  getRoundResults(): RoundResult[] {
    return [...this.roundResults];
  }

  reset(): void {
    this.comboCount = 0;
    this.wrongStreak = 0;
    this.roundResults = [];
    this.roundStartTimestamp = 0;
  }

  getOverallStats(): {
    totalRounds: number;
    correctCount: number;
    avgSemantic: number;
    avgSpeed: number;
    avgTotal: number;
    avgResponseTime: number;
    bestCombo: number;
    totalScore: number;
  } {
    const totalRounds = this.roundResults.length;
    if (totalRounds === 0) {
      return {
        totalRounds: 0,
        correctCount: 0,
        avgSemantic: 0,
        avgSpeed: 0,
        avgTotal: 0,
        avgResponseTime: 0,
        bestCombo: 0,
        totalScore: 0
      };
    }

    const correctResults = this.roundResults.filter(r => r.isCorrect);
    const correctCount = correctResults.length;

    const avgSemantic = this.roundResults.reduce((s, r) => s + r.semanticScore, 0) / totalRounds;
    const avgSpeed = this.roundResults.reduce((s, r) => s + r.speedScore, 0) / totalRounds;
    const avgTotal = this.roundResults.reduce((s, r) => s + r.totalScore, 0) / totalRounds;
    const avgResponseTime = this.roundResults.reduce((s, r) => s + r.responseTime, 0) / totalRounds;
    const totalScore = this.roundResults.reduce((s, r) => s + r.totalScore, 0);

    let runningCombo = 0;
    let bestCombo = 0;
    for (const r of this.roundResults) {
      if (r.isCorrect) {
        runningCombo += 1;
        if (runningCombo > bestCombo) bestCombo = runningCombo;
      } else {
        runningCombo = 0;
      }
    }

    return {
      totalRounds,
      correctCount,
      avgSemantic: Math.round(avgSemantic),
      avgSpeed: Math.round(avgSpeed),
      avgTotal: Math.round(avgTotal),
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      bestCombo,
      totalScore
    };
  }

  buildRadarData(): RadarData {
    const stats = this.getOverallStats();
    const results = this.roundResults;
    if (results.length === 0) {
      return {
        semanticUnderstanding: 0,
        reactionSpeed: 0,
        logicalCoherence: 0,
        emotionalPerception: 0,
        vocabularyRichness: 0
      };
    }

    const correctRate = stats.totalRounds > 0 ? stats.correctCount / stats.totalRounds : 0;
    const recent5 = results.slice(-Math.min(5, results.length));
    const recentCorrect = recent5.filter(r => r.isCorrect).length / (recent5.length || 1);
    const goodResponses = results.filter(r => r.semanticScore >= 85).length / results.length;

    const semanticUnderstanding = stats.avgSemantic;
    const reactionSpeed = stats.avgSpeed;
    const logicalCoherence = Math.min(100, Math.round(stats.avgTotal * 0.55 + correctRate * 100 * 0.45));
    const emotionalPerception = Math.min(100, Math.round(stats.avgSemantic * 0.6 + recentCorrect * 100 * 0.4));
    const vocabularyRichness = Math.min(100, Math.round(goodResponses * 100 * 0.6 + (stats.avgResponseTime < 2.5 ? 40 : stats.avgResponseTime < 3.8 ? 25 : 10)));

    return {
      semanticUnderstanding,
      reactionSpeed,
      logicalCoherence,
      emotionalPerception,
      vocabularyRichness
    };
  }

  getWrongResults(sceneMap: Map<string, Scene>): {
    id: string;
    sceneDescription: string;
    selectedOption: string;
    correctOption: string;
    semanticScore: number;
    timestamp: number;
  }[] {
    const wrong = this.roundResults.filter(r => !r.isCorrect).slice().reverse().slice(0, 5);
    return wrong.map(r => {
      const scene = sceneMap.get(r.sceneId);
      const selected = scene?.options.find(o => o.id === r.selectedOptionId);
      const correct = scene?.options.find(o => o.id === r.correctOptionId);
      return {
        id: `${r.sceneId}-${r.timestamp}`,
        sceneDescription: scene?.description || '场景加载失败',
        selectedOption: selected?.text || '未选择（超时）',
        correctOption: correct?.text || '未知',
        semanticScore: r.semanticScore,
        timestamp: r.timestamp
      };
    });
  }
}

export const TOTAL_ROUNDS = 10;
export const COUNTDOWN_DURATION_MS = TOTAL_DURATION_MS;
