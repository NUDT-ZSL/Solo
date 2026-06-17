import React, { useState, useEffect } from 'react';
import type { RecipeContent, Ingredient, Step } from '../types';

interface RecipeEditorProps {
  initialContent: RecipeContent;
  onContentChange?: (content: RecipeContent) => void;
  readOnly?: boolean;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({
  initialContent,
  onContentChange,
  readOnly = false,
}) => {
  const [content, setContent] = useState<RecipeContent>(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    onContentChange?.(content);
  }, [content, onContentChange]);

  const updateName = (name: string) => {
    setContent((prev) => ({ ...prev, name }));
  };

  const updateNotes = (notes: string) => {
    setContent((prev) => ({ ...prev, notes }));
  };

  const addIngredient = () => {
    const newIngredient: Ingredient = {
      id: Date.now().toString(),
      name: '',
      quantity: '',
      unit: 'g',
    };
    setContent((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, newIngredient],
    }));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setContent((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  const removeIngredient = (id: string) => {
    setContent((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ing) => ing.id !== id),
    }));
  };

  const addStep = () => {
    const newStep: Step = {
      id: Date.now().toString(),
      order: content.steps.length + 1,
      description: '',
    };
    setContent((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
  };

  const updateStep = (id: string, description: string) => {
    setContent((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.id === id ? { ...step, description } : step
      ),
    }));
  };

  const removeStep = (id: string) => {
    setContent((prev) => {
      const filtered = prev.steps.filter((step) => step.id !== id);
      return {
        ...prev,
        steps: filtered.map((step, index) => ({ ...step, order: index + 1 })),
      };
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d7ccc8',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: readOnly ? '#f5f5f5' : '#fff',
    transition: 'all 0.3s ease',
    outline: 'none',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: '#8b4513',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: readOnly ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    transition: 'all 0.15s ease',
    opacity: readOnly ? 0.5 : 1,
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#3e2723' }}>
          食谱名称
        </label>
        <input
          type="text"
          value={content.name}
          onChange={(e) => updateName(e.target.value)}
          disabled={readOnly}
          placeholder="输入食谱名称..."
          style={inputStyle}
          onFocus={(e) => {
            if (!readOnly) {
              e.target.style.borderColor = '#ffb74d';
              e.target.style.boxShadow = '0 2px 8px rgba(255, 183, 77, 0.3)';
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d7ccc8';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#3e2723' }}>食材清单</h3>
            {!readOnly && (
              <button style={buttonStyle} onClick={addIngredient}>
                + 添加食材
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {content.ingredients.map((ingredient) => (
              <div
                key={ingredient.id}
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: '#fff8e7',
                  borderRadius: '8px',
                }}
              >
                <input
                  type="text"
                  value={ingredient.quantity}
                  onChange={(e) => updateIngredient(ingredient.id, 'quantity', e.target.value)}
                  disabled={readOnly}
                  placeholder="数量"
                  style={{ ...inputStyle, width: '80px', padding: '6px 8px' }}
                  onFocus={(e) => {
                    if (!readOnly) {
                      e.target.style.borderColor = '#ffb74d';
                      e.target.style.boxShadow = '0 2px 8px rgba(255, 183, 77, 0.3)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d7ccc8';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <select
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                  disabled={readOnly}
                  style={{ ...inputStyle, width: '70px', padding: '6px 8px' }}
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="个">个</option>
                  <option value="勺">勺</option>
                  <option value="杯">杯</option>
                  <option value="适量">适量</option>
                </select>
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                  disabled={readOnly}
                  placeholder="食材名称"
                  style={{ ...inputStyle, flex: 1, padding: '6px 8px' }}
                  onFocus={(e) => {
                    if (!readOnly) {
                      e.target.style.borderColor = '#ffb74d';
                      e.target.style.boxShadow = '0 2px 8px rgba(255, 183, 77, 0.3)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d7ccc8';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {!readOnly && (
                  <button
                    onClick={() => removeIngredient(ingredient.id)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#e57373',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
            {content.ingredients.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#999', backgroundColor: '#fff8e7', borderRadius: '8px' }}>
                暂无食材，点击上方按钮添加
              </div>
            )}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#3e2723' }}>操作步骤</h3>
            {!readOnly && (
              <button style={buttonStyle} onClick={addStep}>
                + 添加步骤
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {content.steps.map((step) => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  padding: '12px',
                  backgroundColor: '#fff8e7',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: '#8b4513',
                    color: '#fff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                    marginTop: '4px',
                  }}
                >
                  {step.order}
                </div>
                <textarea
                  value={step.description}
                  onChange={(e) => updateStep(step.id, e.target.value)}
                  disabled={readOnly}
                  placeholder="描述这个步骤..."
                  style={{
                    ...inputStyle,
                    flex: 1,
                    minHeight: '60px',
                    resize: 'vertical',
                    padding: '8px 12px',
                  }}
                  onFocus={(e) => {
                    if (!readOnly) {
                      e.target.style.borderColor = '#ffb74d';
                      e.target.style.boxShadow = '0 2px 8px rgba(255, 183, 77, 0.3)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d7ccc8';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {!readOnly && (
                  <button
                    onClick={() => removeStep(step.id)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#e57373',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
            {content.steps.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#999', backgroundColor: '#fff8e7', borderRadius: '8px' }}>
                暂无步骤，点击上方按钮添加
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#3e2723' }}>
          备注
        </label>
        <textarea
          value={content.notes}
          onChange={(e) => updateNotes(e.target.value)}
          disabled={readOnly}
          placeholder="添加备注信息..."
          style={{
            ...inputStyle,
            minHeight: '80px',
            resize: 'vertical',
          }}
          onFocus={(e) => {
            if (!readOnly) {
              e.target.style.borderColor = '#ffb74d';
              e.target.style.boxShadow = '0 2px 8px rgba(255, 183, 77, 0.3)';
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d7ccc8';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>
    </div>
  );
};
