import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { FileText, ListChecks, Star, Type, ChevronDown, Trash2, Eye } from 'lucide-react';
import { useEditorStore } from '../data/store';
import { surveyApi } from '../utils/api';
import type { ComponentType, SurveyComponent } from '../types';
import ComponentRenderer from './ComponentRenderer';

interface DraggableItem {
  type: ComponentType;
  name: string;
  icon: React.ReactNode;
}

const componentTypes: DraggableItem[] = [
  { type: 'radio', name: '单选题', icon: <FileText size={18} /> },
  { type: 'checkbox', name: '多选题', icon: <ListChecks size={18} /> },
  { type: 'rating', name: '评分题', icon: <Star size={18} /> },
  { type: 'text', name: '文本题', icon: <Type size={18} /> },
  { type: 'select', name: '下拉选择', icon: <ChevronDown size={18} /> }
];

const getDefaultLabel = (type: ComponentType): string => {
  const labels: Record<ComponentType, string> = {
    radio: '请选择一个选项',
    checkbox: '请选择多个选项',
    rating: '请您为我们的服务打分',
    text: '请输入您的意见',
    select: '请从下拉列表中选择'
  };
  return labels[type];
};

const getDefaultOptions = (type: ComponentType): string[] | undefined => {
  if (type === 'radio' || type === 'checkbox') {
    return ['选项A', '选项B', '选项C'];
  }
  if (type === 'select') {
    return ['选项一', '选项二', '选项三', '选项四'];
  }
  return undefined;
};

const Editor: React.FC = () => {
  const navigate = useNavigate();
  const {
    components,
    surveyTitle,
    addComponent,
    removeComponent,
    reorderComponents,
    setSurveyTitle,
    setCurrentSurvey
  } = useEditorStore();

  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedType, setDraggedType] = useState<ComponentType | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [libraryWidth, setLibraryWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishedCode, setPublishedCode] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const startWidth = useRef(300);

  const handleDragStart = useCallback((e: React.DragEvent, type: ComponentType) => {
    setDraggedType(type);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('componentType', type);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedType(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) {
      setIsDragOver(true);
    }
  }, [isDragOver]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const type = e.dataTransfer.getData('componentType') as ComponentType;
    if (!type) return;

    const newComponent: SurveyComponent = {
      id: uuidv4(),
      type,
      label: getDefaultLabel(type),
      options: getDefaultOptions(type),
      required: false
    };

    addComponent(newComponent);
    setNewlyAddedId(newComponent.id);

    setTimeout(() => {
      setNewlyAddedId((currentId) =>
        currentId === newComponent.id ? null : currentId
      );
    }, 500);

    setDraggedType(null);
  }, [addComponent]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    dragStartX.current = e.clientX;
    startWidth.current = libraryWidth;
  }, [libraryWidth]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const diff = e.clientX - dragStartX.current;
      const newWidth = Math.max(240, Math.min(400, startWidth.current + diff));
      setLibraryWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleCanvasComponentDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('componentIndex', index.toString());
  }, []);

  const handleCanvasComponentDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleCanvasComponentDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceIndexStr = e.dataTransfer.getData('componentIndex');
    if (sourceIndexStr === '') return;

    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    reorderComponents(sourceIndex, targetIndex);
  }, [reorderComponents]);

  const handlePreview = () => {
    navigate('/preview');
  };

  const handlePublish = async () => {
    if (components.length === 0) {
      alert('请至少添加一个问题组件');
      return;
    }

    try {
      const result = await surveyApi.createSurvey(surveyTitle, components);
      setCurrentSurvey(result.id, result.code);
      setPublishedCode(result.code);
      setShowPublishModal(true);
    } catch (error) {
      alert('发布失败，请重试');
      console.error(error);
    }
  };

  return (
    <div className="editor-container" ref={containerRef}>
      <div
        className="component-library"
        style={{ width: `${libraryWidth}px` }}
      >
        <h3 className="library-title">组件库</h3>
        {componentTypes.map((item) => (
          <div
            key={item.type}
            className={`component-item ${draggedType === item.type ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            onDragEnd={handleDragEnd}
          >
            <div className="component-icon">{item.icon}</div>
            <span className="component-name">{item.name}</span>
          </div>
        ))}

        <div style={{ marginTop: '24px' }}>
          <h3 className="library-title">操作说明</h3>
          <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.6 }}>
            从左侧拖拽组件到右侧画布中，点击组件右上角删除按钮可移除。
            <br /><br />
            拖拽画布内的组件可调整顺序。
          </p>
        </div>
      </div>

      <div
        className="resizer"
        ref={resizerRef}
        onMouseDown={handleMouseDown}
      />

      <div className="canvas-container">
        <div style={{ width: '100%', maxWidth: '800px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input
            type="text"
            className="title-input"
            placeholder="请输入问卷标题"
            value={surveyTitle}
            onChange={(e) => setSurveyTitle(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handlePreview}>
              <Eye size={16} style={{ marginRight: '6px' }} />
              预览
            </button>
            <button className="btn btn-primary" onClick={handlePublish}>
              发布问卷
            </button>
          </div>
        </div>

        <div
          className={`canvas ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {components.length === 0 ? (
            <div className="canvas-placeholder">
              <FileText size={48} />
              <p>拖拽左侧组件到此处开始设计问卷</p>
            </div>
          ) : (
            components.map((component, index) => (
              <div
                key={component.id}
                className="canvas-component"
                draggable
                onDragStart={(e) => handleCanvasComponentDragStart(e, index)}
                onDragOver={(e) => handleCanvasComponentDragOver(e, index)}
                onDrop={(e) => handleCanvasComponentDrop(e, index)}
              >
                <button
                  className="delete-btn"
                  onClick={() => removeComponent(component.id)}
                  title="删除组件"
                >
                  <Trash2 size={14} />
                </button>
                <ComponentRenderer
                  component={component}
                  mode="editor"
                  showLabelDelay={newlyAddedId === component.id}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {showPublishModal && (
        <div className="modal-overlay" onClick={() => setShowPublishModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">问卷发布成功！</h2>
            <div className="modal-body">
              <p style={{ marginBottom: '16px' }}>您的问卷已成功发布，问卷码如下：</p>
              <div className="success-code">{publishedCode}</div>
              <p style={{ marginTop: '16px', fontSize: '13px', color: '#94A3B8' }}>
                请将此问卷码分享给受访者，他们可以通过问卷码参与调查。
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowPublishModal(false)}
              >
                继续编辑
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowPublishModal(false);
                  navigate('/dashboard');
                }}
              >
                查看数据面板
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
