import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface Tool {
  id: string;
  name: string;
  description: string;
  image: string;
  status: 'available' | 'borrowed' | 'maintenance';
}

interface ToolCardProps {
  tool: Tool;
  onClick: (tool: Tool) => void;
}

const statusConfig = {
  available: {
    label: '可用',
    className: 'bg-gradient-to-r from-green-400 to-green-600 animate-glow-green text-white',
  },
  borrowed: {
    label: '已借出',
    className: 'bg-gradient-to-r from-orange-400 to-orange-600 animate-pulse-orange text-white',
  },
  maintenance: {
    label: '维修中',
    className: 'bg-gray-500 text-white',
  },
};

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onClick }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onClick(tool);
  };

  return (
    <motion.div
      className="rounded-xl bg-white cursor-pointer overflow-hidden shadow-sm"
      whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)' }}
      animate={{ scale: isPressed ? 0.95 : 1 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
    >
      <div className="relative">
        <img
          src={tool.image}
          alt={tool.name}
          className="w-full h-40 object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{tool.name}</h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">{tool.description}</p>
        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-lg ${statusConfig[tool.status].className}`}>
          {statusConfig[tool.status].label}
        </span>
      </div>
    </motion.div>
  );
};
