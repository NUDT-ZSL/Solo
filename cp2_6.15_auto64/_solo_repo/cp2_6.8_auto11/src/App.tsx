import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { createTimeline } from './TimelineChart';
import type { TimelineEvent } from './types';
import { COLOR_PALETTE } from './types';

type TimelineInstance = ReturnType<typeof createTimeline> | null;

const DEFAULT_EVENTS: TimelineEvent[] = [
  {
    id: '1',
    name: '项目启动',
    date: '2023-01-15',
    description: '项目正式立项，团队组建完成，开始需求调研和架构设计工作。',
    color: '#64b5f6',
  },
  {
    id: '2',
    name: '需求评审',
    date: '2023-03-20',
    description: '完成产品需求文档评审，确定第一阶段功能范围和优先级。',
    color: '#ffb74d',
  },
  {
    id: '3',
    name: 'Alpha版本发布',
    date: '2023-07-05',
    description: '第一个内部测试版本发布，核心功能完成开发，开始内部测试。',
    color: '#81c784',
  },
  {
    id: '4',
    name: '用户测试',
    date: '2023-09-12',
    description: '邀请首批种子用户进行封闭测试，收集反馈意见。',
    color: '#ba68c8',
  },
  {
    id: '5',
    name: '正式上线',
    date: '2024-02-28',
    description: '产品1.0版本正式发布，面向所有用户开放注册和使用。',
    color: '#e57373',
  },
  {
    id: '6',
    name: '2.0版本规划',
    date: '2024-06-18',
    description: '基于用户反馈启动2.0版本规划，增加高级功能和性能优化。',
    color: '#4dd0e1',
  },
];

interface TooltipState {
  eventId: string;
  x: number;
  y: number;
}

interface ContextMenuState {
  eventId: string;
  x: number;
  y: number;
}

