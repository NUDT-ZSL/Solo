import { useEffect, useState, useRef } from 'react';

interface StatsCardsProps {
  totalCount: number;
  averageSalary: number;
  medianSalary: number;
}

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  isCurrency?: boolean;
}

function AnimatedNumber({ value, duration = 500, isCurrency = false }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (startTime.current === null) {
        startTime.current = timestamp;
      }

      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue.current + (value - startValue.current) * easeOutCubic);

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  if (isCurrency) {
    return <span>{displayValue.toLocaleString('zh-CN')}</span>;
  }
  return <span>{displayValue}</span>;
}

export default function StatsCards({ totalCount, averageSalary, medianSalary }: StatsCardsProps) {
  return (
    <div className="stats-cards">
      <div className="stat-card stat-card-1">
        <div className="stat-label">总人数</div>
        <div className="stat-value">
          <AnimatedNumber value={totalCount} />
          <span className="stat-unit">人</span>
        </div>
      </div>

      <div className="stat-card stat-card-2">
        <div className="stat-label">平均薪资</div>
        <div className="stat-value">
          <AnimatedNumber value={averageSalary} isCurrency />
          <span className="stat-unit">元</span>
        </div>
      </div>

      <div className="stat-card stat-card-3">
        <div className="stat-label">薪资中位数</div>
        <div className="stat-value">
          <AnimatedNumber value={medianSalary} isCurrency />
          <span className="stat-unit">元</span>
        </div>
      </div>
    </div>
  );
}
