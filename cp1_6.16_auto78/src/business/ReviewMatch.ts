export interface ScoreItem {
  innovation: number;
  technicalDepth: number;
  experimentalCompleteness: number;
  writingQuality: number;
}

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  authors: string[];
  reviewerIds: string[];
}

export interface Reviewer {
  id: string;
  name: string;
  email: string;
  expertise: string[];
}

export interface ReviewScore {
  id: string;
  paperId: string;
  reviewerId: string;
  scores: ScoreItem;
  comment: string;
  submitted: boolean;
  arbitratedScores: ScoreItem | null;
  isArbitrated: boolean;
}

export interface ConflictFlag {
  paperId: string;
  dimension: string;
  reviewerIds: string[];
  scoreValues: number[];
  resolved: boolean;
  arbitratedScore: number | null;
}

export interface SummaryItem {
  paperId: string;
  title: string;
  totalScore: number;
  scoreBreakdown: ScoreItem;
  reviewerCount: number;
  conflicts: ConflictFlag[];
}

export const SCORE_WEIGHTS: ScoreItem = {
  innovation: 0.3,
  technicalDepth: 0.25,
  experimentalCompleteness: 0.25,
  writingQuality: 0.2,
};

const DIMENSION_LABELS: Record<string, string> = {
  innovation: '创新性',
  technicalDepth: '技术深度',
  experimentalCompleteness: '实验完整性',
  writingQuality: '写作质量',
};

export function getDimensionLabel(dim: string): string {
  return DIMENSION_LABELS[dim] || dim;
}

function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().trim();
}

function computeJaccardSimilarity(setA: string[], setB: string[]): number {
  const a = new Set(setA.map(normalizeKeyword));
  const b = new Set(setB.map(normalizeKeyword));
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function computePartialMatchSimilarity(paperKeywords: string[], reviewerExpertise: string[]): number {
  const pks = paperKeywords.map(normalizeKeyword);
  const res = reviewerExpertise.map(normalizeKeyword);
  if (pks.length === 0 || res.length === 0) return 0;
  let totalSim = 0;
  for (const pk of pks) {
    let bestSim = 0;
    for (const re of res) {
      if (pk === re) {
        bestSim = 1;
      } else if (pk.includes(re) || re.includes(pk)) {
        bestSim = Math.max(bestSim, 0.6);
      } else {
        const commonPrefix = commonPrefixLength(pk, re);
        const maxLen = Math.max(pk.length, re.length);
        const sim = maxLen > 0 ? commonPrefix / maxLen : 0;
        if (sim > 0.4) bestSim = Math.max(bestSim, sim * 0.5);
      }
    }
    totalSim += bestSim;
  }
  return totalSim / pks.length;
}

function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export function computeSimilarity(paperKeywords: string[], reviewerExpertise: string[]): number {
  const jaccard = computeJaccardSimilarity(paperKeywords, reviewerExpertise);
  const partial = computePartialMatchSimilarity(paperKeywords, reviewerExpertise);
  return 0.4 * jaccard + 0.6 * partial;
}

export interface MatchResult {
  paperId: string;
  reviewerId: string;
  similarity: number;
}

export function matchReviewersToPapers(
  papers: Paper[],
  reviewers: Reviewer[],
  minReviewersPerPaper: number = 2
): MatchResult[][] {
  return papers.map((paper) => {
    const sims = reviewers
      .map((reviewer) => ({
        paperId: paper.id,
        reviewerId: reviewer.id,
        similarity: computeSimilarity(paper.keywords, reviewer.expertise),
      }))
      .sort((a, b) => b.similarity - a.similarity);
    return sims.slice(0, Math.max(minReviewersPerPaper, sims.length));
  });
}

export function autoAssignReviewers(
  papers: Paper[],
  reviewers: Reviewer[],
  minReviewersPerPaper: number = 2,
  maxPapersPerReviewer: number = 5
): { paperId: string; reviewerIds: string[] }[] {
  const assignments: { paperId: string; reviewerIds: string[] }[] = [];
  const reviewerLoad: Record<string, number> = {};
  for (const r of reviewers) {
    reviewerLoad[r.id] = 0;
  }

  const matchResults = matchReviewersToPapers(papers, reviewers, reviewers.length);

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    const candidates = matchResults[i]
      .filter((m) => (reviewerLoad[m.reviewerId] || 0) < maxPapersPerReviewer)
      .sort((a, b) => b.similarity - a.similarity);

    const selected: string[] = [];
    for (const c of candidates) {
      if (selected.length >= minReviewersPerPaper) break;
      selected.push(c.reviewerId);
      reviewerLoad[c.reviewerId] = (reviewerLoad[c.reviewerId] || 0) + 1;
    }
    assignments.push({ paperId: paper.id, reviewerIds: selected });
  }

  return assignments;
}

