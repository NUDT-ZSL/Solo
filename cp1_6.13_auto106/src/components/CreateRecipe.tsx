import { useState, useRef } from 'react';
import { recipeApi } from '../api/recipes';
import type { Recipe, Ingredient, RecipeStep } from '../types';
import IngredientInput from './IngredientInput';
import './CreateRecipe.css';

interface CreateRecipeProps {
  onClose: () => void;
  onCreated: (recipe: Recipe) => void;
}

interface FormErrors {
  name?: boolean;
  image?: boolean;
  prepTime?: boolean;
  ingredients?: boolean;
  steps?: boolean;
}

const NAME_MAX = 50;
const STEP_DESC_MAX = 200;

export default function CreateRecipe({ onClose, onCreated }: CreateRecipeProps) {
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [prepTime, setPrepTime] = useState<number | ''>('');
  const [ingredientNames, setIngredientNames] = useState<string[]>([]);
  const [ingredientAmounts, setIngredientAmounts] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<RecipeStep[]>([{ order: 1, description: '' }]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [shakingFields, setShakingFields] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerShake = (field: string) => {
    setShakingFields((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
    setTimeout(() => {
      setShakingFields((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }, 300);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const fieldsToShake: string[] = [];

    if (!name.trim()) {
      newErrors.name = true;
      fieldsToShake.push('name');
    }
    if (!image.trim()) {
      newErrors.image = true;
      fieldsToShake.push('image');
    }
    if (!prepTime || prepTime <= 0) {
      newErrors.prepTime = true;
      fieldsToShake.push('prepTime');
    }
    if (ingredientNames.length === 0) {
      newErrors.ingredients = true;
      fieldsToShake.push('ingredients');
    }
    const validSteps = steps.filter((s) => s.description.trim());
    if (validSteps.length === 0) {
      newErrors.steps = true;
      fieldsToShake.push('steps');
    }

    fieldsToShake.forEach(triggerShake);
    setErrors(newErrors);
    return fieldsToShake.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const ingredients: Ingredient[] = ingredientNames.map((name) => ({
        name,
        amount: ingredientAmounts[name] || '适量',
      }));
      const validSteps = steps
        .filter((s) => s.description.trim())
        .map((s, idx) => ({ ...s, order: idx + 1 }));

      const recipe = await recipeApi.create({
        name: name.trim(),
        image: image.trim(),
        prepTime: Number(prepTime),
        ingredients,
        steps: validSteps,
      });
      onCreated(recipe);
    } catch (err) {
      console.error('创建菜谱失败:', err);
      alert('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('只支持 JPG 和 PNG 格式');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setErrors((prev) => ({ ...prev, image: false }));
    };
    reader.readAsDataURL(file);
  };

  const addStep = () => {
    setSteps([...steps, { order: steps.length + 1, description: '' }]);
  };

  const updateStep = (index: number, description: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], description };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  return (
    <div className="create-overlay" onClick={onClose}>
      <div className="create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-header">
          <h2 className="create-title">创建新菜谱</h2>
          <button className="create-close" onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="create-form" onSubmit={handleSubmit}>
          <div className={`form-field ${errors.name ? 'error' : ''} ${shakingFields.has('name') ? 'shake' : ''}`}>
            <label className="form-label">菜谱名称 <span className="required">*</span></label>
            <div className="input-wrapper">
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.slice(0, NAME_MAX));
                  if (errors.name) setErrors((prev) => ({ ...prev, name: false }));
                }}
                placeholder="例如：红烧肉"
              />
              <span className="char-count">{name.length}/{NAME_MAX}</span>
            </div>
          </div>

          <div className={`form-field ${errors.image ? 'error' : ''} ${shakingFields.has('image') ? 'shake' : ''}`}>
            <label className="form-label">菜谱图片 <span className="required">*</span></label>
            <div className="image-upload">
              {image ? (
                <div className="image-preview">
                  <img src={image} alt="预览" />
                  <button
                    type="button"
                    className="remove-image"
                    onClick={() => setImage('')}
                  >
                    更换图片
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>点击上传 JPG/PNG（≤2MB）</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
            </div>
          </div>

          <div className={`form-field ${errors.prepTime ? 'error' : ''} ${shakingFields.has('prepTime') ? 'shake' : ''}`}>
            <label className="form-label">准备时间（分钟） <span className="required">*</span></label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={prepTime}
              onChange={(e) => {
                setPrepTime(e.target.value === '' ? '' : Number(e.target.value));
                if (errors.prepTime) setErrors((prev) => ({ ...prev, prepTime: false }));
              }}
              placeholder="例如：30"
            />
          </div>

          <div className={`form-field ${errors.ingredients ? 'error' : ''} ${shakingFields.has('ingredients') ? 'shake' : ''}`}>
            <label className="form-label">食材列表 <span className="required">*</span></label>
            <IngredientInput
              ingredients={ingredientNames}
              onChange={(names) => {
                setIngredientNames(names);
                if (errors.ingredients) setErrors((prev) => ({ ...prev, ingredients: false }));
              }}
              placeholder="输入食材名称，按回车添加"
            />
            {ingredientNames.length > 0 && (
              <div className="amount-inputs">
                {ingredientNames.map((ing) => (
                  <div key={ing} className="amount-row">
                    <span className="amount-name">{ing}</span>
                    <input
                      type="text"
                      className="amount-input"
                      placeholder="用量（如：500g）"
                      value={ingredientAmounts[ing] || ''}
                      onChange={(e) =>
                        setIngredientAmounts({ ...ingredientAmounts, [ing]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`form-field ${errors.steps ? 'error' : ''} ${shakingFields.has('steps') ? 'shake' : ''}`}>
            <label className="form-label">烹饪步骤 <span className="required">*</span></label>
            <div className="steps-list">
              {steps.map((step, idx) => (
                <div key={idx} className="step-input-row">
                  <div className="step-order">{step.order}</div>
                  <div className="step-input-wrapper">
                    <textarea
                      className="step-textarea"
                      value={step.description}
                      onChange={(e) => {
                        updateStep(idx, e.target.value.slice(0, STEP_DESC_MAX));
                        if (errors.steps && steps.some((s) => s.description.trim())) {
                          setErrors((prev) => ({ ...prev, steps: false }));
                        }
                      }}
                      placeholder="描述这一步的操作..."
                      rows={2}
                    />
                    <span className="char-count step-count">
                      {step.description.length}/{STEP_DESC_MAX}
                    </span>
                  </div>
                  {steps.length > 1 && (
                    <button type="button" className="remove-step" onClick={() => removeStep(idx)}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="add-step-btn" onClick={addStep}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加步骤
            </button>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '创建中...' : '创建菜谱'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
