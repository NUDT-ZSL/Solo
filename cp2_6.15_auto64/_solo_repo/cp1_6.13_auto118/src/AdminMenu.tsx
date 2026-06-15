import { useState, useEffect, useCallback } from 'react';
import type { MenuItem } from './types';
import { getAllMenu, createMenuItem, updateMenuItem, deactivateMenuItem } from './api';

interface AdminMenuProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  category?: string;
  image?: string;
}

const CATEGORIES = ['热饮', '冷饮', '手冲', '甜品'];

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  price: '',
  category: '热饮',
  image: '',
};

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = '请输入饮品名称';
  if (!form.description.trim()) errors.description = '请输入描述';
  if (!form.price) {
    errors.price = '请输入价格';
  } else if (isNaN(Number(form.price)) || Number(form.price) <= 0) {
    errors.price = '价格必须为正数';
  }
  if (!form.category) errors.category = '请选择分类';
  if (!form.image.trim()) {
    errors.image = '请输入图片URL';
  } else if (!/^https?:\/\//i.test(form.image)) {
    errors.image = 'URL 必须以 http:// 或 https:// 开头';
  }
  return errors;
}

export default function AdminMenu({ showToast }: AdminMenuProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllMenu();
      setItems(data.sort((a, b) => a.name.localeCompare(b.name, 'zh')));
    } catch {
      showToast('加载菜单失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      setErrors(validateForm(form));
    }
  }, [form, touched]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      image: item.image,
    });
    setTouched({});
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setTouched({});
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.keys(INITIAL_FORM).reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as Record<string, boolean>
    );
    setTouched(allTouched);

    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      showToast('请检查表单填写', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        image: form.image.trim(),
      };

      if (editingId) {
        await updateMenuItem(editingId, payload);
        setItems((prev) =>
          prev.map((i) => (i.id === editingId ? { ...i, ...payload } : i))
        );
        showToast('饮品已更新');
      } else {
        const created = await createMenuItem(payload);
        setItems((prev) => [...prev, created]);
        showToast('饮品已添加');
      }
      resetForm();
    } catch {
      showToast(editingId ? '更新失败' : '添加失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (item: MenuItem) => {
    const ok = window.confirm(`确定要「${item.active ? '下架' : '上架'}」${item.name}吗？`);
    if (!ok) return;

    try {
      if (item.active) {
        await deactivateMenuItem(item.id);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, active: false } : i))
        );
        showToast(`已下架 ${item.name}`);
      } else {
        await updateMenuItem(item.id, { active: true });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, active: true } : i))
        );
        showToast(`已上架 ${item.name}`);
      }
    } catch {
      showToast('操作失败', 'error');
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title font-display">
        {editingId ? '编辑饮品' : '添加饮品'}
      </h1>

      <form className="admin-menu-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="例如：经典美式"
              required
            />
            {touched.name && errors.name && (
              <div className="form-error">{errors.name}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">价格 (¥) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
              onBlur={() => handleBlur('price')}
              placeholder="例如：28"
              required
            />
            {touched.price && errors.price && (
              <div className="form-error">{errors.price}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">分类 *</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              onBlur={() => handleBlur('category')}
              required
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {touched.category && errors.category && (
              <div className="form-error">{errors.category}</div>
            )}
          </div>

          <div className="form-group full">
            <label className="form-label">图片 URL *</label>
            <input
              type="url"
              value={form.image}
              onChange={(e) => handleChange('image', e.target.value)}
              onBlur={() => handleBlur('image')}
              placeholder="https://..."
              required
            />
            {touched.image && errors.image && (
              <div className="form-error">{errors.image}</div>
            )}
          </div>

          <div className="form-group full">
            <label className="form-label">描述 *</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              onBlur={() => handleBlur('description')}
              placeholder="描述这款饮品的特点..."
              required
            />
            {touched.description && errors.description && (
              <div className="form-error">{errors.description}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            className="btn-confirm"
            disabled={submitting}
            style={{ padding: '12px 28px', fontSize: '15px' }}
          >
            {submitting ? '保存中...' : editingId ? '保存修改' : '添加饮品'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn-cancel"
              onClick={resetForm}
              disabled={submitting}
              style={{ padding: '12px 28px', fontSize: '15px' }}
            >
              取消编辑
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title font-display">全部饮品 ({items.length})</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8d6e63' }}>
          加载中...
        </div>
      ) : (
        <div className="admin-menu-list">
          {items.map((item) => (
            <div
              key={item.id}
              className={`admin-menu-item ${!item.active ? 'inactive' : ''}`}
            >
              <img
                src={item.image}
                alt={item.name}
                className="admin-menu-image"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
              <div className="admin-menu-info">
                <div className="admin-menu-name font-display">
                  {item.name}
                  {!item.active && (
                    <span
                      style={{
                        fontSize: '11px',
                        marginLeft: '8px',
                        color: '#8d6e63',
                        fontWeight: 500,
                      }}
                    >
                      (已下架)
                    </span>
                  )}
                </div>
                <div className="admin-menu-meta">
                  <span>{item.category}</span>
                  <span>{item.description}</span>
                </div>
              </div>
              <div className="admin-menu-price">¥{item.price}</div>
              <div className="admin-menu-item-actions">
                <button
                  className="order-action-btn secondary"
                  onClick={() => startEdit(item)}
                >
                  编辑
                </button>
                <button
                  className="order-action-btn primary"
                  onClick={() => handleDeactivate(item)}
                  style={
                    !item.active
                      ? { background: '#43a047' }
                      : { background: '#e53935' }
                  }
                >
                  {item.active ? '下架' : '上架'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
