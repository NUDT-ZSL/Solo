import React, { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { BatchCard } from './BatchCard';
import { RoastPage } from './RoastPage';
import './styles.css';

function AddBatchForm() {
  const { addBatch } = useStore();
  const [form, setForm] = useState({
    origin: '',
    farm: '',
    process: '',
    altitude: '',
    weight: '',
    purchaseDate: '',
  });
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addBatch({
      origin: form.origin,
      farm: form.farm,
      process: form.process,
      altitude: form.altitude,
      weight: parseFloat(form.weight) || 0,
      purchaseDate: form.purchaseDate,
    });
    setForm({ origin: '', farm: '', process: '', altitude: '', weight: '', purchaseDate: '' });
    setOpen(false);
  };

  return (
    <div className="add-batch-wrapper">
      <button className="btn-primary" onClick={() => setOpen(!open)}>
        {open ? '收起' : '+ 添加生豆批次'}
      </button>
      {open && (
        <form className="add-batch-form" onSubmit={handleSubmit}>
          <input placeholder="产地（如：埃塞俄比亚）" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} required />
          <input placeholder="庄园" value={form.farm} onChange={e => setForm({ ...form, farm: e.target.value })} required />
          <input placeholder="处理法（如：水洗）" value={form.process} onChange={e => setForm({ ...form, process: e.target.value })} required />
          <input placeholder="海拔（如：1800m）" value={form.altitude} onChange={e => setForm({ ...form, altitude: e.target.value })} required />
          <input type="number" step="0.1" placeholder="生豆重量（kg）" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} required />
          <input type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} required />
          <button type="submit" className="btn-primary">确认添加</button>
        </form>
      )}
    </div>
  );
}

function CollectionPanel() {
  const { state, toggleCollect } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const collected = state.labels.filter(l => l.isCollected);

  const handleCopy = () => {
    setToast(true);
    setTimeout(() => setToast(false), 300);
  };

  return (
    <div className="collection-panel">
      <h3>我的收藏</h3>
      <div className="collection-grid">
        {collected.map(label => (
          <div key={label.id} className="collection-item" onClick={() => setExpanded(expanded === label.id ? null : label.id)}>
            <div className="mini-badge" style={{
              background: `linear-gradient(135deg, #FF9800, #F44336)`,
            }}>
              <span className="mini-badge-name">{label.coffeeName}</span>
            </div>
            {expanded === label.id && (
              <div className="collection-detail">
                <p>关键词：{label.keywords.join('、')}</p>
                <p>评分：{label.overallScore.toFixed(1)}</p>
                <button className="btn-secondary" onClick={e => { e.stopPropagation(); handleCopy(); }}>
                  复制分享链接
                </button>
              </div>
            )}
          </div>
        ))}
        {collected.length === 0 && <p className="empty-hint">暂无收藏</p>}
      </div>
      {toast && <div className="toast">链接已复制</div>}
    </div>
  );
}

function AppContent() {
  const { state, selectBatch, setDrawer } = useStore();
  const selectedBatch = state.batches.find(b => b.id === state.selectedBatchId);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">☕ RoastTracker</h1>
        <button className="hamburger" onClick={() => setDrawer(!state.drawerOpen)}>☰</button>
      </header>
      <div className="app-body">
        <aside className={`batch-panel ${state.drawerOpen ? 'drawer-open' : ''}`}>
          <AddBatchForm />
          <div className="batch-list">
            {state.batches.map(batch => (
              <BatchCard
                key={batch.id}
                batch={batch}
                selected={batch.id === state.selectedBatchId}
                onSelect={() => selectBatch(batch.id === state.selectedBatchId ? null : batch.id)}
              />
            ))}
            {state.batches.length === 0 && <p className="empty-hint">暂无生豆批次，请添加</p>}
          </div>
          <CollectionPanel />
        </aside>
        <main className="roast-panel">
          {selectedBatch ? (
            <RoastPage batch={selectedBatch} />
          ) : (
            <div className="roast-placeholder">
              <span className="placeholder-icon">🔥</span>
              <p>请从左侧选择一个生豆批次开始烘焙记录</p>
            </div>
          )}
        </main>
      </div>
      <div className={`drawer-overlay ${state.drawerOpen ? 'visible' : ''}`} onClick={() => setDrawer(false)} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
