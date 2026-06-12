import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
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

const RecipeForm: React.FC<RecipeFormProps> = ({ onSubmit, onCancel, authorName }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [steps, setSteps] = useState<string[]>(['']);
  const [difficulty, setDifficulty] = useState(3);
  const [hoveredStar, setHoveredStar] = useState(0);

  const addIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const addStep = () => {
    setSteps([...steps, '']);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSteps(items);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filteredIngredients = ingredients.filter((i) => i.trim() !== '');
    const filteredSteps = steps.filter((s) => s.trim() !== '');

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

  return (
    <div className="recipe-form-overlay" onClick={onCancel}>
      <div className="recipe-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2>创建新菜谱</h2>
          <button className="close-btn" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="form-content">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>菜谱标题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：番茄炒蛋"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述一下这道菜..."
                rows={2}
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label>难度等级</label>
              <div className="difficulty-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star-rating ${
                      star <= (hoveredStar || difficulty) ? 'filled' : ''
                    }`}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setDifficulty(star)}
                  >
                    ★
                  </span>
                ))}
                <span className="difficulty-text">
                  {['', '简单', '较易', '中等', '较难', '困难'][difficulty]}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>食材列表 *</label>
              <div className="ingredients-list">
                {ingredients.map((ing, index) => (
                  <div
                    key={index}
                    className="ingredient-row ingredient-enter"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <input
                      type="text"
                      value={ing}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      placeholder={`食材 ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeIngredient(index)}
                      disabled={ingredients.length <= 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-btn" onClick={addIngredient}>
                + 添加食材
              </button>
            </div>

            <div className="form-group">
              <label>烹饪步骤 * (拖拽排序)</label>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="steps">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="steps-list"
                    >
                      {steps.map((step, index) => (
                        <Draggable
                          key={index}
                          draggableId={`step-${index}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`step-row ${
                                snapshot.isDragging ? 'dragging' : ''
                              }`}
                            >
                              <span className="step-number">{index + 1}</span>
                              <textarea
                                value={step}
                                onChange={(e) =>
                                  updateStep(index, e.target.value)
                                }
                                placeholder={`步骤 ${index + 1}...`}
                                rows={2}
                              />
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeStep(index)}
                                disabled={steps.length <= 1}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              <button type="button" className="add-btn" onClick={addStep}>
                + 添加步骤
              </button>
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={onCancel}>
                取消
              </button>
              <button type="submit" className="submit-btn">
                发布菜谱
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecipeForm;
