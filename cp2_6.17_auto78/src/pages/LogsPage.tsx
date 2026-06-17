import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { fetchLogs, createLog, type Log, type IngredientItem, type ProductItem } from '../api';
import DateSelector from '../components/DateSelector';

const weekColors: Record<number, string> = {
  1: '#e53935',
  2: '#fb8c00',
  3: '#fdd835',
  4: '#43a047',
  5: '#1e88e5',
  6: '#8e24aa',
  0: '#6d4c41',
};

const weekNames: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [logDate, setLogDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [ingredients, setIngredients] = useState<IngredientItem[]>([{ name: '', quantity: 0 }]);
  const [products, setProducts] = useState<ProductItem[]>([{ name: '', quantity: 0 }]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchLogs();
      setLogs(data.sort((a, b) => (a.date < b.date ? 1 : -1)));
    } catch (err) {
      console.error('加载日志失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (dateRange) {
      if (l.date < dateRange.start || l.date > dateRange.end) return false;
    }
    return true;
  });

  const handleRow = (
    list: Array<{ name: string; quantity: number }>,
    setList: (v: Array<{ name: string; quantity: number }>) => void,
    idx: number,
    field: 'name' | 'quantity',
    value: string | number
  ) => {
    const next = [...list];
    (next[idx] as Record<string, string | number>)[field] = value;
    setList(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validIngredients = ingredients.filter((it) => it.name.trim() && it.quantity > 0);
    const validProducts = products.filter((it) => it.name.trim() && it.quantity > 0);
    if (!logDate) {
      alert('请选择日期');
      return;
    }
    try {
      setSubmitting(true);
      await createLog({
        date: logDate,
        ingredients: validIngredients,
        products: validProducts,
        notes: notes.slice(0, 200),
      });
      setIngredients([{ name: '', quantity: 0 }]);
      setProducts([{ name: '', quantity: 0 }]);
      setNotes('');
      setShowForm(false);
      loadLogs();
    } catch (err) {
      console.error('保存日志失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="logs-page">
      <div className="page-header">
        <h1 className="page-title">烘焙日志</h1>
        <button className="btn btn-primary btn-large" onClick={() => setShowForm(!showForm)}>
          {showForm ? '取消' : '+ 记录今日烘焙'}
        </button>
      </div>

      {showForm && (
        <form className="log-form card" onSubmit={handleSubmit}>
          <h3 className="form-title">🍞 新日志</h3>
          <div className="form-row">
            <div className="form-group">
              <label>日期 *</label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>原料消耗（名称 + 数量 kg）</label>
            <div className="items-editor">
              {ingredients.map((item, idx) => (
                <div key={idx} className="item-row">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleRow(ingredients, setIngredients, idx, 'name', e.target.value)}
                    placeholder="原料名称"
                    className="item-name-input"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={item.quantity || ''}
                    onChange={(e) => handleRow(ingredients, setIngredients, idx, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="kg"
                    className="item-qty-input"
                  />
                  <button
                    type="button"
                    className="btn-remove-item"
                    onClick={() => {
                      if (ingredients.length <= 1) return;
                      setIngredients(ingredients.filter((_, i) => i !== idx));
                    }}
                    disabled={ingredients.length <= 1}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-add-item"
                onClick={() => setIngredients([...ingredients, { name: '', quantity: 0 }])}
              >
                + 添加原料
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>烘焙产品（名称 + 数量）</label>
            <div className="items-editor">
              {products.map((item, idx) => (
                <div key={idx} className="item-row">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleRow(products, setProducts, idx, 'name', e.target.value)}
                    placeholder="产品名称"
                    className="item-name-input"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.quantity || ''}
                    onChange={(e) => handleRow(products, setProducts, idx, 'quantity', parseInt(e.target.value) || 0)}
                    placeholder="数量"
                    className="item-qty-input"
                  />
                  <button
                    type="button"
                    className="btn-remove-item"
                    onClick={() => {
                      if (products.length <= 1) return;
                      setProducts(products.filter((_, i) => i !== idx));
                    }}
                    disabled={products.length <= 1}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-add-item"
                onClick={() => setProducts([...products, { name: '', quantity: 0 }])}
              >
                + 添加产品
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>备注（限200字）</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 200))}
              placeholder="记录今日烘焙心得、注意事项等..."
              rows={4}
              maxLength={200}
            />
            <div className="char-count">{notes.length}/200</div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '保存中...' : '保存日志'}
            </button>
          </div>
        </form>
      )}

      <div className="filters card">
        <div className="filter-row">
          <span className="filter-label">日期筛选：</span>
          <DateSelector onChange={setDateRange} />
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="empty-state">暂无烘焙日志</div>
      ) : (
        <div className="timeline">
          {filteredLogs.map((log) => {
            const day = dayjs(log.date).day();
            const color = weekColors[day];
            const wn = weekNames[day];
            return (
              <div className="timeline-item" key={log.id}>
                <div className="timeline-dot" style={{ backgroundColor: color }}></div>
                <div
                  className="log-card"
                  style={{
                    borderLeft: `4px solid ${color}`,
                  }}
                >
                  <div className="log-header">
                    <div>
                      <span className="log-date">{log.date}</span>
                      <span className="log-weekday" style={{ backgroundColor: color }}>
                        {wn}
                      </span>
                    </div>
                  </div>

                  {log.ingredients.length > 0 && (
                    <div className="log-section">
                      <div className="log-section-title">🌾 原料消耗</div>
                      <div className="log-chips">
                        {log.ingredients.map((ing, i) => (
                          <span key={i} className="chip chip-ingredient">
                            {ing.name}: <strong>{ing.quantity} kg</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.products.length > 0 && (
                    <div className="log-section">
                      <div className="log-section-title">🥖 烘焙产品</div>
                      <div className="log-chips">
                        {log.products.map((p, i) => (
                          <span key={i} className="chip chip-product">
                            {p.name}: <strong>{p.quantity} 份</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.notes && (
                    <div className="log-section">
                      <div className="log-section-title">📝 备注</div>
                      <p className="log-notes">{log.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
