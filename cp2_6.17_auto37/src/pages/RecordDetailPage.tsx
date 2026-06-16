import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Download,
  UserPlus,
  UserCheck,
  User,
  Loader2,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useApi } from '../hooks/useApi';
import { RoastRecord, Comment, User as UserType, ControlPoint, FlavorTag } from '../types';
import CurveCanvas from '../components/CurveCanvas';
import ShareCard from '../components/ShareCard';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const CURRENT_USER_ID = 'user-1';
const API_BASE = 'http://localhost:3001';

const pageWrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: 'var(--color-background)',
};

const navBarStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  height: '64px',
  backgroundColor: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const navContentStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '1200px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
};

const backButtonStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 12px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  transition: 'all 0.2s ease',
};

const navTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '20px',
  fontWeight: 700,
  color: 'var(--color-primary-dark)',
};

const mainContentStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '32px 24px',
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '32px',
};

const leftColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const rightColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const desktopGridStyle: React.CSSProperties = {
  ...mainContentStyle,
  gridTemplateColumns: '1fr 400px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'var(--shadow-card)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const curveWrapStyle: React.CSSProperties = {
  width: '100%',
  overflowX: 'auto',
  display: 'flex',
  justifyContent: 'center',
};

const beanOriginTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '28px',
  fontWeight: 700,
  color: 'var(--color-primary-dark)',
  lineHeight: 1.3,
};

const tagsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const getRoastLevelColor = (level: string) => {
  const colors: Record<string, { bg: string; color: string }> = {
    light: { bg: '#e8f5e9', color: '#2e7d32' },
    medium: { bg: '#fff3e0', color: '#ef6c00' },
    dark: { bg: '#3e2723', color: '#ffffff' },
    浅烘: { bg: '#e8f5e9', color: '#2e7d32' },
    中烘: { bg: '#fff3e0', color: '#ef6c00' },
    深烘: { bg: '#3e2723', color: '#ffffff' },
    极浅烘: { bg: '#e3f2fd', color: '#1565c0' },
    中深烘: { bg: '#fbe9e7', color: '#d84315' },
  };
  return colors[level] || { bg: '#eeeeee', color: '#616161' };
};

const roastLevelTagStyle = (level: string): React.CSSProperties => {
  const c = getRoastLevelColor(level);
  return {
    backgroundColor: c.bg,
    color: c.color,
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
  };
};

const processTagStyle: React.CSSProperties = {
  backgroundColor: '#e3f2fd',
  color: '#1565c0',
  padding: '6px 14px',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
};

const flavorTagStyle: React.CSSProperties = {
  backgroundColor: '#f5f0e8',
  color: '#795548',
  padding: '5px 12px',
  borderRadius: '8px',
  fontSize: '13px',
};

const notesStyle: React.CSSProperties = {
  backgroundColor: '#fdf8f3',
  borderRadius: '12px',
  padding: '16px 20px',
  fontSize: '14px',
  lineHeight: 1.8,
  color: 'var(--color-text-secondary)',
  border: '1px solid #f0e6d8',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const userBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '16px 20px',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'var(--shadow-card)',
};

const avatarStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '2px solid #fff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  flexShrink: 0,
};

const avatarPlaceholderStyle: React.CSSProperties = {
  ...avatarStyle,
  backgroundColor: 'var(--color-primary-light)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
};

const userInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
};

const nicknameStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
};

const userStatsStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  marginTop: '2px',
};

const actionButtonsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const followButtonStyle = (isFollowing: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: isFollowing ? 'transparent' : 'var(--color-primary)',
  color: isFollowing ? 'var(--color-primary)' : 'white',
  border: `1px solid ${isFollowing ? 'var(--color-primary)' : 'transparent'}`,
  padding: '8px 16px',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
});

const likeButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'transparent',
  border: '1px solid var(--color-border)',
  padding: '8px 16px',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const shareCardPreviewStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'var(--shadow-card)',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  position: 'sticky',
  top: '88px',
};

const shareCardContainerStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  backgroundColor: '#f5f0e8',
  borderRadius: '12px',
  padding: '24px',
};

const downloadButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  padding: '12px 20px',
  backgroundColor: 'var(--color-primary)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const commentsSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const commentInputStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '16px',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-card)',
  boxShadow: 'var(--shadow-card)',
};

const commentAvatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  backgroundColor: 'var(--color-primary-light)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  flexShrink: 0,
};

const textareaWrapStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '80px',
  padding: '12px',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  fontSize: '14px',
  lineHeight: 1.6,
  resize: 'vertical',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s ease',
};

