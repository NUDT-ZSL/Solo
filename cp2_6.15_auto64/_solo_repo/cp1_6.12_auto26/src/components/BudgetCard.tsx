import { useState, useMemo, useEffect } from 'react';
import {
  Budget,
  BudgetFormData,
  BudgetWarningLevel,
  EXPENSE_CATEGORIES,
  getCategoryColor
} from '../types';
import { getCurrentMonth } from '../hooks/useFinanceData';

interface Props {
  budgets: (Budget & { warningLevel: BudgetWarningLevel })[];
  onAdd: (data: BudgetFormData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onFetchBudgets: (month?: string) => Promise<void>;
}

const emptyForm: BudgetFormData = {
  month: getCurrentMonth(),
  category: '餐饮',
  amount: ''
};

export default function BudgetCard({ budgets, onAdd, onDelete, onFetchBudgets }: Props) {
  const [form, setForm] = useState<BudgetFormData>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [warningTriggered, setWarningTriggered] = useState<Set<string>>(new Set());

  useEffect(() => {
    onFetchBudgets(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    const currentWarnings = new Set<string>();
    budgets.forEach(b => {
      if (b.warningLevel !== 'normal') {
        currentWarnings.add(b.id);
      }
    });
    if (currentWarnings.size > 0) {
      setWarningTriggered(currentWarnings);
      const timer = setTimeout(() => setWarningTriggered(new Set()), 1200);
      return () => clearTimeout(timer);
    }
  }, [budgets.map(b => `${b.id}-${b.spent}`).join(',')]);

  const availableCategories = useMemo(() => {
    const used = new Set(budgets.map(b => b.category));
    return EXPENSE_CATEGORIES.filter(c => !used.has(c.name));
  }, [budgets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof form.amount !== 'number' || form.amount <= 0) return;
    if (!form.month || !form.category) return;
    setSubmitting(true);
    try {
      const ok = await onAdd(form);
      if (ok) {
        setShowForm(false);
        setForm({ ...emptyForm, month: selectedMonth });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);
  const totalRemaining = totalBudget - totalSpent;

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#333' }}>预算追踪</h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1.5px solid #e0e0e0',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="btn-primary"
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: showForm ? '#e0e0e0' : '#4A90D9',
            color: '#fff',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 200ms'
          }}
        >
          {showForm ? '取消' : '+ 添加预算'}
        </button>
      </div>

      {totalBudget > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
            padding: '16px',
            background: 'linear-gradient(135deg, #4A90D90d, #50E3C210)',
            borderRadius: '8px'
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>总预算</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#333', fontVariantNumeric: 'tabular-nums' }}>
              ¥{totalBudget.toFixed(0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>已支出</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#4A90D9', fontVariantNumeric: 'tabular-nums' }}>
              ¥{totalSpent.toFixed(0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>剩余</div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: totalRemaining < 0 ? '#E53935' : totalRemaining < totalBudget * 0.2 ? '#FB8C00' : '#50E3C2',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              ¥{totalRemaining.toFixed(0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>使用率</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#333', fontVariantNumeric: 'tabular-nums' }}>
              {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '20px',
            animation: 'fadeSlideIn 300ms ease both'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              marginBottom: '12px'
            }}
          >
            <div>
              <label style={formLabelStyle}>月份</label>
              <input
                type="month"
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                style={formInputStyle}
                required
              />
            </div>
            <div>
              <label style={formLabelStyle}>分类</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={formInputStyle}
                required
              >
                <option value="">请选择分类</option>
                {(availableCategories.length > 0 ? availableCategories : EXPENSE_CATEGORIES).map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={formLabelStyle}>预算金额 (¥)</label>
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
                placeholder="输入预算金额"
                style={formInputStyle}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || typeof form.amount !== 'number' || form.amount <= 0}
            className="btn-primary"
            style={{
              padding: '10px 24px',
              borderRadius: '6px',
              border: 'none',
              background: submitting ? '#ccc' : '#4A90D9',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 200ms'
            }}
          >
            {submitting ? '保存中...' : '保存预算'}
          </button>
        </form>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px'
        }}
      >
        {budgets.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '40px',
              textAlign: 'center',
              color: '#999',
              fontSize: '14px',
              background: '#fafafa',
              borderRadius: '8px'
            }}
          >
            暂无预算设置，点击"添加预算"开始规划
          </div>
        ) : (
          budgets.map((budget, idx) => {
            const color = getCategoryColor(budget.category);
            const spent = budget.spent || 0;
            const ratio = budget.amount > 0 ? Math.min(spent / budget.amount, 1.2) : 0;
            const percent = Math.min((ratio * 100), 100);
            const remaining = budget.amount - spent;
            const isShaking = warningTriggered.has(budget.id);
            const warnLevel = budget.warningLevel;
            const hasWarning = warnLevel !== 'normal';

            let barColor = color;
            let cardBorder = 'transparent';
            let cardBg = '#fff';
            let titleColor = '#333';
            if (warnLevel === 'danger') {
              barColor = '#E53935';
              cardBorder = '#E53935';
              cardBg = '#FFF5F5';
              titleColor = '#E53935';
            } else if (warnLevel === 'warning') {
              barColor = '#FB8C00';
              cardBorder = '#FB8C00';
              cardBg = '#FFF8E1';
              titleColor = '#E65100';
            }

            const barShakeAnim = isShaking
              ? warnLevel === 'danger'
                ? 'shakeRed 0.45s ease-in-out 2'
                : 'shakeYellow 0.45s ease-in-out 2'
              : 'none';

            const barPulseAnim = hasWarning
              ? 'barPulse 1.5s ease-in-out infinite'
              : 'none';

            return (
              <div
                key={budget.id}
                className={`budget-card budget-${warnLevel}`}
                style={{
                  padding: '18px',
                  borderRadius: '8px',
                  border: `2px solid ${cardBorder}`,
                  background: cardBg,
                  boxShadow: hasWarning
                    ? `0 4px 16px ${warnLevel === 'danger' ? 'rgba(229,57,53,0.2)' : 'rgba(251,140,0,0.2)'}`
                    : '0 2px 8px rgba(0,0,0,0.06)',
                  animation: `fadeSlideIn 300ms ease ${idx * 50}ms both, ${barShakeAnim}`,
                  transform: isShaking ? 'translateZ(0)' : undefined,
                  transition: 'all 250ms ease'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: color
                      }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#333' }}>
                      {budget.category}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`确定删除「${budget.category}」的预算吗？`)) {
                        onDelete(budget.id);
                      }
                    }}
                    className="delete-btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ccc',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      transition: 'all 200ms'
                    }}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '6px',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: '#333' }}>
                      ¥{spent.toFixed(0)}
                    </span>
                    <span style={{ fontSize: '13px', color: '#999', marginLeft: '4px' }}>
                      / ¥{budget.amount.toFixed(0)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color:
                        warnLevel === 'danger'
                          ? '#E53935'
                          : warnLevel === 'warning'
                          ? '#FB8C00'
                          : '#666'
                    }}
                  >
                    {(ratio * 100).toFixed(0)}%
                  </span>
                </div>

                <div
                  style={{
                    height: '8px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '12px'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${percent}%`,
                      background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
                      borderRadius: '4px',
                      transition: 'width 400ms ease-out, background 300ms',
                      boxShadow: warnLevel !== 'normal' ? `0 0 8px ${barColor}88` : 'none',
                      animation: `${barPulseAnim}, ${barShakeAnim}`
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px'
                  }}
                >
                  <span style={{ color: '#888' }}>
                    {remaining >= 0 ? '剩余' : '超支'}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        remaining < 0
                          ? '#E53935'
                          : remaining < budget.amount * 0.2
                          ? '#FB8C00'
                          : '#6BCB77',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {remaining >= 0 ? '' : '-'}¥{Math.abs(remaining).toFixed(2)}
                  </span>
                </div>

                {warnLevel !== 'normal' && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textAlign: 'center',
                      background: warnLevel === 'danger' ? '#FFEBEE' : '#FFF3E0',
                      color: warnLevel === 'danger' ? '#E53935' : '#FB8C00'
                    }}
                  >
                    {warnLevel === 'danger' ? '⚠️ 已超出预算！' : '⚡ 即将达到预算80%'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const formLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#666'
};

const formInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1.5px solid #e0e0e0',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff'
};
