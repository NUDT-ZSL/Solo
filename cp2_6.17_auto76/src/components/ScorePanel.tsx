import { useState } from 'react';
import { Member, ScoreRecord, SONG_LIST } from '@/utils/dataHelper';
import { createScore } from '@/api';
import { useAppStore } from '@/stores/useAppStore';
import AudioRecorder from './AudioRecorder';
import { X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ScorePanelProps {
  open: boolean;
  member: Member | null;
  onClose: () => void;
}

function getTodayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function ScorePanel({ open, member, onClose }: ScorePanelProps) {
  const addScore = useAppStore((s) => s.addScore);

  const [pitch, setPitch] = useState(60);
  const [rhythm, setRhythm] = useState(60);
  const [expression, setExpression] = useState(60);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([SONG_LIST[0]]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleSong = (song: string) => {
    setSelectedSongs((prev) => {
      if (prev.includes(song)) {
        if (prev.length <= 1) return prev;
        return prev.filter((s) => s !== song);
      }
      return [...prev, song];
    });
  };

  const handleSubmit = async () => {
    if (!member || selectedSongs.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const record: Omit<ScoreRecord, 'id'> = {
        memberId: member.id,
        date,
        songs: selectedSongs,
        pitch,
        rhythm,
        expression,
        note,
        audioUrl: audioUrl ?? undefined,
      };
      const created = await createScore(record);
      addScore(created);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        resetForm();
      }, 800);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPitch(60);
    setRhythm(60);
    setExpression(60);
    setSelectedSongs([SONG_LIST[0]]);
    setAudioUrl(null);
    setNote('');
    setDate(getTodayStr());
  };

  const sliderStyle = (value: number): React.CSSProperties => ({
    width: '100%',
    appearance: 'none',
    height: '6px',
    borderRadius: '3px',
    background: `linear-gradient(to right, #ff8a65 ${(value)}%, #4caf50 ${(value)}%)`,
    outline: 'none',
  });

  const thumbGlobalStyle = `
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: #7c4dff;
      border-radius: 50%;
      cursor: pointer;
      border: none;
    }
    input[type=range]::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: #7c4dff;
      border-radius: 50%;
      cursor: pointer;
      border: none;
    }
  `;

  if (!member) return null;

  return (
    <>
      <style>{thumbGlobalStyle}</style>

      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={onClose}
        />
      )}

      <div
        className="fixed right-0 top-0 h-full flex flex-col overflow-y-auto"
        style={{
          width: 360,
          backgroundColor: '#16213e',
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-out',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <div style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 600 }}>{member.name}</div>
            <div style={{ color: '#8a8a9a', fontSize: 13 }}>{member.voicePart}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8a9a' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-4 flex-1">
          {[
            { label: '音准', value: pitch, setter: setPitch },
            { label: '节奏', value: rhythm, setter: setRhythm },
            { label: '表现力', value: expression, setter: setExpression },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span style={{ color: '#c0c0d0', fontSize: 13 }}>{label}</span>
                <span style={{ color: '#7c4dff', fontSize: 13, fontWeight: 600 }}>{value}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                onChange={(e) => setter(Number(e.target.value))}
                style={sliderStyle(value)}
              />
            </div>
          ))}

          <div>
            <div style={{ color: '#c0c0d0', fontSize: 13, marginBottom: 8 }}>曲目</div>
            <div className="flex flex-wrap gap-2">
              {SONG_LIST.map((song) => (
                <button
                  key={song}
                  onClick={() => toggleSong(song)}
                  className="px-3 py-1.5 rounded-full text-sm transition-colors"
                  style={{
                    backgroundColor: selectedSongs.includes(song) ? '#9575cd' : '#2a2a4a',
                    color: '#e0e0e0',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {song}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: '#c0c0d0', fontSize: 13, marginBottom: 8 }}>排演日期</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: '#2a2a4a',
                color: '#e0e0e0',
                border: '1px solid rgba(255,255,255,0.1)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <div style={{ color: '#c0c0d0', fontSize: 13, marginBottom: 8 }}>录音</div>
            <AudioRecorder audioUrl={audioUrl} onAudioReady={setAudioUrl} />
          </div>

          <div>
            <div style={{ color: '#c0c0d0', fontSize: 13, marginBottom: 4 }}>文字备注</div>
            <textarea
              maxLength={150}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加文字备注..."
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              rows={3}
              style={{
                backgroundColor: '#2a2a4a',
                color: '#e0e0e0',
                border: '1px solid rgba(255,255,255,0.1)',
                outline: 'none',
              }}
            />
            <div style={{ color: '#8a8a9a', fontSize: 11, textAlign: 'right' }}>
              {note.length}/150
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={handleSubmit}
            disabled={selectedSongs.length === 0 || submitting}
            className="w-full rounded-lg text-white font-semibold transition-opacity"
            style={{
              height: 44,
              backgroundColor: success ? '#4caf50' : '#7c4dff',
              opacity: selectedSongs.length === 0 || submitting ? 0.5 : 1,
              cursor: selectedSongs.length === 0 || submitting ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
          >
            {success ? '提交成功 ✓' : submitting ? '提交中...' : '提交评分'}
          </button>
        </div>
      </div>
    </>
  );
}
