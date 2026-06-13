import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { projectApi, memberApi, scheduleApi, Project, Member, ScheduleSlot } from '../utils/api';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const TIME_SLOTS = 8;
const SLOT_HEIGHT = 80;
const BLOCK_SIZE = 48;

const PART_COLORS: Record<string, string> = {
  '第一小提琴': '#f59e0b',
  '第二小提琴': '#f59e0b',
  '小提琴': '#f59e0b',
  '大提琴': '#10b981',
  '低音提琴': '#ef4444',
  '中提琴': '#8b5cf6',
  '长笛': '#06b6d4',
  '双簧管': '#ec4899',
  '单簧管': '#14b8a6',
  '大管': '#6366f1',
  '圆号': '#f97316',
  '小号': '#eab308',
  '长号': '#84cc16',
  '大号': '#22c55e',
  '打击乐': '#dc2626',
};

const getPartColor = (part: string): string => {
  return PART_COLORS[part] || '#6b7280';
};

const getPartShortName = (part: string): string => {
  const map: Record<string, string> = {
    '第一小提琴': '小提1',
    '第二小提琴': '小提2',
    '小提琴': '小提',
    '大提琴': '大提',
    '低音提琴': '低音',
    '中提琴': '中提',
    '长笛': '长笛',
    '双簧管': '双簧',
    '单簧管': '单簧',
    '大管': '大管',
    '圆号': '圆号',
    '小号': '小号',
    '长号': '长号',
    '大号': '大号',
    '打击乐': '打击',
  };
  return map[part] || part.slice(0, 2);
};

