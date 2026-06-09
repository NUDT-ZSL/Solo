export interface TimeOption {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  votes: number;
}

export interface Vote {
  optionId: string;
  userId: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  creator: string;
  deadline: number;
  location: string;
  timeOptions: TimeOption[];
  votes: Vote[];
  comments: Comment[];
  recommendedOptionId?: string;
}

export interface CreateActivityRequest {
  name: string;
  description: string;
  creator: string;
  deadline: number;
  location: string;
  timeOptions: Omit<TimeOption, 'id' | 'votes'>[];
}

export interface VoteRequest {
  activityId: string;
  userId: string;
  optionIds: string[];
}

export interface CommentRequest {
  activityId: string;
  userId: string;
  userName: string;
  content: string;
}

export interface ScheduleRecommendation {
  activityId: string;
  recommendedOption: TimeOption | null;
  scores: Record<string, number>;
  conflicts: Record<string, string[]>;
}
