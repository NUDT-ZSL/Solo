import React, { useState, useEffect, useRef } from 'react';
import { Work, Comment, submitComment } from '../utils/http';

interface WorkDetailProps {
  work: Work;
  onBack: () => void;
}

const WorkDetail: React.FC<WorkDetailProps> = ({ work, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [comments, setComments] = useState<Comment[]>(work.comments || []);
  const [newComment, setNewComment] = useState('');
  const [userName, setUserName] = useState('');
  const [progress, setProgress] = useState(0);
  const lyricContainerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setComments(work.comments || []);
    setCurrentLyricIndex(0);
    setProgress(0);
    setIsPlaying(false);
  }, [work.id]);

  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          const newProgress = prev + 0.5;
          const lyricProgress = Math.floor(
            (newProgress / 100) * work.lyrics.length
          );
          setCurrentLyricIndex(Math.min(lyricProgress, work.lyrics.length - 1));
          return newProgress;
        });
      }, 200);
    } else if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, work.lyrics.length]);

  useEffect(() => {
    if (lyricContainerRef.current) {
      const activeLine = lyricContainerRef.current.querySelector(
        `[data-lyric-index="${currentLyricIndex}"]`
      ) as HTMLElement;
      if (activeLine) {
        activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLyricIndex]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    try {
      const comment = await submitComment(work.id, {
        userName: userName.trim() || '匿名用户',
        content: newComment.trim(),
      });
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('评论提交失败:', error);
    }
  };

  const formatTime = (percentage: number) => {
    const totalSeconds = Math.floor((percentage / 100) * 240);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fade-in" style={styles.container}>
      <button style={styles.backBtn} onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        返回列表
      </button>

      <div style={styles.coverSection}>
        <img src={work.cover} alt={work.title} style={styles.coverImage} />
        <div style={styles.coverOverlay}>
          <div style={styles.coverInfo}>
            <h1 style={styles.workTitle}>{work.title}</h1>
            <div style={styles.workMeta}>
              <span>{work.plays.toLocaleString()} 次播放</span>
              <span style={styles.metaDot}>·</span>
              <span>发布于 {work.createdAt}</span>
            </div>
            <div style={styles.playerControls}>
              <button
                style={{
                  ...styles.playBtn,
                  backgroundColor: isPlaying ? '#2c2c2e' : '#ff2d55',
                }}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <polygon points="8,5 19,12 8,19" />
                  </svg>
                )}
              </button>
              <div style={styles.progressWrapper}>
                <span style={styles.timeText}>{formatTime(progress)}</span>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${progress}%`,
                    }}
                  />
                </div>
                <span style={styles.timeText}>4:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.contentGrid} data-detail-grid>
        <div style={styles.lyricsSection}>
          <h3 style={styles.sectionTitle}>歌词</h3>
          <div ref={lyricContainerRef} style={styles.lyricsBox}>
            {work.lyrics.map((line, index) => (
              <div
                key={index}
                data-lyric-index={index}
                style={{
                  ...styles.lyricLine,
                  color: currentLyricIndex === index ? '#ff2d55' : '#ffffff',
                  fontWeight: currentLyricIndex === index ? 600 : 400,
                  transition: 'all 0.3s ease',
                }}
              >
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.commentsSection}>
          <h3 style={styles.sectionTitle}>
            评论 <span style={styles.commentCount}>{comments.length}</span>
          </h3>

          <div style={styles.commentInputBox}>
            <input
              style={styles.nameInput}
              placeholder="你的昵称"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <div style={styles.inputRow}>
              <textarea
                style={styles.commentTextarea}
                placeholder="写下你的评论..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
              />
              <button
                style={styles.sendBtn}
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
              >
                发送
              </button>
            </div>
          </div>

          <div style={styles.commentsList}>
            {comments.length === 0 ? (
              <div style={styles.emptyComments}>暂无评论，快来抢沙发吧~</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} style={styles.commentItem}>
                  <img src={comment.avatar} alt={comment.userName} style={styles.avatar} />
                  <div style={styles.commentBody}>
                    <div style={styles.commentHeader}>
                      <span style={styles.userName}>{comment.userName}</span>
                      <span style={styles.timestamp}>{comment.timestamp}</span>
                    </div>
                    <div style={styles.commentContent}>{comment.content}</div>
                    <div style={styles.commentActions}>
                      <span style={styles.likeBtn}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {comment.likes}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    backgroundColor: '#1c1c1e',
    border: 'none',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 24,
    transition: 'background-color 0.2s ease',
  },
  coverSection: {
    position: 'relative',
    width: '100%',
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
    padding: 40,
    paddingBottom: 32,
  },
  coverInfo: {
    maxWidth: 700,
  },
  workTitle: {
    fontSize: 40,
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: 12,
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
  },
  workMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 24,
  },
  metaDot: {
    margin: '0 8px',
  },
  playerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 20px rgba(255,45,85,0.4)',
    flexShrink: 0,
    paddingLeft: 4,
  },
  progressWrapper: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  timeText: {
    fontSize: 13,
    color: '#8e8e93',
    fontFamily: 'monospace',
    width: 40,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff2d55',
    borderRadius: 2,
    transition: 'width 0.2s linear',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 32,
  },
  lyricsSection: {
    minWidth: 0,
  },
  commentsSection: {
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 16,
  },
  commentCount: {
    color: '#ff2d55',
    fontSize: 16,
    marginLeft: 6,
  },
  lyricsBox: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 20,
    maxHeight: 480,
    overflowY: 'auto',
  },
  lyricLine: {
    fontSize: 15,
    lineHeight: '32px',
    padding: '4px 0',
    textAlign: 'center',
  },
  commentInputBox: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  nameInput: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#2c2c2e',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
    outline: 'none',
  },
  inputRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-end',
  },
  commentTextarea: {
    flex: 1,
    padding: '12px 14px',
    backgroundColor: '#2c2c2e',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 14,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    padding: '10px 24px',
    backgroundColor: '#ff2d55',
    color: '#ffffff',
    border: 'none',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    height: 42,
    flexShrink: 0,
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  emptyComments: {
    padding: 40,
    textAlign: 'center',
    color: '#8e8e93',
    fontSize: 14,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
  },
  commentItem: {
    display: 'flex',
    gap: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 12,
    color: '#8e8e93',
  },
  commentContent: {
    fontSize: 14,
    color: '#e5e5ea',
    lineHeight: 1.6,
    marginBottom: 8,
    wordBreak: 'break-word',
  },
  commentActions: {
    display: 'flex',
    gap: 16,
  },
  likeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#8e8e93',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
};

const responsiveStyle = `
  @media (max-width: 1024px) {
    [data-detail-grid] { grid-template-columns: 1fr !important; }
  }
`;

const detailStyle = document.createElement('style');
detailStyle.textContent = responsiveStyle;
document.head.appendChild(detailStyle);

export default WorkDetail;
