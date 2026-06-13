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
