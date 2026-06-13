import { Maximize2 } from 'lucide-react';
import { useStrataStore } from '@/store/useStrataStore';

export default function TopBar() {
  const resetCamera = useStrataStore((s) => s.resetCamera);

  return (
    <div
      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
      style={{
        height: '56px',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex flex-col">
        <span className="text-white font-bold text-xl">StrataViewer</span>
        <span className="text-gray-400 text-xs">v1.0</span>
      </div>
      <button
        onClick={resetCamera}
        className="bg-white text-gray-900 rounded-full flex items-center justify-center transition-transform hover:scale-105"
        style={{ width: '40px', height: '40px' }}
      >
        <Maximize2 size={20} />
      </button>
    </div>
  );
}
