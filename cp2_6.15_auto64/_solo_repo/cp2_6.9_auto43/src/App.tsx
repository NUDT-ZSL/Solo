import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Timeline from './components/Timeline';
import type { Milestone, MonthInfo, Priority } from './types';

const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

const generateMonths = (): MonthInfo[] => {
  const now = new Date();
  const months: MonthInfo[] = [];

  for (let i = -6; i <= 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      label: MONTH_NAMES[date.getMonth()],
      yearLabel: String(date.getFullYear()),
    });
  }

  return months;
};

const App: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    existing: Milestone;
    incoming: Milestone;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [animatingCount, setAnimatingCount] = useState(false);
  const [animatingAvg, setAnimatingAvg] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const months = useMemo(() => generateMonths(), []);

  const dateRange = useMemo(() => {
    const start = new Date(months[0].year, months[0].month, 1);
    const end = new Date(months[months.length - 1].year, months[months.length - 1].month + 1, 0);
    return {
      min: start.toISOString().split('T')[0],
      max: end.toISOString().split('T')[0],
    };
  }, [months]);

  useEffect(() => {
    if (!newDate && months.length > 6) {
      const now = new Date();
      setNewDate(now.toISOString().split('T')[0]);
    }
  }, [months, newDate]);

  const averageProgress = useMemo(() => {
    if (milestones.length === 0) return 0;
    const sum = milestones.reduce((acc, m) => acc + m.progress, 0);
    return Math.round(sum / milestones.length);
  }, [milestones]);

  useEffect(() => {
    if (milestones.length > 0) {
      setAnimatingCount(true);
      const t1 = setTimeout(() => setAnimatingCount(false), 300);
      setAnimatingAvg(true);
      const t2 = setTimeout(() => setAnimatingAvg(false), 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [milestones.length, averageProgress]);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  }, []);

  const handleAddMilestone = () => {
    if (!newTitle.trim()) {
      showNotification('请输入任务标题');
      return;
    }
    if (!newDate) {
      showNotification('请选择日期');
      return;
    }

    const conflict = milestones.find((m) => m.date === newDate);
    if (conflict) {
      showNotification(`该日期已有任务：${conflict.title}`);
      return;
    }

    const newMilestone: Milestone = {
      id: uuidv4(),
      title: newTitle.trim().slice(0, 30),
      date: newDate,
      priority: newPriority,
      progress: 0,
    };

    setMilestones((prev) => [...prev, newMilestone]);
    setNewTitle('');
    setNewPriority('medium');
    setShowModal(false);
    showNotification('任务添加成功');
  };

  const handleProgressChange = useCallback((id: string, progress: number) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, progress } : m))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    showNotification('任务已删除');
  }, [showNotification]);

  const handleMilestoneUpdate = useCallback((updated: Milestone[]) => {
    setMilestones(updated);
  }, []);

  const handleConflict = useCallback(
    (existing: Milestone, incoming: Milestone): Promise<boolean> => {
      return new Promise((resolve) => {
        setConflictInfo({ existing, incoming, resolve });
        setShowConflictDialog(true);
      });
    },
    []
  );

  const resolveConflict = (shouldMove: boolean) => {
    if (conflictInfo) {
      conflictInfo.resolve(shouldMove);
      if (shouldMove) {
        setMilestones((prev) => prev.filter((m) => m.id !== conflictInfo.existing.id));
        showNotification('已覆盖原有任务');
      }
    }
    setShowConflictDialog(false);
    setConflictInfo(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部导航栏 */}
      <nav
        style={{
          background: 'linear-gradient(135deg, #2c3e50, #34495e)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              backgroundColor: '#3498db',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.2s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2980b9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3498db';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            添加新任务
          </button>
        </div>

        <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, margin: 0, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          时间线编辑器
        </h1>

        <button
          onClick={() => setShowHelp(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#ecf0f1',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </nav>

      {/* 主内容区 */}
      <main style={{ flex: 1, padding: '24px 0', position: 'relative' }}>
        <Timeline
          milestones={milestones}
          months={months}
          onMilestoneUpdate={handleMilestoneUpdate}
          onProgressChange={handleProgressChange}
          onDelete={handleDelete}
          onConflict={handleConflict}
        />

        {/* 信息浮层 */}
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '12px 24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            zIndex: 40,
            border: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span style={{ fontSize: '14px', color: '#666' }}>
              任务总数:{' '}
              <strong
                className={animatingCount ? 'animate-number-jump' : ''}
                style={{ color: '#333', fontSize: '16px' }}
              >
                {milestones.length}
              </strong>
            </span>
          </div>
          <div style={{ width: '1px', height: '20px', backgroundColor: '#ddd' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span style={{ fontSize: '14px', color: '#666' }}>
              平均完成度:{' '}
              <strong
                className={animatingAvg ? 'animate-number-jump' : ''}
                style={{ color: '#27ae60', fontSize: '16px' }}
              >
                {averageProgress}%
              </strong>
            </span>
          </div>
        </div>
      </main>

      {/* 添加任务模态框 */}
      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 100,
            }}
          />
          <div
            className="animate-slide-in"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '28px',
              width: '90%',
              maxWidth: '420px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              zIndex: 101,
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#333' }}>
              添加新任务
            </h2>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#555', marginBottom: '8px' }}>
                任务标题
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value.slice(0, 30))}
                placeholder="最多输入30个字符..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#3498db';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#ddd';
                }}
              />
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
                {newTitle.length}/30
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#555', marginBottom: '8px' }}>
                选择日期
              </label>
              <input
                type="date"
                value={newDate}
                min={dateRange.min}
                max={dateRange.max}
                onChange={(e) => setNewDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#3498db';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#ddd';
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#555', marginBottom: '8px' }}>
                优先级
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = '#3498db';
                }}
                onBlur={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = '#ddd';
                }}
              >
                <option value="high">🔴 高优先级</option>
                <option value="medium">🟠 中优先级</option>
                <option value="low">🟢 低优先级</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  color: '#555',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
                }}
              >
                取消
              </button>
              <button
                onClick={handleAddMilestone}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#3498db',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2980b9';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3498db';
                }}
              >
                确认添加
              </button>
            </div>
          </div>
        </>
      )}

      {/* 冲突确认框 */}
      {showConflictDialog && conflictInfo && (
        <>
          <div
            onClick={() => resolveConflict(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 110,
            }}
          />
          <div
            className="animate-slide-in"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '28px',
              width: '90%',
              maxWidth: '380px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              zIndex: 111,
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fdf2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#333', textAlign: 'center' }}>
              日期冲突
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>
              该日期已有任务：
            </p>
            <p style={{ fontSize: '14px', color: '#333', fontWeight: 500, marginBottom: '24px', textAlign: 'center', padding: '8px 12px', backgroundColor: '#f5f6fa', borderRadius: '8px' }}>
              {conflictInfo.existing.title}
            </p>
            <p style={{ fontSize: '13px', color: '#777', marginBottom: '24px', textAlign: 'center' }}>
              是否覆盖原有任务？
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => resolveConflict(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  color: '#555',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                取消移动
              </button>
              <button
                onClick={() => resolveConflict(true)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#e74c3c',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                覆盖
              </button>
            </div>
          </div>
        </>
      )}

      {/* 帮助弹窗 */}
      {showHelp && (
        <>
          <div
            onClick={() => setShowHelp(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 120,
            }}
          />
          <div
            className="animate-slide-in"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '28px',
              width: '90%',
              maxWidth: '460px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              zIndex: 121,
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', color: '#333' }}>
              使用帮助
            </h2>
            <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.8 }}>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#333' }}>📌 添加任务：</strong>
                <br />
                点击左上角"添加新任务"按钮，填写标题、选择日期和优先级。
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#333' }}>🎯 拖拽排序：</strong>
                <br />
                按住卡片左侧的灰色手柄，可将任务拖动到其他月份。拖拽时卡片会跟随鼠标移动。
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#333' }}>📊 调整进度：</strong>
                <br />
                点击卡片右下角的进度百分比数字，可通过滑块调整任务完成度（0-100%）。
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#333' }}>🗑️ 删除任务：</strong>
                <br />
                点击卡片右上角的垃圾桶图标可删除任务。
              </div>
              <div>
                <strong style={{ color: '#333' }}>🎨 优先级颜色：</strong>
                <br />
                <span style={{ color: '#e74c3c' }}>●</span> 高优先级 &nbsp;
                <span style={{ color: '#f39c12' }}>●</span> 中优先级 &nbsp;
                <span style={{ color: '#27ae60' }}>●</span> 低优先级
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#3498db',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              知道了
            </button>
          </div>
        </>
      )}

      {/* 通知提示 */}
      {notification && (
        <div
          className="animate-slide-in"
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            backgroundColor: '#2c3e50',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            fontSize: '14px',
            zIndex: 200,
          }}
        >
          {notification}
        </div>
      )}
    </div>
  );
};

export default App;
