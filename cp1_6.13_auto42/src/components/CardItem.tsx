import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Task } from '../types';
import { useAppContext } from '../App';
import './CardItem.css';

interface CardItemProps {
  task: Task;
  index: number;
  onClick: () => void;
}

const CardItem: React.FC<CardItemProps> = ({ task, index, onClick }) => {
  const { getMemberById } = useAppContext();
  const assignee = getMemberById(task.assignee);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card-item ${snapshot.isDragging ? 'is-dragging' : ''}`}
          onClick={onClick}
          style={{
            ...provided.draggableProps.style,
            animation: !snapshot.isDragging ? 'fadeIn 0.4s ease' : undefined
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
            <div className="card-comment-count" title={`${task.commentCount}条评论`}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{task.commentCount}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default CardItem;
