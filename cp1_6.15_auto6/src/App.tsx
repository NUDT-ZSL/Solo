import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  createRecordManager,
  calculateTasteVector,
  getCategoryStats,
  TEA_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_GRADIENTS,
  type TeaCategory,
  type TastingRecord
} from './teaRecordModule';
import {
  calculateRecommendations,
  createQuickFill,
  type TeaItem,
  type RecommendedTea
} from './teaRecommendModule';

const recordManager = createRecordManager();

interface FormState {
  teaName: string;
  category: TeaCategory;
  origin: string;
  temperature: number;
  tastingDate: string;
  notes: string;
  rating: number;
}

const emptyForm: FormState = {
  teaName: '',
  category: '绿茶',
  origin: '',
  temperature: 85,
  tastingDate: new Date().toISOString().split('T')[0],
  notes: '',
  rating: 4
};

const App: React.FC = () => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [teaLibrary, setTeaLibrary] = useState<TeaItem[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; category: TeaCategory; origin: string; temp: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [dataLoaded, setDataLoaded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScreen = () => setIsLargeScreen(window.innerWidth > 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestRef.current &&
        !suggestRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teasRes, recordsRes] = await Promise.all([
          fetch('/api/teas'),
          fetch('/api/records')
        ]);
        if (teasRes.ok) {
          const teas = await teasRes.json();
          setTeaLibrary(teas);
        }
        if (recordsRes.ok) {
          const recs = await recordsRes.json();
          setRecords(recs);
        }
      } catch {
        setTeaLibrary(requireFallbackTeas());
      }
      setDataLoaded(true);
    };
    loadData();
  }, []);

  const tasteVector = useMemo(() => calculateTasteVector(records), [records]);
  const stats = useMemo(() => getCategoryStats(records), [records]);
  const recommendations = useMemo(
    () => calculateRecommendations(teaLibrary, tasteVector, records, 5),
    [teaLibrary, tasteVector, records]
  );

  const handleSearchChange = useCallback((value: string) => {
    setForm(f => ({ ...f, teaName: value }));
    if (value.length > 0) {
      const matches = teaLibrary
        .filter(t => t.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8)
        .map(t => ({ id: t.id, name: t.name, category: t.category, origin: t.origin, temp: t.temp }));
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [teaLibrary]);

  const selectSuggestion = (s: { name: string; category: TeaCategory; origin: string; temp: number }) => {
    setForm(f => ({
      ...f,
      teaName: s.name,
      category: s.category,
      origin: s.origin,
      temperature: s.temp
    }));
    setShowSuggestions(false);
  };

  const applyRecommendation = (tea: RecommendedTea) => {
    const fill = createQuickFill(tea);
    setForm(f => ({
      ...f,
      teaName: fill.teaName,
      category: fill.category,
      origin: fill.origin,
      temperature: fill.temperature,
      tastingDate: new Date().toISOString().split('T')[0]
    }));
    if (!isLargeScreen) setFormCollapsed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teaName.trim() || !form.origin.trim()) return;

    if (editingId) {
      try {
        await fetch(`/api/records/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      } catch {}
      recordManager.updateRecord(editingId, form);
      setRecords(recordManager.getRecords());
      setEditingId(null);
    } else {
      try {
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (res.ok) await res.json();
      } catch {}
      recordManager.addRecord(form);
      setRecords(recordManager.getRecords());
    }
    setForm(emptyForm);
  };

  const startEdit = (record: TastingRecord) => {
    if (!record.id) return;
    setForm({
      teaName: record.teaName,
      category: record.category,
      origin: record.origin,
      temperature: record.temperature,
      tastingDate: record.tastingDate,
      notes: record.notes,
      rating: record.rating
    });
    setEditingId(record.id);
    if (!isLargeScreen) setFormCollapsed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (recordId: string) => {
    setDeletingIds(prev => new Set(prev).add(recordId));
    setTimeout(async () => {
      try {
        await fetch(`/api/records/${recordId}`, { method: 'DELETE' });
      } catch {}
      recordManager.deleteRecord(recordId);
      setRecords(recordManager.getRecords());
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }, 300);
  };

  const tempColor = useMemo(() => {
    const ratio = (form.temperature - 60) / 40;
    const r = Math.round(135 + ratio * (255 - 135));
    const g = Math.round(206 + ratio * (99 - 206));
    const b = Math.round(235 + ratio * (71 - 235));
    return `rgb(${r}, ${g}, ${b})`;
  }, [form.temperature]);

  const renderForm = () => (
    <div style={styles.formPanel}>
      <div style={styles.formHeader}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>🍵 品鉴记录</span>
        {!isLargeScreen && (
          <button
            onClick={() => setFormCollapsed(c => !c)}
            style={styles.collapseBtn}
          >
            {formCollapsed ? '▼' : '▲'}
          </button>
        )}
      </div>

      {(isLargeScreen || !formCollapsed) && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={{ position: 'relative' }}>
            <label style={styles.label}>茶品名称</label>
            <input
              ref={searchRef}
              type="text"
              value={form.teaName}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => form.teaName && setShowSuggestions(true)}
              placeholder="输入茶名，如：西湖龙井"
              style={styles.input}
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <div ref={suggestRef} style={styles.suggestions}>
                {suggestions.map(s => (
                  <div
                    key={s.id}
                    className="suggestion-item-hover"
                    style={{
                      ...styles.suggestionItem,
                      borderLeft: `3px solid ${CATEGORY_COLORS[s.category]}`
                    }}
                    onClick={() => selectSuggestion(s)}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = '#FFFBF5';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>
                      {s.category} · {s.origin} · {s.temp}℃
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={styles.label}>品种</label>
            <div style={styles.categoryRow}>
              {TEA_CATEGORIES.map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                  style={{
                    ...styles.categoryTag,
                    backgroundColor: form.category === cat ? CATEGORY_COLORS[cat] : '#FFF8F0',
                    color: form.category === cat ? '#fff' : '#4A3728',
                    borderColor: form.category === cat ? CATEGORY_COLORS[cat] : '#C4A882'
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={styles.label}>产地</label>
            <input
              type="text"
              value={form.origin}
              onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
              placeholder="如：福建武夷山"
              style={styles.input}
              required
            />
          </div>

          <div>
            <label style={styles.label}>
              冲泡温度：<span style={{ color: '#6B4226', fontWeight: 600 }}>{form.temperature}℃</span>
            </label>
            <input
              type="range"
              min={60}
              max={100}
              value={form.temperature}
              onChange={e => setForm(f => ({ ...f, temperature: Number(e.target.value) }))}
              style={{
                ...styles.slider,
                background: `linear-gradient(to right, #87CEEB 0%, ${tempColor} ${((form.temperature - 60) / 40) * 100}%, #FF6347 ${((form.temperature - 60) / 40) * 100}%, #FF6347 100%)`
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8B7355', marginTop: 4 }}>
              <span>60℃</span>
              <span>80℃</span>
              <span>100℃</span>
            </div>
          </div>

          <div>
            <label style={styles.label}>品鉴日期</label>
            <input
              type="date"
              value={form.tastingDate}
              onChange={e => setForm(f => ({ ...f, tastingDate: e.target.value }))}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>
              评分：<span style={{ color: '#6B4226', fontWeight: 600 }}>{form.rating} / 5</span>
            </label>
            <div style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setForm(f => ({ ...f, rating: n }))}
                  style={{
                    ...styles.starBtn,
                    color: n <= form.rating ? '#E8B339' : '#C4A882',
                    transform: n <= form.rating ? 'scale(1.15)' : 'scale(1)'
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={styles.label}>口感描述</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="描述香气、滋味、回甘等品鉴感受..."
              style={{ ...styles.input, minHeight: 90, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" style={styles.submitBtn}>
              {editingId ? '更新记录' : '＋ 保存品鉴'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                style={styles.cancelBtn}
              >
                取消
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );

  const renderRecordCard = (record: TastingRecord, idx: number) => {
    const isDeleting = record.id ? deletingIds.has(record.id) : false;
    return (
      <div
        key={record.id || idx}
        style={{
          ...styles.recordCard,
          animation: isDeleting
            ? 'slideOutLeft 0.3s ease forwards'
            : `slideUp 0.3s ease forwards`,
          animationDelay: isDeleting ? '0s' : `${Math.min(idx * 0.1, 1)}s`,
          opacity: isDeleting ? undefined : 0
        }}
      >
        <div
          style={{
            ...styles.cardHeader,
            background: CATEGORY_GRADIENTS[record.category],
            color: record.category === '白茶' ? '#4A3728' : '#fff'
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16 }}>{record.teaName}</div>
          <div style={{
            fontSize: 12,
            opacity: record.category === '白茶' ? 0.75 : 0.9,
            marginTop: 2
          }}>
            📍 {record.origin} · {record.temperature}℃
          </div>
        </div>

        <div style={styles.cardBody}>
          <div style={styles.metaRow}>
            <span style={{
              ...styles.smallCategory,
              backgroundColor: CATEGORY_COLORS[record.category]
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.transform = 'scale(1)'; }}
            >
              {record.category}
            </span>
            <span style={styles.metaText}>
              {record.tastingDate} · {'★'.repeat(record.rating)}{'☆'.repeat(5 - record.rating)}
            </span>
          </div>
          {record.notes && (
            <p style={styles.notesText}>{record.notes}</p>
          )}
        </div>

        <div style={styles.cardFooter}>
          <button onClick={() => startEdit(record)} style={styles.editBtn}>
            ✏️ 编辑
          </button>
          <button
            onClick={() => record.id && handleDelete(record.id)}
            style={styles.deleteBtn}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#800000';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
              (e.currentTarget as HTMLButtonElement).style.color = '';
            }}
          >
            🗑 删除
          </button>
        </div>
      </div>
    );
  };

  const renderRecommendation = (tea: RecommendedTea, idx: number) => (
    <div
      key={tea.id}
      onClick={() => applyRecommendation(tea)}
      style={{
        ...styles.recommendCard,
        animation: `fadeIn 0.3s ease forwards`,
        animationDelay: `${idx * 0.08}s`,
        opacity: 0,
        cursor: 'pointer'
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.02)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(107,66,38,0.15)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      <div
        style={{
          ...styles.recommendHeader,
          background: CATEGORY_GRADIENTS[tea.category],
          color: tea.category === '白茶' ? '#4A3728' : '#fff'
        }}
      >
        <div style={{ fontWeight: 600 }}>{tea.name}</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>匹配度 {(tea.score / 10 * 10).toFixed(0)}%</div>
      </div>
      <div style={styles.recommendBody}>
        <div style={{ marginBottom: 8 }}>
          <span style={{
            ...styles.smallCategory,
            backgroundColor: CATEGORY_COLORS[tea.category]
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.transform = 'scale(1)'; }}
          >
            {tea.category}
          </span>
          <span style={styles.metaText}>📍 {tea.origin}</span>
        </div>
        <p style={styles.reasonText}>{tea.reason}</p>
        <div style={styles.clickHint}>点击快速创建记录 →</div>
      </div>
    </div>
  );

  return (
    <div style={styles.app}>
      <header style={styles.appHeader}>
        <div style={styles.logoArea}>
          <span style={{ fontSize: 28 }}>🍵</span>
          <div>
            <h1 style={styles.appTitle}>茶品品鉴系统</h1>
            <p style={styles.appSubtitle}>记录每一杯茶的故事 · 品味个性化推荐</p>
          </div>
        </div>
        <div style={styles.statsBadges}>
          <div style={styles.badge}>
            <div style={styles.badgeNum}>{records.length}</div>
            <div style={styles.badgeLabel}>品鉴次数</div>
          </div>
          <div style={styles.badge}>
            <div style={styles.badgeNum}>{tasteVector.topOrigins.length}</div>
            <div style={styles.badgeLabel}>关注产区</div>
          </div>
          <div style={styles.badge}>
            <div style={styles.badgeNum}>{tasteVector.preferredCategories.length}</div>
            <div style={styles.badgeLabel}>偏好品种</div>
          </div>
        </div>
      </header>

      <main style={isLargeScreen ? styles.mainGrid : styles.mainStack}>
        {!isLargeScreen && renderForm()}

        <div style={{ ...styles.leftPane, display: isLargeScreen ? 'block' : 'none' }}>
          {renderForm()}
        </div>

        <div style={styles.rightPane}>
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>✨ 为您推荐</h2>
              <span style={styles.sectionHint}>基于 {records.length} 条品鉴记录智能匹配</span>
            </div>
            {dataLoaded ? (
              <div style={styles.recommendScroll}>
                {recommendations.length > 0 ? (
                  recommendations.map((t, i) => renderRecommendation(t, i))
                ) : (
                  <div style={styles.emptyState}>暂无推荐数据</div>
                )}
              </div>
            ) : (
              <div style={styles.loadingState}>加载推荐中...</div>
            )}
          </section>

          <div style={{
            ...styles.bottomRow,
            gridTemplateColumns: isLargeScreen ? '1.5fr 1fr' : '1fr'
          }}>
            <section style={{ ...styles.section, flex: 1 }}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>📜 品鉴历史</h2>
                <span style={styles.sectionHint}>{records.length} 条记录</span>
              </div>
              {records.length > 0 ? (
                <div style={styles.recordsGrid}>
                  {records.map((r, i) => renderRecordCard(r, i))}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  还没有品鉴记录，填写左侧表单开始记录吧！
                </div>
              )}
            </section>

            <section style={styles.chartSection}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>📊 品种统计</h2>
              </div>
              <div style={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DCCB" />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: '#4A3728', fontSize: 12 }}
                      axisLine={{ stroke: '#C4A882' }}
                    />
                    <YAxis
                      tick={{ fill: '#4A3728', fontSize: 11 }}
                      axisLine={{ stroke: '#C4A882' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFF8F0',
                        border: '1px solid #C4A882',
                        borderRadius: 8,
                        color: '#4A3728'
                      }}
                      formatter={(value: number) => [`${value} 次`, '品鉴次数']}
                    />
                    <Bar dataKey="count" name="品鉴次数" radius={[6, 6, 0, 0]}>
                      {stats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill}
                          onMouseEnter={e => {
                            (e as unknown as HTMLElement).style.transform = 'scaleY(1.1)';
                            (e as unknown as HTMLElement).style.transformOrigin = 'bottom';
                            (e as unknown as HTMLElement).style.transition = 'transform 0.2s';
                          }}
                          onMouseLeave={e => {
                            (e as unknown as HTMLElement).style.transform = '';
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

function requireFallbackTeas(): TeaItem[] {
  return [
    { id: 't1', name: '西湖龙井', category: '绿茶', origin: '浙江杭州', temp: 80, flavor: ['鲜爽', '豆香'], description: '扁平光滑，色泽嫩绿' },
    { id: 't6', name: '正山小种', category: '红茶', origin: '福建武夷山', temp: 90, flavor: ['松烟香'], description: '条索肥实，色泽乌润' },
    { id: 't11', name: '铁观音', category: '乌龙', origin: '福建安溪', temp: 95, flavor: ['兰花香'], description: '螺旋紧结，色泽砂绿' },
    { id: 't16', name: '生普饼茶', category: '普洱', origin: '云南西双版纳', temp: 100, flavor: ['兰香'], description: '紧压成饼，色泽青绿' },
    { id: 't21', name: '福鼎白毫银针', category: '白茶', origin: '福建福鼎', temp: 85, flavor: ['毫香'], description: '芽头肥壮，满披白毫' }
  ];
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    padding: '20px 24px 40px',
    maxWidth: 1440,
    margin: '0 auto'
  },
  appHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #FFF8F0 0%, #F5E6D3 100%)',
    borderRadius: 12,
    border: '1px solid #C4A882',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: 12 },
  appTitle: { fontSize: 22, fontWeight: 700, color: '#4A3728', margin: 0 },
  appSubtitle: { fontSize: 12, color: '#8B7355', margin: '2px 0 0' },
  statsBadges: { display: 'flex', gap: 12 },
  badge: {
    textAlign: 'center',
    padding: '8px 16px',
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #E8DCCB',
    minWidth: 64
  },
  badgeNum: { fontSize: 20, fontWeight: 700, color: '#6B4226' },
  badgeLabel: { fontSize: 11, color: '#8B7355', marginTop: 2 },

  mainGrid: { display: 'grid', gridTemplateColumns: '30% 70%', gap: 20 },
  mainStack: { display: 'flex', flexDirection: 'column', gap: 16 },
  leftPane: {},
  rightPane: { display: 'flex', flexDirection: 'column', gap: 20 },

  bottomRow: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: 20
  } as React.CSSProperties,

  formPanel: {
    background: '#FFF8F0',
    borderRadius: 12,
    border: '1px solid #C4A882',
    padding: 20,
    position: 'sticky',
    top: 20
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #E8DCCB'
  },
  collapseBtn: {
    background: 'none',
    border: 'none',
    color: '#6B4226',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 8px'
  },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#4A3728',
    marginBottom: 6
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #C4A882',
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#4A3728',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit'
  },
  categoryRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  categoryTag: {
    padding: '6px 14px',
    border: '1.5px solid',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    fontFamily: 'inherit'
  },
  slider: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    appearance: 'none',
    WebkitAppearance: 'none',
    outline: 'none',
    cursor: 'pointer'
  },
  ratingRow: { display: 'flex', gap: 4 },
  starBtn: {
    background: 'none',
    border: 'none',
    fontSize: 26,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    padding: '0 2px'
  },
  submitBtn: {
    flex: 1,
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #6B4226 0%, #8B5A2B 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  },
  cancelBtn: {
    padding: '12px 20px',
    background: '#F5F0E8',
    color: '#6B4226',
    border: '1px solid #C4A882',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit'
  },

  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: '#fff',
    border: '1.5px solid #C4A882',
    borderRadius: 8,
    maxHeight: 260,
    overflowY: 'auto',
    zIndex: 100,
    boxShadow: '0 8px 24px rgba(107,66,38,0.12)'
  },
  suggestionItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #F5F0E8',
    transition: 'background-color 0.15s ease'
  },

  section: {
    background: '#FFF8F0',
    borderRadius: 12,
    border: '1px solid #C4A882',
    padding: 20,
    minWidth: 0
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #E8DCCB'
  },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#4A3728', margin: 0 },
  sectionHint: { fontSize: 12, color: '#8B7355' },

  recommendScroll: {
    display: 'flex',
    gap: 16,
    overflowX: 'auto',
    padding: '8px 4px 16px',
    scrollbarGutter: 'stable'
  },
  recommendCard: {
    minWidth: 220,
    maxWidth: 220,
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #E8DCCB',
    overflow: 'hidden',
    transition: 'all 0.25s ease',
    flexShrink: 0
  },
  recommendHeader: {
    padding: '12px 14px'
  },
  recommendBody: { padding: 14 },
  reasonText: {
    fontSize: 12,
    color: '#4A3728',
    lineHeight: 1.6,
    margin: '6px 0'
  },
  clickHint: {
    fontSize: 11,
    color: '#8B5A2B',
    marginTop: 8,
    fontWeight: 500,
    textAlign: 'right'
  },

  recordsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
    maxHeight: 520,
    overflowY: 'auto',
    paddingRight: 4
  },
  recordCard: {
    background: '#FFF8F0',
    borderRadius: 8,
    border: '1px solid #C4A882',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: {
    padding: '12px 14px'
  },
  cardBody: { padding: 14, flex: 1 },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap'
  },
  smallCategory: {
    padding: '3px 10px',
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: 500,
    display: 'inline-block',
    transition: 'transform 0.2s ease',
    cursor: 'default'
  },
  metaText: { fontSize: 12, color: '#8B7355' },
  notesText: {
    fontSize: 13,
    color: '#4A3728',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  cardFooter: {
    display: 'flex',
    gap: 8,
    padding: '10px 14px',
    borderTop: '1px solid #E8DCCB',
    background: '#FFFBF5'
  },
  editBtn: {
    flex: 1,
    padding: '6px 12px',
    background: '#F5E6D3',
    color: '#6B4226',
    border: '1px solid #C4A882',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  },
  deleteBtn: {
    flex: 1,
    padding: '6px 12px',
    background: 'transparent',
    color: '#4A3728',
    border: '1px solid #C4A882',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  },

  chartSection: {
    background: '#FFF8F0',
    borderRadius: 12,
    border: '1px solid #C4A882',
    padding: 20,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  chartContainer: {
    flex: 1,
    minHeight: 260,
    width: '100%'
  },

  emptyState: {
    padding: 40,
    textAlign: 'center',
    color: '#8B7355',
    fontSize: 13,
    background: '#FFFBF5',
    borderRadius: 8,
    border: '1px dashed #C4A882'
  },
  loadingState: {
    padding: 40,
    textAlign: 'center',
    color: '#8B7355',
    fontSize: 13
  }
};

export default App;
