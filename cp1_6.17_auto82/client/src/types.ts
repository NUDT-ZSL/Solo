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
}

export interface Report {
  topicId: string;
  voteTrend: { time: string; count: number }[];
  regionDistribution: { region: string; count: number }[];
  hotComments: { text: string; frequency: number }[];
  totalVotes: number;
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
