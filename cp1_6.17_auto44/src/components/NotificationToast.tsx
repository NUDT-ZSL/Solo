import React, { useState, useEffect, useRef } from 'react';
import { dataStore, Notification } from '../data/dataStore';

const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const handleUpdate = () => {
      const notifs = dataStore.getNotifications();
      setNotifications(notifs);
      notifs.forEach((n) => {
        if (!visibleMap[n.id]) {
          setVisibleMap((prev) => ({ ...prev, [n.id]: true }));
          if (!timersRef.current[n.id]) {
            timersRef.current[n.id] = setTimeout(() => {
              setVisibleMap((prev) => ({ ...prev, [n.id]: false }));
              setTimeout(() => {
                dataStore.consumeNotification(n.id);
                delete timersRef.current[n.id];
              }, 400);
            }, 5000);
          }
        }
      });
    };
    handleUpdate();
    return dataStore.subscribe(handleUpdate);
  }, []);

  const handleDismiss = (id: string) => {
    setVisibleMap((prev) => ({ ...prev, [id]: false }));
    setTimeout(() => {
      dataStore.consumeNotification(id);
      delete timersRef.current[id];
    }, 400);
  };

  return (
    <div className="toast-container">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`toast-item ${visibleMap[n.id] ? 'toast-enter' : 'toast-leave'}`}
          onClick={() => handleDismiss(n.id)}
        >
          <span className="toast-icon">🎉</span>
          <span className="toast-text">
            <strong>{n.routeName}</strong> 已成功匹配 {n.memberCount} 人！
          </span>
          <span className="toast-close">×</span>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
