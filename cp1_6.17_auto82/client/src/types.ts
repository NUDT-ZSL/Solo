export interface TopicOption {
  id: string;
  text: string;
  votes: number;
  color: string;
}

export interface Topic {
  id: string;
  title: string;
  options: TopicOption[];
  deadline: string;
  createdAt: string;
  status: 'pending' | 'active' | 'ended';
  totalVotes: number;
  targetVotes?: number;
}

export interface Report {
  topicId: string;
  voteTrend: { time: string; count: number }[];
  regionDistribution: { region: string; count: number }[];
  hotComments: { text: string; frequency: number }[];
  totalVotes: number;
}

export interface DetailedReport extends Report {
  hourlyTrend: { hour: string; count: number }[];
  deviceDistribution: { device: string; count: number; percentage: number }[];
  commentKeywords: { keyword: string; frequency: number; sentiment: 'positive' | 'neutral' | 'negative' }[];
  optionPerformance: { optionId: string; text: string; votes: number; percentage: number; color: string }[];
  peakVotingTime: { time: string; count: number };
  averageVotesPerHour: number;
  engagementRate: number;
}

export interface CreateTopicRequest {
  title: string;
  options: string[];
  deadline: string;
}

export interface VoteRequest {
  topicId: string;
  optionId: string;
  voterId: string;
}

export interface VoteResponse {
  success: boolean;
  topic: Topic;
}
