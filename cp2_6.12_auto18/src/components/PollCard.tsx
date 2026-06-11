import { Heart, MessageCircle, Clock, Plus, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useState, useEffect } from 'react';

interface PollCardProps {
  poll: {
    id: string;
    title: string;
    description: string;
    options: string[];
    votes: number[];
    createdBy: string;
    createdAt: number;
    duration: number;
    closed: boolean;
  };
  detailed?: boolean;
}

function getVotedPolls(): Set<string> {
  try {
    const raw = localStorage.getItem('votedPolls');
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function markVoted(pollId: string) {
  const set = getVotedPolls();
  set.add(pollId);
  localStorage.setItem('votedPolls', JSON.stringify([...set]));
}

export default function PollCard({ poll, detailed = false }: PollCardProps) {
  const { userId, favorites, toggleFavorite, vote } = useStore();
  const [votedPolls, setVotedPolls] = useState<Set<string>>(getVotedPolls());

  const totalVotes = poll.votes.reduce((a, b) => a + b, 0);
  const isCreator = poll.createdBy === userId;
  const hasVoted = votedPolls.has(poll.id);
  const isFavorite = favorites.includes(poll.id);

  const handleVote = (optionIndex: number) => {
    if (poll.closed || hasVoted) return;
    vote(poll.id, optionIndex);
    markVoted(poll.id);
    setVotedPolls(new Set([...votedPolls, poll.id]));
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(poll.id);
  };

  const endDate = new Date(poll.createdAt + poll.duration * 86400000);
  const isExpired = Date.now() > endDate.getTime();

  return (
    <div
      className={`relative bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] overflow-hidden transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] ${
        detailed ? 'p-6' : 'p-5'
      }`}
    >
      <button
        onClick={handleFavorite}
        className="absolute top-4 right-4 btn-interactive z-10"
        aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
      >
        <Heart
          className={`w-5 h-5 transition-all duration-300 ${
            isFavorite
              ? 'fill-red-500 text-red-500 scale-110'
              : 'text-gray-400 hover:text-red-400'
          }`}
        />
      </button>

      {poll.closed && (
        <span className="absolute top-4 left-4 bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
          已关闭
        </span>
      )}

      <div className={poll.closed ? 'mt-8' : ''}>
        <h3
          className={`font-bold text-gray-900 pr-8 ${
            detailed ? 'text-xl mb-2' : 'text-lg mb-1'
          }`}
        >
          {poll.title}
        </h3>
        {poll.description && (
          <p className="text-gray-500 text-sm mb-4 line-clamp-2">
            {poll.description}
          </p>
        )}
      </div>

      <div className={`space-y-3 ${detailed ? 'mt-5' : 'mt-3'}`}>
        {poll.options.map((option, index) => {
          const count = poll.votes[index] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isVotedOption =
            hasVoted &&
            localStorage.getItem(`votedOption_${poll.id}`) === String(index);

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={poll.closed || hasVoted}
              className={`w-full text-left relative rounded-lg overflow-hidden transition-all duration-200 ${
                isVotedOption
                  ? 'ring-2 ring-blue-400 shadow-sm'
                  : 'hover:ring-1 hover:ring-blue-200'
              } ${
                poll.closed || hasVoted
                  ? 'cursor-default'
                  : 'cursor-pointer btn-interactive'
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 progress-bar-gradient transition-all duration-1000 ease-out rounded-lg"
                style={{ width: `${pct}%` }}
              />
              <div
                className={`relative flex items-center justify-between px-4 py-2.5 ${
                  detailed ? 'text-base' : 'text-sm'
                }`}
              >
                <span className="font-medium text-gray-800 truncate">{option}</span>
                <span className="flex items-center gap-2 text-gray-600 shrink-0 ml-3">
                  <span className="font-semibold">{pct}%</span>
                  <span className="text-xs text-gray-400">({count}票)</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4" />
          {totalVotes} 票
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {!isExpired && !poll.closed
            ? `剩余 ${Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000))} 天`
            : '已结束'}
        </span>
      </div>
    </div>
  );
}
