import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Milestone {
  _id: string;
  activityId: string;
  title: string;
  description: string;
  date: string;
  order: number;
  completed: boolean;
}

interface SortableMilestoneProps {
  milestone: Milestone;
  onToggleComplete: (m: Milestone) => void;
  onDelete: (id: string) => void;
  completingId: string | null;
  index: number;
  total: number;
}

const SortableMilestoneCard = ({
  milestone,
  onToggleComplete,
  onDelete,
  completingId,
  index,
  total,
}: SortableMilestoneProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    marginBottom: 4,
    paddingLeft: 4,
    borderRadius: 8,
  };

  const isCompleting = completingId === milestone._id;

  return (
    <div ref={setNodeRef} style={style}>
      <div style={styles.timelineRow}>
        <div style={styles.timelineLeft}>
          <div
            {...attributes}
            {...listeners}
            style={styles.dragHandle}
            title="拖拽排序"
          >
            ⠿
          </div>
          <div style={styles.timelineDotWrapper}>
            <div
              style={{
                ...styles.timelineDot,
                backgroundColor: milestone.completed ? '#22c55e' : '#d1d5db',
                transform: isCompleting ? 'scale(1.3)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
            >
              {milestone.completed && <span style={styles.checkIcon}>✓</span>}
            </div>
            {index < total - 1 && <div style={styles.timelineLine} />}
          </div>
        </div>

        <div
          style={{
            ...styles.timelineContent,
            ...(isDragging ? styles.timelineContentDragging : {}),
          }}
        >
          <div style={styles.milestoneHeader}>
            <h4
              style={{
                ...styles.milestoneTitle,
                textDecoration: milestone.completed ? 'line-through' : 'none',
                color: milestone.completed ? '#94a3b8' : '#e2e8f0',
              }}
            >
              {milestone.title}
            </h4>
            <div style={styles.milestoneActions}>
              <button
                style={{
                  ...styles.actionBtn,
                  backgroundColor: milestone.completed
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(34, 197, 94, 0.15)',
                  color: milestone.completed ? '#f59e0b' : '#22c55e',
                }}
                onClick={() => onToggleComplete(milestone)}
              >
                {milestone.completed ? '撤回' : '完成'}
              </button>
              <button
                style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                onClick={() => onDelete(milestone._id)}
              >
                删除
              </button>
            </div>
          </div>
          {milestone.description && (
            <p style={styles.milestoneDesc}>{milestone.description}</p>
          )}
          <div style={styles.milestoneDate}>
            <span>📅</span> {milestone.date}
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelineTab = () => {
  const { id } = useParams<{ id: string }>();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', date: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (id) fetchMilestones();
  }, [id]);

  const fetchMilestones = async () => {
    try {
      const res = await axios.get<Milestone[]>(`/api/activities/${id}/milestones`);
      setMilestones(res.data.sort((a, b) => a.order - b.order));
    } catch (err) {
      console.error('Failed to fetch milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = milestones.findIndex((m) => m._id === active.id);
    const newIndex = milestones.findIndex((m) => m._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const moved = milestones[oldIndex];
    const reordered = arrayMove(milestones, oldIndex, newIndex);

    const updatedReordered = reordered.map((m, i) => ({ ...m, order: i }));
    setMilestones(updatedReordered);

    try {
      await axios.put(`/api/milestones/${moved._id}/reorder`, {
        newOrder: newIndex,
        activityId: id,
      });
      await fetchMilestones();
    } catch (err) {
      console.error('Failed to reorder milestone:', err);
      fetchMilestones();
    }
  };

  const handleToggleComplete = async (milestone: Milestone) => {
    setCompletingId(milestone._id);
    try {
      await axios.put(`/api/milestones/${milestone._id}`, {
        completed: !milestone.completed,
      });
      await fetchMilestones();
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    } finally {
      setTimeout(() => setCompletingId(null), 300);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await axios.delete(`/api/milestones/${milestoneId}`);
      fetchMilestones();
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.title || !newMilestone.date) return;
    try {
      await axios.post(`/api/activities/${id}/milestones`, {
        ...newMilestone,
        order: milestones.length,
        completed: false,
      });
      setShowAddMilestone(false);
      setNewMilestone({ title: '', description: '', date: '' });
      fetchMilestones();
    } catch (err) {
      console.error('Failed to add milestone:', err);
    }
  };

  const activeMilestone = activeId ? milestones.find((m) => m._id === activeId) : null;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.timelineHeader}>
        <h3 style={styles.sectionTitle}>活动里程碑</h3>
        <button style={styles.addButton} onClick={() => setShowAddMilestone(true)}>
          ＋ 添加里程碑
        </button>
      </div>

      <div style={styles.hintText}>
        💡 拖拽左侧⠿手柄可调整里程碑顺序，调整后自动重算日期
      </div>

      {milestones.length === 0 ? (
        <div style={styles.emptyTimeline}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>📌</div>
          <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>暂无里程碑</div>
          <div style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>
            点击"添加里程碑"开始规划活动时间线
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={milestones.map((m) => m._id)}
            strategy={verticalListSortingStrategy}
          >
            <div style={styles.timelineContainer}>
              {milestones.map((milestone, index) => (
                <SortableMilestoneCard
                  key={milestone._id}
                  milestone={milestone}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteMilestone}
                  completingId={completingId}
                  index={index}
                  total={milestones.length}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeMilestone ? (
              <div style={styles.dragOverlayCard}>
                <div style={styles.overlayDragHandle}>⠿</div>
                <div style={styles.overlayContent}>
                  <div style={styles.overlayTitle}>{activeMilestone.title}</div>
                  <div style={styles.overlayDate}>📅 {activeMilestone.date}</div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {showAddMilestone && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowAddMilestone(false)}
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>添加里程碑</h2>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>里程碑名称 *</label>
              <input
                style={styles.formInput}
                placeholder="例如：确定活动场地"
                value={newMilestone.title}
                onChange={(e) =>
                  setNewMilestone({ ...newMilestone, title: e.target.value })
                }
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>描述</label>
              <input
                style={styles.formInput}
                placeholder="简要描述此里程碑内容"
                value={newMilestone.description}
                onChange={(e) =>
                  setNewMilestone({ ...newMilestone, description: e.target.value })
                }
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>目标日期 *</label>
              <input
                type="date"
                style={styles.formInput}
                value={newMilestone.date}
                onChange={(e) =>
                  setNewMilestone({ ...newMilestone, date: e.target.value })
                }
              />
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowAddMilestone(false)}
              >
                取消
              </button>
              <button style={styles.confirmButton} onClick={handleAddMilestone}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #334155',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    margin: 0,
  },
  addButton: {
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  hintText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
    padding: '10px 16px',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: 8,
  },
  emptyTimeline: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
  },
  timelineContainer: {
    position: 'relative',
  },
  timelineRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
  },
  timelineLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  dragHandle: {
    fontSize: 18,
    color: '#475569',
    cursor: 'grab',
    userSelect: 'none',
    padding: '0 4px',
    touchAction: 'none',
    fontWeight: 700,
  },
  timelineDotWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    flexShrink: 0,
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: '#334155',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '14px 18px',
    marginBottom: 8,
  },
  timelineContentDragging: {
    borderColor: '#6366f1',
    boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
  },
  milestoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
  },
  milestoneActions: {
    display: 'flex',
    gap: 8,
  },
  actionBtn: {
    padding: '4px 12px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
  },
  milestoneDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    marginBottom: 0,
    lineHeight: 1.4,
  },
  milestoneDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  dragOverlayCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 18px',
    backgroundColor: '#1e293b',
    border: '2px solid #6366f1',
    borderRadius: 10,
    boxShadow: '0 12px 32px rgba(99, 102, 241, 0.3)',
    width: 500,
    maxWidth: '80vw',
    opacity: 0.95,
  },
  overlayDragHandle: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: 700,
  },
  overlayContent: {
    flex: 1,
  },
  overlayTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  overlayDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 16,
    padding: 28,
    width: 440,
    maxWidth: '90vw',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  formInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default TimelineTab;
