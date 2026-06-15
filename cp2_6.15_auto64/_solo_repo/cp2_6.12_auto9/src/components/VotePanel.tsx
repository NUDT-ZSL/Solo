import { useState } from 'react';
import useActivityStore from '@/store';
import { getSocket } from '@/App';

export default function VotePanel() {
  const { currentVote, voteEnded, winnerId } = useActivityStore();
  const [votedOption, setVotedOption] = useState<string | null>(null);

  if (!currentVote) {
    return (
      <div className="glass-panel flex h-full items-center justify-center rounded-2xl p-8">
        <div className="text-center">
          <div className="mb-3 text-4xl">🗳️</div>
          <p className="text-lg text-gray-400">等待主持人发起投票</p>
        </div>
      </div>
    );
  }

  const totalVotes = currentVote.options.reduce((sum, o) => sum + o.count, 0);

  const handleVote = (optionId: string) => {
    if (voteEnded || votedOption) return;
    setVotedOption(optionId);
    const socket = getSocket();
    socket.emit('vote', { voteId: currentVote.id, optionId });
  };

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white">{currentVote.title}</h2>
        <div className="flex items-center gap-2">
          {voteEnded ? (
            <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-400">
              已结束
            </span>
          ) : (
            <span className="rounded-full bg-primary/20 px-3 py-1 text-sm text-primary">
              进行中
            </span>
          )}
          <span className="text-sm text-gray-400">{totalVotes} 票</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {currentVote.options.map((option) => {
          const pct = totalVotes > 0 ? (option.count / totalVotes) * 100 : 0;
          const isWinner = voteEnded && winnerId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={voteEnded || votedOption !== null}
              className={`group relative overflow-hidden rounded-xl border border-white/10 transition-all duration-300 hover:border-white/20 ${
                isWinner ? 'goldPulse' : ''
              } ${votedOption === option.id ? 'ring-2 ring-primary/50' : ''}`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #00d2ff, #7b2ff7)',
                  opacity: 0.3,
                }}
              />
              <div className="relative flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-white">{option.text}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300">{option.count}票</span>
                  <span className="text-xs font-bold text-primary">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
