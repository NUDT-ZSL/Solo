import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  status: '可用' | '已借出' | '维修中';
  owner_id: string;
  owner_name?: string;
  available_from?: string;
  available_to?: string;
}

interface ToolCardProps {
  tool: Tool;
  onReserve?: (tool: Tool) => void;
  onReturn?: (tool: Tool, reservationId: string) => void;
  reservationId?: string;
  isLent?: boolean;
}

const statusConfig = {
  '可用': {
    label: '可用',
    baseClass: 'relative overflow-hidden text-white',
    gradient: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
    shadowClass: 'animate-glow-green',
  },
  '已借出': {
    label: '已借出',
    baseClass: 'relative overflow-hidden text-white animate-pulse-orange',
    gradient: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
    shadowClass: '',
  },
  '维修中': {
    label: '维修中',
    baseClass: 'relative text-gray-100',
    gradient: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)',
    shadowClass: '',
  },
};

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onReserve, onReturn, reservationId, isLent }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [returning, setReturning] = useState(false);
  const cfg = statusConfig[tool.status];

  const handleCardClick = () => {
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      setShowDetail(!showDetail);
    }, 150);
  };

  const handleReserve = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReserve?.(tool);
  };

  const handleReturn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reservationId) return;
    setReturning(true);
    setTimeout(() => {
      onReturn?.(tool, reservationId);
      setReturning(false);
    }, 200);
  };

  return (
    <motion.div
      className="rounded-[12px] bg-white cursor-pointer overflow-hidden shadow-sm border border-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isPressed ? 0.95 : 1,
      }}
      whileHover={{
        y: -4,
        boxShadow: '0 16px 32px -8px rgba(0, 0, 0, 0.12), 0 4px 8px -4px rgba(0, 0, 0, 0.06)',
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={handleCardClick}
    >
      <div className="relative w-full h-40 overflow-hidden bg-gray-100">
        <img
          src={tool.image_url}
          alt={tool.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="256" viewBox="0 0 400 256"%3E%3Crect fill="%23FCECD0" width="400" height="256"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23F5A623" font-family="sans-serif" font-size="18"%3E工具%3C/text%3E%3C/svg%3E';
          }}
        />
        <div className="absolute top-3 left-3">
          <span
            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${cfg.baseClass} ${cfg.shadowClass}`}
            style={{ background: cfg.gradient }}
          >
            {cfg.label}
          </span>
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 bg-white/85 backdrop-blur rounded-full text-xs font-medium text-gray-600">
          {tool.category}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-[15px] font-bold text-gray-800 leading-snug">{tool.name}</h3>
          <Info size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
        </div>

        <motion.div
          initial={false}
          animate={{ height: showDetail ? 'auto' : 40 }}
          className="overflow-hidden"
        >
          <p className="text-xs text-gray-500 leading-relaxed">
            {tool.description}
          </p>
          {showDetail && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {tool.owner_name && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-gray-400">提供者：</span>
                  <span className="text-gray-700 font-medium">{tool.owner_name}</span>
                </div>
              )}
              {tool.available_from && tool.available_to && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-gray-400">可用时段：</span>
                  <span className="text-gray-700">{tool.available_from} - {tool.available_to}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {showDetail ? '点击收起' : '点击查看详情'}
          </span>
          {tool.status === '可用' && onReserve && (
            <button
              onClick={handleReserve}
              className="h-8 px-4 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #2C5F8A 0%, #3A7AB5 100%)' }}
            >
              立即预约
            </button>
          )}
          {isLent && tool.status === '已借出' && onReturn && reservationId && (
            <button
              onClick={handleReturn}
              disabled={returning}
              className="h-10 px-4 rounded-[8px] text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)' }}
            >
              {returning ? '确认中...' : '确认归还'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
