import { getProgressGradient } from '@/utils/helpers';

interface ProgressBarProps {
  current: number;
  goal: number;
  height?: number;
  showText?: boolean;
  animate?: boolean;
}

const ProgressBar = ({
  current,
  goal,
  height = 24,
  showText = true,
  animate = false,
}: ProgressBarProps) => {
  const progress = Math.min(100, Math.max(0, (current / goal) * 100));
  const gradientColor = getProgressGradient(progress / 100);

  return (
    <div className="w-full">
      <div
        className="w-full bg-gray-200 rounded-full overflow-hidden relative"
        style={{ height: `${height}px`, borderRadius: `${height / 2}px` }}
      >
        <div
          className={`h-full transition-all duration-500 ease-out ${animate ? 'progress-animate' : ''}`}
          style={{
            width: `${progress}%`,
            backgroundColor: '#3b82f6',
            background: `linear-gradient(90deg, #ef4444 0%, ${gradientColor} 100%)`,
            borderRadius: `${height / 2}px`,
          }}
        />
      </div>
      {showText && (
        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="text-[#4b5563]">
            已筹 <span className="font-semibold text-[#1f2937]">¥{current.toLocaleString()}</span>
          </span>
          <span className="text-[#4b5563]">
            目标 <span className="font-semibold text-[#1f2937]">¥{goal.toLocaleString()}</span>
            <span className="ml-1">🔥</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
