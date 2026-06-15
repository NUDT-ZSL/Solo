import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const Header: React.FC = () => {
  const setShowInviteModal = useStore((state) => state.setShowInviteModal);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <header className="h-14 bg-[#25253a] border-b border-[#444466] flex items-center justify-between px-4 transition-all duration-300 ease-out">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#6c63ff] flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <h1 className="text-[18px] font-semibold text-[#e0e0ff]">虚拟策展</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowInviteModal(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="
            w-10 h-10 rounded-full bg-[#6c63ff]
            flex items-center justify-center
            text-white transition-all duration-300 ease-out
            hover:bg-[#5a52e0] active:bg-[#4a42d0]
            hover:rotate-90
          "
          title="邀请成员"
        >
          <UserPlus size={20} />
        </button>

        <div className="relative">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=curator"
            alt="用户头像"
            className="w-8 h-8 rounded-full border-2 border-[#6c63ff] object-cover"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#25253a]" />
        </div>
      </div>
    </header>
  );
};
