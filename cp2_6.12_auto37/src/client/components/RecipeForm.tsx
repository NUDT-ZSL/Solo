import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot, DroppableStateSnapshot } from 'react-beautiful-dnd';
import './RecipeForm.css';

interface RecipeFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    ingredients: string[];
    steps: string[];
    difficulty: number;
  }) => void;
  onCancel: () => void;
  authorName: string;
}

interface AnimatedItem {
  id: string;
  value: string;
  isNew?: boolean;
  isRemoving?: boolean;
}

const RecipeForm: React.FC<RecipeFormProps> = ({ onSubmit, onCancel, authorName }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<AnimatedItem[]>([
    { id: `ing-${Date.now()}`, value: '' }
  ]);
  const [steps, setSteps] = useState<AnimatedItem[]>([
    { id: `step-${Date.now()}`, value: '' }
  ]);
  const [difficulty, setDifficulty] = useState(3);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [animatingStars, setAnimatingStars] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLDivElement>(null);

  const addIngredient = () => {
    const newId = `ing-${Date.now()}-${Math.random()}`;
    setIngredients(prev => [...prev, { id: newId, value: '', isNew: true }]);
    setTimeout(() => {
      setIngredients(prev => prev.map(item => 
        item.id === newId ? { ...item, isNew: false } : item
      ));
    }, 300);
  };

  const removeIngredient = (id: string, index: number) => {
    if (ingredients.length <= 1) return;
    
    setIngredients(prev => prev.map(item =>
      item.id === id ? { ...item, isRemoving: true } : item
    ));
    
    setTimeout(() => {
      setIngredients(prev => prev.filter(item => item.id !== id));
    }, 280);
  };

  const updateIngredient = (id: string, value: string) => {
    setIngredients(prev => prev.map(item =>
      item.id === id ? { ...item, value } : item
    ));
  };

  const addStep = () => {
    const newId = `step-${Date.now()}-${Math.random()}`;
    setSteps(prev => [...prev, { id: newId, value: '', isNew: true }]);
    setTimeout(() => {
      setSteps(prev => prev.map(item => 
        item.id === newId ? { ...item, isNew: false } : item
      ));
    }, 300);
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    
    setSteps(prev => prev.map(item =>
      item.id === id ? { ...item, isRemoving: true } : item
    ));
    
    setTimeout(() => {
      setSteps(prev => prev.filter(item => item.id !== id));
    }, 280);
  };

  const updateStep = (id: string, value: string) => {
    setSteps(prev => prev.map(item =>
      item.id === id ? { ...item, value } : item
    ));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSteps(items);
  };

  const handleStarClick = (star: number) => {
    setAnimatingStars(prev => new Set(prev).add(star));
    setTimeout(() => {
      setAnimatingStars(prev => {
        const next = new Set(prev);
        next.delete(star);
        return next;
      });
    }, 400);
    setDifficulty(star);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filteredIngredients = ingredients
      .filter(i => i.value.trim() !== '')
      .map(i => i.value.trim());
    const filteredSteps = steps
      .filter(s => s.value.trim() !== '')
      .map(s => s.value.trim());

    if (!title.trim()) {
      alert('请输入菜谱标题');
      return;
    }
    if (filteredIngredients.length === 0) {
      alert('请至少添加一种食材');
      return;
    }
    if (filteredSteps.length === 0) {
      alert('请至少添加一个步骤');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      ingredients: filteredIngredients,
      steps: filteredSteps,
      difficulty
    });
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div className="recipe-form-overlay" onClick={onCancel}>
      <div 
        className="recipe-form-modal" 
        onClick={(e) => e.stopPropagation()}
        ref={formRef}
      >
        <div className="form-header">
          <h2>
            <span className="form-emoji">📝</span>
            创建新菜谱
          </h2>
          <button className="close-btn" onClick={onCancel} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="form-content">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>
                <span className="label-icon">🍳</span>
                菜谱标题 <span className="required">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：番茄炒蛋、红烧肉..."
                maxLength={50}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                <span className="label-icon">📖</span>
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述一下这道菜的特点，适合什么场合..."
                rows={2}
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label>
                <span className="label-icon">⭐</span>
                难度等级
              </label>
              <div className="difficulty-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-rating-btn ${
                      star <= (hoveredStar || difficulty) ? 'filled' : ''
                    } ${animatingStars.has(star) ? 'animating' : ''}`}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => handleStarClick(star)}
                    aria-label={`${['', '简单', '较易', '中等', '较难', '困难'][star]}难度`}
                  >
                    <span className="star-icon">★</span>
                  </button>
                ))}
                <span className="difficulty-text">
                  {['', '简单', '较易', '中等', '较难', '困难'][difficulty]}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>
                <span className="label-icon">🥗</span>
                食材列表 <span className="required">*</span>
              </label>
              <div className="ingredients-list">
                {ingredients.map((item, index) => (
                  <div
                    key={item.id}
                    className={`ingredient-row ${item.isNew ? 'slide-in' : ''} ${item.isRemoving ? 'slide-out' : ''}`}
                  >
                    <span className="ingredient-index">{index + 1}</span>
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => updateIngredient(item.id, e.target.value)}
                      placeholder={`例如：鸡蛋 2个、番茄 300g`}
                    />
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeIngredient(item.id, index)}
                      disabled={ingredients.length <= 1}
                      aria-label="删除食材"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-btn" onClick={addIngredient}>
                <span className="add-icon">+</span> 添加食材
              </button>
            </div>

            <div className="form-group">
              <label>
                <span className="label-icon">📋</span>
                烹饪步骤 <span className="required">*</span>
                <span className="label-hint">（拖拽排序）</span>
              </label>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="steps">
                  {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`steps-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    >
                      {steps.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`step-row
                                ${snapshot.isDragging ? 'dragging' : ''}
                                ${item.isNew ? 'slide-in' : ''}
                                ${item.isRemoving ? 'slide-out' : ''}
                              `}
                              style={{
                                ...provided.draggableProps.style,
                                transition: snapshot.isDragging ? 'none' : 'all 0.25s ease'
                              }}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="drag-handle"
                              >
                                <span className="drag-indicator">⋮⋮</span>
                                <span className="step-number">{index + 1}</span>
                              </div>
                              <textarea
                                value={item.value}
                                onChange={(e) => updateStep(item.id, e.target.value)}
                                placeholder={`步骤 ${index + 1}：描述具体操作...`}
                                rows={2}
                              />
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeStep(item.id)}
                                disabled={steps.length <= 1}
                                aria-label="删除步骤"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      <div className={`drop-indicator ${snapshot.isDraggingOver ? 'visible' : ''}`} />
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              
              <button type="button" className="add-btn" onClick={addStep}>
                <span className="add-icon">+</span> 添加步骤
              </button>
            </div>

            <div className="form-footer-info">
              <span className="author-badge">
                👤 发布者：{authorName}
              </span>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={onCancel}
              >
                取消
              </button>
              <button type="submit" className="submit-btn">
                <span>🎉</span> 发布菜谱
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecipeForm;
