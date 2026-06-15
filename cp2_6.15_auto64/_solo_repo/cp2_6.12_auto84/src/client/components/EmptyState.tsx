import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无工具',
  description = '快来发布或搜索您需要的工具吧！',
  icon,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 mb-6">
        {icon || (
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="20" y="35" width="80" height="50" rx="8" fill="#FED7AA" />
            <rect x="25" y="40" width="70" height="40" rx="6" fill="#FED7AA" />
            <rect x="30" y="45" width="25" height="15" rx="3" fill="#F97316" />
            <rect x="35" y="50" width="15" height="5" rx="2" fill="#FED7AA" />
            <rect x="60" y="45" width="30" height="8" rx="2" fill="#FDBA74" />
            <rect x="60" y="57" width="25" height="8" rx="2" fill="#FDBA74" />
            <circle cx="85" cy="60" r="10" fill="#F97316" />
            <circle cx="85" cy="60" r="5" fill="#FED7AA" />
            <rect x="45" y="70" width="30" height="20" rx="4" fill="#EA580C" />
            <rect x="50" y="75" width="20" height="3" rx="1" fill="#FED7AA" />
            <rect x="50" y="80" width="15" height="3" rx="1" fill="#FED7AA" />
            <path
              d="M40 25L45 35M80 25L75 35M60 20L60 30"
              stroke="#F97316"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="40" cy="25" r="3" fill="#FCD34D" />
            <circle cx="80" cy="25" r="3" fill="#FCD34D" />
            <circle cx="60" cy="20" r="3" fill="#FCD34D" />
          </svg>
        )}
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-center max-w-sm">{description}</p>

      <div className="mt-6 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </motion.div>
  );
};
