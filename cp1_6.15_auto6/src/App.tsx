import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  createRecordManager,
  createEmptyForm,
  searchTeaLibrary,
  fetchTeaLibrary,
  fetchTastingRecords,
  saveRecord,
  updateRecordApi,
  createDeleteHandler,
  getTemperatureColor,
  getCardAnimationDelay,
  formToRecord,
  recordToForm,
  TEA_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_GRADIENTS,
  type TeaCategory,
  type TastingRecord,
  type TeaItem,
  type FormState
} from './teaRecordModule';
import {
  calculateRecommendations,
  createQuickFill,
  measurePerformance,
  analyzeUserPreferences,
  type RecommendedTea
} from './teaRecommendModule';

const recordManager = createRecordManager();

const App: React.FC = () => {
  const [form, setForm] = useState<FormState>(createEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [teaLibrary, setTeaLibrary] = useState<TeaItem[]>([]);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof searchTeaLibrary>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [dataLoaded, setDataLoaded] = useState(false);
  const [perfMetrics, setPerfMetrics] = useState<{ render: number; recommend: number } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const deleteHandler = useMemo(() =>
    createDeleteHandler(
      (id) => {
        setDeletingIds(prev => new Set(prev).add(id));
      },
      (id) => {
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        recordManager.deleteRecord(id);
        setRecords(recordManager.getRecords());
      },
      300
    )
  , []);

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
      const [teas, recs] = await Promise.all([
        fetchTeaLibrary(),
        fetchTastingRecords()
      ]);
      setTeaLibrary(teas);
      setRecords(recs);
      recordManager.initialize(recs);
      setDataLoaded(true);
    };
    loadData();
  }, []);

  const tasteVector = useMemo(() => {
    const perf = measurePerformance(
      () => recordManager.getTasteVector(),
      'getTasteVector'
    );
    return perf.result;
  }, [records]);

  const stats = useMemo(() => recordManager.getStats(), [records]);

  const recommendations = useMemo(() => {
    const perf = measurePerformance(
      () => calculateRecommendations(teaLibrary, tasteVector, records, 5),
      'calculateRecommendations'
    );
    setPerfMetrics(m => ({
      render: m ? m.render : 0,
      recommend: perf.durationMs
    }));
    if (perf.durationMs > 200) {
      console.warn(`[Performance Warning] 推荐计算耗时 ${perf.durationMs.toFixed(2)}ms，超过200ms阈值`);
    }
    return perf.result;
  }, [teaLibrary, tasteVector, records]);

  const userProfile = useMemo(() =>
    analyzeUserPreferences(records, tasteVector)
  , [records, tasteVector]);

  const handleSearchChange = useCallback((value: string) => {
    setForm(f => ({ ...f, teaName: value }));
    const matches = searchTeaLibrary(teaLibrary, value);
    setSuggestions(matches);
    setShowSuggestions(value.length > 0 && matches.length > 0);
  }, [teaLibrary]);

  const selectSuggestion = useCallback((s: { name: string; category: TeaCategory; origin: string; temp: number }) => {
    setForm(f => ({
      ...f,
      teaName: s.name,
      category: s.category,
      origin: s.origin,
      temperature: s.temp
    }));
    setShowSuggestions(false);
  }, []);

  const applyRecommendation = useCallback((tea: RecommendedTea) => {
    const fill = createQuickFill(tea);
    setForm({
      ...createEmptyForm(),
      teaName: fill.teaName,
      category: fill.category,
      origin: fill.origin,
      temperature: fill.temperature
    });
    if (!isLargeScreen) setFormCollapsed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isLargeScreen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teaName.trim() || !form.origin.trim()) return;

    const startRender = performance.now();

    if (editingId) {
      await updateRecordApi(editingId, form);
      recordManager.updateRecord(editingId, form);
      setEditingId(null);
    } else {
      await saveRecord(form);
      recordManager.addRecord(formToRecord(form));
    }

    setRecords(recordManager.getRecords());
    setForm(createEmptyForm());

    const renderDuration = performance.now() - startRender;
    setPerfMetrics(m => ({ render: renderDuration, recommend: m ? m.recommend : 0 }));

    if (renderDuration > 150) {
      console.warn(`[Performance Warning] 列表渲染耗时 ${renderDuration.toFixed(2)}ms，超过150ms阈值`);
    }
  }, [form, editingId]);

  const startEdit = useCallback((record: TastingRecord) => {
    if (!record.id) return;
    setForm(recordToForm(record));
    setEditingId(record.id);
    if (!isLargeScreen) setFormCollapsed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isLargeScreen]);

  const handleDelete = useCallback(async (recordId: string) => {
    await deleteHandler.triggerDelete(recordId);
  }, [deleteHandler]);

  const isDeleting = useCallback((id: string) =>
    deleteHandler.isDeleting(id) || deletingIds.has(id)
  , [deleteHandler, deletingIds]);

  const tempColor = useMemo(() =>
    getTemperatureColor(form.temperature)
  , [form.temperature]);

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
                    style={{
                      ...styles.suggestionItem,
                      borderLeft: `3px solid ${CATEGORY_COLORS[s.category]}`
                    }}
                    onClick={() => selectSuggestion(s)}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#FFFBF5'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = ''; }}
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
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
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
                  setForm(createEmptyForm());
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
    const isDeletingCard = record.id ? isDeleting(record.id) : false;
    return (
      <div
        key={record.id || idx}
        style={{
          ...styles.recordCard,
          animation: isDeletingCard
            ? 'slideOutLeft 0.3s ease forwards'
            : `slideUp 0.3s ease forwards`,
          animationDelay: isDeletingCard ? '0s' : getCardAnimationDelay(idx, 100),
          opacity: isDeletingCard ? undefined : 0
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
            <span
              style={{
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
        animationDelay: `${idx * 80}ms`,
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
        <div style={{ fontSize: 11, marginTop: 2 }}>匹配度 {Math.min(Math.round((tea.score / 10) * 100), 99)}%</div>
      </div>
      <div style={styles.recommendBody}>
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
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

  const renderBarChart = () => (
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
              style={{
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                transformOrigin: 'bottom',
                cursor: 'pointer'
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
          {perfMetrics && (
            <div style={{ ...styles.badge, borderColor: '#7CCD7C' }}>
              <div style={{ ...styles.badgeNum, color: '#3CB371', fontSize: 14 }}>
                {perfMetrics.recommend.toFixed(0)}ms
              </div>
              <div style={styles.badgeLabel}>推荐耗时</div>
            </div>
          )}
        </div>
      </header>

      {userProfile.topCategory && records.length >= 2 && (
        <div style={styles.profileBanner}>
          <span style={{ marginRight: 8 }}>🎯 品鉴标签：</span>
          <strong>{userProfile.tastingHabit}</strong>
          {userProfile.topOrigin && (
            <span style={{ margin: '0 12px' }}>· 偏爱 {userProfile.topOrigin} 产区</span>
          )}
          {userProfile.preferredFlavors.length > 0 && (
            <span>· 喜好 {userProfile.preferredFlavors.slice(0, 3).join('、')} 风味</span>
          )}
        </div>
      )}

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
                {renderBarChart()}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    padding: '20px 24px 40px',
    maxWidth: 1440,
    margin: '0 auto'
  },
  profileBanner: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #FFFBF5 0%, #FFF0E0 100%)',
    borderRadius: 10,
    border: '1px dashed #C4A882',
    marginBottom: 16,
    fontSize: 13,
    color: '#6B4226'
  },
  appHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #FFF8F0 0%, #F5E6D3 100%)',
    borderRadius: 12,
    border: '1px solid #C4A882',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 16
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: 12 },
  appTitle: { fontSize: 22, fontWeight: 700, color: '#4A3728', margin: 0 },
  appSubtitle: { fontSize: 12, color: '#8B7355', margin: '2px 0 0' },
  statsBadges: { display: 'flex', gap: 12, flexWrap: 'wrap' },
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
    gap: 20
  },

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
    minWidth: 240,
    maxWidth: 240,
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
