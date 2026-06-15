import React, { useState, useRef, useCallback } from 'react';
import EmotionCanvas, { EmotionRecord } from './EmotionCanvas';
import ControlPanel from './ControlPanel';
import { EmotionType, EMOTION_LABELS, getEmotionColor } from './utils/colorMap';

const STORAGE_KEY = 'emotion-spectrum-records';

function loadRecords(): EmotionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: EmotionRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const App: React.FC = () => {
  const [records, setRecords] = useState<EmotionRecord[]>(loadRecords);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState('');
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [detailRecord, setDetailRecord] = useState<EmotionRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSubmit = useCallback(() => {
    if (!selectedEmotion) return;
    const today = formatDateStr(new Date());
    const newRecord: EmotionRecord = {
      date: today,
      emotion: selectedEmotion,
      intensity,
      note,
    };
    const updated = [...records, newRecord];
    setRecords(updated);
    saveRecords(updated);
    setNote('');
    setIntensity(5);
    showToast('记录成功 ✓');
  }, [selectedEmotion, intensity, note, records]);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `emotion-spectrum-${formatDateStr(new Date())}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('光谱已导出');
  }, []);

  const handlePrev = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  }, [currentDate, viewMode]);

  const handleNext = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  }, [currentDate, viewMode]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const monthLabel = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;

  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">情绪光谱</h1>
        <p className="app-subtitle">记录你的情绪，看见内心的色彩</p>
      </header>

      <main className="app-main">
        <div className="glass-card canvas-card">
          <div className="nav-bar">
            <button className="nav-btn" onClick={handlePrev}>
              ‹
            </button>
            <span className="nav-label">
              {viewMode === 'week' ? weekLabel : monthLabel}
            </span>
            <button className="nav-btn" onClick={handleNext}>
              ›
            </button>
          </div>
          <EmotionCanvas
            records={records}
            viewMode={viewMode}
            currentDate={currentDate}
            onRecordClick={setDetailRecord}
            canvasRef={canvasRef}
          />
        </div>

        <div className="glass-card control-card">
          <ControlPanel
            selectedEmotion={selectedEmotion}
            onEmotionChange={setSelectedEmotion}
            intensity={intensity}
            onIntensityChange={setIntensity}
            note={note}
            onNoteChange={setNote}
            onSubmit={handleSubmit}
            onExport={handleExport}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </main>

      {detailRecord && (
        <div className="modal-overlay" onClick={() => setDetailRecord(null)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetailRecord(null)}>
              ×
            </button>
            <div className="modal-date">{detailRecord.date}</div>
            <div className="modal-emotion" style={{ color: getEmotionColor(detailRecord.emotion).main }}>
              {EMOTION_LABELS[detailRecord.emotion]}
            </div>
            <div className="modal-intensity">强度：{detailRecord.intensity}/10</div>
            {detailRecord.note && <div className="modal-note">{detailRecord.note}</div>}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default App;