export default function App() {
  const [events, setEvents] = useState<TimelineEvent[]>(DEFAULT_EVENTS);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterColor, setFilterColor] = useState<string>('all');

  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState(COLOR_PALETTE[0].color);

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    date: '',
    description: '',
    color: COLOR_PALETTE[0].color,
  });

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<TimelineInstance>(null);
  const appRef = useRef<HTMLDivElement>(null);

  const filteredIds = useMemo(() => {
    if (filterYear === 'all' && filterColor === 'all') return new Set<string>();
    const ids = new Set<string>();
    events.forEach((e) => {
      const yearMatch = filterYear === 'all' || e.date.startsWith(filterYear);
      const colorMatch = filterColor === 'all' || e.color === filterColor;
      if (yearMatch && colorMatch) ids.add(e.id);
    });
    return ids;
  }, [events, filterYear, filterColor]);

  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    events.forEach((e) => years.add(e.date.slice(0, 4)));
    return Array.from(years).sort();
  }, [events]);

  const selectedEvent = useMemo(() => {
    if (!tooltip) return null;
    return events.find((e) => e.id === tooltip.eventId) || null;
  }, [tooltip, events]);

  const initChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const instance = createTimeline(chartContainerRef.current, events, {
      onEventClick: (id, x, y) => {
        setSelectedEventId(id);
        setContextMenu(null);
        setTooltip({ eventId: id, x, y });
      },
      onEventContextMenu: (id, x, y) => {
        setSelectedEventId(id);
        setTooltip(null);
        setContextMenu({ eventId: id, x, y });
      },
      onBackgroundClick: () => {
        setSelectedEventId(null);
        setTooltip(null);
        setContextMenu(null);
      },
    });

    chartRef.current = instance;
  }, [events]);

  useEffect(() => {
    initChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.cleanup();
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update(events);
    }
  }, [events]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.updateFilter(filteredIds);
    }
  }, [filteredIds]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.updateSelected(selectedEventId);
    }
  }, [selectedEventId]);

  const handleAddEvent = useCallback(() => {
    if (!formName.trim() || !formDate) return;

    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      name: formName.trim(),
      date: formDate,
      description: formDesc.trim(),
      color: formColor,
    };

    setEvents((prev) => [...prev, newEvent]);
    setFormName('');
    setFormDesc('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormColor(COLOR_PALETTE[0].color);
    setShowMobileMenu(false);
  }, [formName, formDate, formDesc, formColor]);

  const handleDeleteConfirm = useCallback(() => {
    if (!pendingDeleteId) return;
    setEvents((prev) => prev.filter((e) => e.id !== pendingDeleteId));
    setPendingDeleteId(null);
    setTooltip(null);
    setContextMenu(null);
    setSelectedEventId(null);
    setEditingEvent(null);
  }, [pendingDeleteId]);

  const handleEditSave = useCallback(() => {
    if (!editingEvent || !editForm.name.trim() || !editForm.date) return;
    setEvents((prev) =>
      prev.map((e) =>
        e.id === editingEvent.id
          ? {
              ...e,
              name: editForm.name.trim(),
              date: editForm.date,
              description: editForm.description.trim(),
              color: editForm.color,
            }
          : e,
      ),
    );
    setEditingEvent(null);
    setTooltip(null);
    setContextMenu(null);
  }, [editingEvent, editForm]);

  const openEditModal = useCallback((event: TimelineEvent) => {
    setEditingEvent(event);
    setEditForm({
      name: event.name,
      date: event.date,
      description: event.description,
      color: event.color,
    });
    setContextMenu(null);
    setTooltip(null);
  }, []);

  const openDeleteConfirm = useCallback((id: string) => {
    setPendingDeleteId(id);
    setContextMenu(null);
    setTooltip(null);
  }, []);

  const handleExport = useCallback(async () => {
    if (!appRef.current) return;

    try {
      const canvas = await html2canvas(appRef.current, {
        backgroundColor: '#f7f9fc',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `timeline-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    }
  }, []);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="app-container" ref={appRef}>
      <header className="header">
        <div className="header-top">
          <div className="app-title">📅 交互式时间线</div>
          <button
            className="hamburger-btn"
            onClick={() => setShowMobileMenu((v) => !v)}
            aria-label="菜单"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className="header-row">
          <div className="app-title" style={{ display: 'none' }}>📅 交互式时间线</div>

          <div className="form-group">
            <label className="form-label">名称</label>
            <input
              type="text"
              className="form-input"
              placeholder="事件名称"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">日期</label>
            <input
              type="date"
              className="form-input"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea
              className="form-textarea"
              placeholder="事件描述"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">颜色</label>
            <div className="color-picker">
              {COLOR_PALETTE.map((c) => (
                <div
                  key={c.color}
                  className={`color-option ${formColor === c.color ? 'active' : ''}`}
                  style={{ background: c.color }}
                  title={c.label}
                  onClick={() => setFormColor(c.color)}
                />
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleAddEvent}>
            + 添加
          </button>

          <div className="divider" />

          <div className="form-group">
            <label className="form-label">年份</label>
            <select
              className="form-select"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="all">全部年份</option>
              {uniqueYears.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">标签</label>
            <select
              className="form-select"
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
            >
              <option value="all">全部颜色</option>
              {COLOR_PALETTE.map((c) => (
                <option key={c.color} value={c.color}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-secondary" onClick={handleExport}>
            📷 导出PNG
          </button>
        </div>

        <div className={`mobile-menu ${showMobileMenu ? '' : 'hidden'}`}>
          <div className="mobile-form-group">
            <label className="form-label">事件名称</label>
            <input
              type="text"
              className="form-input"
              placeholder="事件名称"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          <div className="mobile-form-group">
            <label className="form-label">日期</label>
            <input
              type="date"
              className="form-input"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>
          <div className="mobile-form-group">
            <label className="form-label">描述</label>
            <textarea
              className="form-textarea"
              placeholder="事件描述"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>
          <div className="mobile-form-group">
            <label className="form-label">颜色标签</label>
            <div className="mobile-color-picker">
              {COLOR_PALETTE.map((c) => (
                <div
                  key={c.color}
                  className={`color-option ${formColor === c.color ? 'active' : ''}`}
                  style={{ background: c.color }}
                  title={c.label}
                  onClick={() => setFormColor(c.color)}
                />
              ))}
            </div>
          </div>
          <div className="mobile-buttons">
            <button className="btn btn-primary" onClick={handleAddEvent}>
              + 添加事件
            </button>
          </div>

          <div className="mobile-divider" />

          <div className="mobile-form-group">
            <label className="form-label">筛选</label>
            <div className="mobile-filter-row">
              <select
                className="form-select"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="all">全部年份</option>
                {uniqueYears.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
              <select
                className="form-select"
                value={filterColor}
                onChange={(e) => setFilterColor(e.target.value)}
              >
                <option value="all">全部颜色</option>
                {COLOR_PALETTE.map((c) => (
                  <option key={c.color} value={c.color}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mobile-buttons">
            <button className="btn btn-secondary" onClick={handleExport}>
              📷 导出PNG
            </button>
          </div>
        </div>
      </header>

      <div className="timeline-container" ref={chartContainerRef}>
        <div className="legend">
          {COLOR_PALETTE.map((c) => (
            <div key={c.color} className="legend-item">
              <span className="legend-color" style={{ background: c.color }} />
              <span>{c.label}</span>
            </div>
          ))}
        </div>

        {tooltip && selectedEvent && (
          <div
            className="tooltip"
            style={{
              left: Math.min(tooltip.x + 16, (chartContainerRef.current?.clientWidth || 0) - 340),
              top: Math.max(
                10,
                Math.min(tooltip.y + 16, (chartContainerRef.current?.clientHeight || 500) - 200),
              ),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tooltip-header">
              <span className="tooltip-color" style={{ background: selectedEvent.color }} />
              <span className="tooltip-name">{selectedEvent.name}</span>
            </div>
            <div className="tooltip-date">{formatDate(selectedEvent.date)}</div>
            {selectedEvent.description && (
              <div className="tooltip-desc">{selectedEvent.description}</div>
            )}
            <div className="tooltip-actions">
              <button className="btn btn-secondary" onClick={() => openEditModal(selectedEvent)}>
                编辑
              </button>
              <button
                className="btn btn-danger"
                onClick={() => openDeleteConfirm(selectedEvent.id)}
              >
                删除
              </button>
            </div>
          </div>
        )}

        {contextMenu && (
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="context-menu-item"
              onClick={() => {
                const ev = events.find((e) => e.id === contextMenu.eventId);
                if (ev) openEditModal(ev);
              }}
            >
              ✏️ 编辑事件
            </div>
            <div
              className="context-menu-item danger"
              onClick={() => openDeleteConfirm(contextMenu.eventId)}
            >
              🗑️ 删除事件
            </div>
          </div>
        )}
      </div>

      {editingEvent && (
        <div className="modal-overlay" onClick={() => setEditingEvent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">编辑事件</div>
            <div className="modal-form">
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                  事件名称
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                  日期
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                  描述
                </label>
                <textarea
                  className="form-textarea"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>
                  颜色标签
                </label>
                <div className="color-picker">
                  {COLOR_PALETTE.map((c) => (
                    <div
                      key={c.color}
                      className={`color-option ${editForm.color === c.color ? 'active' : ''}`}
                      style={{ background: c.color }}
                      title={c.label}
                      onClick={() => setEditForm({ ...editForm, color: c.color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditingEvent(null)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleEditSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteId && (
        <div className="modal-overlay" onClick={() => setPendingDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">确认删除</div>
            <div style={{ color: '#546e7a', fontSize: 14, lineHeight: 1.6 }}>
              确定要删除这个事件吗？此操作无法撤销。
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPendingDeleteId(null)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
