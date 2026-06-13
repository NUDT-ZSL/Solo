// ============================================================
// SidePanel —— 右侧（或底部移动端）信息面板
// 数据流向：
//   useStrataStore.selectedLayerId -> 监听变化 -> fetch('/api/layers/:id/fossils')
//   server: GET /api/layers/:id/fossils -> 返回 Fossil[] -> useStrataStore.setFossils
//   -> maps FossilCard 列表
// ============================================================
import { Info, ChevronUp } from 'lucide-react';
import { useStrataStore } from '@/store/useStrataStore';
import { FossilCard } from './FossilCard';
import type { Layer } from '@/types';
import { useEffect } from 'react';

function formatAge(age: number): string {
  if (age >= 10000) {
    return `${(age / 10000).toFixed(2)}亿年前`;
  }
  return `${age}万年前`;
}

export default function SidePanel() {
  const layers = useStrataStore((s) => s.layers);
  const selectedLayerId = useStrataStore((s) => s.selectedLayerId);
  const fossils = useStrataStore((s) => s.fossils);
  const setFossils = useStrataStore((s) => s.setFossils);

  const selectedLayer: Layer | undefined = layers.find((l) => l._id === selectedLayerId) || undefined;

  // ------------------------------------------------------------
  // selectedLayerId 变化时向后端请求该层的化石列表
  // GET /api/layers/:id/fossils 由 server/src/server.ts 提供
  // ------------------------------------------------------------
  useEffect(() => {
    if (!selectedLayerId) {
      setFossils([]);
      return;
    }
    const fetchFossils = async () => {
      try {
        const res = await fetch(`/api/layers/${selectedLayerId}/fossils`);
        if (res.ok) {
          const data = await res.json();
          setFossils(data);
        }
      } catch {
        setFossils([]);
      }
    };
    fetchFossils();
  }, [selectedLayerId, setFossils]);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 md:top-16 md:right-4 md:bottom-24 md:left-auto h-[50vh] md:h-auto md:w-[320px] overflow-y-auto z-40 p-6 border border-slate-700 rounded-tl-[24px] rounded-tr-[24px] md:rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
      style={{
        backgroundColor: 'rgba(31, 41, 55, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="md:hidden flex justify-center mb-2">
        <ChevronUp size={24} className="text-gray-400" />
      </div>
      {!selectedLayer ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
            <Info size={32} className="text-blue-300" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">请选择地层</h2>
          <p className="text-gray-400 text-sm mb-6">点击任意地层切片查看详情</p>
          <p className="text-gray-300 text-xs">当前展示地层总数: {layers.length}</p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-white font-bold text-xl mb-1">{selectedLayer.name}</h2>
              <p className="text-blue-300 text-sm">{selectedLayer.era} · {selectedLayer.period}</p>
            </div>
            <div
              className="w-6 h-6 rounded shrink-0 ml-3 border border-white/20"
              style={{ backgroundColor: selectedLayer.color }}
            />
          </div>
          <div className="flex flex-wrap gap-4 mb-6 text-gray-300 text-xs">
            <span>{formatAge(selectedLayer.ageStart)} - {formatAge(selectedLayer.ageEnd)}</span>
            <span>厚度: {selectedLayer.thickness}米</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-white font-bold text-base">化石标本</h3>
            <span className="bg-slate-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
              {fossils.length}
            </span>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto flex-1 pb-2">
            {fossils.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">暂无化石数据</div>
            ) : (
              fossils.map((fossil) => (
                <FossilCard key={fossil._id} fossil={fossil} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
