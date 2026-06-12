import { useEffect, useState } from 'react';

interface BudgetDashboardProps {
  income: number;
  expense: number;
  balance: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * easeOut);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>¥{display.toFixed(2)}</span>;
}

function BudgetDashboard({ income, expense, balance }: BudgetDashboardProps) {
  return (
    <div className="stat-cards">
      <div className="stat-card income">
        <div className="stat-icon">📈</div>
        <div className="stat-info">
          <div className="stat-label">本月总收入</div>
          <div className="stat-value">
            <AnimatedNumber value={income} />
          </div>
        </div>
      </div>
      <div className="stat-card expense">
        <div className="stat-icon">📉</div>
        <div className="stat-info">
          <div className="stat-label">本月总支出</div>
          <div className="stat-value">
            <AnimatedNumber value={expense} />
          </div>
        </div>
      </div>
      <div className="stat-card balance">
        <div className="stat-icon">💰</div>
        <div className="stat-info">
          <div className="stat-label">本月结余</div>
          <div className="stat-value">
            <AnimatedNumber value={balance} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default BudgetDashboard;
