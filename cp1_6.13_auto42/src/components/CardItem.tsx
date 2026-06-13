import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '../types';
import { useAppContext } from '../App';
import './CardItem.css';

interface CardItemProps {
  task: Task;
  index: number;
  onClick: () => void;
  isDraggingContext: boolean;
}

const CardItem: React.FC<CardItemProps> = ({ task, index, onClick, isDraggingContext }) => {
  const { getMemberById } = useAppContext();
  const assignee = getMemberById(task.assignee);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card-item ${snapshot.isDragging ? 'is-dragging' : ''} ${
            isDraggingContext && !snapshot.isDragging ? 'is-dragging-context' : ''
          }`}
          onClick={onClick}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: snapshot.isDragging ? '#60a5fa40' : undefined,
            transition: snapshot.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.2s ease',
            animation: !snapshot.isDragging && !isDraggingContext ? 'fadeIn 0.4s ease' : undefined
          }}
        >
          <h4 className="card-title">{task.title}</h4>

          {task.tags.length > 0 && (
            <div className="card-tags">
              {task.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="card-tag">
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="card-tag-more">+{task.tags.length - 3}</span>
              )}
            </div>
          )}

          <div className="card-footer">
            {assignee && (
              <div
                className="card-assignee"
                title={assignee.name}
                style={{ background: assignee.color }}
              >
                {assignee.name[0]}
              </div>
            )}
            <div className="card-comment-bubble" title={`${task.commentCount}条评论`}>
              {task.commentCount}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default CardItem;
