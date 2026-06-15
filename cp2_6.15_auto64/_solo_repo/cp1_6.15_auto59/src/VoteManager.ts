import { v4 as uuidv4 } from 'uuid';

export interface VoteOption {
  id: string;
  title: string;
  imageUrl?: string;
  order: number;
}

export interface Poll {
  id: string;
  name: string;
  deadline: string;
  options: VoteOption[];
  votes: Record<string, string[]>;
  createdAt: string;
  votedUsers: string[];
}

export interface PollResult {
  pollId: string;
  pollName: string;
  totalVotes: number;
  optionResults: {
    optionId: string;
    title: string;
    voteCount: number;
    percentage: number;
  }[];
}

const SECTOR_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'];

export function getSectorColor(index: number): string {
  return SECTOR_COLORS[index % SECTOR_COLORS.length];
}

export function getSectorColors(): string[] {
  return [...SECTOR_COLORS];
}

export function createVote(
  name: string,
  deadline: string,
  options: { title: string; imageUrl?: string }[]
): Poll | { error: string } {
  if (!name || name.trim().length === 0) {
    return { error: '活动名称不能为空' };
  }
  if (!deadline) {
    return { error: '截止时间不能为空' };
  }
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return { error: '截止时间格式无效' };
  }
  if (deadlineDate.getTime() <= Date.now()) {
    return { error: '截止时间必须在未来' };
  }
  if (!options || options.length < 2) {
    return { error: '至少需要2个选项' };
  }
  if (options.length > 6) {
    return { error: '最多6个选项' };
  }
  for (let i = 0; i < options.length; i++) {
    if (!options[i].title || options[i].title.trim().length === 0) {
      return { error: `第${i + 1}个选项标题不能为空` };
    }
  }

  const poll: Poll = {
    id: uuidv4(),
    name: name.trim(),
    deadline,
    options: options.map((opt, idx) => ({
      id: uuidv4(),
      title: opt.title.trim(),
      imageUrl: opt.imageUrl?.trim() || undefined,
      order: idx,
    })),
    votes: {},
    createdAt: new Date().toISOString(),
    votedUsers: [],
  };

  poll.options.forEach((opt) => {
    poll.votes[opt.id] = [];
  });

  return poll;
}

export function submitVote(
  poll: Poll,
  optionId: string,
  userId: string
): Poll | { error: string } {
  if (!poll) {
    return { error: '投票不存在' };
  }
  const deadlineDate = new Date(poll.deadline);
  if (deadlineDate.getTime() <= Date.now()) {
    return { error: '投票已截止' };
  }
  if (poll.votedUsers.includes(userId)) {
    return { error: '您已经投过票了' };
  }
  const option = poll.options.find((o) => o.id === optionId);
  if (!option) {
    return { error: '无效的选项' };
  }

  const updatedPoll: Poll = {
    ...poll,
    votes: {
      ...poll.votes,
      [optionId]: [...(poll.votes[optionId] || []), userId],
    },
    votedUsers: [...poll.votedUsers, userId],
  };

  return updatedPoll;
}

export function calculateResults(poll: Poll): PollResult {
  const totalVotes = poll.votedUsers.length;

  const optionResults = poll.options.map((opt, idx) => {
    const voteCount = (poll.votes[opt.id] || []).length;
    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
    return {
      optionId: opt.id,
      title: opt.title,
      voteCount,
      percentage,
    };
  });

  return {
    pollId: poll.id,
    pollName: poll.name,
    totalVotes,
    optionResults,
  };
}

export function formatCountdown(deadline: string): string {
  const deadlineDate = new Date(deadline);
  const now = Date.now();
  const diff = deadlineDate.getTime() - now;

  if (diff <= 0) {
    return '0天 00时 00分 00秒';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${days}天 ${String(hours).padStart(2, '0')}时 ${String(minutes).padStart(2, '0')}分 ${String(seconds).padStart(2, '0')}秒`;
}

export function isPollExpired(poll: Poll): boolean {
  return new Date(poll.deadline).getTime() <= Date.now();
}
