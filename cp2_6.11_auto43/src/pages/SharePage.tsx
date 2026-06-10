import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { EmotionRecord, Echo } from '../../shared/types';
import { PRESET_COLORS } from '../../shared/types';
import { ArrowLeft } from 'lucide-react';

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [records, setRecords] = useState<EmotionRecord[]>([]);
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);
  const [echoText, setEchoText] = useState('');
  const [echoColor, setEchoColor] = useState(PRESET_COLORS[0]);
  const [echoDate, setEchoDate] = useState('');

  useEffect(() => {
    if (!shareId) return;
    fetch(`/api/share/${shareId}`)
      .then((res) => res.json())
      .then((data) => {
        setRecords(data.records || []);
        setEchoes(data.echoes || []);
        if (data.records?.length > 0) {
          setEchoDate(data.records[0].date);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [shareId]);

  const handleAddEcho = async () => {
    if (!echoText.trim() || !echoDate) return;
    const targetRecord = records.find((r) => r.date === echoDate);
    if (!targetRecord) return;
    try {
      const res = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trajectoryId: targetRecord.id,
          targetDate: echoDate,
          color: echoColor,
          text: echoText.trim(),
        }),
      });
      const newEcho = await res.json();
      setEchoes((prev) => [...prev, newEcho]);
      setEchoText('');
    } catch {}
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FADDC6 0%, #E8D0F0 100%)' }}
      >
        <div className="text-white/60">加载中...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #FADDC6 0%, #E8D0F0 100%)' }}
    >
      <div className="relative z-10 min-h-screen p-6">
        <header className="flex items-center gap-4 mb-6">
          <Link
            to="/"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <ArrowLeft size={16} className="text-white/80" />
          </Link>
          <h1 className="text-xl font-bold text-white/90">情绪轨迹</h1>
        </header>

        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backdropFilter: 'blur(12px)',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <div className="flex flex-wrap gap-3">
            {records.map((r) => {
              const recordEchoes = echoes.filter((e) => e.targetDate === r.date);
              return (
                <div key={r.id} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <div
                      className="rounded-full transition-all duration-300 hover:scale-110 cursor-pointer"
                      style={{
                        width: `${20 + r.intensity * 6}px`,
                        height: `${20 + r.intensity * 6}px`,
                        backgroundColor: r.color,
                        boxShadow: `0 0 10px ${r.color}50`,
                      }}
                    />
                    {recordEchoes.map((e) => (
                      <div
                        key={e.id}
                        className="absolute -right-1.5 top-0 w-2 h-2 rounded-full animate-ping"
                        style={{ backgroundColor: e.color }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-white/60">{r.date.slice(5)}</span>
                  <span className="text-xs text-white/80 max-w-[60px] truncate">{r.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {echoes.length > 0 && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <h3 className="text-sm text-white/60 mb-2">回声</h3>
            <div className="space-y-2">
              {echoes.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-xs text-white/50">{e.targetDate.slice(5)}</span>
                  <span className="text-sm text-white/80">{e.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="rounded-2xl p-4"
          style={{
            backdropFilter: 'blur(12px)',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <h3 className="text-sm text-white/70 mb-3">添加回声</h3>
          <select
            value={echoDate}
            onChange={(e) => setEchoDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm mb-3 outline-none"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
          >
            {records.map((r) => (
              <option key={r.id} value={r.date} className="bg-gray-800">
                {r.date} - {r.text}
              </option>
            ))}
          </select>

          <div className="flex gap-2 mb-3">
            {PRESET_COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                onClick={() => setEchoColor(c)}
                className="w-6 h-6 rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: c,
                  border: echoColor === c ? '2px solid white' : '2px solid rgba(255,255,255,0.2)',
                  transform: echoColor === c ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={echoText}
              onChange={(e) => setEchoText(e.target.value.slice(0, 30))}
              placeholder="写一句回声..."
              maxLength={30}
              className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/40 text-sm outline-none"
              style={{ border: `1px solid ${echoText ? echoColor : 'rgba(255,255,255,0.2)'}` }}
            />
            <button
              onClick={handleAddEcho}
              disabled={!echoText.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-300 disabled:opacity-40"
              style={{ background: echoText.trim() ? echoColor : 'rgba(255,255,255,0.15)' }}
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
