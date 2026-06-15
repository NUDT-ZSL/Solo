// ============================================================
// FPSCounter —— 帧率计数器 HTML 组件
// 数据流向：
//   useFPS hook (requestAnimationFrame 每 500ms 计算) -> fps
//   fps >= 30 -> 绿色 #4ade80
//   fps <  30 -> 红色 #ef4444
// Scene3D 中同时渲染了 drei 的 <Stats /> 提供更详细的性能面板
// ============================================================
import { useFPS } from '@/hooks/useFPS';

export default function FPSCounter() {
  const fps = useFPS();

  return (
    <div
      className="absolute top-16 left-4 z-50 flex items-center gap-2"
      style={{
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '8px 14px',
      }}
    >
      <span className="text-gray-400 text-[10px]">FPS</span>
      <span
        className="text-[14px] font-bold font-mono transition-colors duration-300"
        style={{ color: fps >= 30 ? '#4ade80' : '#ef4444' }}
      >
        {fps}
      </span>
    </div>
  );
}
