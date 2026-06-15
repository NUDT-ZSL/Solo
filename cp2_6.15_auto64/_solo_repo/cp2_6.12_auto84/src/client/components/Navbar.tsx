import React from 'react';
import { Search, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userAvatar?: string;
  creditScore: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  userAvatar,
  creditScore,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-40 h-14 backdrop-blur-xl bg-background/70 border-b border-gray-200/50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <Wrench className="text-white" size={22} />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-dark to-secondary bg-clip-text text-transparent">
            邻里工具箱
          </span>
        </div>

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索工具名称..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white/80 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30 bg-gray-200">
            {userAvatar ? (
              <img src={userAvatar} alt="用户头像" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-white font-semibold">
                用
              </div>
            )}
          </div>
          <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-white text-xs font-bold shadow-sm ${getScoreColor(creditScore)}`}>
            {creditScore}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
