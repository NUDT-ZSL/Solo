import { Vote, VoteResult, Card } from './types';

const WEIGHTS: Record<string, number> = {
  'manager': 1.5,
  'tech_lead': 1.3,
  'developer': 1.0,
  'designer': 1.0,
  'default': 1.0
};

interface VoteWithWeight extends Vote {
  userRole?: string;
}

interface CardWithVotes {
  card: Card;
  votes: VoteWithWeight[];
}

export function calculatePriority(
  votes: VoteWithWeight[],
  cards: Card[],
  minVoters: number = 3
): VoteResult[] {
  const cardVoteMap = new Map<string, CardWithVotes>();

  cards.forEach(card => {
    cardVoteMap.set(card.id, { card, votes: [] });
  });

  votes.forEach(vote => {
    const entry = cardVoteMap.get(vote.cardId);
    if (entry) {
      entry.votes.push(vote);
    }
  });

  const results: VoteResult[] = [];

  cardVoteMap.forEach(({ card, votes: cardVotes }) => {
    if (cardVotes.length < minVoters) {
      return;
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;

    cardVotes.forEach(vote => {
      const weight = WEIGHTS[vote.userRole || 'default'] || WEIGHTS.default;
      totalWeightedScore += vote.score * weight;
      totalWeight += weight;
    });

    const weightedScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    results.push({
      cardId: card.id,
      weightedScore,
      totalVotes: cardVotes.length,
      rank: 0
    });
  });

  const cardMap = new Map(cards.map(c => [c.id, c]));

  results.sort((a, b) => {
    if (b.weightedScore !== a.weightedScore) {
      return b.weightedScore - a.weightedScore;
    }
    const cardA = cardMap.get(a.cardId);
    const cardB = cardMap.get(b.cardId);
    return (cardA?.estimateDays || 0) - (cardB?.estimateDays || 0);
  });

  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  return results;
}

export function validateVote(score: number): boolean {
  return Number.isInteger(score) && score >= 1 && score <= 5;
}

export function hasEnoughVoters(
  cardId: string,
  votes: Vote[],
  minVoters: number = 3
): boolean {
  const cardVotes = votes.filter(v => v.cardId === cardId);
  const uniqueVoters = new Set(cardVotes.map(v => v.userId));
  return uniqueVoters.size >= minVoters;
}
