import { getLineById, timeLabels, type Station } from '@/map/stationData';
import { X, Users, Clock, MapPin } from 'lucide-react';

interface DetailPanelProps {
  station: Station | null;
  currentTime: number;
  onClose: () => void;
}

export default function DetailPanel({ station, currentTime, onClose }: DetailPanelProps) {
  if (!station) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6">
        <MapPin size={48} className="mb-4 opacity-30" />
        <p className="text-sm text-center">点击地图上的站点查看详情</p>
      </div>
    );
  }

  const line = getLineById(station.lineId);
  const currentFlow = station.passengerFlow[currentTime];
  const maxFlow = Math.max(...station.passengerFlow);
  const avgFlow = Math.floor(
    station.passengerFlow.reduce((a, b) => a + b, 0) / station.passengerFlow.length
  );
  const peakHour = station.passengerFlow.indexOf(maxFlow);

  return (
    <div className="h-full flex flex-col animate-slideUpFadeIn">
      <div
        className="p-4 text-white"
        style={{ backgroundColor: line?.color || '#64748b' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{station.name}</h2>
            <p className="text-sm opacity-90">{line?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Users size={14} />
              <span>当前客流</span>
            </div>
            <p className="text-xl font-bold text-white">{currentFlow.toLocaleString()}</p>
            <p className="text-xs text-slate-500">人次/小时</p>
          </div>

          <div className="card p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Clock size={14} />
              <span>峰值时间</span>
            </div>
            <p className="text-xl font-bold text-white">{timeLabels[peakHour]}</p>
            <p className="text-xs text-slate-500">{maxFlow.toLocaleString()} 人次</p>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-white text-sm font-semibold mb-3">24小时客流分布</h3>
          <div className="h-28 flex items-end gap-0.5">
            {station.passengerFlow.map((flow, hour) => {
              const height = (flow / maxFlow) * 100;
              const isCurrent = hour === currentTime;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${height}%`,
                      backgroundColor: isCurrent
                        ? line?.color || '#3b82f6'
                        : `${line?.color}60` || '#3b82f660',
                      minHeight: '4px',
                    }}
                  />
                  {hour % 6 === 0 && (
                    <span className="text-[10px] text-slate-500">{hour}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-white text-sm font-semibold mb-3">站点信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">日均客流</span>
              <span className="text-white">{avgFlow.toLocaleString()} 人次</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">所属线路</span>
              <span className="text-white">{line?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">站点编号</span>
              <span className="text-white font-mono text-xs">{station.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
