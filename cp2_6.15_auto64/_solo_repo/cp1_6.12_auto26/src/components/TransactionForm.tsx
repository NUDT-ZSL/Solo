import { useState, useMemo, useEffect } from 'react';
import {
  TransactionFormData,
  TransactionType,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  DEFAULT_CATEGORIES,
  getCategoryColor
} from '../types';
import { Budget } from '../types';
import { getToday } from '../hooks/useFinanceData';

interface Props {
  budgets: Budget[];
  allTags: string[];
  onSubmit: (data: TransactionFormData) => Promise<boolean>;
  loading?: boolean;
}

const emptyForm: TransactionFormData = {
  type: 'expense',
  amount: '',
  category: '餐饮',
  description: '',
  tags: [],
  date: getToday()
};

export default function TransactionForm({ budgets, allTags, onSubmit, loading }: Props) {
  const [form, setForm] = useState<TransactionFormData>(emptyForm);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const categories = useMemo(
    () => (form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES),
    [form.type]
  );

  useEffect(() => {
    const defaultCat = form.type === 'expense' ? '餐饮' : '工资';
    if (!DEFAULT_CATEGORIES.find(c => c.name === form.category && c.type === form.type)) {
      setForm(f => ({ ...f, category: defaultCat }));
    }
  }, [form.type]);

  const currentBudget = useMemo(() => {
    if (form.type !== 'expense') return null;
    const month = form.date.slice(0, 7);
    return budgets.find(b => b.month === month && b.category === form.category);
  }, [budgets, form.type, form.date, form.category]);

  const remainingBudget = useMemo(() => {
    if (!currentBudget) return null;
    const amount = typeof form.amount === 'number' ? form.amount : 0;
    const spent = (currentBudget.spent || 0) + amount;
    return currentBudget.amount - spent;
  }, [currentBudget, form.amount]);

  const handleTypeChange = (type: TransactionType) => {
    setForm(f => ({ ...f, type }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof form.amount !== 'number' || form.amount <= 0) return;
    if (!form.category || !form.date) return;

    setSubmitting(true);
    try {
      const ok = await onSubmit(form);
      if (ok) {
        setSuccess(true);
        setForm({ ...emptyForm, date: getToday() });
        setTimeout(() => setSuccess(false), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const catColor = getCategoryColor(form.category);

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '18px', color: '#333' }}>
        添加交易记录
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className="type-btn"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              transition: 'all 200ms ease',
              background: form.type === 'expense' ? '#FF6B6B' : '#f0f0f0',
              color: form.type === 'expense' ? '#fff' : '#666',
              transform: form.type === 'expense' ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className="type-btn"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              transition: 'all 200ms ease',
              background: form.type === 'income' ? '#6BCB77' : '#f0f0f0',
              color: form.type === 'income' ? '#fff' : '#666',
              transform: form.type === 'income' ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            收入
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>金额 (¥)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={e =>
              setForm(f => ({
                ...f,
                amount: e.target.value === '' ? '' : parseFloat(e.target.value)
              }))
            }
            placeholder="请输入金额"
            required
            style={inputStyle}
          />
          {remainingBudget !== null && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '13px',
                color:
                  remainingBudget < 0
                    ? '#E53935'
                    : remainingBudget < currentBudget!.amount * 0.2
                    ? '#FB8C00'
                    : '#666'
              }}
            >
              {remainingBudget >= 0
                ? `该分类本月剩余预算: ¥${remainingBudget.toFixed(2)}`
                : `该分类本月已超支: ¥${Math.abs(remainingBudget).toFixed(2)}`}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>分类</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
              gap: '8px'
            }}
          >
            {categories.map(cat => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: cat.name }))}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border:
                    form.category === cat.name
                      ? `2px solid ${cat.color}`
                      : '2px solid transparent',
                  background:
                    form.category === cat.name ? `${cat.color}15` : '#f8f9fa',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 200ms ease',
                  color: '#333'
                }}
                className="cat-btn"
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: cat.color,
                    marginRight: '6px'
                  }}
                />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>日期</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>描述</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="可选描述"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>标签 (回车添加)</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleAddTag}
              placeholder="输入标签后回车"
              style={{ ...inputStyle, margin: 0, flex: 1 }}
              list="tag-suggestions"
            />
            <datalist id="tag-suggestions">
              {allTags.map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-secondary"
              style={{ ...btnSecondary, whiteSpace: 'nowrap' }}
            >
              添加
            </button>
          </div>
          {form.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {form.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    background: `linear-gradient(135deg, ${'#4A90D9'}22, ${'#50E3C2'}22)`,
                    borderRadius: '14px',
                    fontSize: '12px',
                    color: '#4A90D9'
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#4A90D9',
                      padding: 0,
                      fontSize: '14px',
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || loading || typeof form.amount !== 'number' || form.amount <= 0}
          className="btn-primary"
          style={{
            ...btnPrimary,
            background: submitting || success
              ? success
                ? '#6BCB77'
                : '#ccc'
              : catColor,
            width: '100%'
          }}
        >
          {submitting ? '保存中...' : success ? '✓ 添加成功' : `添加${form.type === 'expense' ? '支出' : '收入'}`}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#555'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid #e0e0e0',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 200ms, box-shadow 200ms',
  boxSizing: 'border-box'
};

const btnPrimary: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 200ms ease'
};

const btnSecondary: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: '8px',
  border: 'none',
  background: '#f0f0f0',
  color: '#555',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 200ms ease'
};
