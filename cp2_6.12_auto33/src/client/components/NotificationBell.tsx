import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAppStore, type ExchangeRequest } from '../store';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    color: '#5a4a3a',
  },
  bellButtonHover: {
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
  },
  bellButtonActive: {
    transform: 'scale(0.95)',
    backgroundColor: 'rgba(139, 115, 85, 0.15)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 9,
    backgroundColor: '#e53935',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transformOrigin: 'center',
  },
  badgeBounce: {
    animation: 'badge-bounce 0.3s ease',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    right: 0,
    width: 360,
    maxHeight: 420,
    backgroundColor: '#fffdf8',
    borderRadius: 14,
    boxShadow: '0 10px 40px rgba(90, 74, 58, 0.15), 0 2px 8px rgba(90, 74, 58, 0.08)',
    border: '1px solid rgba(139, 115, 85, 0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    animation: 'dropdown-in 0.2s ease',
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(139, 115, 85, 0.1)',
    backgroundColor: '#faf6ef',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#5a4a3a',
    margin: 0,
  },
  markAllBtn: {
    fontSize: 12,
    color: '#8b7355',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
    transition: 'background-color 0.15s ease',
  },
  listContainer: {
    overflowY: 'auto',
    flex: 1,
  },
  requestItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 18px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    borderBottom: '1px solid rgba(139, 115, 85, 0.06)',
  },
  requestItemUnread: {
    backgroundColor: 'rgba(255, 248, 230, 0.5)',
  },
  requesterAvatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    border: '2px solid #fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  requestContent: {
    flex: 1,
    minWidth: 0,
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#3a2e22',
    marginBottom: 2,
    lineHeight: 1.4,
  },
  requestFurniture: {
    fontSize: 12,
    color: '#8b7355',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  furnitureThumb: {
    width: 20,
    height: 20,
    borderRadius: 4,
    objectFit: 'cover',
  },
  requestTime: {
    fontSize: 11,
    color: '#b09e84',
    marginTop: 3,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#e53935',
    flexShrink: 0,
    marginLeft: 8,
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#b09e84',
    fontSize: 13,
  },
};

const keyframesStyle = `
@keyframes badge-bounce {
  0% { transform: scale(1); }
  30% { transform: scale(1.4); }
  50% { transform: scale(0.9); }
  70% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes dropdown-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
`;

export default function NotificationBell() {
  const {
    unreadCount,
    exchangeRequests,
    markRequestAsRead,
    markAllAsRead,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(unreadCount);

  useEffect(() => {
    if (prevUnreadRef.current !== unreadCount) {
      setBounceKey((k) => k + 1);
      prevUnreadRef.current = unreadCount;
    }
  }, [unreadCount]);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-notification-bell', 'true');
    styleEl.textContent = keyframesStyle;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleBellClick = () => {
    setIsOpen((prev) => !prev);
  };

  const handleRequestClick = (req: ExchangeRequest) => {
    if (!req.read) {
      markRequestAsRead(req.id);
    }
  };

  const mergedBellButtonStyle: React.CSSProperties = {
    ...styles.bellButton,
    ...(isHovered ? styles.bellButtonHover : {}),
    ...(isActive ? styles.bellButtonActive : {}),
  };

  const mergedBadgeStyle: React.CSSProperties = {
    ...styles.badge,
    animation: bounceKey > 0 ? 'badge-bounce 0.3s ease' : undefined,
  };

  const unreadRequests = exchangeRequests.filter((r) => !r.read);

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        style={mergedBellButtonStyle}
        onClick={handleBellClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsActive(false);
        }}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
        aria-label="通知"
      >
        <Bell size={22} strokeWidth={2} />
        {unreadCount > 0 && (
          <span key={bounceKey} style={mergedBadgeStyle}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <h3 style={styles.headerTitle}>交换请求通知</h3>
            {unreadRequests.length > 0 && (
              <button
                style={styles.markAllBtn}
                onClick={() => markAllAsRead()}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(139, 115, 85, 0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                全部已读
              </button>
            )}
          </div>

          <div style={styles.listContainer}>
            {exchangeRequests.length === 0 ? (
              <div style={styles.emptyState}>暂无通知</div>
            ) : (
              exchangeRequests.map((req) => {
                const mergedItemStyle: React.CSSProperties = {
                  ...styles.requestItem,
                  ...(!req.read ? styles.requestItemUnread : {}),
                };
                return (
                  <div
                    key={req.id}
                    style={mergedItemStyle}
                    onClick={() => handleRequestClick(req)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = !req.read
                        ? 'rgba(255, 248, 230, 0.8)'
                        : 'rgba(139, 115, 85, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = !req.read
                        ? 'rgba(255, 248, 230, 0.5)'
                        : 'transparent';
                    }}
                  >
                    <img
                      src={req.requesterAvatar}
                      alt={req.requesterName}
                      style={styles.requesterAvatar}
                    />
                    <div style={styles.requestContent}>
                      <div style={styles.requestTitle}>
                        <span style={{ fontWeight: 600 }}>{req.requesterName}</span>
                        <span> 请求交换您的家具</span>
                      </div>
                      <div style={styles.requestFurniture}>
                        <img
                          src={req.furnitureImage}
                          alt={req.furnitureName}
                          style={styles.furnitureThumb}
                        />
                        <span>{req.furnitureName}</span>
                      </div>
                      <div style={styles.requestTime}>{req.time}</div>
                    </div>
                    {!req.read && <div style={styles.unreadDot} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