export function calculateWeightedScore(scores: ScoreItem, weights: ScoreItem = SCORE_WEIGHTS): number {
  return (
    scores.innovation * weights.innovation +
    scores.technicalDepth * weights.technicalDepth +
    scores.experimentalCompleteness * weights.experimentalCompleteness +
    scores.writingQuality * weights.writingQuality
  );
}

export function detectConflicts(
  paperScores: ReviewScore[],
  threshold: number = 5
): ConflictFlag[] {
  if (paperScores.length < 2) return [];
  const dimensions: (keyof ScoreItem)[] = [
    'innovation',
    'technicalDepth',
    'experimentalCompleteness',
    'writingQuality',
  ];
  const conflicts: ConflictFlag[] = [];
  for (const dim of dimensions) {
    const vals = paperScores.map((s) => s.scores[dim]);
    const maxDiff = Math.max(...vals) - Math.min(...vals);
    if (maxDiff > threshold) {
      conflicts.push({
        paperId: paperScores[0].paperId,
        dimension: dim,
        reviewerIds: paperScores.map((s) => s.reviewerId),
        scoreValues: vals,
        resolved: false,
        arbitratedScore: null,
      });
    }
  }
  return conflicts;
}

export function computePaperSummary(
  paper: Paper,
  paperScores: ReviewScore[],
  paperConflicts: ConflictFlag[]
): SummaryItem {
  const dims: (keyof ScoreItem)[] = ['innovation', 'technicalDepth', 'experimentalCompleteness', 'writingQuality'];
  const avgScores: ScoreItem = {
    innovation: 0,
    technicalDepth: 0,
    experimentalCompleteness: 0,
    writingQuality: 0,
  };

  if (paperScores.length === 0) {
    return {
      paperId: paper.id,
      title: paper.title,
      totalScore: 0,
      scoreBreakdown: avgScores,
      reviewerCount: 0,
      conflicts: paperConflicts,
    };
  }

  for (const dim of dims) {
    const conflictForDim = paperConflicts.find((c) => c.dimension === dim && c.resolved);
    if (conflictForDim && conflictForDim.arbitratedScore !== null) {
      avgScores[dim] = conflictForDim.arbitratedScore;
    } else {
      const effectiveScores = paperScores.map((s) => {
        if (s.isArbitrated && s.arbitratedScores) return s.arbitratedScores[dim];
        return s.scores[dim];
      });
      avgScores[dim] = effectiveScores.reduce((a, b) => a + b, 0) / effectiveScores.length;
    }
  }

  const totalScore = calculateWeightedScore(avgScores);
  return {
    paperId: paper.id,
    title: paper.title,
    totalScore: Math.round(totalScore * 100) / 100,
    scoreBreakdown: {
      innovation: Math.round(avgScores.innovation * 100) / 100,
      technicalDepth: Math.round(avgScores.technicalDepth * 100) / 100,
      experimentalCompleteness: Math.round(avgScores.experimentalCompleteness * 100) / 100,
      writingQuality: Math.round(avgScores.writingQuality * 100) / 100,
    },
    reviewerCount: paperScores.length,
    conflicts: paperConflicts,
  };
}
