import { useState } from 'react';
import { PRESET_COLORS } from '../../../shared/types';
import type { EmotionRecord, Echo } from '../../../shared/types';

interface Props {
  open: boolean;
  records: EmotionRecord[];
  echoes: Echo[];
  onClose: () => void;
  onAddEcho: (echo: Omit<Echo, 'id' | 'createdAt'>) => void;
}

export default function ShareModal({ open, records, echoes, onClose, onAddEcho }: Props) {
  const [echoText, setEchoText] = useState('');
  const [echoColor, setEchoColor] = useState(PRESET_COLORS[0]);
  const [echoDate, setEchoDate] = useState(records[0]?.date || '');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)' }} />
      <div
        className="relative z-10 w-full max-w-[500px] mx-4 p-6 rounded-2xl max-h-[80vh] overflow-y-auto"
        style={{
          backdropFilter: 'blur(12px)',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">分享轨迹</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {records.map((r) => (
            <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="text-xs text-white/70">{r.date.slice(5)}</span>
              <span className="text-xs text-white/50">{r.text.slice(0, 6)}</span>
            </div>
          ))}
        </div>

        {echoes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm text-white/60 mb-2">回声</h3>
            <div className="space-y-1">
              {echoes.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm text-white/80">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-white/50">{e.targetDate.slice(5)}</span>
                  <span>{e.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-4 mt-4">
          <h3 className="text-sm text-white/60 mb-2">添加回声</h3>
          <select
            value={echoDate}
            onChange={(e) => setEchoDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm mb-2 outline-none"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
          >
            {records.map((r) => (
              <option key={r.id} value={r.date} className="bg-gray-800">
                {r.date}
              </option>
            ))}
          </select>

          <div className="flex gap-2 mb-2">
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
              onClick={() => {
                if (!echoText.trim() || !echoDate) return;
                const targetRecord = records.find((r) => r.date === echoDate);
                if (!targetRecord) return;
                onAddEcho({
                  trajectoryId: targetRecord.id,
                  targetDate: echoDate,
                  color: echoColor,
                  text: echoText.trim(),
                });
                setEchoText('');
              }}
              disabled={!echoText.trim() || !echoDate}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-40"
              style={{
                background: echoText.trim() ? echoColor : 'rgba(255,255,255,0.15)',
                color: 'white',
              }}
            >
              发送
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-xl text-white/60 transition-all duration-300 hover:bg-white/10"
          style={{ border: '1px solid rgba(255,255,255,0.2)' }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
