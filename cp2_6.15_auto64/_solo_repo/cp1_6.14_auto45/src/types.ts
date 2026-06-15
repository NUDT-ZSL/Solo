export type PollType = 'single' | 'multiple' | 'rating' | 'ranking';

export interface Poll {
  id: string;
  title: string;
  type: PollType;
  options: string[];
  deadline: number | null;
  created_at: number;
  participant_count: number;
}

export interface PollResult {
  optionIndex: number;
  count: number;
  avgRating?: number;
}

export interface VoteSelection {
  optionIndex: number;
  rating?: number;
  rankPosition?: number;
}
