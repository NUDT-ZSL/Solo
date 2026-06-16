import React, { useState } from 'react';
import { Track } from '../types';

interface TrackListProps {
  tracks: Track[];
  onTrackUpdate: (track: Track) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function TrackList({ tracks, onTrackUpdate, collapsed, onToggleCollapse }: TrackListProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (collapsed) {
    return (
      <>
        <div style={{
          width: 50,
          background: '#16213e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          gap: 12,
          flexShrink: 0,
        }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#0f3460',
              border: 'none',
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ☰
          </button>
          {tracks.map(t => (
            <div key={t.id} style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: t.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
            }}>
              {t.name[0]}
            </div>
          ))}
        </div>
        {drawerOpen && (
          <>
            <div
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 998,
              }}
            />
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              background: '#16213e',
              borderRadius: '0 12px 12px 0',
              zIndex: 999,
              padding: 16,
              overflow: 'auto',
              animation: 'slideIn 0.25s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>轨道列表</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18 }}
                >
                  ✕
                </button>
              </div>
              {tracks.map(track => (
                <TrackCard key={track.id} track={track} onUpdate={onTrackUpdate} />
              ))}
            </div>
          </>
        )}
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      </>
    );
  }

  return (
    <div style={{
      width: 280,
      background: '#16213e',
      borderRadius: 12,
      margin: 8,
      padding: 12,
      overflow: 'auto',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#e94560' }}>
        🎵 轨道列表
      </div>
      {tracks.map(track => (
        <TrackCard key={track.id} track={track} onUpdate={onTrackUpdate} />
      ))}
    </div>
  );
}

function TrackCard({ track, onUpdate }: { track: Track; onUpdate: (t: Track) => void }) {
  return (
    <div style={{
      background: '#0f3460',
      borderRadius: 8,
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: track.color,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{track.name}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => onUpdate({ ...track, solo: !track.solo })}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: track.solo ? '#e94560' : '#0f3460',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          S
        </button>
        <button
          onClick={() => onUpdate({ ...track, mute: !track.mute })}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: track.mute ? '#e94560' : '#0f3460',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          M
        </button>
        <button
          onClick={() => onUpdate({ ...track, visible: !track.visible })}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: track.visible ? '#533483' : '#0f3460',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          👁
        </button>
      </div>
    </div>
  );
}
