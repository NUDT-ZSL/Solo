import { cn } from '@/lib/utils';

interface CountdownBarProps {
  unlockYear: number;
  progress: number;
}

export default function CountdownBar({ unlockYear, progress }: CountdownBarProps) {
  const now = new Date();
  const unlockDate = new Date(unlockYear, 0, 1);
  const diff = unlockDate.getTime() - now.getTime();

  let years = 0;
  let months = 0;
  let days = 0;

  if (diff > 0) {
    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    years = Math.floor(totalDays / 365);
    months = Math.floor((totalDays % 365) / 30);
    days = totalDays % 30;
  }

  return (
    <div className="w-full">
      <p className="mb-2 text-sm text-vintage-brown">
        距解锁还有 {years}年{months}月{days}日
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-vintage-cream">
        <div
          className={cn(
            'h-full rounded-full animate-ink-flow',
            'bg-gradient-to-r from-vintage-ink via-vintage-brown to-vintage-ink',
            'bg-[length:200%_100%]',
          )}
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
