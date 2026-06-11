import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Clock } from 'lucide-react';
import PollCard from '@/components/PollCard';
import ResultChart from '@/components/ResultChart';
import CommentBox from '@/components/CommentBox';

export default function PollDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentPoll, fetchPoll, fetchComments, closePoll, userId, pulsePollId } =
    useStore();
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (id) {
      fetchPoll(id);
      fetchComments(id);
    }
  }, [id]);

  useEffect(() => {
    if (!currentPoll) return;

    const updateCountdown = () => {
      const endTime = currentPoll.createdAt + currentPoll.duration * 86400000;
      const remaining = endTime - Date.now();

      if (remaining <= 0 || currentPoll.closed) {
        setCountdown('已结束');
        return;
      }

      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      if (days > 0) {
        setCountdown(`${days}天 ${hours}时 ${minutes}分 ${seconds}秒`);
      } else if (hours > 0) {
        setCountdown(`${hours}时 ${minutes}分 ${seconds}秒`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}分 ${seconds}秒`);
      } else {
        setCountdown(`${seconds}秒`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [currentPoll]);

  if (!currentPoll || !id) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-400">
        加载中...
      </div>
    );
  }

  const isCreator = currentPoll.createdBy === userId;
  const showPulse = pulsePollId === id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 relative">
      {showPulse && (
        <div className="pulse-overlay fixed inset-0 z-50 pointer-events-none" />
      )}

      <div className="flex items-center gap-3 mb-6 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] px-5 py-4">
        <Clock className="w-5 h-5 text-blue-500 shrink-0" />
        <div>
          <span className="text-sm text-gray-500">倒计时</span>
          <span className="ml-3 font-bold text-gray-900">{countdown}</span>
        </div>
      </div>

      <div className="mb-6">
        <PollCard poll={currentPoll} detailed />
      </div>

      <div className="mb-6">
        <ResultChart poll={currentPoll} />
      </div>

      {isCreator && !currentPoll.closed && (
        <button
          onClick={() => closePoll(id)}
          className="btn-interactive mb-6 w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors"
        >
          关闭投票
        </button>
      )}

      <CommentBox pollId={id} />
    </div>
  );
}
