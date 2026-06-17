import { useMoodBoardStore } from '../store/useMoodBoardStore';
import './SavedBoardsList.css';

interface SavedBoardsListProps {
  onLoadBoard?: () => void;
}

export function SavedBoardsList({ onLoadBoard }: SavedBoardsListProps) {
  const { savedBoards, loadBoard, deleteBoard } = useMoodBoardStore();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortedBoards = [...savedBoards].sort((a, b) => b.createdAt - a.createdAt);

  const handleLoad = (boardId: string) => {
    loadBoard(boardId);
    if (onLoadBoard) {
      onLoadBoard();
    }
  };

  return (
    <div className="saved-boards-list">
      <div className="saved-boards-header">
        <h3>我的情绪板</h3>
        <span className="boards-count">{savedBoards.length} 个</span>
      </div>

      <div className="saved-boards-content">
        {sortedBoards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无保存的情绪板</p>
            <p className="empty-hint">点击右上角保存按钮创建第一个</p>
          </div>
        ) : (
          <div className="boards-list">
            {sortedBoards.map((board) => (
              <div
                key={board.id}
                className="board-item"
                onClick={() => handleLoad(board.id)}
              >
                <div className="board-thumbnail">
                  {board.thumbnail ? (
                    <img src={board.thumbnail} alt={board.name} />
                  ) : (
                    <div className="thumbnail-placeholder">
                      <span>📋</span>
                    </div>
                  )}
                </div>
                <div className="board-info">
                  <div className="board-name" title={board.name}>
                    {board.name || '未命名'}
                  </div>
                  <div className="board-date">{formatDate(board.createdAt)}</div>
                  {board.tags.length > 0 && (
                    <div className="board-tags">
                      {board.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="board-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="delete-board-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这个情绪板吗？')) {
                      deleteBoard(board.id);
                    }
                  }}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
