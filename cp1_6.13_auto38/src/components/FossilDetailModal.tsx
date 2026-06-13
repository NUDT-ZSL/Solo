import { X } from 'lucide-react';
import { useStrataStore } from '@/store/useStrataStore';

export default function FossilDetailModal() {
  const showFossilDetail = useStrataStore((s) => s.showFossilDetail);
  const viewingFossil = useStrataStore((s) => s.viewingFossil);
  const setShowFossilDetail = useStrataStore((s) => s.setShowFossilDetail);
  const toggleFossilRotation = useStrataStore((s) => s.toggleFossilRotation);

  if (!showFossilDetail || !viewingFossil) return null;

  const handleClose = () => {
    setShowFossilDetail(false);
    toggleFossilRotation();
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div
        className="pointer-events-auto fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[90vw] rounded-2xl p-6 border border-slate-600 shadow-[0_25px_80px_rgba(0,0,0,0.6)] relative"
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="mb-4">
          <h2 className="text-white font-bold text-[22px] pr-10">
            {viewingFossil.name}
          </h2>
          <p className="text-blue-400 text-sm italic mt-1">
            {viewingFossil.latinName}
          </p>
        </div>

        <div className="space-y-0">
          <div className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-700">
            <span className="text-gray-400 text-sm">生存年代</span>
            <span className="text-gray-200 text-sm text-right">
              {viewingFossil.era}
            </span>
          </div>

          <div className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-700">
            <span className="text-gray-400 text-sm">发现地点</span>
            <span className="text-gray-200 text-sm text-right">
              {viewingFossil.discoveryLocation}
            </span>
          </div>

          <div className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-700">
            <span className="text-gray-400 text-sm">特征描述</span>
            <span className="text-gray-200 text-sm text-right max-w-[200px]">
              {viewingFossil.characteristics}
            </span>
          </div>
        </div>

        <p className="text-gray-400 text-[11px] text-center mt-5">
          再次点击模型可继续旋转
        </p>
      </div>
    </div>
  );
}
