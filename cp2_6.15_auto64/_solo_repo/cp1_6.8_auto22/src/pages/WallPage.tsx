import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Flame, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import InspirationCard from '../components/InspirationCard';
import StarField from '../components/StarField';
import ParticleEffect from '../components/ParticleEffect';
import { getEmotionColors } from '../utils/colorUtils';

interface NotePosition {
  id: string;
  x: number;
  y: number;
  animation: string;
  delay: number;
}

const WallPage: React.FC = () => {
  const {
    inspirations,
    selectedInspiration,
    showDetail,
    isContinuing,
    isSubmitting,
    addInspiration,
    resonate,
    selectInspiration,
    setShowDetail,
    setIsContinuing,
    continueInspiration,
  } = useStore();

  const [inputText, setInputText] = useState('');
  const [continuationText, setContinuationText] = useState('');
  const [particleActive, setParticleActive] = useState(false);
  const [particlePos, setParticlePos] = useState({ x: 0, y: 0 });
  const [particleColor, setParticleColor] = useState('rgb(247, 201, 72)');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width, h: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const notePositions = useMemo<NotePosition[]>(() => {
    const animations = ['float-slow', 'float-medium', 'float-fast'];
    const cols = containerSize.w > 768 ? 5 : 3;
    const rows = Math.ceil(inspirations.length / cols);
    const cellW = containerSize.w / cols;
    const cellH = containerSize.h / (rows + 1);
    const headerOffset = 80;

    return inspirations.map((insp, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = (Math.sin(i * 3.7) * 0.5 + 0.5) * 30 - 15;
      const jitterY = (Math.cos(i * 2.3) * 0.5 + 0.5) * 20 - 10;

      return {
        id: insp.id,
        x: col * cellW + cellW * 0.1 + jitterX,
        y: headerOffset + row * cellH + jitterY,
        animation: animations[i % 3],
        delay: i * 0.3,
      };
    });
  }, [inspirations, containerSize]);

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() || inputText.length > 150) return;
    await addInspiration(inputText.trim());
    setInputText('');
  }, [inputText, addInspiration]);

  const handleResonate = useCallback(
    (e: React.MouseEvent, id: string) => {
      const insp = inspirations.find((i) => i.id === id);
      if (!insp) return;

      const colors = getEmotionColors(insp.emotion);
      setParticlePos({ x: e.clientX, y: e.clientY });
      setParticleColor(colors.primary.startsWith('#')
        ? `rgb(${parseInt(colors.primary.slice(1,3),16)}, ${parseInt(colors.primary.slice(3,5),16)}, ${parseInt(colors.primary.slice(5,7),16)})`
        : 'rgb(247, 201, 72)'
      );
      setParticleActive(true);
      resonate(id);
    },
    [inspirations, resonate]
  );

  const handleContinue = useCallback(async () => {
    if (!selectedInspiration || !continuationText.trim()) return;
    await continueInspiration(selectedInspiration.id, continuationText.trim());
    setContinuationText('');
  }, [selectedInspiration, continuationText, continueInspiration]);

  const selectedColors = selectedInspiration
    ? getEmotionColors(selectedInspiration.emotion)
    : null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <StarField />

      <div
        ref={containerRef}
        className="relative w-full h-full"
        style={{ zIndex: 1 }}
      >
        <div className="fixed top-0 left-0 right-0 z-30 p-4">
          <div className="glass-card rounded-xl px-4 py-3 max-w-lg mx-auto flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, 150))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="记录你一闪而过的灵感..."
              className="flex-1 bg-transparent outline-none text-sm text-white/90 placeholder-white/30 font-body"
              maxLength={150}
            />
            <span className="text-[10px] text-white/30 whitespace-nowrap">
              {inputText.length}/150
            </span>
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim() || isSubmitting}
              className="neon-button flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed text-xs !py-1.5 !px-3"
            >
              <Send size={12} />
              <span>发光</span>
            </button>
          </div>
        </div>

        <div className="absolute inset-0 pt-20 pb-4">
          {notePositions.map((pos, i) => {
            const insp = inspirations[i];
            if (!insp) return null;
            return (
              <div
                key={insp.id}
                className={pos.animation}
                style={{
                  left: pos.x,
                  top: pos.y,
                  animationDelay: `${pos.delay}s`,
                }}
              >
                <InspirationCard
                  inspiration={insp}
                  variant="wall"
                  onClick={() => selectInspiration(insp)}
                  onResonate={handleResonate}
                />
              </div>
            );
          })}
        </div>
      </div>

      <ParticleEffect
        active={particleActive}
        x={particlePos.x}
        y={particlePos.y}
        color={particleColor}
        onComplete={() => setParticleActive(false)}
      />

      <AnimatePresence>
        {showDetail && selectedInspiration && selectedColors && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            onClick={() => setShowDetail(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative glass-card rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDetail(false)}
                className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors"
              >
                <X size={18} />
              </button>

              <div
                className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
                style={{ background: selectedColors.gradient }}
              />

              <div className="mb-4">
                <p className="font-display text-base leading-relaxed text-white/95">
                  {selectedInspiration.content}
                </p>
              </div>

              {selectedInspiration.continuation && (
                <div
                  className="rounded-lg px-4 py-3 mb-4"
                  style={{
                    background: `linear-gradient(180deg, ${selectedColors.primary}22, ${selectedColors.secondary}44)`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame size={12} className="text-orange-400" />
                    <span className="text-xs text-white/50">续写</span>
                  </div>
                  <p className="font-display text-sm leading-relaxed text-white/80">
                    {selectedInspiration.continuation}
                  </p>
                </div>
              )}

              {isContinuing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={continuationText}
                      onChange={(e) => setContinuationText(e.target.value.slice(0, 100))}
                      onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                      placeholder="续写这段灵感..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-purple-500/50 transition-colors"
                      autoFocus
                      maxLength={100}
                    />
                    <button
                      onClick={handleContinue}
                      disabled={!continuationText.trim()}
                      className="neon-button !py-2 !px-3 disabled:opacity-40"
                    >
                      <Flame size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <div className="flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>共鸣 {selectedInspiration.resonanceCount}</span>
                  </div>
                  <span>
                    {new Date(selectedInspiration.createdAt).toLocaleString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {!isContinuing && !selectedInspiration.continuation && (
                  <button
                    onClick={() => setIsContinuing(true)}
                    className="neon-button !py-1.5 !px-4 flex items-center gap-1.5 text-xs"
                  >
                    <Flame size={12} />
                    <span>续写</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WallPage;
