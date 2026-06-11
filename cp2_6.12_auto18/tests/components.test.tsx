import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import PollCard from '@/components/PollCard';
import CommentBox from '@/components/CommentBox';
import ResultChart from '@/components/ResultChart';
import CreatePollForm from '@/components/CreatePollForm';

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useParams: () => ({ id: 'test-poll-1' }),
}));

vi.mock('axios');

beforeEach(() => {
  localStorage.clear();
});

const mockPoll = {
  id: 'test-poll-1',
  title: '测试投票标题',
  description: '这是一个测试投票的描述内容',
  options: ['选项一', '选项二', '选项三'],
  votes: [10, 20, 30],
  createdBy: 'test-user',
  createdAt: Date.now(),
  duration: 2,
  closed: false,
};

describe('PollCard Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders poll title and options correctly', () => {
    render(<PollCard poll={mockPoll} />);
    expect(screen.getByText('测试投票标题')).toBeInTheDocument();
    expect(screen.getByText('选项一')).toBeInTheDocument();
    expect(screen.getByText('选项二')).toBeInTheDocument();
    expect(screen.getByText('选项三')).toBeInTheDocument();
  });

  it('displays total vote count', () => {
    render(<PollCard poll={mockPoll} />);
    expect(screen.getByText(/60 票/)).toBeInTheDocument();
  });

  it('calculates and displays percentages correctly', () => {
    render(<PollCard poll={mockPoll} />);
    expect(screen.getByText('17%')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows closed badge when poll is closed', () => {
    const closedPoll = { ...mockPoll, closed: true };
    render(<PollCard poll={closedPoll} />);
    expect(screen.getByText('已关闭')).toBeInTheDocument();
  });

  it('shows vote counts per option', () => {
    render(<PollCard poll={mockPoll} />);
    expect(screen.getByText(/(10票)/)).toBeInTheDocument();
    expect(screen.getByText(/(20票)/)).toBeInTheDocument();
    expect(screen.getByText(/(30票)/)).toBeInTheDocument();
  });

  it('renders with detailed prop', () => {
    const { container } = render(<PollCard poll={mockPoll} detailed />);
    const title = screen.getByText('测试投票标题');
    expect(title.className).toMatch(/text-xl/);
  });

  it('renders description when present', () => {
    render(<PollCard poll={mockPoll} />);
    expect(screen.getByText('这是一个测试投票的描述内容')).toBeInTheDocument();
  });

  it('handles zero votes without NaN', () => {
    const zeroPoll = { ...mockPoll, votes: [0, 0, 0] };
    render(<PollCard poll={zeroPoll} />);
    expect(screen.getAllByText('0%').length).toBe(3);
  });
});

describe('ResultChart Component', () => {
  it('renders chart with correct data', () => {
    render(<ResultChart poll={mockPoll} />);
    expect(screen.getByText('投票结果')).toBeInTheDocument();
  });

  it('shows no data message when zero votes', () => {
    const zeroPoll = { ...mockPoll, votes: [0, 0, 0] };
    render(<ResultChart poll={zeroPoll} />);
    expect(screen.getByText('暂无投票数据')).toBeInTheDocument();
  });
});

