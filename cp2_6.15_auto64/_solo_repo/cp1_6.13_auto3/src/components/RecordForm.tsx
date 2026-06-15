import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface RecordFormProps {
  onSuccess: () => void;
}

interface FormData {
  type: 'income' | 'expense';
  category: string;
  amount: string;
  date: string;
}

const expenseCategories = ['餐饮', '交通', '购物', '其他'];
const incomeCategories = ['工资', '奖金', '投资', '其他'];

function RecordForm({ onSuccess }: RecordFormProps) {
  const [formData, setFormData] = useState<FormData>({
    type: 'expense',
    category: '餐饮',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const currentCategories =
    formData.type === 'expense' ? expenseCategories : incomeCategories;

  const handleTypeChange = (type: 'income' | 'expense') => {
    setFormData({
      ...formData,
      type,
      category: type === 'expense' ? '餐饮' : '工资',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(formData.amount);

    if (!formData.date) {
      setError('请选择日期');
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('金额必须为正数');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          category: formData.category,
          amount: amountNum,
          date: formData.date,
        }),
      });

      if (res.ok) {
        setFormData({
          type: 'expense',
          category: '餐饮',
          amount: '',
          date: format(new Date(), 'yyyy-MM-dd'),
        });
        setError(null);
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || '提交失败，请重试');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-card">
      <h3 className="form-title">添加收支记录</h3>
      <form className="record-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>类型</label>
          <select
            value={formData.type}
            onChange={(e) =>
              handleTypeChange(e.target.value as 'income' | 'expense')
            }
          >
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
        </div>
        <div className="form-group">
          <label>类别</label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
          >
            {currentCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>金额 (¥)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="请输入金额"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
          />
        </div>
        <div className="form-group">
          <label>日期</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
          />
        </div>
        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? '提交中...' : '添加'}
        </button>
      </form>
      {error && <div className="form-error">⚠️ {error}</div>}
    </div>
  );
}

export default RecordForm;
