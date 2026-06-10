import React, { useEffect, useState } from 'react';
import { Event } from './types';

interface EventCardProps {
  event: Event | null;
  allEvents: Event[];
  onClose: () => void;
  onEventClick: (event: Event) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, allEvents, onClose, onEventClick }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (event) {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [event]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 500);
  };

  const getRelatedEvents = (currentEvent: Event): Event[] => {
    return allEvents.filter(e => {
      if (e.id === currentEvent.id) return false;
      return e.keywords.some(keyword => 
        currentEvent.keywords.includes(keyword)
      );
    });
  };

  const getSharedKeywords = (event1: Event, event2: Event): string[] => {
    return event1.keywords.filter(k => event2.keywords.includes(k));
  };

  if (!event) return null;

  const relatedEvents = getRelatedEvents(event);

  return (
    <div className={`event-card-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
      <div 
        className={`event-card ${isVisible ? 'visible' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <button className="close-btn" onClick={handleClose}>×</button>
        <h2>{event.name}</h2>
        <div className="card-date">{event.date}</div>
        <p className="card-description">{event.description}</p>
        <div className="card-keywords">
          {event.keywords.map((keyword, index) => (
            <span key={index}>{keyword}</span>
          ))}
        </div>
        {relatedEvents.length > 0 && (
          <div className="related-events">
            <h3>相关事件 ({relatedEvents.length})</h3>
            {relatedEvents.map(relatedEvent => (
              <div 
                key={relatedEvent.id}
                className="related-event-item"
                onClick={() => onEventClick(relatedEvent)}
              >
                <div className="related-name">{relatedEvent.name}</div>
                <div className="related-date">
                  {relatedEvent.date} · 共享关键词: {getSharedKeywords(event, relatedEvent).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
