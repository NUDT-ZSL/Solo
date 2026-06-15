import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task, MemberWorkload } from '@/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/types';
import KanbanBoard from './board/components/KanbanBoard';
import WorkloadChart from './load/components/WorkloadChart';
import { calculateWorkload } from './load/logic/loadLogic';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberWorkload | null>(
    null
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsSmallScreen(window.innerWidth < 1200);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedMember) {
          setSelectedMember(null);
        } else if (isDrawerOpen) {
          setIsDrawerOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMember, isDrawerOpen]);

  const handleTasksChange = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, []);

  const workloadSummary = useMemo(
    () => calculateWorkload(tasks),
    [tasks]
  );

  const handleMemberClick = useCallback((member: MemberWorkload) => {
    setSelectedMember(member);
    setIsDrawerOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((v) => !v);
  }, []);

  const getColumnLabel = (columnId: string) => {
    if (columnId.includes('todo')) return '待办';
    if (columnId.includes('progress')) return '进行中';
    if (columnId.includes('done')) return '已完成';
    return columnId;
  };

  const WorkloadPanel = (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#f8f9fa',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '20px 20px 12px',
          flexShrink: 0,
          borderBottom: '1px solid #e9ecef',
        }}
      >
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: '#2d3436',
          }}
        >
          团队工作负载
        </h2>
        <p
          style={{
            fontSize: 12,
            color: '#95a5a6',
            marginTop: 2,
          }}
        >
          成员任务数与剩余容量分析
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <WorkloadChart
          summary={workloadSummary}
          onMemberClick={handleMemberClick}
        />
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#f0f2f5',
        display: 'flex',
        minWidth: isSmallScreen ? '100%' : '1200px',
      }}
    >
      <div
        style={{
          flex: isSmallScreen ? '1 1 100%' : '0 0 70%',
          minWidth: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <KanbanBoard
          onTasksChange={handleTasksChange}
          onToggleDrawer={toggleDrawer}
          isSmallScreen={isSmallScreen}
        />
      </div>

      {!isSmallScreen && (
        <div
          style={{
            flex: '0 0 30%',
            minWidth: 280,
            width: '30%',
            height: '100vh',
            position: 'sticky',
            top: 0,
            borderLeft: '1px solid #e9ecef',
            overflow: 'hidden',
          }}
        >
          {WorkloadPanel}
        </div>
      )}

      <AnimatePresence>
        {isSmallScreen && isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 200,
              }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 320,
                maxWidth: '85vw',
                zIndex: 201,
                boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
                overflow: 'hidden',
              }}
            >
              {WorkloadPanel}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMember && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedMember(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(2px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, type: 'spring', damping: 25 }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                maxWidth: '90vw',
                maxHeight: '80vh',
                background: '#ffffff',
                borderRadius: 12,
                zIndex: 301,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '18px 20px',
                  borderBottom: '1px solid #e9ecef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: selectedMember.isOverloaded
                        ? 'linear-gradient(135deg, #ff4d4d, #ff6b6b)'
                        : 'linear-gradient(135deg, #4d79ff, #6c5ce7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {selectedMember.name.charAt(0)}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#2d3436',
                      }}
                    >
                      {selectedMember.name}
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        color: selectedMember.isOverloaded
                          ? '#ff4d4d'
                          : '#636e72',
                        marginTop: 1,
                      }}
                    >
                      {selectedMember.isOverloaded
                        ? '⚠ 当前已超载'
                        : `剩余容量：${selectedMember.remainingCapacity}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'transparent',
                    color: '#ff4d4d',
                    fontSize: 18,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,77,77,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  padding: '14px 20px',
                  display: 'flex',
                  gap: 16,
                  borderBottom: '1px solid #f1f3f5',
                  flexShrink: 0,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#95a5a6',
                      marginBottom: 2,
                    }}
                  >
                    任务数
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: selectedMember.isOverloaded
                        ? '#ff4d4d'
                        : '#4d79ff',
                    }}
                  >
                    {selectedMember.taskCount}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#95a5a6',
                      marginBottom: 2,
                    }}
                  >
                    总工时
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#2d3436',
                    }}
                  >
                    {selectedMember.totalHours}h
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px 20px 20px',
                }}
              >
                {selectedMember.tasks.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 0',
                      color: '#adb5bd',
                      fontSize: 13,
                      fontStyle: 'italic',
                    }}
                  >
                    暂无任务
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedMember.tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          background: '#f8f9fa',
                          borderRadius: 8,
                          padding: '12px 12px 12px 16px',
                          borderLeft: `4px solid ${PRIORITY_COLORS[task.priority]}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#2d3436',
                            marginBottom: 8,
                          }}
                        >
                          {task.title}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: `${PRIORITY_COLORS[task.priority]}20`,
                                color: PRIORITY_COLORS[task.priority],
                                fontWeight: 600,
                              }}
                            >
                              {PRIORITY_LABELS[task.priority]}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: '#e9ecef',
                                color: '#636e72',
                              }}
                            >
                              {getColumnLabel(task.columnId)}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#636e72',
                            }}
                          >
                            {task.estimateHours}h
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
