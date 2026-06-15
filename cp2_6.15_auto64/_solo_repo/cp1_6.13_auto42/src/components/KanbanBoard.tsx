import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, DropResult, DragStart, DragEnd } from '@hello-pangea/dnd';
import { Task, GroupId } from '../types';
import { useAppContext } from '../App';
import CardItem from './CardItem';
import './KanbanBoard.css';

interface KanbanBoardProps {
  onCardClick: (task: Task) => void;
  onCreateClick: (group: GroupId) => void;
  activeMobileColumn: number;
  setActiveMobileColumn: (index: number) => void;
}

const GROUP_ORDER: GroupId[] = ['review', 'developing', 'testing', 'done'];

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  onCardClick,
  onCreateClick,
  activeMobileColumn,
  setActiveMobileColumn
}) => {
  const { tasks, groupMap, moveCard, filterGroup } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);

  const groupedTasks = useMemo(() => {
    const result: Record<GroupId, Task[]> = {
      review: [],
      developing: [],
      testing: [],
      done: []
    };

    tasks.forEach(task => {
      result[task.group].push(task);
    });

    return result;
  }, [tasks]);

  const onDragStart = (_: DragStart) => {
    setIsDragging(true);
  };

  const onDragEnd = (result: DropResult) => {
    setIsDragging(false);
    if (!result.destination) return;

    const { draggableId, destination } = result;
    moveCard(draggableId, destination.droppableId as GroupId, destination.index);
  };

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="kanban-board">
        <div className="kanban-columns">
          {GROUP_ORDER.map((groupId, idx) => {
            const isActiveMobileColumn = idx === activeMobileColumn;
            const columnTasks = groupedTasks[groupId];
            const displayTasks = filterGroup === 'all' || filterGroup === groupId ? columnTasks : [];

            return (
              <div
                key={groupId}
                className={`kanban-column ${isActiveMobileColumn ? 'active' : ''}`}
              >
                <div className="column-header">
                  <h3 className="column-title">{groupMap[groupId]}</h3>
                  <span className="column-count">{displayTasks.length}</span>
                </div>

                <Droppable droppableId={groupId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`column-content ${
                        snapshot.isDraggingOver ? 'is-dragging-over' : ''
                      }`}
                    >
                      {displayTasks.length === 0 ? (
                        <div className="column-empty">暂无需求</div>
                      ) : (
                        displayTasks.map((task, index) => (
                          <CardItem
                            key={task.id}
                            task={task}
                            index={index}
                            onClick={() => onCardClick(task)}
                            isDraggingContext={isDragging}
                          />
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <button
                  className="column-add-btn"
                  onClick={() => onCreateClick(groupId)}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  新建
                </button>
              </div>
            );
          })}
        </div>

        <div className="mobile-column-pagination">
          {GROUP_ORDER.map((groupId, idx) => (
            <button
              key={groupId}
              className={`mobile-page-btn ${idx === activeMobileColumn ? 'active' : ''}`}
              onClick={() => setActiveMobileColumn(idx)}
            >
              {groupMap[groupId]}
            </button>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
