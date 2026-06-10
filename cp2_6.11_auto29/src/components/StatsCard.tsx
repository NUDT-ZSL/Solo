import { useState, useEffect, useRef } from 'react';

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}

/**
 * ★★★ 个人面板数据卡片组件 ★★★
 * 功能点4: 数字变化时播放0.3秒缩放动画 (1.1倍 → 1倍)
 *         使用CSS keyframes (.animate-number) 触发
 *         通过监听 value 变化，每次变化时重新添加动画类
 */
export default function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const [animateKey, setAnimateKey] = useState(0);   // 每次变化+1 → 重新触发动画
  const prevValue = useRef(value);

  // ★★★ 4. 检测 value 变化 → 触发缩放动画 ★★★
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      // 通过改变 key，强制 React 重新挂载带动画的 span
      setAnimateKey(k => k + 1);
    }
  }, [value]);

  return (
    <div
      className="glass-card"
      style={{
        padding: 20, display: 'flex', flexDirection: 'column', gap: 8,
        position: 'relative', overflow: 'hidden'
      }}
    >
      {/* 装饰光晕 */}
      {color && (
        <div style={{
          position: 'absolute', top: -10, right: -10,
          width: 60, height: 60, borderRadius: '50%',
          background: `${color}22`, filter: 'blur(20px)'
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      </div>

      {/* ★★★ 4. 数字：通过 animate-number 类触发 0.3s scale(1.1)→(1) ★★★
          用 key 强制重新渲染 → 每次重新播放动画 */}
      <span
        key={animateKey}
        className="animate-number"
        style={{
          fontSize: 28, fontWeight: 700,
          color: color || 'var(--text-primary)',
          fontFamily: "'Noto Serif SC', serif",
          display: 'inline-block',
          width: 'fit-content'
        }}
      >
        {value}
      </span>
    </div>
  );
}
