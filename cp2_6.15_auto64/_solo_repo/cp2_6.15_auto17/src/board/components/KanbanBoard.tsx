import React, { useReducer, useState, useCallback, useEffect, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task, BoardAction } from '@/types';
import { PRIORITY_COLORS, PRIORITY_LABELS, type Priority } from '@/types';
import {
  boardReducer,
  initialBoardState,
  getColumnTasks,
  getAllTasks,
  createNewTaskData,
  getCurrentMembers,
} from '../logic/boardLogic';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  onTasksChange: (tasks: Task[]) => void;
  onToggleDrawer: () => void;
  isSmallScreen: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  onTasksChange,
  onToggleDrawer,
  isSmallScreen,
}) => {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formHours, setFormHours] = useState(2);
  const [formPriority, setFormPriority] = useState<Priority>('medium');

  const currentMembers = useMemo(() => getCurrentMembers(state), [state]);

  useEffect(() => {
    if (currentMembers.length > 0 && !currentMembers.includes(formAssignee)) {
      setFormAssignee(currentMembers[0]);
    }
  }, [currentMembers, formAssignee]);

  useEffect(() => {
    onTasksChange(getAllTasks(state));
  }, [state, onTasksChange]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const action: BoardAction = {
        type: 'MOVE_TASK',
        payload: {
          source: {
            droppableId: result.source.droppableId,
            index: result.source.index,
          },
          destination: {
            droppableId: result.destination.droppableId,
            index: result.destination.index,
          },
        },
      };
      dispatch(action);
    },
    []
  );

  const handleAddTask = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formTitle.trim()) return;

      const taskData = createNewTaskData(
        formTitle,
        formAssignee,
        formHours,
        formPriority
      );

      dispatch({ type: 'ADD_TASK', payload: taskData });

      setFormTitle('');
      if (currentMembers.length > 0) {
        setFormAssignee(currentMembers[0]);
      }
      setFormHours(2);
      setFormPriority('medium');
      setShowAddForm(false);
    },
    [formTitle, formAssignee, formHours, formPriority, currentMembers]
  );

  const columns = useMemo(
    () =>
      state.columnOrder.map((colId) => ({
        ...state.columns[colId],
        tasks: getColumnTasks(state, colId, searchKeyword),
      })),
    [state, searchKeyword]
  );

  const hasSearchResult = useMemo(
    () => columns.some((col) => col.tasks.length > 0),
    [columns]
  );

  const priorities: Priority[] = ['urgent', 'high', 'medium', 'low'];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          flexShrink: 0,
        }}
      >
        <div style={{ position: 'relative', width: 200 }}>
          <input
            type="text"
            placeholder="搜索任务或负责人..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              borderRadius: 18,
              border: `2px solid ${
                searchKeyword ? '#4d79ff' : '#dee2e6'
              }`,
              padding: '0 16px 0 36px',
              fontSize: 13,
              background: '#ffffff',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4d79ff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = searchKeyword ? '#4d79ff' : '#dee2e6';
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
              color: '#adb5bd',
            }}
          >
            🔍
          </span>
        </div>

        {isSmallScreen && (
          <button
            onClick={onToggleDrawer}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: '#ffffff',
              border: '1px solid #dee2e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            📊
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '0 20px 20px' }}>
        {searchKeyword && !hasSearchResult ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60%',
              fontStyle: 'italic',
              color: '#adb5bd',
              fontSize: 15,
            }}
          >
            无结果
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div
              style={{
                display: 'flex',
                gap: 16,
                height: '100%',
                minHeight: 0,
              }}
            >
              {columns.map((column) => (
                <div
                  key={column.id}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    background: 'rgba(255,255,255,0.5)',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 8px 12px',
                      flexShrink: 0,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#2d3436',
                      }}
                    >
                      {column.title}
                    </h3>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#4d79ff',
                        background: 'rgba(77, 121, 255, 0.1)',
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}
                    >
                      {column.tasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          flex: 1,
                          minHeight: 100,
                          padding: 4,
                          borderRadius: 8,
                          background: snapshot.isDraggingOver
                            ? 'rgba(77, 121, 255, 0.08)'
                            : 'transparent',
                          transition: 'background-color 0.2s ease',
                          overflowY: 'auto',
                        }}
                      >
                        <AnimatePresence initial={false}>
                          {column.tasks.map((task, index) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              index={index}
                            />
                          ))}
                        </AnimatePresence>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          padding: '0 20px',
        }}
      >
        <button
          onClick={() => setShowAddForm((v) => !v)}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 20,
            background: '#00b894',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            transition: 'background-color 0.2s ease, transform 0.1s ease',
            boxShadow: '0 2px 8px rgba(0, 184, 148, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#00a381';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#00b894';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {showAddForm ? '取消添加' : '+ 添加任务'}
        </button>

        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleAddTask}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: isSmallScreen ? 0 : '30%',
                height: 300,
                background: '#f1f3f5',
                borderTop: '1px solid #dee2e6',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: '24px 28px',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#2d3436',
                }}
              >
                添加新任务
              </h3>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#636e72',
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  任务名称
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={15}
                  placeholder="请输入任务名（最多15字）"
                  required
                  style={{
                    width: '100%',
                    height: 40,
                    borderRadius: 8,
                    border: '1px solid #dee2e6',
                    padding: '0 12px',
                    fontSize: 13,
                    background: '#ffffff',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: '#636e72',
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    负责人
                  </label>
                  <select
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                    style={{
                      width: '100%',
                      height: 40,
                      borderRadius: 8,
                      border: '1px solid #dee2e6',
                      padding: '0 12px',
                      fontSize: 13,
                      background: '#ffffff',
                    }}
                  >
                    {currentMembers.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: '#636e72',
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    预估工时（小时）
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={formHours}
                    onChange={(e) =>
                      setFormHours(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    style={{
                      width: '100%',
                      height: 40,
                      borderRadius: 8,
                      border: '1px solid #dee2e6',
                      padding: '0 12px',
                      fontSize: 13,
                      background: '#ffffff',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#636e72',
                    marginBottom: 8,
                    fontWeight: 500,
                  }}
                >
                  优先级
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                  }}
                >
                  {priorities.map((p) => (
                    <label
                      key={p}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        height: 36,
                        borderRadius: 8,
                        border:
                          formPriority === p
                            ? `2px solid ${PRIORITY_COLORS[p]}`
                            : '1px solid #dee2e6',
                        background:
                          formPriority === p
                            ? `${PRIORITY_COLORS[p]}15`
                            : '#ffffff',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={p}
                        checked={formPriority === p}
                        onChange={() => setFormPriority(p)}
                        style={{ display: 'none' }}
                      />
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: PRIORITY_COLORS[p],
                        }}
                      />
                      {PRIORITY_LABELS[p]}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 20,
                    background: '#ffffff',
                    color: '#636e72',
                    fontSize: 13,
                    fontWeight: 500,
                    border: '1px solid #dee2e6',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 20,
                    background: '#00b894',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  提交
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KanbanBoard;
