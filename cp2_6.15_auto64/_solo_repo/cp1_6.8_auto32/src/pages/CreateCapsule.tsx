import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCapsuleStore, Duration, formatDurationLabel, getDurationColor } from '@/utils/CapsuleEngine';
import { ArrowLeft, Send } from 'lucide-react';

const DURATIONS: Duration[] = [7, 30, 365];
const MAX_LENGTH = 300;

export default function CreateCapsule() {
  const [content, setContent] = useState('');
  const [duration, setDuration] = useState<Duration>(7);
  const [submitting, setSubmitting] = useState(false);
  const createCapsule = useCapsuleStore((s) => s.createCapsule);
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    const capsule = createCapsule(content.trim(), duration);
    setTimeout(() => {
      navigate('/', { state: { flyCapsule: capsule } });
    }, 100);
  };

  const selectedColor = getDurationColor(duration);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a1a' }}>
      <div className="flex items-center px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={18} className="text-white/60" />
        </button>
        <h1 className="flex-1 text-center text-white/80 text-base font-medium pr-9">
          写给未来的自己
        </h1>
      </div>

      <div className="flex-1 px-5 pb-8 flex flex-col">
        <div
          className="flex-1 rounded-2xl p-5 flex flex-col"
          style={{
            background: 'rgba(15, 15, 46, 0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="在这里写下给未来的话..."
            className="flex-1 w-full bg-transparent text-white/85 text-base leading-relaxed resize-none outline-none placeholder:text-white/15 min-h-[200px]"
          />
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
            <span className="text-xs text-white/25">
              {content.length} / {MAX_LENGTH}
            </span>
            <div className="w-20 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(content.length / MAX_LENGTH) * 100}%`,
                  background: `linear-gradient(90deg, ${selectedColor.primary}, ${selectedColor.secondary})`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-white/30 text-xs mb-3 tracking-wider">选择封存时长</div>
          <div className="flex gap-3">
            {DURATIONS.map((d) => {
              const colors = getDurationColor(d);
              const selected = d === duration;
              return (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-all relative overflow-hidden"
                  style={{
                    background: selected
                      ? `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selected ? colors.primary + '60' : 'rgba(255,255,255,0.06)'}`,
                    color: selected ? colors.primary : 'rgba(255,255,255,0.35)',
                    boxShadow: selected ? `0 0 20px ${colors.glow}` : 'none',
                  }}
                >
                  {formatDurationLabel(d)}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="mt-6 w-full py-3.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: content.trim()
              ? `linear-gradient(135deg, ${selectedColor.primary}, ${selectedColor.secondary})`
              : 'rgba(255,255,255,0.05)',
            boxShadow: content.trim() ? `0 0 30px ${selectedColor.glow}` : 'none',
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <Send size={16} />
            {submitting ? '封存中...' : '封存胶囊'}
          </span>
        </button>
      </div>
    </div>
  );
}
