import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { BriefModuleData, User } from '../types';
import { debounce } from '../utils/storage';
import '../styles/BriefModule.css';

const moduleIcons: Record<string, string> = {
  headline: '📰',
  local: '🏙️',
  international: '🌍',
  finance: '💰',
};

const moduleColors: Record<string, string> = {
  headline: 'linear-gradient(90deg, #1e3a5f 0%, #2563eb 100%)',
  local: 'linear-gradient(90deg, #0369a1 0%, #0ea5e9 100%)',
  international: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)',
  finance: 'linear-gradient(90deg, #065f46 0%, #10b981 100%)',
};

interface BriefModuleProps {
  module: BriefModuleData;
  index: number;
  currentUser: User;
  editingUsers: User[];
  onContentChange: (moduleId: string, content: string) => void;
  onTitleChange: (moduleId: string, title: string) => void;
}

const BriefModule: React.FC<BriefModuleProps> = ({
  module,
  index,
  currentUser,
  editingUsers,
  onContentChange,
  onTitleChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  const handleContentChange = useCallback(
    debounce((content: string) => {
      onContentChange(module.id, content);
    }, 300),
    [module.id, onContentChange]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTitleChange(module.id, e.target.value);
    },
    [module.id, onTitleChange]
  );

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  const otherEditingUsers = editingUsers.filter((u) => u.id !== currentUser.id);
  const hasOtherEditors = otherEditingUsers.length > 0;

  const cardClassName = `module-card ${hasOtherEditors ? 'user-b' : ''}`;

  return (
    <Draggable draggableId={module.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cardClassName}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
            transform: snapshot.isDragging
              ? `${provided.draggableProps.style?.transform} rotate(2deg)`
              : provided.draggableProps.style?.transform,
          }}
        >
          <div
            className="module-header"
            style={{ background: moduleColors[module.type] }}
            {...provided.dragHandleProps}
          >
            <span className="module-icon">{moduleIcons[module.type]}</span>
            <input
              type="text"
              className="module-title-input"
              value={module.title}
              onChange={handleTitleChange}
              placeholder="输入模块标题..."
              onClick={(e) => e.stopPropagation()}
            />
            <span className="drag-handle">⋮⋮</span>
          </div>

          <div className="module-content">
            {hasOtherEditors && (
              <div className="user-bubble">
                <div className="user-avatar-bubble orange">
                  {otherEditingUsers[0].name.charAt(0)}
                </div>
              </div>
            )}

            <div className="editor-wrapper">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={module.content}
                onChange={handleContentChange}
                modules={modules}
                placeholder="开始编辑新闻内容..."
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default BriefModule;
