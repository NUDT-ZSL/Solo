import React, { useEffect, useRef } from 'react';
import { TravelNode, formatDate } from '../utils/geoUtils';
import type { TravelNode as TravelNodeType } from '../types';

interface SidebarProps {
  nodes: TravelNodeType[];
  activeNodeId: string | null;
  onNodeClick: (node: TravelNodeType) => void;
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
              className={isActive ? 'node-card-highlight' : ''}
            >
              <div style={styles.cardTop}>
                <div style={styles.thumbnailWrap}>
                  {node.photoUrl ? (
                    <img
                      src={node.photoUrl}
                      alt=""
                      style={styles.thumbnail}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement)
                          .parentElement as HTMLElement;
                        if (parent) {
                          const placeholder = document.createElement('div');
                          placeholder.textContent = '🖼️';
                          placeholder.style.cssText = `
                            width: 100%;
                            height: 100%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: rgba(30,30,36,0.6);
                            font-size: 20px;
                            border-radius: 8px;
                          `;
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                  ) : (
                    <div style={styles.thumbnailPlaceholder}>🖼️</div>
                  )}
                </div>
                <div style={styles.cardInfo}>
                  <span
                    style={styles.dateTag}
                    onClick={() => onNodeClick(node)}
                  >
                    {formatDate(node.date)}
                  </span>
                  <span style={styles.placeName} title={node.address}>
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
          <div style={styles.empty}>点击地图添加你的第一个旅行节点</div>
        )}
      </div>
      <style>{`
        @keyframes nodeCardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .node-card-highlight {
          animation: nodeCardFloat 1.2s ease-in-out;
        }
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .node-card-fade-in {
          animation: fadeInCard 400ms ease;
        }
      `}</style>
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
    transition: 'transform 200ms, box-shadow 200ms, border-left-color 200ms',
    cursor: 'default',
    position: 'relative',
    borderLeft: '3px solid transparent',
    animation: 'fadeInCard 400ms ease',
  },
  cardActive: {
    boxShadow: '0 4px 20px rgba(240,194,122,0.3)',
    borderLeftColor: '#f0c27a',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  thumbnailWrap: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 8,
    overflow: 'hidden',
    background: 'rgba(30,30,36,0.6)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 8,
    display: 'block',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    background: 'rgba(30,30,36,0.6)',
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
    display: 'inline-block',
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
    transition: 'opacity 200ms, transform 200ms',
    padding: 4,
  },
  empty: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 1.6,
  },
};

export default Sidebar;
