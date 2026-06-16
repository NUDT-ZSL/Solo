import { useState, useEffect, useRef } from 'react';
import { useTrafficStore } from '../store/trafficStore';

function AnimatedNumber({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);
  const targetValue = useRef(value);
  const currentAnimValue = useRef(value);

  useEffect(() => {
    if (targetValue.current === value) return;

    const startValue = currentAnimValue.current;
    const endValue = value;
    targetValue.current = value;
    const duration = 300;
    let startTime: number | null = null;
    let cancelled = false;
    const valueRange = Math.max(1, Math.abs(endValue - startValue));
    const threshold = valueRange * 0.001;

    const animate = (timestamp: number) => {
      if (cancelled) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const newValue = startValue + (endValue - startValue) * easeProgress;

      currentAnimValue.current = newValue;
      setDisplayValue(newValue);

      if (progress < 1 && Math.abs(newValue - endValue) > threshold) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        currentAnimValue.current = endValue;
        setDisplayValue(endValue);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [value]);

  return <span>{displayValue.toFixed(decimals)}</span>;
}

export default function StatsPanel() {
  const { statistics } = useTrafficStore();
  const [displayStats, setDisplayStats] = useState({
    totalVehicles: 0,
    averageWaitTime: 0,
    maxQueueLength: 0,
    throughput: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayStats({
        totalVehicles: statistics.totalVehicles,
        averageWaitTime: statistics.averageWaitTime,
        maxQueueLength: statistics.maxQueueLength,
        throughput: statistics.throughput
      });
    }, 2000);

    setDisplayStats({
      totalVehicles: statistics.totalVehicles,
      averageWaitTime: statistics.averageWaitTime,
      maxQueueLength: statistics.maxQueueLength,
      throughput: statistics.throughput
    });

    return () => clearInterval(interval);
  }, [statistics]);

  const stats = [
    { label: '总车辆数', value: displayStats.totalVehicles, unit: '辆', decimals: 0 },
    { label: '平均等待时间', value: displayStats.averageWaitTime, unit: '秒', decimals: 1 },
    { label: '最大排队长度', value: displayStats.maxQueueLength, unit: '米', decimals: 1 },
    { label: '通过率', value: displayStats.throughput, unit: '辆/分钟', decimals: 1 }
  ];

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>实时统计</div>
      <div style={statsContainerStyle}>
        {stats.map((stat, index) => (
          <div key={index} style={statItemStyle}>
            <div style={labelStyle}>{stat.label}</div>
            <div style={valueStyle}>
              <AnimatedNumber value={stat.value} decimals={stat.decimals} />
              <span style={unitStyle}>{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  left: '20px',
  width: '220px',
  padding: '16px',
  borderRadius: '12px',
  backgroundColor: 'rgba(30, 39, 46, 0.85)',
  backdropFilter: 'blur(10px)',
  zIndex: 100
};

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '12px',
  color: '#dfe6e9'
};

const statsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const statItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#b2bec3'
};

const valueStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#00b894',
  fontFamily: 'monospace',
  fontVariantNumeric: 'tabular-nums'
};

const unitStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#636e72',
  marginLeft: '4px',
  fontWeight: 'normal'
};
