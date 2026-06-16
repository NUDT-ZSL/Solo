import { useEffect, useRef } from 'react';
import {
  getLineById,
  getCurrentFlow,
  getDensity,
  getCrowdLevel,
  getCrowdLevelText,
  getCrowdLevelColor,
  calculateTrend,
  getTrendArrow,
  getTrendColor,
  type Station,
} from '@/map/stationData';
import { X, Users, Clock, MapPin, TrendingUp } from 'lucide-react';

interface DetailPanelProps {
  station: Station | null;
  currentTime: number;
  onClose: () => void;
}

export default function DetailPanel({ station, currentTime, onClose }: DetailPanelProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas || !station) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 16, right: 12, bottom: 24, left: 36 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const history = station.history;
    const prediction = station.prediction;
    const allData = [...history, ...prediction];
    const maxVal = Math.max(...allData) * 1.1;
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const historyCount = history.length;
    const totalCount = allData.length;
    const stepX = chartW / (totalCount - 1);

    const getY = (val: number) => {
      return padding.top + chartH - ((val - minVal) / range) * chartH;
    };

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const val = Math.round(maxVal - (range / 4) * i);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText((val / 1000).toFixed(0) + 'k', padding.left - 6, y);
    }

    ctx.save();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let i = 0; i < historyCount; i++) {
      const x = padding.left + i * stepX;
      const y = getY(history[i]);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([5, 3]);
    for (let i = 0; i <= prediction.length; i++) {
      const idx = historyCount - 1 + i;
      const x = padding.left + idx * stepX;
      const val = i === 0 ? history[historyCount - 1] : prediction[i - 1];
      const y = getY(val);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const currentIdx = Math.floor(currentTime);
    const currentX = padding.left + currentIdx * stepX;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(currentX, padding.top);
    ctx.lineTo(currentX, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(currentX, getY(history[currentIdx]), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < 24; i += 6) {
      const x = padding.left + i * stepX;
      ctx.fillText(`${i}:00`, x, height - padding.bottom + 6);
    }

    ctx.fillStyle = '#93c5fd';
    ctx.fillText('预测', padding.left + (historyCount + 10) * stepX, padding.top - 10);
  }, [station, currentTime]);

  if (!station) {
    return (
      <div className="w-[320px] h-full flex flex-col items-center justify-center text-slate-400 p-6 bg-[#f8fafc] rounded-xl shadow-lg">
        <MapPin size={48} className="mb-4 opacity-30" />
        <p className="text-sm text-center">点击地图上的站点查看详情</p>
      </div>
    );
  }

  const line = getLineById(station.lineId);
  const flow = getCurrentFlow(station, Math.floor(currentTime));
  const density = getDensity(station, Math.floor(currentTime));
  const crowdLevel = getCrowdLevel(density);
  const crowdText = getCrowdLevelText(crowdLevel);
  const crowdColor = getCrowdLevelColor(crowdLevel);
  const trend = calculateTrend(station, Math.floor(currentTime));
  const trendArrow = getTrendArrow(trend);
  const trendColor = getTrendColor(trend);
  const trendText = trend === 'up' ? '上升' : trend === 'down' ? '下降' : '稳定';

  const maxFlow = Math.max(...station.history);
  const avgFlow = Math.floor(station.history.reduce((a, b) => a + b, 0) / station.history.length);
  const peakHour = station.history.indexOf(maxFlow);

  return (
    <div className="w-[320px] h-full flex flex-col bg-[#f8fafc] rounded-xl shadow-lg overflow-hidden">
      <div
        className="p-4 text-white"
        style={{ backgroundColor: line?.color || '#64748b' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{station.name}</h2>
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
          <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Users size={12} />
              <span>当前客流</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{flow.toLocaleString()}</p>
            <p className="text-xs text-slate-400">人次/小时</p>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Clock size={12} />
              <span>峰值时间</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{peakHour}:00</p>
            <p className="text-xs text-slate-400">{maxFlow.toLocaleString()} 人次</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-800 text-sm font-semibold">客流状态</h3>
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{ backgroundColor: crowdColor + '20', color: crowdColor }}
            >
              {crowdText}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${density * 100}%`, backgroundColor: crowdColor }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">拥挤度 {Math.round(density * 100)}%</span>
            <span style={{ color: trendColor }}>
              {trendArrow} {trendText}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-blue-500" />
            <h3 className="text-slate-800 text-sm font-semibold">客流趋势预测</h3>
          </div>
          <div className="h-32">
            <canvas
              ref={chartRef}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-blue-400" />
              历史
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-blue-400" />
              预测
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <h3 className="text-slate-800 text-sm font-semibold mb-3">站点信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">日均客流</span>
              <span className="text-slate-800">{avgFlow.toLocaleString()} 人次</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">设计容量</span>
              <span className="text-slate-800">{station.capacity.toLocaleString()} 人/小时</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">所属线路</span>
              <span className="text-slate-800">{line?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">站点编号</span>
              <span className="text-slate-800 font-mono text-xs">{station.id}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <h3 className="text-slate-800 text-sm font-semibold mb-3">未来1小时预测</h3>
          <div className="space-y-2">
            {[0, 15, 30, 45, 59].map((minute) => {
              const val = station.prediction[minute] || 0;
              const pct = val / station.capacity;
              const timeLabel = `${(Math.floor(currentTime) + 1) % 24}:${minute.toString().padStart(2, '0')}`;
              return (
                <div key={minute} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-12">{timeLabel}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, pct * 100)}%`,
                        backgroundColor: pct > 0.8 ? '#ef4444' : pct > 0.6 ? '#f97316' : pct > 0.3 ? '#eab308' : '#22c55e',
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-600 w-16 text-right">
                    {val.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
