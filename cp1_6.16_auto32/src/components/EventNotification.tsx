import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EcoEvent } from '@/ecosystem/types';

interface EventNotificationProps {
  events: EcoEvent[];
}

const ICON_MAP: Record<EcoEvent['type'], string> = {
  alert: '⚠️',
  prosperity: '🎉',
  warning: '⚠️',
  info: 'ℹ️',
};

interface VisibleNotification {
  event: EcoEvent;
  entering: boolean;
  fading: boolean;
}

const EventNotification: React.FC<EventNotificationProps> = ({ events }) => {
  const [notifications, setNotifications] = useState<VisibleNotification[]>([]);
  const prevEventIdsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeNotification = useCallback((eventId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.event.id === eventId ? { ...n, fading: true } : n
      )
    );
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.event.id !== eventId));
      timersRef.current.delete(eventId);
    }, 1000);
  }, []);

  useEffect(() => {
    const currentIds = new Set(events.map((e) => e.id));
    const prevIds = prevEventIdsRef.current;

    const newEvents = events.filter(
      (e) =>
        !prevIds.has(e.id) &&
        (e.type === 'alert' || e.type === 'prosperity' || e.type === 'warning')
    );

    if (newEvents.length > 0) {
      setNotifications((prev) => {
        const updated = [...prev];
        for (const event of newEvents) {
          if (updated.length >= 3) {
            const oldest = updated[0];
            removeNotification(oldest.event.id);
            updated.shift();
          }
          updated.push({ event, entering: true, fading: false });

          setTimeout(() => {
            setNotifications((curr) =>
              curr.map((n) =>
                n.event.id === event.id ? { ...n, entering: false } : n
              )
            );
          }, 50);

          const fadeTimer = setTimeout(() => {
            removeNotification(event.id);
          }, 5000);
          timersRef.current.set(event.id, fadeTimer);
        }
        return updated;
      });
    }

    prevEventIdsRef.current = currentIds;
  }, [events, removeNotification]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {notifications.map((n) => (
        <div
          key={n.event.id}
          style={{
            background: 'rgba(30, 144, 255, 0.9)',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500,
            transform: n.entering ? 'translateY(-100%)' : 'translateY(0)',
            opacity: n.fading ? 0 : 1,
            transition: n.entering
              ? 'transform 0.5s ease-out'
              : n.fading
              ? 'opacity 1s'
              : 'transform 0.5s ease-out, opacity 1s',
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{ICON_MAP[n.event.type]}</span>
          <span>{n.event.message}</span>
        </div>
      ))}
    </div>
  );
};

export default EventNotification;
