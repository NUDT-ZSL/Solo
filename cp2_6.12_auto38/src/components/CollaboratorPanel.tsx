import React from 'react';
import type { Collaborator, Note } from '../types';
import { midiToName, DURATION_LABELS } from '../types';

interface Props {
  me: Omit<Collaborator, 'selectedNoteId' | 'cursorX' | 'cursorY'>;
  collaborators: Collaborator[];
  notes: Note[];
  selectedNoteId: string | null;
}

const CollaboratorPanel: React.FC<Props> = ({ me, collaborators, notes, selectedNoteId }) => {
  const all = [
    { ...me, selectedNoteId },
    ...collaborators,
  ];

  const getNoteInfo = (noteId: string | null) => {
    if (!noteId) return null;
    const n = notes.find(x => x.id === noteId);
    if (!n) return null;
    return `${midiToName(n.pitch)} · ${DURATION_LABELS[n.duration]}`;
  };

  return (
    <div>
      <div className="panel-title">👥 协作者 ({all.length})</div>

      <div className="collaborator-list">
        {all.map(c => {
          const info = getNoteInfo(c.selectedNoteId);
          return (
            <div
              key={c.id}
              className={`collaborator-item ${info ? 'has-selection' : ''}`}
              style={{
                borderLeft: `3px solid ${c.color}`,
              }}
            >
              <div
                className="avatar"
                style={{ background: c.color }}
              >
                {c.avatar}
              </div>
              <div className="collab-info">
                <div className="collab-name">
                  {c.id === me.id ? `${c.name} (我)` : c.name}
                </div>
                <div className="collab-position">
                  {info ? `🎶 ${info}` : '正在浏览...'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: 'var(--bg-tertiary)' }}>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          乐谱统计
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span>🎵 音符总数</span>
          <strong style={{ color: 'var(--accent)' }}>{notes.length}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 6 }}>
          <span>👤 在线人数</span>
          <strong style={{ color: '#22c55e' }}>{all.length}</strong>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorPanel;
