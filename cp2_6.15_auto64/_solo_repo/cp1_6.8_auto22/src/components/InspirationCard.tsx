import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flame, Sparkles } from 'lucide-react';
import { getEmotionColors, getContinuationGradient } from '../utils/colorUtils';
import type { Inspiration } from '../store/useStore';

interface InspirationCardProps {
  inspiration: Inspiration;
  variant?: 'wall' | 'spark';
  onClick?: () => void;
  onResonate?: (e: React.MouseEvent, id: string) => void;
  onRelease?: (id: string) => void;
  index?: number;
}

const InspirationCard: React.FC<InspirationCardProps> = ({
  inspiration,
  variant = 'wall',
  onClick,
  onResonate,
  onRelease,
  index = 0,
}) => {
  const [isReleasing, setIsReleasing] = useState(false);
  const colors = getEmotionColors(inspiration.emotion);
  const contGradient = inspiration.continuation
    ? getContinuationGradient(inspiration.emotion)
    : '';

  const handleResonate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onResonate?.(e, inspiration.id);
    },
    [onResonate, inspiration.id]
  );

  const handleRelease = useCallback(() => {
    setIsReleasing(true);
    setTimeout(() => {
      onRelease?.(inspiration.id);
    }, 800);
  }, [onRelease, inspiration.id]);

  const previewText =
    inspiration.content.length > 8
      ? inspiration.content.slice(0, 8) + '...'
      : inspiration.content;

  if (variant === 'spark') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isReleasing ? { opacity: 0, y: -120, scale: 0.5 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: isReleasing ? 0.8 : 0.5,
          delay: isReleasing ? 0 : index * 0.08,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="relative rounded-lg overflow-hidden paper-texture cursor-pointer group"
        style={{
          background: `linear-gradient(135deg, rgba(30,30,50,0.9), rgba(40,40,60,0.85))`,
          boxShadow: `0 0 10px ${colors.glow}, 0 4px 20px rgba(0,0,0,0.3)`,
        }}
        onClick={onClick}
      >
        <div
          className="absolute inset-0 rounded-lg opacity-60"
          style={{ background: colors.gradient }}
        />
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: colors.gradient }}
        />

        <div className="relative p-4">
          <p className="font-display text-sm leading-relaxed text-white/90 mb-3">
            {inspiration.content}
          </p>
          {inspiration.continuation && (
            <div
              className="rounded px-3 py-2 mb-3"
              style={{ background: contGradient }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={10} className="text-orange-400" />
                <span className="text-[10px] text-white/50">续写</span>
              </div>
              <p className="font-display text-xs leading-relaxed text-white/80">
                {inspiration.continuation}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-white/40 text-[10px]">
              <Sparkles size={10} />
              <span>{inspiration.resonanceCount}</span>
            </div>
            <span className="text-white/30 text-[10px]">
              {new Date(inspiration.createdAt).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRelease();
            }}
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1 text-[10px] text-white/50 hover:text-cyan-400"
          >
            <Flame size={12} />
            <span>放飞</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ scale: 1.08, zIndex: 20 }}
      className="absolute cursor-pointer group"
      style={{ width: 'fit-content', maxWidth: '200px' }}
      onClick={onClick}
    >
      <div
        className={`relative rounded-lg overflow-hidden paper-texture ${colors.glowClass}`}
        style={{
          background: `linear-gradient(135deg, rgba(30,30,50,0.92), rgba(40,40,60,0.88))`,
          transition: 'box-shadow 0.3s ease',
        }}
      >
        <div
          className="absolute inset-0 rounded-lg opacity-50"
          style={{ background: colors.gradient }}
        />
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: colors.gradient }}
        />

        <div className="relative p-3">
          <p className="font-display text-xs leading-relaxed text-white/90 line-clamp-2">
            {inspiration.content}
          </p>

          {inspiration.continuation && (
            <div
              className="rounded px-2 py-1.5 mt-2"
              style={{ background: contGradient }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Flame size={8} className="text-orange-400" />
                <span className="text-[8px] text-white/40">续写</span>
              </div>
              <p className="font-display text-[10px] leading-relaxed text-white/75 line-clamp-1">
                {inspiration.continuation}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-white/0 group-hover:text-white/50 text-[9px] transition-colors duration-200 truncate max-w-[80px]">
              {previewText}
            </span>
            <button
              onClick={handleResonate}
              className="flex items-center gap-0.5 text-white/40 hover:text-yellow-400 transition-colors duration-200"
              title="共鸣"
            >
              <Sparkles size={11} />
              <span className="text-[9px]">{inspiration.resonanceCount}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InspirationCard;
