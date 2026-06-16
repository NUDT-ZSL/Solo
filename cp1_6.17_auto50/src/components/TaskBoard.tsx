import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { Commission, CommissionStatus } from '../data/mockData';
import { statusLabels } from '../data/mockData';

const statusOrder: CommissionStatus[] = ['pending', 'negotiating', 'creating', 'revising', 'completed'];

interface TaskBoardProps {
  onSelectCommission: (id: string) => void;
}

export default function TaskBoard({ onSelectCommission }: TaskBoardProps) {
  const commissions = useStore((state) => state.commissions);
  const updateCommissionStatus = useStore((state) => state.updateCommissionStatus);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleDragStart = (e: React.MouseEvent, commission: Commission) => {
    setDraggedId(commission.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setDragPosition({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleDragEnd = (e: MouseEvent) => {
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);

    if (draggedId) {
      const columns = document.querySelectorAll('.board-column');
      let found = false;
      columns.forEach((col) => {
        const rect = col.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          const status = col.getAttribute('data-status') as CommissionStatus;
          if (status) {
            updateCommissionStatus(draggedId, status);
            found = true;
          }
        }
      });
      if (!found) {
        setDraggedId(null);
      }
    }
    setDraggedId(null);
  };

  const getCommissionsByStatus = (status: CommissionStatus) =>
    commissions.filter((c) => c.status === status);

  const draggedCommission = commissions.find((c) => c.id === draggedId);

  return (
    <div className="task-board-wrapper">
      <div className="board-header">
        <h2>委托看板</h2>
        <p>拖动卡片切换状态</p>
      </div>
      <div className="board-container">
        {statusOrder.map((status) => (
          <div
            key={status}
            className="board-column"
            data-status={status}
          >
            <div className="column-header">
              <span className={`status-dot status-${status}`}></span>
              <h3>{statusLabels[status]}</h3>
              <span className="column-count">{getCommissionsByStatus(status).length}</span>
            </div>
            <div className="column-content">
              {getCommissionsByStatus(status).map((commission) => (
                <div
                  key={commission.id}
                  className={`commission-card ${draggedId === commission.id ? 'dragging' : ''}`}
                  onMouseDown={(e) => handleDragStart(e, commission)}
                  onClick={() => onSelectCommission(commission.id)}
                >
                  <h4 className="card-title">{commission.artworkTitle}</h4>
                  <p className="card-desc">{commission.description}</p>
                  <div className="card-meta">
                    <span className="card-budget">¥{commission.budget}</span>
                    <span className="card-deadline">截止: {commission.deadline}</span>
                  </div>
                  <div className="card-progress">
                    <div
                      className="progress-fill"
                      style={{ width: `${commission.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {draggedCommission && (
        <div
          className="dragging-card"
          style={{
            left: dragPosition.x - dragOffset.current.x,
            top: dragPosition.y - dragOffset.current.y
          }}
        >
          <h4 className="card-title">{draggedCommission.artworkTitle}</h4>
          <p className="card-desc">{draggedCommission.description}</p>
          <div className="card-meta">
            <span className="card-budget">¥{draggedCommission.budget}</span>
            <span className="card-deadline">截止: {draggedCommission.deadline}</span>
          </div>
        </div>
      )}
    </div>
  );
}
