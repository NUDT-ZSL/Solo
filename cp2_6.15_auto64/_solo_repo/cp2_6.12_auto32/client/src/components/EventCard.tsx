import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Event, Comment, THEME_COLORS } from '../types';
import { timelineAPI } from '../api';

interface EventCardProps {
  event: Event;
  index: number;
  themeColor: string;
  isLeft?: boolean;
  isEditor?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string, targetIndex: number) => void;
  onDelete?: (id: string) => void;
  onEdit?: (event: Event) => void;
  onLikeUpdate?: (eventId: string, likes: number) => void;
}

function EventCard({
  event,
  index,
  themeColor,
  isLeft = true,
  isEditor = false,
  onDragStart,
  onDragEnd,
  onDelete,
  onEdit,
  onLikeUpdate
}: EventCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(event.likes);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartIndex = useRef(0);

  const theme = THEME_COLORS.find(t => t.primary === themeColor) || THEME_COLORS[0];

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditor || !onDragStart) return;
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartIndex.current = index;
    onDragStart(event.id);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    // 拖拽逻辑已在父组件处理
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (onDragEnd) {
      onDragEnd(event.id, index);
    }
  };

  const loadComments = async () => {
    try {
      const res = await timelineAPI.getComments(event.id);
      setComments(res.data);
    } catch (err) {
      console.error('加载评论失败', err);
    }
  };

  const handleLike = async () => {
    try {
      const res = await timelineAPI.likeEvent(event.id);
      setLikes(res.data.likes);
      setIsLiked(true);
      if (onLikeUpdate) {
        onLikeUpdate(event.id, res.data.likes);
      }
    } catch (err) {
      console.error('点赞失败', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !nickname.trim()) return;
    try {
      const res = await timelineAPI.addComment(event.id, {
        nickname: nickname.trim(),
        content: newComment.trim()
      });
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (err) {
      console.error('评论失败', err);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.5,
        ease: 'easeOut'
      }
    })
  };

  const detailVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  const commentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05 }
    })
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        custom={index}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={cardVariants}
        whileHover={{ scale: 1.02 }}
        style={{
          ...styles.card,
          background: theme.bg,
          borderLeft: `4px solid ${theme.primary}`,
          marginLeft: isLeft ? '0' : 'auto',
          cursor: isEditor ? 'grab' : 'pointer',
          opacity: isDragging ? 0.5 : 1,
          boxShadow: isDragging
            ? '0 10px 40px rgba(0,0,0,0.2)'
            : '0 4px 20px rgba(0,0,0,0.06)'
        }}
        onClick={() => !isEditor && setShowDetail(true)}
        onMouseDown={isEditor ? handleDragStart : undefined}
        onMouseMove={isDragging ? handleDragMove : undefined}
        onMouseUp={isDragging ? handleDragEnd : undefined}
        onMouseLeave={isDragging ? handleDragEnd : undefined}
      >
        {isEditor && (
          <div style={styles.editorControls}>
            <button
              style={styles.editBtn}
              onClick={(e) => {
                e.stopPropagation();
                onEdit && onEdit(event);
              }}
            >
              编辑
            </button>
            <button
              style={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                onDelete && onDelete(event.id);
              }}
            >
              删除
            </button>
          </div>
        )}

        <div style={{ ...styles.date, color: theme.primary }}>{event.date}</div>
        <h3 style={{ ...styles.title, color: theme.text }}>{event.title}</h3>
        <p style={styles.description}>
          {event.description.length > 100
            ? event.description.slice(0, 100) + '...'
            : event.description}
        </p>

        {event.coverImage && (
          <div style={styles.imageContainer}>
            <img
              src={event.coverImage}
              alt={event.title}
              style={styles.coverImage}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {!isEditor && (
          <div style={styles.cardFooter}>
            <motion.button
              whileTap={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3 }}
              style={{
                ...styles.likeBtn,
                color: isLiked ? '#ef4444' : '#888'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
            >
              <span>{isLiked ? '❤️' : '🤍'}</span>
              <span style={styles.likeCount}>{likes}</span>
            </motion.button>
            <span style={styles.commentCount}>💬 {comments.length}</span>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              variants={detailVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                ...styles.modal,
                borderTop: `4px solid ${theme.primary}`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                style={styles.closeBtn}
                onClick={() => setShowDetail(false)}
              >
                ✕
              </button>

              <div style={{ ...styles.detailDate, color: theme.primary }}>
                {event.date}
              </div>
              <h2 style={{ ...styles.detailTitle, color: theme.text }}>
                {event.title}
              </h2>

              {event.coverImage && (
                <div style={styles.detailImageContainer}>
                  <img
                    src={event.coverImage}
                    alt={event.title}
                    style={styles.detailImage}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <p style={styles.detailDescription}>{event.description}</p>

              <div style={styles.likeSection}>
                <motion.button
                  whileTap={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.3 }}
                  style={{
                    ...styles.bigLikeBtn,
                    background: isLiked
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : '#f3f4f6',
                    color: isLiked ? 'white' : '#666'
                  }}
                  onClick={handleLike}
                >
                  {isLiked ? '❤️ 已点赞' : '🤍 点赞'}
                  <span style={styles.bigLikeCount}>{likes}</span>
                </motion.button>
              </div>

              <div style={styles.commentsSection}>
                <h4 style={styles.commentsTitle}>评论 ({comments.length})</h4>

                <div style={styles.commentInputArea}>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    style={styles.nicknameInput}
                    placeholder="您的昵称"
                    maxLength={20}
                  />
                  <div style={styles.commentInputRow}>
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={styles.commentInput}
                      placeholder="写下您的评论..."
                      maxLength={150}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment();
                      }}
                    />
                    <button
                      style={styles.sendBtn}
                      onClick={handleAddComment}
                    >
                      发送
                    </button>
                  </div>
                </div>

                <div style={styles.commentsList}>
                  <AnimatePresence>
                    {comments.map((comment, i) => (
                      <motion.div
                        key={comment.id}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -10 }}
                        variants={commentVariants}
                        style={styles.commentBubble}
                      >
                        <div style={styles.commentNickname}>{comment.nickname}</div>
                        <div style={styles.commentContent}>{comment.content}</div>
                        <div style={styles.commentTime}>
                          {new Date(comment.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {comments.length === 0 && (
                    <p style={styles.noComments}>暂无评论，来抢沙发吧~</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '24px',
    width: '45%',
    transition: 'all 0.3s ease',
    position: 'relative'
  },
  editorControls: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    display: 'flex',
    gap: '6px',
    opacity: 0,
    transition: 'opacity 0.3s ease'
  },
  editBtn: {
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.9)',
    color: '#3b82f6',
    borderRadius: '6px',
    fontSize: '12px',
    transition: 'all 0.3s ease'
  },
  deleteBtn: {
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.9)',
    color: '#ef4444',
    borderRadius: '6px',
    fontSize: '12px',
    transition: 'all 0.3s ease'
  },
  date: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px'
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '10px'
  },
  description: {
    fontSize: '14px',
    color: '#555',
    lineHeight: 1.6,
    marginBottom: '12px'
  },
  imageContainer: {
    width: '100%',
    height: '120px',
    overflow: 'hidden',
    borderRadius: '8px',
    marginTop: '10px'
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(0,0,0,0.06)'
  },
  likeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    fontSize: '14px',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'all 0.3s ease'
  },
  likeCount: {
    fontSize: '13px',
    fontWeight: 500
  },
  commentCount: {
    fontSize: '13px',
    color: '#888'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: '32px',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#f3f4f6',
    color: '#666',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  detailDate: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px'
  },
  detailTitle: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '16px'
  },
  detailImageContainer: {
    width: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '20px'
  },
  detailImage: {
    width: '100%',
    maxHeight: '300px',
    objectFit: 'cover'
  },
  detailDescription: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#444',
    marginBottom: '24px',
    whiteSpace: 'pre-wrap'
  },
  likeSection: {
    marginBottom: '24px',
    textAlign: 'center'
  },
  bigLikeBtn: {
    padding: '12px 32px',
    borderRadius: '30px',
    fontSize: '16px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.3s ease'
  },
  bigLikeCount: {
    marginLeft: '4px'
  },
  commentsSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '20px'
  },
  commentsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '16px'
  },
  commentInputArea: {
    marginBottom: '20px'
  },
  nicknameInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '10px',
    transition: 'all 0.3s ease'
  },
  commentInputRow: {
    display: 'flex',
    gap: '10px'
  },
  commentInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  sendBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  commentBubble: {
    background: '#f8f9fa',
    padding: '12px 16px',
    borderRadius: '12px',
    borderBottomLeftRadius: '4px'
  },
  commentNickname: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#3b82f6',
    marginBottom: '4px'
  },
  commentContent: {
    fontSize: '14px',
    color: '#444',
    lineHeight: 1.5,
    marginBottom: '6px'
  },
  commentTime: {
    fontSize: '11px',
    color: '#999'
  },
  noComments: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: '14px',
    padding: '20px'
  }
};

export default EventCard;
