import React, { useState, useEffect, useRef } from 'react';
import { Exhibit } from '../types';
import './EditPanel.css';

interface EditPanelProps {
  exhibit: Exhibit | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (exhibitData: Partial<Exhibit>) => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ exhibit, isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [year, setYear] = useState('');
  const [material, setMaterial] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (exhibit) {
      setName(exhibit.name);
      setArtist(exhibit.artist);
      setYear(exhibit.year);
      setMaterial(exhibit.material);
      if (editorRef.current) {
        editorRef.current.innerHTML = exhibit.description;
      }
    }
  }, [exhibit]);

  useEffect(() => {
    if (isOpen && editorRef.current) {
      editorRef.current.innerHTML = exhibit?.description || '';
    }
  }, [isOpen, exhibit?.description]);

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

  return (
    <>
      <div className={`edit-backdrop ${isOpen ? 'visible' : ''}`} onClick={onClose} />
      <div className={`edit-panel ${isOpen ? 'open' : ''}`}>
        <div className="edit-panel-header">
          <h3>展品详情编辑</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="edit-panel-body">
          <div className="form-field">
            <label className="form-label">展品名称</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入展品名称"
            />
          </div>

          <div className="form-field">
            <label className="form-label">艺术家</label>
            <input
              type="text"
              className="form-input"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="请输入艺术家姓名"
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">创作年份</label>
              <input
                type="text"
                className="form-input"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="如：1889"
              />
            </div>
            <div className="form-field">
              <label className="form-label">材质尺寸</label>
              <input
                type="text"
                className="form-input"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="如：布面油画"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">策展描述</label>
            <div className="rich-editor-toolbar">
              <button
                className="tool-btn"
                onClick={() => execCommand('bold')}
                title="加粗"
                type="button"
              >
                <b>B</b>
              </button>
              <button
                className="tool-btn"
                onClick={() => execCommand('italic')}
                title="斜体"
                type="button"
              >
                <i>I</i>
              </button>
              <button
                className="tool-btn"
                onClick={() => execCommand('underline')}
                title="下划线"
                type="button"
              >
                <u>U</u>
              </button>
              <span className="tool-divider" />
              <button
                className="tool-btn"
                onClick={() => execCommand('insertUnorderedList')}
                title="无序列表"
                type="button"
              >
                •
              </button>
              <button
                className="tool-btn"
                onClick={() => execCommand('insertOrderedList')}
                title="有序列表"
                type="button"
              >
                1.
              </button>
            </div>
            <div
              ref={editorRef}
              className="rich-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="请输入策展描述..."
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