const submitButtonStyle = (disabled: boolean): React.CSSProperties => ({
  alignSelf: 'flex-end',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  backgroundColor: disabled ? 'var(--color-border)' : 'var(--color-primary)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
});

const commentListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const commentItemStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '16px',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-card)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

const commentContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const commentHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const commentNicknameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
};

const commentTimeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-muted)',
};

const commentTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.7,
  color: 'var(--color-text-secondary)',
  wordBreak: 'break-word',
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '80px 20px',
  color: 'var(--color-text-muted)',
};

const errorStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 20px',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
  gap: '8px',
};

const emptyCommentsStyle: React.CSSProperties = {
  padding: '32px 20px',
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  fontSize: '14px',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-card)',
};

interface LikeResponse {
  success: boolean;
  likes: number;
  liked: boolean;
}

interface FollowResponse {
  success: boolean;
  following: boolean;
}

interface CommentsResponse {
  comments: Comment[];
}

const roastLevelMap: Record<string, 'light' | 'medium' | 'dark'> = {
  light: 'light',
  medium: 'medium',
  dark: 'dark',
  浅烘: 'light',
  中烘: 'medium',
  深烘: 'dark',
  极浅烘: 'light',
  中深烘: 'medium',
};

const RecordDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const recordApi = useApi<RoastRecord>();
  const commentsApi = useApi<CommentsResponse>();
  const likeApi = useApi<LikeResponse>();
  const followApi = useApi<FollowResponse>();
  const postCommentApi = useApi<Comment>();

  const [record, setRecord] = useState<RoastRecord | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isHeartBouncing, setIsHeartBouncing] = useState(false);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    const result = await recordApi.request(`${API_BASE}/api/records/${id}`);
    if (result) {
      setRecord(result);
      setIsLiked(result.likedBy?.includes(CURRENT_USER_ID) || false);
    }
  }, [id, recordApi]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    const result = await commentsApi.request(`${API_BASE}/api/records/${id}/comments`);
    if (result) {
      setComments(result.comments);
    }
  }, [id, commentsApi]);

  useEffect(() => {
    fetchRecord();
    fetchComments();
  }, [fetchRecord, fetchComments]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleLike = async () => {
    if (!record) return;

    const wasLiked = isLiked;

    setIsHeartBouncing(true);
    setTimeout(() => setIsHeartBouncing(false), 200);

    setIsLiked(!wasLiked);
    setRecord((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        likes: wasLiked ? prev.likes - 1 : prev.likes + 1,
        likedBy: wasLiked
          ? prev.likedBy.filter((uid) => uid !== CURRENT_USER_ID)
          : [...prev.likedBy, CURRENT_USER_ID],
      };
    });

    try {
      await likeApi.request(`${API_BASE}/api/records/${record.id}/like`, {
        method: 'POST',
        body: JSON.stringify({ userId: CURRENT_USER_ID }),
      });
    } catch (err) {
      console.error('Failed to like record:', err);
      setIsLiked(wasLiked);
      setRecord((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          likes: wasLiked ? prev.likes + 1 : prev.likes - 1,
        };
      });
    }
  };

  const handleFollow = async () => {
    if (!record?.userId || record.userId === CURRENT_USER_ID) return;

    const wasFollowing = isFollowing;

    setIsFollowing(!wasFollowing);

    try {
      await followApi.request(`${API_BASE}/api/users/${record.userId}/follow`, {
        method: 'POST',
        body: JSON.stringify({ followerId: CURRENT_USER_ID }),
      });
    } catch (err) {
      console.error('Failed to follow user:', err);
      setIsFollowing(wasFollowing);
    }
  };

  const handleSubmitComment = async () => {
    if (!record || !commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await postCommentApi.request(
        `${API_BASE}/api/records/${record.id}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            userId: CURRENT_USER_ID,
            content: commentText.trim(),
          }),
        }
      );

      if (result) {
        setComments((prev) => [result, ...prev]);
        setCommentText('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    console.log('Download share card');
  };

  const getShareCardRoastLevel = (level: string): 'light' | 'medium' | 'dark' => {
    return roastLevelMap[level] || 'medium';
  };

  const getFlavorTagsForShareCard = (tags: string[] | FlavorTag[]): FlavorTag[] => {
    if (tags.length === 0) return [];
    if (typeof tags[0] === 'string') {
      return (tags as string[]).map((name, idx) => ({
        id: `flavor-${idx}`,
        name,
        selected: true,
      }));
    }
    return tags as FlavorTag[];
  };

  if (recordApi.loading) {
    return (
      <div style={pageWrapStyle}>
        <div style={navBarStyle}>
          <div style={navContentStyle}>
            <button style={backButtonStyle} onClick={handleBack}>
              <ArrowLeft size={18} />
              <span>返回</span>
            </button>
            <h1 style={navTitleStyle}>烘焙记录详情</h1>
          </div>
        </div>
        <div style={loadingStyle}>
          <Loader2 size={28} className="animate-spin" style={{ marginRight: '8px' }} />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (recordApi.error || !record) {
    return (
      <div style={pageWrapStyle}>
        <div style={navBarStyle}>
          <div style={navContentStyle}>
            <button style={backButtonStyle} onClick={handleBack}>
              <ArrowLeft size={18} />
              <span>返回</span>
            </button>
            <h1 style={navTitleStyle}>烘焙记录详情</h1>
          </div>
        </div>
        <div style={errorStyle}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>记录不存在或加载失败</p>
          <p style={{ fontSize: '14px' }}>请返回上一页重试</p>
        </div>
      </div>
    );
  }

  const isSelf = record.userId === CURRENT_USER_ID;
  const flavorTagsList = Array.isArray(record.flavorTags) ? record.flavorTags : [];

  return (
    <div style={pageWrapStyle}>
      <div style={navBarStyle}>
        <div style={navContentStyle}>
          <button
            style={backButtonStyle}
            onClick={handleBack}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f0e8';
              (e.currentTarget as HTMLButtonElement).style.color =
                'var(--color-primary-dark)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color =
                'var(--color-text-secondary)';
            }}
          >
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <h1 style={navTitleStyle}>烘焙记录详情</h1>
        </div>
      </div>

      <main
        style={mainContentStyle}
        className="record-detail-main"
      >
        <div style={leftColumnStyle}>
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>
              <span>📈</span>
              <span>烘焙曲线</span>
            </h2>
            <div style={curveWrapStyle}>
              <CurveCanvas
                controlPoints={record.controlPoints as ControlPoint[]}
                readOnly={true}
              />
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h1 style={beanOriginTitleStyle}>{record.beanOrigin}</h1>
              <div style={tagsRowStyle}>
                <span style={processTagStyle}>{record.processMethod}</span>
                <span style={roastLevelTagStyle(record.roastLevel)}>
                  {record.roastLevel === 'light' ||
                  record.roastLevel === 'medium' ||
                  record.roastLevel === 'dark'
                    ? { light: '浅烘', medium: '中烘', dark: '深烘' }[record.roastLevel]
                    : record.roastLevel}
                </span>
              </div>
              {flavorTagsList.length > 0 && (
                <div style={tagsRowStyle}>
                  {flavorTagsList.map((tag, idx) => {
                    const tagName = typeof tag === 'string' ? tag : (tag as FlavorTag).name;
                    const tagId =
                      typeof tag === 'string' ? `tag-${idx}` : (tag as FlavorTag).id;
                    return (
                      <span key={tagId} style={flavorTagStyle}>
                        #{tagName}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {record.notes && (
            <div style={cardStyle}>
              <h2 style={cardTitleStyle}>
                <span>📝</span>
                <span>烘焙笔记</span>
              </h2>
              <div style={notesStyle}>{record.notes}</div>
            </div>
          )}

          <div style={userBarStyle}>
            {record.user?.avatar ? (
              <img
                src={record.user.avatar}
                alt={record.user.username || '用户'}
                style={avatarStyle}
              />
            ) : (
              <div style={avatarPlaceholderStyle}>
                <User size={22} />
              </div>
            )}
            <div style={userInfoStyle}>
              <span style={nicknameStyle}>
                {record.user?.username || '匿名用户'}
              </span>
              <span style={userStatsStyle}>
                {record.user?.followers || 0} 粉丝 ·{' '}
                {dayjs(record.createdAt).format('YYYY年MM月DD日')}
              </span>
            </div>
            <div style={actionButtonsStyle}>
              {!isSelf && (
                <button
                  style={followButtonStyle(isFollowing)}
                  onClick={handleFollow}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    if (isFollowing) {
                      btn.style.backgroundColor = '#ffebee';
                      btn.style.borderColor = 'var(--color-secondary)';
                      btn.style.color = 'var(--color-secondary)';
                    } else {
                      btn.style.backgroundColor = 'var(--color-primary-dark)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    if (isFollowing) {
                      btn.style.backgroundColor = 'transparent';
                      btn.style.borderColor = 'var(--color-primary)';
                      btn.style.color = 'var(--color-primary)';
                    } else {
                      btn.style.backgroundColor = 'var(--color-primary)';
                    }
                  }}
                >
                  {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                  {isFollowing ? '已关注' : '关注'}
                </button>
              )}
              <button
                style={{
                  ...likeButtonStyle,
                  backgroundColor: isLiked ? '#fff5f5' : 'transparent',
                  borderColor: isLiked ? '#ffcdd2' : 'var(--color-border)',
                }}
                onClick={handleLike}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.backgroundColor = '#fff5f5';
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.backgroundColor = isLiked ? '#fff5f5' : 'transparent';
                }}
              >
                <Heart
                  size={18}
                  fill={isLiked ? 'var(--color-secondary)' : 'none'}
                  color={isLiked ? 'var(--color-secondary)' : 'var(--color-text-muted)'}
                  strokeWidth={2}
                  className={isHeartBouncing ? 'heart-bounce' : ''}
                />
                <span
                  style={{
                    color: isLiked
                      ? 'var(--color-secondary)'
                      : 'var(--color-text-secondary)',
                    fontWeight: 500,
                  }}
                >
                  {record.likes}
                </span>
              </button>
            </div>
          </div>

          <div style={commentsSectionStyle}>
            <div style={commentInputStyle}>
              <div style={commentAvatarStyle}>
                <User size={18} />
              </div>
              <div style={textareaWrapStyle}>
                <textarea
                  style={textareaStyle}
                  placeholder="写下你的评论..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmitComment();
                    }
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLTextAreaElement).style.borderColor =
                      'var(--color-primary)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLTextAreaElement).style.borderColor =
                      'var(--color-border)';
                  }}
                />
                <button
                  style={submitButtonStyle(!commentText.trim() || isSubmitting)}
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmitting}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    if (!btn.disabled) {
                      btn.style.backgroundColor = 'var(--color-primary-dark)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    if (!btn.disabled) {
                      btn.style.backgroundColor = 'var(--color-primary)';
                    }
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {isSubmitting ? '发送中...' : '发布'}
                </button>
              </div>
            </div>

            <h2 style={{ ...cardTitleStyle, padding: '0 4px' }}>
              <MessageCircle size={20} />
              <span>评论 ({comments.length})</span>
            </h2>

            {commentsApi.loading ? (
              <div style={{ ...loadingStyle, padding: '40px 20px' }}>
                <Loader2 size={24} className="animate-spin" style={{ marginRight: '8px' }} />
                <span>加载评论中...</span>
              </div>
            ) : comments.length === 0 ? (
              <div style={emptyCommentsStyle}>
                <MessageCircle
                  size={28}
                  style={{ margin: '0 auto 8px', opacity: 0.4 }}
                />
                <p>暂无评论，来发表第一条评论吧</p>
              </div>
            ) : (
              <div style={commentListStyle}>
                {comments.map((comment) => (
                  <div key={comment.id} style={commentItemStyle}>
                    {comment.user?.avatar ? (
                      <img
                        src={comment.user.avatar}
                        alt={comment.user.username || '用户'}
                        style={{
                          ...avatarStyle,
                          width: '36px',
                          height: '36px',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          ...commentAvatarStyle,
                          width: '36px',
                          height: '36px',
                          flexShrink: 0,
                        }}
                      >
                        <User size={16} />
                      </div>
                    )}
                    <div style={commentContentStyle}>
                      <div style={commentHeaderStyle}>
                        <span style={commentNicknameStyle}>
                          {comment.user?.username || '匿名用户'}
                        </span>
                        <span style={commentTimeStyle}>
                          {dayjs(comment.createdAt).fromNow()}
                        </span>
                      </div>
                      <div style={commentTextStyle}>{comment.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={rightColumnStyle}>
          <div style={shareCardPreviewStyle}>
            <h2 style={cardTitleStyle}>
              <span>🎴</span>
              <span>分享卡片预览</span>
            </h2>
            <div style={shareCardContainerStyle}>
              <div
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  transform: 'scale(1)',
                  transformOrigin: 'top center',
                }}
              >
                <ShareCard
                  beanOrigin={record.beanOrigin}
                  processMethod={record.processMethod}
                  roastLevel={getShareCardRoastLevel(record.roastLevel)}
                  flavorTags={getFlavorTagsForShareCard(record.flavorTags)}
                  notes={record.notes}
                  controlPoints={record.controlPoints as ControlPoint[]}
                  curveImage={record.curveImage}
                  userName={record.user?.username || '烘焙师'}
                  userAvatar={record.user?.avatar}
                />
              </div>
            </div>
            <button
              style={downloadButtonStyle}
              onClick={handleDownload}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'var(--color-primary-dark)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'var(--color-primary)';
              }}
            >
              <Download size={18} />
              下载图片
            </button>
          </div>
        </div>
      </main>

      <style>{`
        @media (min-width: 1024px) {
          .record-detail-main {
            grid-template-columns: 1fr 400px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default RecordDetailPage;
