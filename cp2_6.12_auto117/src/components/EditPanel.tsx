import React, { useState, useEffect, useRef } from 'react';
import { Exhibit } from '../types';
import './EditPanel.css';

interface EditPanelProps {
  exhibit: Exhibit | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (exhibit: Partial<Exhibit>) => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ exhibit, isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [year, setYear] = useState('');
  const [material, setMaterial] = useState('');
  const [description, setDescription] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (exhibit) {
      setName(exhibit.name);
      setArtist(exhibit.artist);
      setYear(exhibit.year);
      setMaterial(exhibit.material);
      setDescription(exhibit.description);
      if (editorRef.current) {
        editorRef.current.innerHTML = exhibit.description;
      }
    }
  }, [exhibit]);

  const handleSave = () => {
    if (!exhibit) return;
    onSave({
      id: exhibit.id,
      name,
      artist,
      year,
      material,
      description: editorRef.current?.innerHTML || '',
    });
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  if (!exhibit) return null;

  return (
    <>
      <div className={`edit-panel-backdrop ${isOpen ? 'visible' : ''}`} onClick={onClose} />
      <div className={`edit-panel-overlay ${isOpen ? 'open' : ''}`}>
        <div className="edit-panel-header">
          <h3>展品详情</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="edit-panel-body">
          <div className="form-group">
            <label>展品名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="输入展品名称"
            />
          </div>

          <div className="form-group">
            <label>艺术家</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="form-input"
              placeholder="输入艺术家名称"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>创作年份</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="form-input"
                placeholder="如：1889"
              />
            </div>
            <div className="form-group">
              <label>材质尺寸</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="form-input"
                placeholder="如：布面油画"
              />
            </div>
          </div>

          <div className="form-group">
            <label>策展描述</label>
            <div className="rich-editor-toolbar">
              <button
                className="toolbar-btn"
                onClick={() => execCommand('bold')}
                title="加粗"
              >
                <b>B</b>
              </button>
              <button
                className="toolbar-btn"
                onClick={() => execCommand('italic')}
                title="斜体"
              >
                <i>I</i>
              </button>
              <button
                className="toolbar-btn"
                onClick={() => execCommand('underline')}
                title="下划线"
              >
                <u>U</u>
              </button>
              <span className="toolbar-divider" />
              <button
                className="toolbar-btn"
                onClick={() => execCommand('insertUnorderedList')}
                title="无序列表"
              >
                •
              </button>
              <button
                className="toolbar-btn"
                onClick={() => execCommand('insertOrderedList')}
                title="有序列表"
              >
                1.
              </button>
            </div>
            <div
              ref={editorRef}
              className="rich-editor"
              contentEditable
              suppressContentEditableWarning
              placeholder="输入策展描述..."
            />
          </div>
        </div>

        <div className="edit-panel-footer">
          <button className="cancel-btn" onClick={onClose}>
            取消
          </button>
          <button className="save-btn" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </>
  );
};

export default EditPanel;
