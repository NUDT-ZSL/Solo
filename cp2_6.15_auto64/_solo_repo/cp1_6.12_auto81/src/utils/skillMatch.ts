export interface Skill {
  name: string;
  score: number;
  category: 'frontend' | 'backend' | 'design';
}

export interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
  skills: Skill[];
}

export interface MatchResult {
  memberId: string;
  matchPercent: number;
}

const categoryColorMap: Record<string, string> = {
  frontend: '#4dabf7',
  backend: '#51cf66',
  design: '#cc5de8',
};

export function getSkillColor(category: string): string {
  return categoryColorMap[category] || '#ffd93d';
}

export function getScoreLabel(score: number): string {
  if (score >= 4) return '精通';
  if (score >= 3) return '熟练';
  return '了解';
}

export function computeMatch(requirements: string[], members: Member[]): MatchResult[] {
  const normalizedReqs = requirements.map((r) => r.trim().toLowerCase());

  const results: MatchResult[] = members.map((member) => {
    let matchedCount = 0;
    let totalSkillScore = 0;

    normalizedReqs.forEach((req) => {
      const found = member.skills.find(
        (s) => s.name.toLowerCase() === req || s.name.toLowerCase().includes(req)
      );
      if (found) {
        matchedCount += 1;
        totalSkillScore += found.score;
      }
    });

    const coverageRatio = normalizedReqs.length > 0 ? matchedCount / normalizedReqs.length : 0;
    const avgScore = matchedCount > 0 ? totalSkillScore / (matchedCount * 5) : 0;
    const matchPercent = Math.round((coverageRatio * 0.6 + avgScore * 0.4) * 100);

    return {
      memberId: member.id,
      matchPercent: Math.min(100, matchPercent),
    };
  });

  results.sort((a, b) => b.matchPercent - a.matchPercent);
  return results;
}

export function computeSimilarity(skillsA: Skill[], skillsB: Skill[]): number {
  const mapA = new Map<string, number>();
  skillsA.forEach((s) => mapA.set(s.name.toLowerCase(), s.score));

  const mapB = new Map<string, number>();
  skillsB.forEach((s) => mapB.set(s.name.toLowerCase(), s.score));

  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  let sumSq = 0;
  allKeys.forEach((key) => {
    const diff = (mapA.get(key) || 0) - (mapB.get(key) || 0);
    sumSq += diff * diff;
  });

  const maxDist = Math.sqrt(allKeys.size * 25);
  const dist = Math.sqrt(sumSq);
  const similarity = maxDist > 0 ? ((maxDist - dist) / maxDist) * 100 : 100;
  return Math.round(similarity);
}

export function getSkillDifferences(
  skillsA: Skill[],
  skillsB: Skill[]
): { name: string; diff: number }[] {
  const mapA = new Map<string, number>();
  skillsA.forEach((s) => mapA.set(s.name, s.score));

  const mapB = new Map<string, number>();
  skillsB.forEach((s) => mapB.set(s.name, s.score));

  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  const diffs: { name: string; diff: number }[] = [];

  allKeys.forEach((key) => {
    const scoreA = mapA.get(key) || 0;
    const scoreB = mapB.get(key) || 0;
    const diff = Math.abs(scoreA - scoreB);
    if (diff > 2) {
      diffs.push({ name: key, diff });
    }
  });

  return diffs;
}
