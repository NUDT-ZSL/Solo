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

const getPartColor = (part: string): string => PART_COLORS[part] || '#6b7280';

const getPartShortName = (part: string): string => {
  const map: Record<string, string> = {
    '第一小提琴': '小提1', '第二小提琴': '小提2', '小提琴': '小提',
    '大提琴': '大提', '低音提琴': '低音', '中提琴': '中提',
    '长笛': '长笛', '双簧管': '双簧', '单簧管': '单簧',
    '大管': '大管', '圆号': '圆号', '小号': '小号',
    '长号': '长号', '大号': '大号', '打击乐': '打击',
  };
  return map[part] || part.slice(0, 2);
};

interface BlockState {
  slot: ScheduleSlot;
  x: number;
  y: number;
  animating: boolean;
}

export default function Schedule() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [blocks, setBlocks] = useState<BlockState[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragCurrentPos, setDragCurrentPos] = useState({ x: 0, y: 0 });
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number; timeSlot: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) loadSchedule();
  }, [selectedProjectId]);

  useEffect(() => {
    updateBlockPositions(schedule, false);
  }, [schedule]);

  const updateBlockPositions = useCallback((slots: ScheduleSlot[], animate: boolean) => {
    if (!gridRef.current) return;
    const gridEl = gridRef.current;
    const headerRow = gridEl.querySelector('[data-row="header"]');
    const timeCol = gridEl.querySelector('[data-time="0"]');

    if (!headerRow || !timeCol) return;

    const gridRect = gridEl.getBoundingClientRect();
    const headerWidth = timeCol.getBoundingClientRect().width;
    const headerHeight = headerRow.getBoundingClientRect().height;
    const cellWidth = (gridRect.width - headerWidth) / 7;

    const newBlocks = slots.map((slot) => {
      const x = headerWidth + slot.dayIndex * cellWidth + (cellWidth - BLOCK_SIZE) / 2;
      const y = headerHeight + slot.timeSlot * SLOT_HEIGHT + (SLOT_HEIGHT - BLOCK_SIZE) / 2;
      return { slot, x, y, animating: animate };
    });

    setBlocks(newBlocks);

    if (animate) {
      setTimeout(() => {
        setBlocks((prev) => prev.map((b) => ({ ...b, animating: false })));
      }, 150);
    }
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, membersRes] = await Promise.all([
        projectApi.getAll(),
        memberApi.getAll(),
      ]);
      const projectsData = Array.isArray(projectsRes.data) ? projectsRes.data : [];
      setProjects(projectsData);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      if (projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
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

      if (!Array.isArray(scheduleData) || scheduleData.length === 0) {
        const project = projects.find((p) => p.id === selectedProjectId);
        if (project) {
          const confirmedMembers: Array<{ memberId: string; part: string }> = [];
          (project.tracks || []).forEach((track) => {
            (track.assignments || []).forEach((a) => {
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

  const hasCollision = (dayIndex: number, timeSlot: number, excludeId?: string): boolean => {
    return schedule.some(
      (s) => s.id !== excludeId && s.dayIndex === dayIndex && s.timeSlot === timeSlot
    );
  };

  const getSlotFromMouse = (clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    const gridRect = gridRef.current.getBoundingClientRect();
    const timeCol = gridRef.current.querySelector('[data-time="0"]');
    const headerRow = gridRef.current.querySelector('[data-row="header"]');
    if (!timeCol || !headerRow) return null;

    const headerWidth = timeCol.getBoundingClientRect().width;
    const headerHeight = headerRow.getBoundingClientRect().height;

    const x = clientX - gridRect.left - headerWidth;
    const y = clientY - gridRect.top - headerHeight;
    const cellWidth = (gridRect.width - headerWidth) / 7;

    const dayIndex = Math.floor(x / cellWidth);
    const timeSlot = Math.floor(y / SLOT_HEIGHT);

    if (dayIndex >= 0 && dayIndex < 7 && timeSlot >= 0 && timeSlot < TIME_SLOTS) {
      return { dayIndex, timeSlot };
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent, block: BlockState) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(block.slot.id);
    setDragStartPos({ x: e.clientX - block.x, y: e.clientY - block.y });
    setDragCurrentPos({ x: block.x, y: block.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId) return;
    const newX = e.clientX - dragStartPos.x;
    const newY = e.clientY - dragStartPos.y;
    setDragCurrentPos({ x: newX, y: newY });

    const slotInfo = getSlotFromMouse(e.clientX, e.clientY);
    setDragOverSlot(slotInfo);
  }, [draggingId, dragStartPos]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!draggingId) return;

    const slotInfo = getSlotFromMouse(e.clientX, e.clientY);

    if (slotInfo && !hasCollision(slotInfo.dayIndex, slotInfo.timeSlot, draggingId)) {
      const newSchedule = schedule.map((s) =>
        s.id === draggingId
          ? { ...s, dayIndex: slotInfo.dayIndex, timeSlot: slotInfo.timeSlot }
          : s
      );
      setSchedule(newSchedule);
      saveSchedule(newSchedule);
      updateBlockPositions(newSchedule, true);
    } else {
      updateBlockPositions(schedule, true);
    }

    setDraggingId(null);
    setDragOverSlot(null);
  }, [draggingId, schedule, saveSchedule, updateBlockPositions]);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, handleMouseMove, handleMouseUp]);

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name || id;

  const getTimeLabel = (idx: number) => {
    const hour = 9 + Math.floor(idx * 1.5);
    const min = idx % 2 === 0 ? '00' : '30';
    return `${String(hour).padStart(2, '0')}:${min}`;
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">排练时间表</h1>
            <p className="page-subtitle">拖拽彩色方块调整排练时间，碰撞检测避免重叠</p>
          </div>
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

      <div className="card">
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
            {projects.find((p) => p.id === selectedProjectId)?.title}
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {Object.entries(PART_COLORS).slice(0, 6).map(([part, color]) => (
              <div key={part} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: color }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {getPartShortName(part)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', overflowX: 'auto' }}>
          <div
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px repeat(7, 1fr)',
              gap: '0px',
              border: '2px solid #333',
              borderRadius: '8px',
              overflow: 'hidden',
              minWidth: '700px',
            }}
          >
            <div data-row="header" className="schedule-header" style={{ background: 'var(--bg-nav)', padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '13px' }}></div>
            {DAYS.map((day, idx) => (
              <div key={idx} className="schedule-header" style={{ background: 'var(--bg-nav)', padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '13px' }}>{day}</div>
            ))}

            {Array.from({ length: TIME_SLOTS }).map((_, timeIdx) => (
              <div key={`row-${timeIdx}`} style={{ display: 'contents' }}>
                <div
                  data-time={String(timeIdx)}
                  className="schedule-time-label"
                  style={{ background: 'var(--bg-nav)', padding: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {getTimeLabel(timeIdx)}
                </div>
                {DAYS.map((_, dayIdx) => {
                  const isOver = dragOverSlot?.dayIndex === dayIdx && dragOverSlot?.timeSlot === timeIdx;
                  const isCollision = isOver && draggingId && hasCollision(dayIdx, timeIdx, draggingId);
                  return (
                    <div
                      key={`slot-${dayIdx}-${timeIdx}`}
                      className="schedule-slot"
                      style={{
                        background: isCollision ? '#7f1d1d' : isOver ? '#065f46' : '#1e1e2e',
                        minHeight: `${SLOT_HEIGHT}px`,
                        position: 'relative',
                        borderTop: '1px solid #333',
                        borderBottom: '1px solid #333',
                        transition: 'background 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            {blocks.map((block) => {
              const isDragging = block.slot.id === draggingId;
              const currentX = isDragging ? dragCurrentPos.x : block.x;
              const currentY = isDragging ? dragCurrentPos.y : block.y;

              return (
                <div
                  key={block.slot.id}
                  onMouseDown={(e) => !isDragging && handleMouseDown(e, block)}
                  style={{
                    position: 'absolute',
                    left: currentX,
                    top: currentY,
                    width: `${BLOCK_SIZE}px`,
                    height: `${BLOCK_SIZE}px`,
                    borderRadius: '8px',
                    background: getPartColor(block.slot.part),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#fff',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    zIndex: isDragging ? 1000 : 10,
                    opacity: isDragging ? 0.9 : 1,
                    pointerEvents: isDragging ? 'none' : 'auto',
                    boxShadow: isDragging
                      ? '0 8px 25px rgba(0,0,0,0.5)'
                      : '0 2px 8px rgba(0,0,0,0.3)',
                    transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                    transition: isDragging
                      ? 'box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                      : block.animating
                        ? 'left 0.15s cubic-bezier(0.4, 0, 0.2, 1), top 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                        : 'box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  title={`${getMemberName(block.slot.memberId)} - ${block.slot.part}`}
                >
                  {getPartShortName(block.slot.part)}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>已分配成员</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {schedule.map((item) => (
              <span key={item.id} className="badge badge-info">
                {getMemberName(item.memberId)} ({item.part}) - {DAYS[item.dayIndex]} {getTimeLabel(item.timeSlot)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
