// ============================================================
// FossilCard —— 单个化石卡片
// 数据流向：
//   SidePanel (父) -> 传入 fossil 对象
//   onClick "查看3D" -> useStrataStore.viewFossil(fossil)
//   -> Scene3D/FossilViewer 读取 viewingFossil 并渲染 3D 模型
// ============================================================
import { Eye } from 'lucide-react';
import type { Fossil } from '@/types';
import { useStrataStore } from '@/store/useStrataStore';

interface FossilCardProps {
  fossil: Fossil;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getGradientColors(modelType: string): [string, string] {
  const colorPalettes: [string, string][] = [
    ['#f59e0b', '#ef4444'],
    ['#10b981', '#06b6d4'],
    ['#8b5cf6', '#ec4899'],
    ['#3b82f6', '#8b5cf6'],
    ['#f97316', '#eab308'],
    ['#14b8a6', '#22c55e'],
    ['#ec4899', '#f43f5e'],
    ['#6366f1', '#3b82f6'],
  ];
  const index = hashCode(modelType) % colorPalettes.length;
  return colorPalettes[index];
}

export function FossilCard({ fossil }: FossilCardProps) {
  const viewFossil = useStrataStore((s) => s.viewFossil);
  const setFossilRotating = useStrataStore((s) => s.setFossilRotating);
  const setShowFossilDetail = useStrataStore((s) => s.setShowFossilDetail);

  const [color1, color2] = getGradientColors(fossil.modelType);
  const firstChar = fossil.name.charAt(0).toUpperCase();

  const handleClick = () => {
    viewFossil(fossil);
    setFossilRotating(true);
    setShowFossilDetail(false);
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:scale-[1.02] transition-all duration-150"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
    >
      <div
        className="w-[60px] h-[60px] rounded-full flex items-center justify-center shrink-0"
        style={{
          background: `conic-gradient(from 0deg, ${color1}, ${color2}, ${color1})`,
        }}
      >
        <span className="text-white font-bold text-[22px]">{firstChar}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold text-[15px] truncate">{fossil.name}</div>
        <div className="text-gray-400 italic text-[11px] truncate">{fossil.latinName}</div>
      </div>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 bg-emerald-500 text-white text-[13px] py-1.5 px-3 rounded-lg hover:bg-emerald-600 hover:scale-105 transition-all duration-150 shrink-0"
      >
        <Eye size={14} />
        <span>查看3D</span>
      </button>
    </div>
  );
}
