import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Capsule } from '@/utils/api';

interface CapsuleCardProps {
  capsule: Capsule;
  isUnlocked: boolean;
  countdown: { years: number; months: number; days: number; progress: number };
}

const MOOD_LABELS: Record<string, string> = {
  happy: '开心',
  calm: '平静',
  nostalgic: '怀念',
  sad: '忧伤',
  excited: '激动',
};

export default function CapsuleCard({ capsule, isUnlocked, countdown }: CapsuleCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/capsule/${capsule.id}`)}
      className={cn(
        'relative cursor-pointer rounded-lg border border-vintage-brown/20 bg-vintage-paper p-6',
        'shadow-md transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:shadow-lg',
        'bg-paper-texture',
      )}
    >
      {!isUnlocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-vintage-paper/80 backdrop-blur-[1px]">
          <Lock
            className={cn(
              'mb-2 h-8 w-8 text-vintage-ink/50',
              'transition-transform duration-300',
              'hover:animate-lock-shake',
            )}
          />
          <h3 className="font-serif-heading text-lg text-vintage-ink/40">{capsule.title}</h3>
          <p className="text-sm text-vintage-ink/30">{capsule.year}</p>
          <p className="mt-2 text-xs text-vintage-brown/60">
            距解锁还有 {countdown.years}年{countdown.months}月{countdown.days}日
          </p>
        </div>
      )}

      {isUnlocked && (
        <div className="animate-fade-in-up">
          <div className="mb-3 flex items-start justify-between">
            <h3 className="font-serif-heading text-xl text-vintage-ink">{capsule.title}</h3>
            <span className="rounded-full bg-vintage-brown/10 px-2 py-0.5 text-xs text-vintage-brown">
              {capsule.year}
            </span>
          </div>

          <ul className="mb-3 space-y-1">
            {capsule.events.slice(0, 2).map((event, i) => (
              <li key={i} className="text-sm text-vintage-ink/70 before:mr-2 before:content-['·']">
                {event}
              </li>
            ))}
          </ul>

          <span className="inline-block rounded-full bg-vintage-cream px-3 py-1 text-xs text-vintage-brown">
            {MOOD_LABELS[capsule.mood] ?? capsule.mood}
          </span>
        </div>
      )}
    </div>
  );
}
