export type GameAction =
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'MOVE_FORWARD'
  | 'MOVE_BACKWARD'
  | 'SKILL_FIREBALL'
  | 'SKILL_ICE'
  | 'SKILL_SHIELD'
  | 'STORY_A'
  | 'STORY_B'
  | 'STORY_C';

export const ACTION_LABELS: Record<GameAction, string> = {
  MOVE_LEFT: '向左移动',
  MOVE_RIGHT: '向右移动',
  MOVE_FORWARD: '向前移动',
  MOVE_BACKWARD: '向后移动',
  SKILL_FIREBALL: '火球术',
  SKILL_ICE: '冰冻术',
  SKILL_SHIELD: '护盾术',
  STORY_A: '选项A',
  STORY_B: '选项B',
  STORY_C: '选项C',
};

const COMMAND_PATTERNS: [string, GameAction][] = [
  ['左移', 'MOVE_LEFT'],
  ['向左', 'MOVE_LEFT'],
  ['左走', 'MOVE_LEFT'],
  ['右移', 'MOVE_RIGHT'],
  ['向右', 'MOVE_RIGHT'],
  ['右走', 'MOVE_RIGHT'],
  ['前进', 'MOVE_FORWARD'],
  ['向前', 'MOVE_FORWARD'],
  ['前移', 'MOVE_FORWARD'],
  ['后退', 'MOVE_BACKWARD'],
  ['向后', 'MOVE_BACKWARD'],
  ['后移', 'MOVE_BACKWARD'],
  ['放火球', 'SKILL_FIREBALL'],
  ['火球', 'SKILL_FIREBALL'],
  ['火焰', 'SKILL_FIREBALL'],
  ['放冰冻', 'SKILL_ICE'],
  ['冰冻', 'SKILL_ICE'],
  ['冰晶', 'SKILL_ICE'],
  ['放护盾', 'SKILL_SHIELD'],
  ['护盾', 'SKILL_SHIELD'],
  ['防御', 'SKILL_SHIELD'],
  ['选项A', 'STORY_A'],
  ['选A', 'STORY_A'],
  ['选项B', 'STORY_B'],
  ['选B', 'STORY_B'],
  ['选项C', 'STORY_C'],
  ['选C', 'STORY_C'],
];

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function parseCommand(text: string): GameAction | null {
  const normalized = text.trim();

  for (const [pattern, action] of COMMAND_PATTERNS) {
    if (normalized === pattern) return action;
  }

  let bestMatch: GameAction | null = null;
  let bestSimilarity = 0;

  for (const [pattern, action] of COMMAND_PATTERNS) {
    const maxLen = Math.max(normalized.length, pattern.length);
    if (maxLen === 0) continue;
    const distance = levenshteinDistance(normalized.toLowerCase(), pattern.toLowerCase());
    const similarity = 1 - distance / maxLen;
    if (similarity >= 0.8 && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = action;
    }
  }

  return bestMatch;
}

export const RANDOM_DANMAKU_POOL: string[] = [
  '左移', '右移', '前进', '后退',
  '放火球', '火球', '冰冻', '放冰冻',
  '护盾', '放护盾', '防御',
  '选项A', '选项B', '选项C',
  '选A', '选B', '选C',
  '左走', '向右', '向前', '后退',
];

export function generateRandomDanmaku(count: number): string[] {
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    results.push(RANDOM_DANMAKU_POOL[Math.floor(Math.random() * RANDOM_DANMAKU_POOL.length)]);
  }
  return results;
}
