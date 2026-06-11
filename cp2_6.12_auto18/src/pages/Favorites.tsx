import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useStore } from '@/store/useStore';
import PollCard from '@/components/PollCard';

export default function Favorites() {
  const { polls, favorites, fetchPolls, fetchFavorites, toggleFavorite } = useStore();

  useEffect(() => {
    fetchPolls();
    fetchFavorites();
  }, []);

  const favoritePolls = polls.filter((p) => favorites.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的收藏</h1>

      {favoritePolls.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg">暂无收藏</p>
          <p className="text-sm mt-1">
            点击投票卡片上的
            <Heart className="inline w-4 h-4 mx-1" />
            收藏你感兴趣的投票
          </p>
          <Link
            to="/"
            className="inline-block mt-4 text-blue-500 hover:text-blue-600 text-sm underline"
          >
            浏览投票大厅
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {favoritePolls.map((poll) => (
            <div key={poll.id} className="relative group">
              <Link to={`/poll/${poll.id}`} className="block">
                <PollCard poll={poll} />
              </Link>
              <button
                onClick={() => toggleFavorite(poll.id)}
                className="absolute top-4 right-4 z-20 btn-interactive bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="取消收藏"
              >
                <Heart className="w-5 h-5 fill-red-500 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
