import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEXTURE_TAGS, FlavorRating } from '../types';

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

export default function Record() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [textureTags, setTextureTags] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [note, setNote] = useState('');
  const [flavor, setFlavor] = useState<FlavorRating>({
    spicy: 5,
    sweet: 5,
    salty: 5,
    sour: 5,
    umami: 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formVisible, setFormVisible] = useState(true);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });
  const [blinkingStar, setBlinkingStar] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (toast.visible) {
      const t = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [toast.visible]);

  const nameError = nameTouched && name.trim().length === 0;

  function addIngredient() {
    if (ingredients.length >= 8) return;
    setIngredients([...ingredients, '']);
  }

  function removeIngredient(index: number) {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, value: string) {
    const trimmed = value.slice(0, 15);
    const next = [...ingredients];
    next[index] = trimmed;
    setIngredients(next);
  }

  function toggleTextureTag(tag: string) {
    if (textureTags.includes(tag)) {
      setTextureTags(textureTags.filter((t) => t !== tag));
    } else if (textureTags.length < 3) {
      setTextureTags([...textureTags, tag]);
    }
  }

  function handleRatingClick(val: number) {
    setRating(val);
    setBlinkingStar(val);
    setTimeout(() => setBlinkingStar(null), 500);
  }

  function isFormValid() {
    return (
      name.trim().length > 0 &&
      ingredients.some((i) => i.trim().length > 0) &&
      textureTags.length >= 1 &&
      textureTags.length <= 3 &&
      rating >= 1 &&
      rating <= 5
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    if (!isFormValid() || submitting) return;

    setSubmitting(true);

    setFormVisible(false);
    const submitStart = performance.now();

    try {
      const validIngredients = ingredients
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ingredients: validIngredients,
          textureTags,
          rating,
          note: note.slice(0, 200),
          flavor,
        }),
      });

      const elapsed = performance.now() - submitStart;
      console.log(`Submit took ${elapsed}ms`);

      if (res.ok) {
        setToast({ visible: true, message: '记录成功！', type: 'success' });
        setTimeout(() => {
          navigate('/');
        }, 2200);
      } else {
        const data = await res.json().catch(() => ({}));
        setToast({ visible: true, message: data.error || '提交失败', type: 'error' });
        setFormVisible(true);
        setSubmitting(false);
      }
    } catch {
      setToast({ visible: true, message: '网络错误，请重试', type: 'error' });
      setFormVisible(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      {toast.visible && (
        <div
          className="toast"
          style={{
            background: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          <span style={{ fontSize: 18 }}>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.message}
        </div>
      )}

      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>📝</span> 记录新菜品
      </h1>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          opacity: formVisible ? 1 : 0,
          transform: formVisible ? 'scale(1)' : 'scale(0.92)',
          pointerEvents: submitting ? 'none' : 'auto',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: 8,
                fontSize: 15,
              }}
            >
              菜品名称 <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              className={`input-field ${nameError ? 'error' : ''}`}
              placeholder="例如：麻婆豆腐"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              style={{ maxWidth: 400 }}
            />
            {nameError && (
              <p style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 6 }}>
                请输入菜品名称
              </p>
            )}
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <label style={{ fontWeight: 600, fontSize: 15 }}>
                食材列表
                <span style={{ fontWeight: 400, color: 'var(--color-text-light)', fontSize: 13, marginLeft: 8 }}>
                  ({ingredients.filter((i) => i.trim()).length}/8)
                </span>
              </label>
              <button
                type="button"
                onClick={addIngredient}
                disabled={ingredients.length >= 8}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  borderRadius: 'var(--radius-md)',
                  background: ingredients.length >= 8 ? 'var(--color-gray-200)' : 'var(--color-primary)',
                  color: ingredients.length >= 8 ? 'var(--color-text-light)' : 'white',
                  cursor: ingredients.length >= 8 ? 'not-allowed' : 'pointer',
                  transition: 'var(--transition)',
                }}
              >
                + 添加食材
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ingredients.map((ing, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--color-gray-100)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--color-text-light)',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="输入食材名称（最多15字）"
                    value={ing}
                    onChange={(e) => updateIngredient(idx, e.target.value)}
                    maxLength={15}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    disabled={ingredients.length <= 1}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-md)',
                      background: ingredients.length <= 1 ? 'var(--color-gray-50)' : '#fef2f2',
                      color: ingredients.length <= 1 ? 'var(--color-gray-300)' : 'var(--color-danger)',
                      fontSize: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: ingredients.length <= 1 ? 'not-allowed' : 'pointer',
                      transition: 'var(--transition)',
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
              口感标签
              <span style={{ fontWeight: 400, color: 'var(--color-text-light)', fontSize: 13, marginLeft: 8 }}>
                (选择1-3个)
              </span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {TEXTURE_TAGS.map((tag) => {
                const selected = textureTags.includes(tag);
                const disabled = !selected && textureTags.length >= 3;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTextureTag(tag)}
                    disabled={disabled}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 20,
                      fontWeight: 600,
                      fontSize: 14,
                      transition: 'var(--transition)',
                      background: selected ? '#f97316' : disabled ? 'var(--color-gray-100)' : '#f5f5f5',
                      color: selected ? 'white' : disabled ? 'var(--color-gray-300)' : '#1c1917',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      border: selected ? '2px solid #f97316' : '2px solid transparent',
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {textureTags.length < 1 && (
              <p style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 8 }}>
                请至少选择1个口感标签
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
              总体评价
              <span style={{ fontWeight: 400, color: 'var(--color-text-light)', fontSize: 13, marginLeft: 8 }}>
                (点击评分)
              </span>
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => {
                const isActive = (hoverRating || rating) >= s;
                const isBlinking = blinkingStar === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleRatingClick(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      fontSize: 36,
                      lineHeight: 1,
                      padding: '4px',
                      transition: 'transform 0.15s ease, color 0.15s ease',
                      transform: isBlinking ? 'scale(1.35)' : 'scale(1)',
                      animation: isBlinking ? 'starBlink 0.5s ease' : undefined,
                    }}
                  >
                    <span
                      style={{
                        color: isActive ? '#f59e0b' : '#d1d5db',
                        textShadow: isActive ? '0 2px 6px rgba(245, 158, 11, 0.4)' : 'none',
                        transition: 'color 0.15s ease',
                      }}
                    >
                      ★
                    </span>
                  </button>
                );
              })}
            </div>
            <style>{`
              @keyframes starBlink {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(1.5); }
              }
            `}</style>
            {rating === 0 && (
              <p style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 8 }}>
                请点击星星进行评分
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 15 }}>
              风味评分
              <span style={{ fontWeight: 400, color: 'var(--color-text-light)', fontSize: 13, marginLeft: 8 }}>
                (0-10)
              </span>
            </label>
            <div className="grid grid-2" style={{ gap: 16 }}>
              {[
                { key: 'spicy', label: '🌶️ 辣度' },
                { key: 'sweet', label: '🍬 甜度' },
                { key: 'salty', label: '🧂 咸度' },
                { key: 'sour', label: '🍋 酸度' },
                { key: 'umami', label: '🍄 鲜度' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      fontSize: 13,
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {flavor[key as keyof FlavorRating]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={flavor[key as keyof FlavorRating]}
                    onChange={(e) =>
                      setFlavor((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                    style={{
                      width: '100%',
                      accentColor: 'var(--color-primary)',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 15 }}>
              备注 / 烹饪心得
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                className="input-field textarea-field"
                placeholder="记录口感评价、食材搭配建议、烹饪心得等..."
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={4}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 12,
                  fontSize: 12,
                  color:
                    note.length >= 200
                      ? 'var(--color-danger)'
                      : note.length >= 180
                      ? 'var(--color-warning)'
                      : 'var(--color-text-light)',
                  fontWeight: 500,
                }}
              >
                {note.length}/200 {note.length >= 200 && '（已达上限）'}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              paddingTop: 8,
              borderTop: '1px solid var(--color-gray-100)',
            }}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
              style={{ padding: '12px 28px' }}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isFormValid() || submitting}
              style={{
                padding: '12px 32px',
                fontSize: 15,
                opacity: !isFormValid() || submitting ? 0.5 : 1,
                cursor: !isFormValid() || submitting ? 'not-allowed' : 'pointer',
                boxShadow: isFormValid() ? '0 6px 20px rgba(249, 115, 22, 0.35)' : 'none',
              }}
            >
              {submitting ? '提交中...' : '✓ 保存记录'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
