import { useMemo } from "react";

interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  sentiment: number;
}

interface WaveformProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  segments?: TranscriptSegment[];
}

export default function Waveform({ currentTime, duration, isPlaying }: WaveformProps) {
  const bars = useMemo(() => {
    const count = 60;
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const h = 10 + (seed - Math.floor(seed)) * 50;
      result.push(h);
    }
    return result;
  }, []);

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex h-[60px] items-end justify-center gap-[2px]">
      {bars.map((barHeight, i) => {
        const barProgress = i / bars.length;
        const isPlayed = barProgress <= progressRatio;
        const isActive =
          isPlaying &&
          barProgress <= progressRatio &&
          barProgress >= progressRatio - 0.03;

        return (
          <div
            key={i}
            className="w-[4px] rounded-full transition-all"
            style={{
              height: `${barHeight}px`,
              background: isPlayed
                ? "linear-gradient(to top, #7c3aed, #a78bfa)"
                : "#e5e7eb",
              opacity: isActive ? 0.7 : 1,
              animation: isActive ? "pulse 0.3s ease-in-out" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
