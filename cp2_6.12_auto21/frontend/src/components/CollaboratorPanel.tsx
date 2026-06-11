import React, { useState, useEffect } from 'react';
import { socketService } from '../services/socket';

const PRESET_COLORS = [
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71',
  '#1ABC9C', '#3498DB', '#9B59B6', '#E91E63',
  '#00BCD4', '#8BC34A', '#FF9800', '#795548'
];

const getColorByUserId = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_COLORS.length;
  return PRESET_COLORS[index];
};

interface CursorPosition {
  line: number;
  column: number;
}

interface Collaborator {
  userId: string;
  username: string;
  color: string;
  cursorPosition: CursorPosition | null;
  isOnline: boolean;
}

interface CollaboratorPanelProps {
  proposalId: string;
  userId: string;
}

const CollaboratorPanel: React.FC<CollaboratorPanelProps> = ({ proposalId, userId }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleJoined = (collaborator: Collaborator) => {
      setCollaborators(prev => {
        const exists = prev.find(c => c.userId === collaborator.userId);
        if (exists) {
          if (leavingIds.has(collaborator.userId)) {
            setLeavingIds(prev => {
              const next = new Set(prev);
              next.delete(collaborator.userId);
              return next;
            });
          }
          return prev.map(c => c.userId === collaborator.userId
            ? { ...c, isOnline: true, color: collaborator.color || c.color, username: collaborator.username || c.username }
            : c
          );
        }
        const color = collaborator.color || getColorByUserId(collaborator.userId);
        const newCollaborator = { ...collaborator, color, isOnline: true, cursorPosition: null };
        setAnimatingIds(prev => new Set(prev).add(collaborator.userId));
        setTimeout(() => {
          setAnimatingIds(prev => {
            const next = new Set(prev);
            next.delete(collaborator.userId);
            return next;
          });
        }, 300);
        return [...prev, newCollaborator];
      });
    };

    const handleLeft = (data: { userId: string }) => {
      const leftUserId = data.userId;
      setLeavingIds(prev => new Set(prev).add(leftUserId));
      setTimeout(() => {
        setCollaborators(prev => prev.map(c => c.userId === leftUserId ? { ...c, isOnline: false } : c));
        setLeavingIds(prev => {
          const next = new Set(prev);
          next.delete(leftUserId);
          return next;
        });
      }, 200);
    };

    const handleCursorMove = (data: { userId: string; username: string; position: number; cursorPosition: CursorPosition; color: string }) => {
      setCollaborators(prev => {
        const exists = prev.find(c => c.userId === data.userId);
        if (exists) {
          return prev.map(c => c.userId === data.userId
            ? { ...c, cursorPosition: data.cursorPosition, color: data.color || c.color, username: data.username || c.username }
            : c
          );
        }
        const color = data.color || getColorByUserId(data.userId);
        return [...prev, {
          userId: data.userId,
          username: data.username,
          color,
          cursorPosition: data.cursorPosition,
          isOnline: true,
        }];
      });
    };

    socketService.on('collaborator-joined', handleJoined);
    socketService.on('collaborator-left', handleLeft);
    socketService.on('remote-cursor-move', handleCursorMove);

    return () => {
      socketService.off('collaborator-joined');
      socketService.off('collaborator-left');
      socketService.off('remote-cursor-move');
    };
  }, [proposalId, userId, leavingIds]);

  const online = collaborators.filter(c => c.isOnline);
  const offline = collaborators.filter(c => !c.isOnline);

  const renderCollaborator = (c: Collaborator, isOnline: boolean) => {
    const isLeaving = leavingIds.has(c.userId);
    const isAnimating = animatingIds.has(c.userId);

    return (
      <div
        key={c.userId}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 0',
          borderBottom: '1px solid #BDC3C7',
          opacity: isOnline ? (isLeaving ? 0.5 : 1) : 0.5,
          transition: 'opacity 0.2s ease',
          animation: isAnimating ? 'springIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
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
          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#2C3E50' }}>
            {c.username}{c.userId === userId ? ' (你)' : ''}
          </div>
          {c.cursorPosition && (
            <div style={{ fontSize: 11, color: '#7F8C8D', transition: 'all 0.15s ease' }}>
              行 {c.cursorPosition.line}, 列 {c.cursorPosition.column}
            </div>
          )}
        </div>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isOnline ? '#2ECC71' : '#BDC3C7',
          flexShrink: 0,
        }} />
      </div>
    );
  };

  return (
    <div style={{
      background: '#ECF0F1',
      color: '#2C3E50',
      borderLeft: '1px solid #BDC3C7',
      width: 240,
      padding: 16,
      overflowY: 'auto',
      fontFamily: 'sans-serif',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#2C3E50' }}>
        协作者
      </h3>

      {online.map(c => renderCollaborator(c, true))}

      {offline.map(c => renderCollaborator(c, false))}

      <style>{`
        @keyframes springIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
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