export default function Schedule() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [draggingItem, setDraggingItem] = useState<ScheduleSlot | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number; timeSlot: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadSchedule();
    }
  }, [selectedProjectId]);

  const loadData = async () => {
    try {
      const [projectsRes, membersRes] = await Promise.all([
        projectApi.getAll(),
        memberApi.getAll(),
      ]);
      setProjects(projectsRes.data);
      setMembers(membersRes.data);
      if (projectsRes.data.length > 0) {
        setSelectedProjectId(projectsRes.data[0].id);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const loadSchedule = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await scheduleApi.get(selectedProjectId);
      let scheduleData = res.data;

      if (scheduleData.length === 0) {
        const project = projects.find((p) => p.id === selectedProjectId);
        if (project) {
          const confirmedMembers: Array<{ memberId: string; part: string }> = [];
          project.tracks.forEach((track) => {
            track.assignments.forEach((a) => {
              if (a.status === 'confirmed') {
                const exists = confirmedMembers.some(
                  (m) => m.memberId === a.memberId && m.part === a.part
                );
                if (!exists) {
                  confirmedMembers.push({ memberId: a.memberId, part: a.part });
                }
              }
            });
          });

          scheduleData = confirmedMembers.map((m, idx) => ({
            id: uuidv4(),
            dayIndex: idx % 7,
            timeSlot: Math.floor(idx / 7) % TIME_SLOTS,
            memberId: m.memberId,
            part: m.part,
            projectId: selectedProjectId,
          }));

          await scheduleApi.update(selectedProjectId, scheduleData);
        }
      }

      setSchedule(scheduleData);
    } catch (e) {
      console.error('Failed to load schedule:', e);
    }
  };

  const saveSchedule = useCallback(async (newSchedule: ScheduleSlot[]) => {
    if (!selectedProjectId) return;
    try {
      await scheduleApi.update(selectedProjectId, newSchedule);
    } catch (e) {
      console.error('Failed to save schedule:', e);
    }
  }, [selectedProjectId]);

  const checkCollision = (slot: ScheduleSlot, excludeId?: string): boolean => {
    return schedule.some(
      (s) =>
        s.id !== excludeId &&
        s.dayIndex === slot.dayIndex &&
        s.timeSlot === slot.timeSlot
    );
  };

  const getSlotPosition = (dayIndex: number, timeSlot: number) => {
    if (!scheduleRef.current) return null;
    const cellWidth = scheduleRef.current.offsetWidth / 8;
    const x = 80 + dayIndex * cellWidth + (cellWidth - BLOCK_SIZE) / 2;
    const y = 40 + timeSlot * SLOT_HEIGHT + (SLOT_HEIGHT - BLOCK_SIZE) / 2;
    return { x, y, cellWidth };
  };

  const handleMouseDown = (e: React.MouseEvent, item: ScheduleSlot) => {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggingItem(item);
    setIsDragging(true);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingItem || !scheduleRef.current) return;

    setDragPosition({ x: e.clientX, y: e.clientY });

    const rect = scheduleRef.current.getBoundingClientRect();
    const cellWidth = (rect.width - 80) / 7;
    const x = e.clientX - rect.left - 80;
    const y = e.clientY - rect.top - 40;

    const dayIndex = Math.floor(x / cellWidth);
    const timeSlot = Math.floor(y / SLOT_HEIGHT);

    if (dayIndex >= 0 && dayIndex < 7 && timeSlot >= 0 && timeSlot < TIME_SLOTS) {
      setDragOverSlot({ dayIndex, timeSlot });
    } else {
      setDragOverSlot(null);
    }
  }, [draggingItem]);

  const handleMouseUp = useCallback(() => {
    if (!draggingItem || !dragOverSlot) {
      setDraggingItem(null);
      setIsDragging(false);
      setDragOverSlot(null);
      return;
    }

    const newSlot: ScheduleSlot = {
      ...draggingItem,
      dayIndex: dragOverSlot.dayIndex,
      timeSlot: dragOverSlot.timeSlot,
    };

    if (!checkCollision(newSlot, draggingItem.id)) {
      const newSchedule = schedule.map((s) =>
        s.id === draggingItem.id ? newSlot : s
      );
      setSchedule(newSchedule);
      saveSchedule(newSchedule);
    }

    setDraggingItem(null);
    setIsDragging(false);
    setDragOverSlot(null);
  }, [draggingItem, dragOverSlot, schedule, saveSchedule]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name || id;

  const renderDraggingItem = () => {
    if (!draggingItem) return null;
    return (
      <div
        className="member-block dragging"
        style={{
          position: 'fixed',
          left: dragPosition.x - dragOffset.x,
          top: dragPosition.y - dragOffset.y,
          background: getPartColor(draggingItem.part),
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        {getPartShortName(draggingItem.part)}
      </div>
    );
  };

  const renderBlock = (item: ScheduleSlot) => {
    const pos = getSlotPosition(item.dayIndex, item.timeSlot);
    if (!pos) return null;

    return (
      <div
        key={item.id}
        className={`member-block ${draggingItem?.id === item.id ? 'dragging' : ''}`}
        style={{
          left: pos.x,
          top: pos.y,
          background: getPartColor(item.part),
          display: draggingItem?.id === item.id ? 'none' : 'flex',
        }}
        onMouseDown={(e) => handleMouseDown(e, item)}
        title={`${getMemberName(item.memberId)} - ${item.part}`}
      >
        {getPartShortName(item.part)}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">排练时间表</h1>
            <p className="page-subtitle">拖拽彩色方块调整排练时间，避免重叠冲突</p>
          </div>
          <div className="flex gap-2">
            <select
              className="form-select"
              style={{ width: '200px' }}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
            {projects.find((p) => p.id === selectedProjectId)?.title}
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {Object.entries(PART_COLORS).slice(0, 6).map(([part, color]) => (
              <div key={part} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    background: color,
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {getPartShortName(part)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="schedule-container" ref={scheduleRef}>
          <div className="schedule-grid">
            <div className="schedule-header"></div>
            {DAYS.map((day, idx) => (
              <div key={idx} className="schedule-header">{day}</div>
            ))}

            {Array.from({ length: TIME_SLOTS }).map((_, timeIdx) => (
              <>
                <div key={`time-${timeIdx}`} className="schedule-time-label">
                  {String(9 + timeIdx * 1.5).padStart(2, '0')}:00
                </div>
                {DAYS.map((_, dayIdx) => (
                  <div
                    key={`slot-${dayIdx}-${timeIdx}`}
                    className={`schedule-slot ${
                      dragOverSlot?.dayIndex === dayIdx && dragOverSlot?.timeSlot === timeIdx
                        ? 'drag-over'
                        : ''
                    }`}
                    style={{
                      background: dragOverSlot?.dayIndex === dayIdx && dragOverSlot?.timeSlot === timeIdx
                        ? draggingItem && checkCollision(
                            { ...draggingItem, dayIndex: dayIdx, timeSlot: timeIdx },
                            draggingItem.id
                          )
                          ? '#7f1d1d'
                          : '#065f46'
                        : undefined,
                    }}
                  />
                ))}
              </>
            ))}
          </div>

          <div style={{ position: 'relative', marginTop: '-8px' }}>
            {schedule.map((item) => renderBlock(item))}
          </div>
        </div>

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>已分配成员</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {schedule.map((item) => (
              <span key={item.id} className="badge badge-info">
                {getMemberName(item.memberId)} ({item.part}) - {DAYS[item.dayIndex]} {String(9 + item.timeSlot * 1.5).padStart(2, '0')}:00
              </span>
            ))}
          </div>
        </div>
      </div>

      {renderDraggingItem()}
    </div>
  );
}
