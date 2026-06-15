import React, { useState } from 'react';
import { Tag, Character } from '../types';

interface SidePanelProps {
  tags: Tag[];
  characters: Character[];
  onAddCharacter: () => void;
  onAddTag: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const SidePanel: React.FC<SidePanelProps> = ({
  tags,
  characters,
  onAddCharacter,
  onAddTag,
  isOpen = true,
  onClose,
  isMobile = false,
}) => {
  const [tagsCollapsed, setTagsCollapsed] = useState(false);
  const [charsCollapsed, setCharsCollapsed] = useState(false);

  const handleTagDragStart = (e: React.DragEvent, tag: Tag) => {
    e.dataTransfer.setData('tag', JSON.stringify(tag));
    e.dataTransfer.effectAllowed = 'link';
  };

  const handleCharacterDragStart = (e: React.DragEvent, character: Character) => {
    e.dataTransfer.setData('character', JSON.stringify(character));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const panelContent = (
    <div className="side-panel-inner">
      <div className="panel-header">
        <h2 className="panel-title">StoryCanvas</h2>
        {isMobile && (
          <button className="close-btn" onClick={onClose}>&times;</button>
        )}
      </div>

      <div className="panel-section">
        <div
          className="section-header"
          onClick={() => setTagsCollapsed(!tagsCollapsed)}
        >
          <span className="section-title">标签</span>
          <span className="collapse-icon">{tagsCollapsed ? '▼' : '▲'}</span>
        </div>
        {!tagsCollapsed && (
          <div className="tag-list">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="tag-chip"
                style={{ backgroundColor: tag.color }}
                draggable
                onDragStart={(e) => handleTagDragStart(e, tag)}
                title="拖拽到卡片上关联标签"
              >
                {tag.name}
              </div>
            ))}
            <button className="add-tag-btn" onClick={onAddTag}>
              + 新建标签
            </button>
          </div>
        )}
      </div>

      <div className="panel-section">
        <div
          className="section-header"
          onClick={() => setCharsCollapsed(!charsCollapsed)}
        >
          <span className="section-title">角色库</span>
          <span className="collapse-icon">{charsCollapsed ? '▼' : '▲'}</span>
        </div>
        {!charsCollapsed && (
          <div className="character-list">
            {characters.map((char) => (
              <div
                key={char.id}
                className="character-card"
                draggable
                onDragStart={(e) => handleCharacterDragStart(e, char)}
                title="拖拽到画布创建角色节点"
              >
                <div className="char-avatar"></div>
                <span className="char-name">{char.name}</span>
              </div>
            ))}
            <button className="add-char-btn" onClick={onAddCharacter}>
              + 新建角色
            </button>
          </div>
        )}
      </div>

      <style>{`
        .side-panel-inner {
          width: 240px;
          height: 100%;
          background: #2c2c38;
          color: #dfe6e9;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .panel-header {
          padding: 20px 16px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #3d3d4e;
        }

        .panel-title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }

        .close-btn {
          background: none;
          border: none;
          color: #dfe6e9;
          font-size: 24px;
          cursor: pointer;
          padding: 0 4px;
        }

        .close-btn:hover {
          color: #ffffff;
        }

        .panel-section {
          padding: 16px;
          border-bottom: 1px solid #3d3d4e;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          margin-bottom: 12px;
          user-select: none;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        .collapse-icon {
          font-size: 10px;
          color: #b2bec3;
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag-chip {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 13px;
          color: #ffffff;
          cursor: grab;
          transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
          user-select: none;
        }

        .tag-chip:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .tag-chip:active {
          cursor: grabbing;
        }

        .add-tag-btn {
          width: 100%;
          margin-top: 8px;
          padding: 8px;
          background: transparent;
          border: 1px dashed #636e72;
          color: #b2bec3;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .add-tag-btn:hover {
          border-color: #6c5ce7;
          color: #a29bfe;
        }

        .character-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .character-card {
          width: 160px;
          height: 60px;
          background: #ffeaa7;
          color: #2d3436;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          cursor: grab;
          transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
          user-select: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .character-card:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }

        .character-card:active {
          cursor: grabbing;
        }

        .char-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #fdcb6e;
        }

        .char-name {
          font-size: 14px;
          font-weight: 500;
        }

        .add-char-btn {
          width: 160px;
          height: 40px;
          background: #6c5ce7;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: background-color 0.2s ease;
        }

        .add-char-btn:hover {
          background: #a29bfe;
        }
      `}</style>
    </div>
  );

  if (isMobile) {
    return (
      <div className={`mobile-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-overlay" onClick={onClose}></div>
        <div className="drawer-panel">
          {panelContent}
        </div>
        <style>{`
          .mobile-drawer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            pointer-events: none;
          }

          .mobile-drawer.open {
            pointer-events: auto;
          }

          .drawer-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .mobile-drawer.open .drawer-overlay {
            opacity: 1;
          }

          .drawer-panel {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .mobile-drawer.open .drawer-panel {
            transform: translateX(0);
          }
        `}</style>
      </div>
    );
  }

  return panelContent;
};

export default SidePanel;
