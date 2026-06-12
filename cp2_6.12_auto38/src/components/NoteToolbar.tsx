import React from 'react';
import type { Note, NoteDuration } from '../types';
import { midiToName, DURATION_LABELS } from '../types';

interface Props {
  selectedNote: Note | null;
  onUpdateNote: (noteId: string, changes: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
}

const PITCH_OPTIONS: { label: string; value: number }[] = [];
for (let octave = 3; octave <= 6; octave++) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  names.forEach((n, i) => {
    PITCH_OPTIONS.push({
      label: `${n}${octave}`,
      value: (octave + 1) * 12 + i,
    });
  });
}

const DURATION_OPTIONS: { label: string; value: NoteDuration }[] = [
  { label: '全音符 (4拍)', value: 'whole' },
  { label: '二分音符 (2拍)', value: 'half' },
  { label: '四分音符 (1拍)', value: 'quarter' },
  { label: '八分音符 (½拍)', value: 'eighth' },
  { label: '十六分音符 (¼拍)', value: 'sixteenth' },
];

const NoteToolbar: React.FC<Props> = ({ selectedNote, onUpdateNote, onDeleteNote }) => {
  if (!selectedNote) {
    return (
      <div>
        <div className="panel-title">🎵 音符属性</div>
        <div className="add-hint">
          <strong>操作提示：</strong><br />
          • 点击五线谱空白处添加音符<br />
          • 拖拽音符可移动位置<br />
          • 点击音符可选中编辑属性<br />
          • 按 Delete 键删除选中音符
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-title">🎵 音符属性</div>

      <div style={{
        padding: '12px',
        borderRadius: 10,
        background: 'var(--bg-tertiary)',
        marginBottom: 18,
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>当前音符</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {midiToName(selectedNote.pitch)} · {DURATION_LABELS[selectedNote.duration]}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">音高 (Pitch)</label>
        <select
          className="form-select"
          value={selectedNote.pitch}
          onChange={e => onUpdateNote(selectedNote.id, { pitch: Number(e.target.value) })}
        >
          {PITCH_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">时值 (Duration)</label>
        <select
          className="form-select"
          value={selectedNote.duration}
          onChange={e => onUpdateNote(selectedNote.id, { duration: e.target.value as NoteDuration })}
        >
          {DURATION_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">水平位置</label>
        <input
          type="range"
          min={60}
          max={800}
          value={Math.round(selectedNote.x)}
          onChange={e => onUpdateNote(selectedNote.id, { x: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 2 }}>
          {Math.round(selectedNote.x)}px
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">五线谱位置</label>
        <input
          type="range"
          min={-2}
          max={11}
          value={selectedNote.y}
          onChange={e => {
            const y = Number(e.target.value);
            onUpdateNote(selectedNote.id, {
              y,
              pitch: 60 + (y - 4),
            });
          }}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 2 }}>
          位置 {selectedNote.y}
        </div>
      </div>

      <button
        className="delete-btn"
        onClick={() => onDeleteNote(selectedNote.id)}
      >
        🗑 删除音符
      </button>
    </div>
  );
};

export default NoteToolbar;
