import { useState, useMemo } from 'react';

interface ItemFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  name?: string;
  description?: string;
}

const CATEGORIES = ['园艺', '修理', '手工', '烹饪', '电子设备', '其他'];

function ItemForm({ onClose, onSuccess }: ItemFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [image, setImage] = useState('');
  const [touched, setTouched] = useState<{ name: boolean; description: boolean }>({
    name: false,
    description: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const errors = useMemo<FormErrors>(() => {
    const e: FormErrors = {};
    if (!name.trim() || name.trim().length < 2) {
      e.name = '物品名称必填，且至少需要2个字符';
    }
    if (!description.trim() || description.trim().length < 10) {
      e.description = '物品描述至少需要10个字符';
    }
    return e;
  }, [name, description]);

  const isFormValid = Object.keys(errors).length === 0;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (!touched.name) setTouched(prev => ({ ...prev, name: true }));
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    if (!touched.description) setTouched(prev => ({ ...prev, description: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, description: true });
    if (!isFormValid) return;

    setSubmitting(true);
    setServerError('');
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          image: image.trim()
        })
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setServerError(data.error || '提交失败，请重试');
      }
    } catch (err) {
      setServerError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const nameHasError = touched.name && !!errors.name;
  const descHasError = touched.description && !!errors.description;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="form-modal" onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">📦 添加新物品</h2>
          <button className="form-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-body">
            <div className={`form-group ${nameHasError ? 'has-error' : ''}`}>
              <label className="form-label">物品名称 <span className="required">*</span></label>
              <input
                type="text"
                className={`form-input ${nameHasError ? 'input-error' : ''}`}
                value={name}
                onChange={handleNameChange}
                onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                placeholder="请输入物品名称（至少2个字符）"
              />
              <div className={`char-count ${nameHasError ? 'error-count' : ''}`}>
                {name.length} 字符
              </div>
              {nameHasError && <div className="error-text">{errors.name}</div>}
            </div>

            <div className={`form-group ${descHasError ? 'has-error' : ''}`}>
              <label className="form-label">物品描述 <span className="required">*</span></label>
              <textarea
                className={`form-textarea ${descHasError ? 'input-error' : ''}`}
                value={description}
                onChange={handleDescChange}
                onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
                placeholder="请详细描述物品的用途、状态和使用注意事项（至少10个字符）"
                rows={4}
              />
              <div className={`char-count ${descHasError ? 'error-count' : ''}`}>
                {description.length} / 最少 10 字符
              </div>
              {descHasError && <div className="error-text">{errors.description}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">物品分类</label>
                <select
                  className="form-input form-select"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">图片链接（可选）</label>
                <input
                  type="url"
                  className="form-input"
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {serverError && <div className="server-error">{serverError}</div>}
          </div>

          <div className="form-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isFormValid || submitting}
            >
              {submitting ? '提交中...' : '确认上架'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ItemForm;
