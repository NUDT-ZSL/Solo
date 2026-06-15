import React from 'react';
import { BandEvent } from '../types';
import { format } from 'date-fns';

interface EventCardProps {
  event: BandEvent;
  onEdit: (event: BandEvent) => void;
  onDelete: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onEdit, onDelete }) => {
  const accentColor = event.type === 'gig' ? '#f59e0b' : '#22c55e';
  const typeLabel = event.type === 'gig' ? '演出' : '排练';

  return (
    <div
      className="event-card"
      style={{ borderLeft: `6px solid ${accentColor}` }}
    >
      <div className="event-card-body">
        <div className="event-card-header">
          <span className="event-type-tag" style={{ background: accentColor }}>
            {typeLabel}
          </span>
          <span className="event-time">
            {format(new Date(event.datetime), 'HH:mm')}
          </span>
        </div>
        <div className="event-title" title={event.title}>
          {event.title}
        </div>
        {event.location && (
          <div className="event-location">
            📍 {event.location}
          </div>
        )}
        <div className="event-card-actions">
          <button
            className="btn-sm"
            onClick={(e) => { e.stopPropagation(); onEdit(event); }}
          >
            编辑
          </button>
          <button
            className="btn-sm btn-danger"
            onClick={(e) => { e.stopPropagation(); onDelete(event._id); }}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
