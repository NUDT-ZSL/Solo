import React from 'react';
import { TravelNode, formatDate } from '../utils/geoUtils';

interface SidebarProps {
  nodes: TravelNode[];
  activeNodeId: string | null;
  onNodeClick: (node: TravelNode) => void;
  onDeleteNode: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  nodes,
  activeNodeId,
  onNodeClick,
  onDeleteNode,
}) => {
  const sorted = [...nodes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <span style={styles.sidebarTitle}>旅行节点</span>
        <span style={styles.count}>{nodes.length}</span>
      </div>
      <div style={styles.list}>
        {sorted.map((node) => {
          const isActive = node.id === activeNodeId;
          const visibleEmojis = node.emojiTags.slice(0, 3);
          const hiddenCount = node.emojiTags.length - 3;

          return (
            <div
              key={node.id}
              style={{
                ...styles.card,
                ...(isActive ? styles.cardActive : {}),
              }}
              className={isActive ? 'node-card-active' : ''}
            >
              <div style={styles.cardTop}>
                {node.photoUrl && (
                  <img src={node.photoUrl} alt="" style={styles.thumbnail} />
                )}
                <div style={styles.cardInfo}>
                  <span
                    style={styles.dateTag}
                    onClick={() => onNodeClick(node)}
                  >
                    {formatDate(node.date)}
                  </span>
                  <span style={styles.placeName}>
                    {node.address.split(',')[0]}
                  </span>
                </div>
                {node.emojiTags.length > 0 && (
                  <div style={styles.emojiContainer}>
                    {visibleEmojis.map((emoji, i) => (
                      <span key={i} style={styles.emojiBadge}>
                        {emoji}
                      </span>
                    ))}
                    {hiddenCount > 0 && (
                      <span style={styles.emojiMore}>+{hiddenCount}</span>
                    )}
                  </div>
                )}
              </div>
              <p style={styles.desc}>{node.description}</p>
              <button
                style={styles.deleteBtn}
                onClick={() => onDeleteNode(node.id)}
                title="删除节点"
              >
                🗑️
              </button>
            </div>
          );
        })}
        {nodes.length === 0 && (
          <div style={styles.empty}>
            点击地图添加你的第一个旅行节点
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '30%',
    height: '100%',
    background: '#1e1e24',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '16px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  sidebarTitle: {
    color: '#f0c27a',
    fontSize: 14,
    fontWeight: 600,
  },
  count: {
    background: 'rgba(240,194,122,0.2)',
    color: '#f0c27a',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 10,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  card: {
    background: '#2a3b4c',
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    transition: 'transform 200ms, box-shadow 200ms',
    cursor: 'default',
    position: 'relative',
    animation: 'fadeInCard 400ms ease',
  },
  cardActive: {
    boxShadow: '0 4px 20px rgba(240,194,122,0.3)',
    borderLeft: '3px solid #f0c27a',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  dateTag: {
    color: '#f0c27a',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 200ms',
  },
  placeName: {
    color: '#aaa',
    fontSize: 11,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emojiContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  emojiBadge: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'rgba(240,194,122,0.15)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
  },
  emojiMore: {
    background: 'rgba(240,194,122,0.3)',
    color: '#f0c27a',
    fontSize: 9,
    padding: '2px 5px',
    borderRadius: 8,
  },
  desc: {
    margin: '8px 0 0',
    color: '#ccc',
    fontSize: 12,
    lineHeight: 1.5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    opacity: 0.4,
    transition: 'opacity 200ms',
    padding: 4,
  },
  empty: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
};

export default Sidebar;
