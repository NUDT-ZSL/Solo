import React, { useState, useEffect } from 'react';
import { socketService } from '../services/socket';

interface Collaborator {
  userId: string;
  username: string;
  color: string;
  cursorPosition: number | null;
  isOnline: boolean;
}

interface CollaboratorPanelProps {
  proposalId: string;
  userId: string;
}

const CollaboratorPanel: React.FC<CollaboratorPanelProps> = ({ proposalId, userId }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    const handleJoined = (collaborator: Collaborator) => {
      setCollaborators(prev => {
        const exists = prev.find(c => c.userId === collaborator.userId);
        if (exists) {
          return prev.map(c => c.userId === collaborator.userId ? { ...c, isOnline: true } : c);
        }
        return [...prev, collaborator];
      });
    };

    const handleLeft = (leftUserId: string) => {
      setCollaborators(prev => prev.map(c => c.userId === leftUserId ? { ...c, isOnline: false } : c));
    };

    socketService.on('collaborator-joined', handleJoined);
    socketService.on('collaborator-left', handleLeft);

    return () => {
      socketService.off('collaborator-joined', handleJoined);
      socketService.off('collaborator-left', handleLeft);
    };
  }, [proposalId]);

  const online = collaborators.filter(c => c.isOnline);
  const offline = collaborators.filter(c => !c.isOnline);

  return (
    <div style={{
      background: '#ECF0F1',
      color: '#2C3E50',
      borderLeft: '1px solid #BDC3C7',
      width: 240,
      padding: 16,
      overflowY: 'auto',
      fontFamily: 'sans-serif',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#2C3E50' }}>
        协作者
      </h3>

      {online.map(c => (
        <div
          key={c.userId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 0',
            borderBottom: '1px solid #BDC3C7',
            animation: c.userId === userId ? 'none' : 'springIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: c.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {c.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.username}{c.userId === userId ? ' (你)' : ''}
            </div>
            {c.cursorPosition != null && (
              <div style={{ fontSize: 11, color: '#7F8C8D' }}>
                行 {c.cursorPosition}
              </div>
            )}
          </div>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#2ECC71',
            flexShrink: 0,
          }} />
        </div>
      ))}

      {offline.map(c => (
        <div
          key={c.userId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 0',
            borderBottom: '1px solid #BDC3C7',
            opacity: 0.5,
            animation: 'fadeOut 0.2s',
          }}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: c.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {c.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.username}{c.userId === userId ? ' (你)' : ''}
            </div>
            {c.cursorPosition != null && (
              <div style={{ fontSize: 11, color: '#7F8C8D' }}>
                行 {c.cursorPosition}
              </div>
            )}
          </div>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#BDC3C7',
            flexShrink: 0,
          }} />
        </div>
      ))}

      <style>{`
        @keyframes springIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default CollaboratorPanel;