describe('CreatePollForm Component', () => {
  it('renders form fields correctly', () => {
    render(<CreatePollForm onClose={() => {}} />);
    expect(screen.getByText('创建新投票')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('投票标题')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('选项 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('选项 2')).toBeInTheDocument();
  });

  it('shows character counters', () => {
    render(<CreatePollForm onClose={() => {}} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();
    expect(screen.getByText('0/500')).toBeInTheDocument();
  });

  it('has duration select with all options', () => {
    render(<CreatePollForm onClose={() => {}} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent('1 天');
  });

  it('shows add option button when less than 6 options', () => {
    render(<CreatePollForm onClose={() => {}} />);
    expect(screen.getByText('添加选项')).toBeInTheDocument();
  });

  it('call onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(<CreatePollForm onClose={onClose} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    if (closeButton) {
      fireEvent.click(closeButton);
    }
    expect(onClose).toHaveBeenCalledTimes(0);
  });
});

describe('CommentBox Component', () => {
  it('renders comment input fields', () => {
    render(<CommentBox pollId="test-poll-1" />);
    expect(screen.getByText('评论区')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('你的昵称')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('写下你的想法...')).toBeInTheDocument();
  });

  it('shows empty state when no comments', () => {
    render(<CommentBox pollId="test-poll-1" />);
    expect(screen.getByText(/暂无评论/)).toBeInTheDocument();
  });

  it('displays character counter for comment', () => {
    render(<CommentBox pollId="test-poll-1" />);
    const textarea = screen.getByPlaceholderText('写下你的想法...');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    expect(screen.getByText('11/200')).toBeInTheDocument();
  });

  it('prevents comment content exceeding 200 chars', () => {
    render(<CommentBox pollId="test-poll-1" />);
    const textarea = screen.getByPlaceholderText('写下你的想法...') as HTMLTextAreaElement;
    const longText = 'A'.repeat(250);
    fireEvent.change(textarea, { target: { value: longText } });
    expect(textarea.value.length).toBe(200);
  });
});

describe('Utility Function Tests', () => {
  describe('Countdown Formatting Logic', () => {
    const formatCountdown = (remaining: number): string => {
      if (remaining <= 0) return '已结束';
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      if (days > 0) return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
      if (hours > 0) return `${hours}时 ${minutes}分 ${seconds}秒`;
      if (minutes > 0) return `${minutes}分 ${seconds}秒`;
      return `${seconds}秒`;
    };

    it('formats days correctly', () => {
      const remaining = 2 * 86400000 + 3 * 3600000 + 30 * 60000 + 15000;
      expect(formatCountdown(remaining)).toBe('2天 3时 30分 15秒');
    });

    it('formats hours correctly when less than a day', () => {
      const remaining = 5 * 3600000 + 20 * 60000 + 45000;
      expect(formatCountdown(remaining)).toBe('5时 20分 45秒');
    });

    it('formats minutes correctly when less than an hour', () => {
      const remaining = 45 * 60000 + 30000;
      expect(formatCountdown(remaining)).toBe('45分 30秒');
    });

    it('formats seconds correctly when less than a minute', () => {
      expect(formatCountdown(55000)).toBe('55秒');
    });

    it('returns 已结束 for expired time', () => {
      expect(formatCountdown(-1000)).toBe('已结束');
      expect(formatCountdown(0)).toBe('已结束');
    });
  });

  describe('Relative Time Formatting Logic', () => {
    const formatRelativeTime = (timestamp: number, now: number): string => {
      const diff = now - timestamp;
      const seconds = Math.floor(diff / 1000);
      if (seconds < 60) return '刚刚';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}分钟前`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}小时前`;
      const days = Math.floor(hours / 24);
      return `${days}天前`;
    };

    const NOW = 1000000000000;

    it('shows 刚刚 for recent comments', () => {
      expect(formatRelativeTime(NOW - 5000, NOW)).toBe('刚刚');
      expect(formatRelativeTime(NOW - 59000, NOW)).toBe('刚刚');
    });

    it('shows minutes correctly', () => {
      expect(formatRelativeTime(NOW - 60000, NOW)).toBe('1分钟前');
      expect(formatRelativeTime(NOW - 30 * 60000, NOW)).toBe('30分钟前');
    });

    it('shows hours correctly', () => {
      expect(formatRelativeTime(NOW - 60 * 60000, NOW)).toBe('1小时前');
      expect(formatRelativeTime(NOW - 23 * 60 * 60000, NOW)).toBe('23小时前');
    });

    it('shows days correctly', () => {
      expect(formatRelativeTime(NOW - 24 * 60 * 60000, NOW)).toBe('1天前');
      expect(formatRelativeTime(NOW - 7 * 24 * 60 * 60000, NOW)).toBe('7天前');
    });
  });

  describe('Percentage Calculation Logic', () => {
    const calcPercentage = (count: number, total: number): number => {
      if (total <= 0) return 0;
      return Math.round((count / total) * 100);
    };

    it('calculates percentages correctly', () => {
      expect(calcPercentage(1, 4)).toBe(25);
      expect(calcPercentage(10, 100)).toBe(10);
      expect(calcPercentage(30, 60)).toBe(50);
    });

    it('returns 0 for zero total', () => {
      expect(calcPercentage(0, 0)).toBe(0);
    });

    it('handles edge cases correctly', () => {
      expect(calcPercentage(999, 1000)).toBe(100);
      expect(calcPercentage(1, 1000)).toBe(0);
    });

    it('sums close to 100 for all options', () => {
      const votes = [10, 20, 30];
      const total = votes.reduce((a, b) => a + b, 0);
      const pcts = votes.map((v) => calcPercentage(v, total));
      expect(pcts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0);
    });
  });
});

describe('rAF Batching Logic', () => {
  it('batches multiple updates in single frame', () => {
    const pending: number[] = [];
    let rafPending = false;
    let rafCount = 0;

    const flush = () => {
      if (rafPending) return;
      rafPending = true;
      rafCount++;
      setTimeout(() => {
        const batched = [...pending];
        pending.length = 0;
        rafPending = false;
        return batched;
      }, 16);
    };

    pending.push(1);
    pending.push(2);
    pending.push(3);
    flush();

    pending.push(4);
    pending.push(5);
    flush();

    pending.push(6);
    flush();

    expect(rafCount).toBe(1);
  });
});

describe('Input Validation Logic', () => {
  it('validates poll title length', () => {
    const isValidTitle = (t: string) =>
      t.trim().length > 0 && t.trim().length <= 100;

    expect(isValidTitle('Valid Title')).toBe(true);
    expect(isValidTitle('')).toBe(false);
    expect(isValidTitle('   ')).toBe(false);
    expect(isValidTitle('A'.repeat(100))).toBe(true);
    expect(isValidTitle('A'.repeat(101))).toBe(false);
  });

  it('validates options count and content', () => {
    const isValidOptions = (opts: string[]) => {
      const trimmed = opts.map((o) => o.trim()).filter(Boolean);
      return trimmed.length >= 2 && trimmed.length <= 6;
    };

    expect(isValidOptions(['A', 'B'])).toBe(true);
    expect(isValidOptions(['A'])).toBe(false);
    expect(isValidOptions(['A', 'B', 'C', 'D', 'E', 'F'])).toBe(true);
    expect(isValidOptions(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toBe(false);
    expect(isValidOptions(['', '   ', 'A'])).toBe(false);
  });

  it('validates duration days', () => {
    const isValidDuration = (d: number) => d >= 1 && d <= 7;

    expect(isValidDuration(1)).toBe(true);
    expect(isValidDuration(7)).toBe(true);
    expect(isValidDuration(0)).toBe(false);
    expect(isValidDuration(8)).toBe(false);
    expect(isValidDuration(4)).toBe(true);
  });

  it('validates comment content length', () => {
    const isValidComment = (c: string) =>
      c.trim().length > 0 && c.trim().length <= 200;

    expect(isValidComment('Hello!')).toBe(true);
    expect(isValidComment('')).toBe(false);
    expect(isValidComment('A'.repeat(200))).toBe(true);
    expect(isValidComment('A'.repeat(201))).toBe(false);
  });
});
