import { useOceanStore } from '../store';
import { EMOTION_CONFIG } from '../BottleData';
import type { Emotion } from '../BottleData';
import { Heart, HandHeart, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export default function AnalysisPanel() {
  const showAnalysis = useOceanStore((s) => s.showAnalysis);
  const analysisResult = useOceanStore((s) => s.analysisResult);
  const selectedBottleId = useOceanStore((s) => s.selectedBottleId);
  const bottles = useOceanStore((s) => s.bottles);
  const addReaction = useOceanStore((s) => s.addReaction);
  const closeAnalysis = useOceanStore((s) => s.closeAnalysis);

  const [reacting, setReacting] = useState<string | null>(null);

  if (!showAnalysis || !analysisResult) return null;

  const bottle = bottles.find((b) => b.id === selectedBottleId);
  const config = EMOTION_CONFIG[analysisResult.emotion];

  const handleReaction = (type: 'like' | 'comfort' | 'sigh') => {
    if (!selectedBottleId) return;
    setReacting(type);
    addReaction(selectedBottleId, type);
    setTimeout(() => setReacting(null), 600);
  };

  return (
    <div className="analysis-panel">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-80 animate-fade-in">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.glowColor}` }}
              />
              <span className="text-sm font-medium" style={{ color: config.color }}>
                {config.label}
              </span>
            </div>
            <button
              onClick={closeAnalysis}
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {bottle && (
            <p className="text-white/80 text-sm leading-relaxed italic">
              &ldquo;{bottle.content}&rdquo;
            </p>
          )}

          <div className="space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">关键词</p>
            <div className="flex flex-wrap gap-2">
              {analysisResult.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: `${config.color}20`,
                    color: config.color,
                    border: `1px solid ${config.color}40`,
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">寄语</p>
            <p className="text-white/90 text-sm leading-relaxed">{analysisResult.poem}</p>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleReaction('like')}
              className={`reaction-btn ${reacting === 'like' ? 'reaction-pulse' : ''}`}
              style={{ '--glow-color': '#F6C344' } as React.CSSProperties}
            >
              <Heart size={18} />
              <span className="text-xs ml-1">{bottle?.reactions.like || 0}</span>
            </button>
            <button
              onClick={() => handleReaction('comfort')}
              className={`reaction-btn ${reacting === 'comfort' ? 'reaction-pulse' : ''}`}
              style={{ '--glow-color': '#7EB8DA' } as React.CSSProperties}
            >
              <HandHeart size={18} />
              <span className="text-xs ml-1">{bottle?.reactions.comfort || 0}</span>
            </button>
            <button
              onClick={() => handleReaction('sigh')}
              className={`reaction-btn ${reacting === 'sigh' ? 'reaction-pulse' : ''}`}
              style={{ '--glow-color': '#48BB78' } as React.CSSProperties}
            >
              <Sparkles size={18} />
              <span className="text-xs ml-1">{bottle?.reactions.sigh || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
