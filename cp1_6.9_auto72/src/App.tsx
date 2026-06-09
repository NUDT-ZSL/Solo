import { useState, useEffect, useCallback } from 'react';
import { ClimateData, TreeRecord } from './types';
import { api } from './utils/api';
import { formatDate } from './utils/treeGenerator';
import TreeTimeline from './components/TreeTimeline';
import TreeCard from './components/TreeCard';

export default function App() {
  const [treeList, setTreeList] = useState<TreeRecord[]>([]);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [todayDate, setTodayDate] = useState<string>(formatDate(new Date()));
  const [showCard, setShowCard] = useState(false);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const res = await api.getAllTrees();
    if (res.success && res.data) {
      setTreeList(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setTodayDate(formatDate(new Date()));
    fetchAll();
  }, [fetchAll]);

  const currentRecord = currentDate
    ? treeList.find((t) => t.date === currentDate) || null
    : null;

  const handleSelectDate = (date: string) => {
    setCurrentDate(date);
    setShowCard(true);
  };

  const handleCloseCard = () => {
    setShowCard(false);
  };

  const handleAddToday = () => {
    setCurrentDate(null);
    setShowCard(true);
  };

  const handleSubmit = async (
    climate: ClimateData,
    isUpdate: boolean,
    date?: string
  ): Promise<boolean> => {
    let res;
    if (isUpdate && date) {
      res = await api.updateTree(date, climate);
    } else {
      res = await api.createTree(climate);
    }
    if (res.success && res.data) {
      const newRecord = res.data;
      setTreeList((prev) => {
        const idx = prev.findIndex((t) => t.date === newRecord.date);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newRecord;
          return next.sort((a, b) => a.date.localeCompare(b.date));
        }
        return [...prev, newRecord].sort((a, b) => a.date.localeCompare(b.date));
      });
      setCurrentDate(newRecord.date);
      return true;
    }
    return false;
  };

  const handleDelete = async (date: string) => {
    setDeletingDate(date);
    setTimeout(async () => {
      const res = await api.deleteTree(date);
      if (res.success) {
        setTreeList((prev) => prev.filter((t) => t.date !== date));
        setShowCard(false);
        setCurrentDate(null);
      }
      setDeletingDate(null);
    }, 500);
  };

  const todayRecorded = treeList.some((t) => t.date === todayDate);

  return (
    <div className="app-root">
      <div className="app-bg" />
      <div className="stars" />

      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-icon">🌲</span>
            <h1 className="brand-title">气候年轮</h1>
            <span className="brand-sub">Climate Rings</span>
          </div>
          <div className="header-actions">
            <div className="today-info">
              <span className="today-date">📅 {todayDate}</span>
              {todayRecorded ? (
                <span className="today-status recorded">✓ 今日已记录</span>
              ) : (
                <span className="today-status pending">● 今日待记录</span>
              )}
            </div>
            <button className="btn btn-primary add-btn" onClick={handleAddToday}>
              {todayRecorded ? '🌿 查看/编辑今日' : '🌱 记录今日'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="timeline-section glass-panel">
          <TreeTimeline
            treeList={treeList}
            currentDate={currentDate}
            onSelectDate={handleSelectDate}
            deletingDate={deletingDate}
          />
          {loading && treeList.length === 0 && (
            <div className="loading-hint">加载中...</div>
          )}
          {!loading && treeList.length === 0 && (
            <div className="empty-hint">
              <div className="empty-tree">🌱</div>
              <p>年轮还是空白的</p>
              <p className="empty-sub">点击右上角「记录今日」开始你的第一棵树</p>
            </div>
          )}
        </section>

        <section className="info-section">
          <div className="info-card glass-panel">
            <h3 className="info-title">📖 如何使用</h3>
            <ul className="info-list">
              <li>
                <b>温度：</b>决定树干粗度，越高树干越粗壮（5~20px）
              </li>
              <li>
                <b>湿度：</b>决定分支角度，越高枝条越下垂（20°~-60°）
              </li>
              <li>
                <b>风速：</b>决定叶片密度，风越大叶子越少（80~10片）
              </li>
              <li>
                <b>光照：</b>决定叶片颜色，从深绿(#2D5A27)到亮绿(#8FCF4E)
              </li>
            </ul>
          </div>
          <div className="info-card glass-panel stats-card">
            <h3 className="info-title">📊 统计</h3>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-num">{treeList.length}</div>
                <div className="stat-label">总记录</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">
                  {treeList.length > 0
                    ? Math.round(
                        treeList.reduce((s, t) => s + t.climate.temperature, 0) /
                          treeList.length
                      ) + '°C'
                    : '-'}
                </div>
                <div className="stat-label">平均温度</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">
                  {treeList.length > 0
                    ? Math.round(
                        treeList.reduce((s, t) => s + t.climate.humidity, 0) /
                          treeList.length
                      ) + '%'
                    : '-'}
                </div>
                <div className="stat-label">平均湿度</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">
                  {todayRecorded ? '🌳' : '🌱'}
                </div>
                <div className="stat-label">今日状态</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>🌲 记录每一天的微气候，让时间生长成森林 🌲</p>
      </footer>

      {showCard && (
        <TreeCard
          record={currentRecord}
          todayDate={todayDate}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onClose={handleCloseCard}
        />
      )}
    </div>
  );
}
