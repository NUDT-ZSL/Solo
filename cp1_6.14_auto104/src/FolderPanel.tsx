import React, { useState } from 'react';
import { Folder, Card } from './types';
import './FolderPanel.css';

interface FolderPanelProps {
  folders: Folder[];
  cards: Card[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onCardDrop: (cardId: string, folderId: string | null) => void;
  onExportJSON: () => void;
  onExportZIP: () => void;
}

const FolderPanel: React.FC<FolderPanelProps> = ({
  folders,
  cards,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onCardDrop,
  onExportJSON,
  onExportZIP,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const allFolderCount = cards.length;

  const handleCreateClick = () => {
    setIsCreating(true);
    setNewFolderName('');
  };

  const handleCreateSubmit = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setIsCreating(false);
      setNewFolderName('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateSubmit();
    if (e.key === 'Escape') {
      setIsCreating(false);
      setNewFolderName('');
    }
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      onCardDrop(cardId, folderId);
    }
    setDragOverFolderId(null);
  };

  return (
    <div className="folder-panel">
      <div className="folder-panel-header">
        <span>
          <h3 className="panel-title">分组</h3>
        </span>
        <button className="add-folder-btn" onClick={handleCreateClick} title="新建分组">
          +
        </button>
      </div>

      {isCreating && (
        <div className="create-folder-form">
          <input
            type="text"
            className="folder-input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="分组名称"
            autoFocus
          />
          <div className="folder-form-actions">
            <button className="btn btn-primary btn-sm" onClick={handleCreateSubmit}>
              创建
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setIsCreating(false);
                setNewFolderName('');
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div
        className={`folder-item all-folder ${selectedFolderId === null ? 'selected' : ''} ${dragOverFolderId === null && dragOverFolderId !== undefined ? 'drag-over' : ''}`}
        onClick={() => onSelectFolder(null)}
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      >
        <div className="folder-icon all-icon">📁</div>
        <span className="folder-name">全部灵感</span>
        {allFolderCount > 0 && (
          <span className="folder-badge">{allFolderCount}</span>
        )}
      </div>

      <div className="folder-grid">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`folder-item ${selectedFolderId === folder.id ? 'selected' : ''} ${dragOverFolderId === folder.id ? 'drag-over' : ''}`}
            onClick={() => onSelectFolder(folder.id)}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
          >
            <div className="folder-icon">📂</div>
            <span className="folder-name">{folder.name}</span>
            {folder.cardCount > 0 && (
              <span className="folder-badge">{folder.cardCount}</span>
            )}
          </div>
        ))}
      </div>

      <div className="export-section">
        <h4 className="section-title">导出</h4>
        <button className="export-btn" onClick={onExportJSON}>
          📄 导出 JSON
        </button>
        <button className="export-btn" onClick={onExportZIP}>
          📦 导出 ZIP
        </button>
      </div>
    </div>
  );
};

export default FolderPanel;
