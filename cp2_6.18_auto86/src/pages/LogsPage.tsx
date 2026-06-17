import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import DateSelector, { DateRange } from '../components/DateSelector';
import {
  fetchLogs,
  createLog,
  BakingLog,
  MaterialConsumption,
  BakedProduct,
} from '../api';

interface NewLogForm {
  date: string;
  materials: MaterialConsumption[];
  products: BakedProduct[];
  notes: string;
}

const weekdayColorMap: Record<number, string> = {
  0: '#e53935',
  1: '#fb8c00',
  2: '#fdd835',
  3: '#43a047',
  4: '#1e88e5',
  5: '#8e24aa',
  6: '#6d4c41',
};

const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function LogsPage() {
  const [logs, setLogs] = useState<BakingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [form, setForm] = useState<NewLogForm>({
    date: dayjs().format('YYYY-MM-DD'),
    materials: [{ name: '', quantity: 0, unit: 'kg' }],
    products: [{ name: '', quantity: 0 }],
    notes: '',
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLogs();
      setLogs(data);
    } catch (error) {
      console.error('加载日志失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleDateChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (dateRange) {
      result = result.filter(
        (l) => l.date >= dateRange.start && l.date <= dateRange.end
      );
    }
    return result.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [logs, dateRange]);

  const statsData = useMemo(() => {
    const weekStart = dayjs().startOf('week').add(1, 'day');
    const weekEnd = weekStart.add(6, 'day');
    const weekLogs = logs.filter((l) => {
      const d = dayjs(l.date);
      return d.isAfter(weekStart.subtract(1, 'day')) && d.isBefore(weekEnd.add(1, 'day'));
    });

    const materialMap = new Map<string, number>();
    weekLogs.forEach((log) => {
      log.materials.forEach((m) => {
        if (!m.name.trim()) return;
        let qty = m.quantity;
        if (m.unit === 'g') qty = qty / 1000;
        const current = materialMap.get(m.name) || 0;
        materialMap.set(m.name, current + qty);
      });
    });

    const arr = Array.from(materialMap.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));

    arr.sort((a, b) => b.value - a.value);
    return arr;
  }, [logs]);

  const addMaterial = () => {
    setForm((p) => ({
      ...p,
      materials: [...p.materials, { name: '', quantity: 0, unit: 'kg' }],
    }));
  };

  const removeMaterial = (idx: number) => {
    setForm((p) => ({
      ...p,
      materials: p.materials.filter((_, i) => i !== idx),
    }));
  };

  const updateMaterial = (idx: number, field: keyof MaterialConsumption, value: string | number) => {
    setForm((p) => ({
      ...p,
      materials: p.materials.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    }));
  };

  const addProduct = () => {
    setForm((p) => ({
      ...p,
      products: [...p.products, { name: '', quantity: 0 }],
    }));
  };

  const removeProduct = (idx: number) => {
    setForm((p) => ({
      ...p,
      products: p.products.filter((_, i) => i !== idx),
    }));
  };

  const updateProduct = (idx: number, field: keyof BakedProduct, value: string | number) => {
    setForm((p) => ({
      ...p,
      products: p.products.map((pr, i) => (i === idx ? { ...pr, [field]: value } : pr)),
    }));
  };

  const handleSubmit = async () => {
    const validMaterials = form.materials.filter(
      (m) => m.name.trim() && m.quantity > 0
    );
    const validProducts = form.products.filter(
      (p) => p.name.trim() && p.quantity > 0
    );

    if (!form.date) {
      alert('请选择日期');
      return;
    }
    if (validMaterials.length === 0 && validProducts.length === 0) {
      alert('请至少填写一项原料消耗或烘焙产品');
      return;
    }

    try {
      await createLog({
        date: form.date,
        materials: validMaterials,
        products: validProducts,
        notes: form.notes.trim().slice(0, 200),
      });
      setForm({
        date: dayjs().format('YYYY-MM-DD'),
        materials: [{ name: '', quantity: 0, unit: 'kg' }],
        products: [{ name: '', quantity: 0 }],
        notes: '',
      });
      setShowModal(false);
      loadLogs();
    } catch (error) {
      console.error('创建日志失败:', error);
      alert('创建日志失败');
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <div className="empty-text">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">📒 烘焙日志</h2>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <DateSelector onChange={handleDateChange} />
          <button className="btn btn-warn" onClick={() => setShowModal(true)}>
            + 记录日志
          </button>
        </div>
      </div>

      <div className="stats-panel">
        <div className="stats-title">📊 本周原料消耗统计 (kg)</div>
        {statsData.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
            本周暂无原料消耗数据
          </div>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData} margin={{ top: 30, right: 30, left: 20, bottom: 10 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a5d6a7" />
                    <stop offset="100%" stopColor="#388e3c" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 13 }} />
                <YAxis tick={{ fill: '#555', fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`${value} kg`, '消耗量']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="url(#barGradient)">
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v: number) => `${v}kg`}
                    style={{ fill: '#333', fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {filteredLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <div className="empty-text">暂无烘焙日志</div>
        </div>
      ) : (
        <div className="timeline">
          {filteredLogs.map((log) => {
            const dayIdx = dayjs(log.date).day();
            return (
              <div key={log.id} className={`timeline-item day-${dayIdx}`}>
                <div className="timeline-dot" />
                <div className={`log-card day-${dayIdx}`}>
                  <div className="log-date">
                    {log.date} {weekdayNames[dayIdx]}
                  </div>

                  {log.materials.length > 0 && (
                    <div className="log-section">
                      <div className="log-section-title">🧺 原料消耗</div>
                      <ul className="log-list">
                        {log.materials.map((m, idx) => (
                          <li key={idx}>
                            {m.name}
                            <span>
                              {m.quantity} {m.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {log.products.length > 0 && (
                    <div className="log-section">
                      <div className="log-section-title">🥐 烘焙产品</div>
                      <ul className="log-list">
                        {log.products.map((p, idx) => (
                          <li key={idx}>
                            {p.name}
                            <span>× {p.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {log.notes && (
                    <div className="log-section">
                      <div className="log-section-title">📌 备注</div>
                      <div className="log-notes">{log.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal-content">
            <h3 className="modal-title">记录烘焙日志</h3>

            <div className="form-group">
              <label>日期</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>原料消耗清单</label>
              <div className="dynamic-list">
                {form.materials.map((m, idx) => (
                  <div key={idx} className="dynamic-item">
                    <input
                      type="text"
                      className="name-input"
                      placeholder="原料名称"
                      value={m.name}
                      onChange={(e) => updateMaterial(idx, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      className="qty-input"
                      placeholder="数量"
                      min="0"
                      step="0.1"
                      value={m.quantity || ''}
                      onChange={(e) =>
                        updateMaterial(idx, 'quantity', parseFloat(e.target.value) || 0)
                      }
                    />
                    <input
                      type="text"
                      className="unit-input"
                      placeholder="单位"
                      value={m.unit}
                      onChange={(e) => updateMaterial(idx, 'unit', e.target.value)}
                    />
                    <button
                      className="remove-btn"
                      onClick={() => removeMaterial(idx)}
                      disabled={form.materials.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className="add-btn" onClick={addMaterial}>
                  + 添加原料
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>烘焙产品</label>
              <div className="dynamic-list">
                {form.products.map((p, idx) => (
                  <div key={idx} className="dynamic-item">
                    <input
                      type="text"
                      className="name-input"
                      placeholder="产品名称"
                      value={p.name}
                      onChange={(e) => updateProduct(idx, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      className="qty-input"
                      placeholder="数量"
                      min="0"
                      value={p.quantity || ''}
                      onChange={(e) =>
                        updateProduct(idx, 'quantity', parseInt(e.target.value) || 0)
                      }
                    />
                    <button
                      className="remove-btn"
                      onClick={() => removeProduct(idx)}
                      disabled={form.products.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className="add-btn" onClick={addProduct}>
                  + 添加产品
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>备注 (最多200字)</label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value.slice(0, 200) }))
                }
                placeholder="记录今天的烘焙心得或特殊事项..."
                maxLength={200}
              />
              <div
                className={`char-count ${form.notes.length > 160 ? 'warning' : ''}`}
              >
                {form.notes.length}/200
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="btn btn-warn" onClick={handleSubmit}>
                保存日志
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
