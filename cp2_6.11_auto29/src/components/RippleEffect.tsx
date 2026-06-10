import { useEffect, useState } from 'react';
import { EMOTION_COLORS, EmotionType } from '../types';

/**
 * ★★★ 回响涟漪动画组件 ★★★
 * 用CSS keyframes (@keyframes ripple-particle 定义在global.css中)
 * 生成30个细密光点，从卡片中心向外扩散
 * 持续1.5秒后自动消失
 */
interface RippleEffectProps {
  trigger: boolean;          // 触发信号
  emotion: EmotionType;      // 情绪类型（决定光点颜色）
  onFinished?: () => void;   // 动画结束回调
}

export default function RippleEffect({ trigger, emotion, onFinished }: RippleEffectProps) {
  const [particles, setParticles] = useState<{ id: number; angle: number; delay: number; dist: number; size: number }[]>([]);

  useEffect(() => {
    if (!trigger) return;

    // 生成30个细密光点，分布在圆形各角度上
    const count = 30;
    const arr = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      angle: (i / count) * Math.PI * 2,        // 0 ~ 2π 均匀分布
      delay: Math.random() * 0.15,              // 微小延迟错开
      dist: 50 + Math.random() * 60,            // 扩散半径
      size: 3 + Math.random() * 5               // 光点大小
    }));
    setParticles(arr);

    // 1.5秒后清除光点
    const timer = setTimeout(() => {
      setParticles([]);
      onFinished?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [trigger, emotion, onFinished]);

  if (particles.length === 0) return null;

  const color = EMOTION_COLORS[emotion];

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      overflow: 'visible', zIndex: 10
    }}>
      {particles.map(p => {
        // 把每个光点放在指定角度方向
        const offsetX = Math.cos(p.angle) * p.dist;
        const offsetY = Math.sin(p.angle) * p.dist;
        return (
          <span
            key={p.id}
            className="ripple-spark"
            style={{
              // 叠加偏移：CSS动画会从中心扩散，这里再加一个角度偏移
              // 实现：通过 transform-origin 或 CSS变量结合JS触发
              width: p.size,
              height: p.size,
              background: color,
              boxShadow: `0 0 ${p.size * 3}px ${color}, 0 0 ${p.size * 6}px ${color}`,
              animationDelay: `${p.delay}s`,
              // 通过CSS自定义属性传递最终位置偏移（用transform结束位置模拟圆周扩散）
              ['--rx' as any]: `${offsetX}px`,
              ['--ry' as any]: `${offsetY}px`,
            }}
          />
        );
      })}
      {/* 再加一圈：环形发光 */}
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 80, height: 80, borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          border: `2px solid ${color}88`,
          animation: 'ripple-particle 1.5s ease-out forwards',
          background: 'transparent',
          boxShadow: `0 0 30px ${color}66 inset`
        }}
      />
    </div>
  );
}
