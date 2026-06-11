import { useStore } from '@/store/useStore';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import PollCard from '@/components/PollCard';
import CreatePollForm from '@/components/CreatePollForm';

export default function Home() {
  const { polls, fetchPolls, initSocket } = useStore();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    initSocket();
    fetchPolls();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">投票大厅</h1>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="btn-interactive flex items-center gap-2 bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white px-5 py-2.5 rounded-lg font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          创建投票
        </button>
      </div>

      {showForm && <CreatePollForm onClose={() => setShowForm(false)} />}

      {polls.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <p className="text-lg">暂无投票</p>
          <p className="text-sm mt-1">点击"创建投票"开始第一个投票吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {polls.map((poll) => (
            <Link key={poll.id} to={`/poll/${poll.id}`} className="block">
              <PollCard poll={poll} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
