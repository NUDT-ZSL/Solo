import React, { useState, useCallback, useRef, useEffect } from 'react';
import EntityList from './components/EntityList';
import StoryMap from './components/StoryMap';
import Timeline from './components/Timeline';
import { Entity, Relation, ChapterEvent, UploadResponse } from './types';

const App: React.FC = () => {
  const [bookId, setBookId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string>('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [timeline, setTimeline] = useState<ChapterEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragEntity, setDragEntity] = useState<Entity | null>(null);
  const [highlightedEntityIds, setHighlightedEntityIds] = useState<string[]>([]);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [editName, setEditName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    
    try {
      const content = await file.text();
      const format = file.name.endsWith('.epub') ? 'epub' : 'txt';
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          filename: file.name,
          format
        })
      });
      
      if (!response.ok) {
        throw new Error('上传失败');
      }
      
      const data: UploadResponse = await response.json();
      
      setBookId(data.bookId);
      setBookTitle(file.name.replace(/\.(txt|epub)$/i, ''));
      setEntities(data.entities);
      setRelations(data.relations);
      setTimeline(data.timeline);
      
      localStorage.setItem('currentBookId', data.bookId);
      
    } catch (error) {
      console.error('上传错误:', error);
      alert('上传文件时出错，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragStart = useCallback((entity: Entity, e: React.MouseEvent) => {
    setIsDragging(true);
    setDragEntity(entity);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragEntity(null);
  }, []);

  const handleDropOnMap = useCallback(async (targetX: number, targetY: number) => {
    if (!dragEntity || !bookId) return;

    const nearestEntity = entities
      .filter(e => e.id !== dragEntity.id)
      .map(e => ({
        entity: e,
        distance: Math.sqrt(
          Math.pow((e.x || 0) - targetX, 2) + 
          Math.pow((e.y || 0) - targetY, 2)
        )
      }))
      .filter(e => e.distance < 60)
      .sort((a, b) => a.distance - b.distance)[0]?.entity;

    if (nearestEntity) {
      try {
        const response = await fetch('/api/relations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookId,
            sourceId: dragEntity.id,
            targetId: nearestEntity.id
          })
        });

        if (response.ok) {
          const data = await response.json();
          const existingRel = relations.find(r => 
            (r.sourceId === dragEntity.id && r.targetId === nearestEntity.id) ||
            (r.sourceId === nearestEntity.id && r.targetId === dragEntity.id)
          );
          
          if (existingRel) {
            setRelations(prev => prev.map(r => 
              r.id === existingRel.id 
                ? { ...r, cooccurrence: r.cooccurrence + 1 }
                : r
            ));
          } else {
            setRelations(prev => [...prev, data.relation]);
          }
        }
      } catch (error) {
        console.error('创建关系失败:', error);
      }
    }

    handleDragEnd();
  }, [dragEntity, bookId, entities, relations, handleDragEnd]);

  const handleNodeDoubleClick = useCallback((entity: Entity) => {
    setEditingEntity(entity);
    setEditName(entity.name);
  }, []);

  const handleEntityUpdate = useCallback(async () => {
    if (!editingEntity || !editName.trim()) return;

    try {
      const response = await fetch(`/api/entities/${editingEntity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setEntities(prev => prev.map(e => 
          e.id === editingEntity.id ? data.entity : e
        ));
      }
    } catch (error) {
      console.error('更新实体失败:', error);
    }

    setEditingEntity(null);
  }, [editingEntity, editName]);

  const handleEntityDelete = useCallback(async () => {
    if (!editingEntity) return;

    try {
      const response = await fetch(`/api/entities/${editingEntity.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setEntities(prev => prev.filter(e => e.id !== editingEntity.id));
        setRelations(prev => prev.filter(r => 
          r.sourceId !== editingEntity.id && r.targetId !== editingEntity.id
        ));
      }
    } catch (error) {
      console.error('删除实体失败:', error);
    }

    setEditingEntity(null);
  }, [editingEntity]);

  const handleNodePositionChange = useCallback(async (entityId: string, x: number, y: number) => {
    if (!bookId) return;

    try {
      await fetch(`/api/entities/${entityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y })
      });
    } catch (error) {
      console.error('更新位置失败:', error);
    }
  }, [bookId]);

  const handleEventClick = useCallback((event: ChapterEvent) => {
    if (highlightedEventId === event.id) {
      setHighlightedEventId(null);
      setHighlightedEntityIds([]);
    } else {
      setHighlightedEventId(event.id);
      
      const relatedNames = event.relatedEntities;
      const relatedIds = entities
        .filter(e => relatedNames.includes(e.name))
        .map(e => e.id);
      setHighlightedEntityIds(relatedIds);
    }
  }, [highlightedEventId, entities]);

  const loadSavedBook = useCallback(async () => {
    const savedBookId = localStorage.getItem('currentBookId');
    if (!savedBookId) return;

    try {
      const [entitiesRes, relationsRes, timelineRes, bookRes] = await Promise.all([
        fetch(`/api/entities/${savedBookId}`),
        fetch(`/api/relations/${savedBookId}`),
        fetch(`/api/timeline/${savedBookId}`),
        fetch(`/api/book/${savedBookId}`)
      ]);

      if (entitiesRes.ok && relationsRes.ok) {
        const entitiesData = await entitiesRes.json();
        const relationsData = await relationsRes.json();
        const timelineData = await timelineRes.json();
        const bookData = await bookRes.json();

        setBookId(savedBookId);
        setBookTitle(bookData?.title || '');
        setEntities(entitiesData);
        setRelations(relationsData);
        setTimeline(timelineData);
      }
    } catch (error) {
      console.error('加载保存的书籍失败:', error);
    }
  }, []);

  useEffect(() => {
    loadSavedBook();
  }, [loadSavedBook]);

  return (
    <div className="app-container">
      <div className="header">
        <div className="header-title">
          📖 故事地图 {bookTitle && `- ${bookTitle}`}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.epub"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button className="upload-btn" onClick={handleUploadClick} disabled={loading}>
          {loading ? '处理中...' : '上传电子书'}
        </button>
      </div>

      <div className="main-content">
        <EntityList
          entities={entities}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collapsed={listCollapsed}
          onToggleCollapse={() => setListCollapsed(!listCollapsed)}
        />

        {loading ? (
          <div className="story-map-panel">
            <div className="empty-state">
              <div className="loading-spinner" />
              <div className="empty-state-text" style={{ marginTop: '16px' }}>
                正在分析电子书...
              </div>
            </div>
          </div>
        ) : (
          <StoryMap
            entities={entities}
            relations={relations}
            highlightedEntityIds={highlightedEntityIds}
            isDraggingFromList={isDragging}
            dragEntity={dragEntity}
            onDropOnMap={handleDropOnMap}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodePositionChange={handleNodePositionChange}
          />
        )}

        <Timeline
          events={timeline}
          highlightedEventId={highlightedEventId}
          onEventClick={handleEventClick}
        />
      </div>

      {editingEntity && (
        <div className="edit-modal-overlay" onClick={() => setEditingEntity(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-title">编辑实体</div>
            <input
              className="edit-modal-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="实体名称"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEntityUpdate();
                if (e.key === 'Escape') setEditingEntity(null);
              }}
            />
            <div className="edit-modal-buttons">
              <button className="btn btn-danger" onClick={handleEntityDelete}>
                删除
              </button>
              <button className="btn btn-secondary" onClick={() => setEditingEntity(null)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleEntityUpdate}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
