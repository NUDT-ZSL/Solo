import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';
import axios from 'axios';
import type { BookCandidate } from '../types';
import { useStore } from '../store/useStore';

interface VotePanelProps {
  bookClubId: string;
  onClose: () => void;
}

function AnimatedNumber({ value, duration = 400 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  const animate = useCallback((from: number, to: number) => {
    startTimeRef.current = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplayValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [duration]);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      animate(prevValueRef.current, value);
      prevValueRef.current = value;
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, animate]);

  return <span>{displayValue}</span>;
}

export default function VotePanel({ bookClubId, onClose }: VotePanelProps) {
  const { currentUser } = useStore();
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    axios.get(`/api/bookclubs/${bookClubId}/candidates`)
      .then(res => setCandidates(res.data))
      .catch(err => console.error('获取候选书目失败:', err));
  }, [bookClubId]);

  const handleVote = () => {
    if (!selectedId || voted || voting) return;
    setVoting(true);
    axios.post(`/api/bookclubs/${bookClubId}/vote`, {
      userId: currentUser.id,
      candidateId: selectedId
    })
      .then(res => {
        setVoted(true);
        setCandidates(prev =>
          prev.map(c =>
            c.id === res.data.candidateId
              ? { ...c, votes: res.data.votes }
              : c
          )
        );
        setTimeout(onClose, 600);
      })
      .catch(err => {
        if (err.response?.status === 400) {
          setVoted(true);
        }
      })
      .finally(() => setVoting(false));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-coffee">投票选书</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {candidates.map(candidate => (
            <motion.div
              key={candidate.id}
              onClick={() => !voted && setSelectedId(candidate.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                selectedId === candidate.id
                  ? 'border-violet-theme bg-violet-50'
                  : voted
                  ? 'border-gray-100 bg-gray-50 cursor-default'
                  : 'border-gray-100 hover:border-violet-theme/50 hover:bg-violet-50/30'
              }`}
            >
              <div
                className="w-16 h-20 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: candidate.coverBg }}
              >
                <BookOpen className="w-6 h-6 text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-coffee text-sm md:text-base">{candidate.title}</h3>
                <p className="text-gray-500 text-sm">{candidate.author}</p>
                <div className="mt-1 flex items-center gap-1 text-sm text-violet-theme font-medium">
                  <AnimatedNumber value={candidate.votes} />
                  <span className="text-gray-400 font-normal">票</span>
                </div>
              </div>
              {selectedId === candidate.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-violet-theme flex items-center justify-center"
                >
                  <span className="text-white text-xs">✓</span>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleVote}
          disabled={!selectedId || voted || voting}
          className={`w-full py-3 rounded-lg font-medium text-sm transition-all duration-300 ${
            voted
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : !selectedId
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-violet-theme text-white hover:bg-violet-600'
          }`}
        >
          {voted ? '已投票' : voting ? '投票中...' : '确认投票'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
