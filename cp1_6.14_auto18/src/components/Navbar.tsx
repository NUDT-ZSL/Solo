import { Link } from 'react-router-dom';
import { Sparkles, PlusCircle, User } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getAvatarColor, getInitials } from '@/utils/helpers';

const Navbar = () => {
  const { currentUser } = useAppStore();

  return (
    <nav className="h-16 bg-[#1e293b] text-white fixed top-0 left-0 right-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Sparkles className="w-8 h-8 text-[#3b82f6]" />
          <span className="text-xl font-bold">CrowdSpark</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            to="/create"
            className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] active:bg-[#1d4ed8] px-4 py-2 rounded-lg transition-colors h-10"
          >
            <PlusCircle className="w-5 h-5" />
            <span>发起项目</span>
          </Link>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: getAvatarColor(currentUser.name) }}
              >
                {getInitials(currentUser.name)}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#475569] flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
