import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Heart, Download, Dice6, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Game, Comment } from '../types';
import { gameApi, getUserId, getUserName } from '../api/client';

export default function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userId] = useState(getUserId());
  const [userName, setUserName] = useState(getUserName());

  const [game, setGame] = useState<Game | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const [hoveredStar, setHoveredStar] = useState(0);
  const [isRating, setIsRating] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [ratingFlash, setRatingFlash] = useState(false);

  const [commentRating, setCommentRating] = useState(5);
  const [commentContent, setCommentContent] = useState('');
  const [commentUserName, setCommentUserName] = useState(userName);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [gameData, commentsData] = await Promise.all([
        gameApi.getGameById(id),
        gameApi.getComments(id)
      ]);
      setGame(gameData);
      setComments(commentsData);
      if (gameData) {
        setIsLiked(gameData.likedBy.includes(userId));
        setLikeCount(gameData.likeCount);
        setAverageRating(gameData.averageRating);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, userId]);

  const handleRating = async (score: number) => {
    if (!id || isRating) return;
    try {
      setIsRating(true);
      setRatingFlash(true);
      const result = await gameApi.rateGame(id, userId, score);
      if (result) {
        setAverageRating(result.averageRating);
      }
      setTimeout(() => setRatingFlash(false), 300);
    } catch (error) {
      console.error('评分失败:', error);
    } finally {
      setIsRating(false);
    }
  };

  const handleLike = async () => {
    if (!id || isLiking) return;
    try {
      setIsLiking(true);
      setLikeAnimating(true);
      const result = await gameApi.toggleLike(id, userId);
      if (result) {
        setIsLiked(result.liked);
        setLikeCount(result.likeCount);
      }
      setTimeout(() => setLikeAnimating(false), 400);
    } catch (error) {
      console.error('点赞失败:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!id || !commentContent.trim() || submittingComment) return;
    try {
      setSubmittingComment(true);
      const result = await gameApi.addComment(
        id,
        userId,
        commentUserName || userName,
        commentRating,
        commentContent.trim()
      );
      if (result) {
        setComments(prev => [result, ...prev]);
        setCommentContent('');
        setCommentRating(5);
        localStorage.setItem('gameUserName', commentUserName || userName);
        const refreshedGame = await gameApi.getGameById(id);
        if (refreshedGame) {
          setAverageRating(refreshedGame.averageRating);
        }
      }
    } catch (error) {
      console.error('发表评论失败:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id || !game || isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      await gameApi.downloadPdf(id, game.name);
    } catch (error) {
      console.error('生成PDF失败:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderStars = (rating: number, interactive = false, size = 20) => (
    <div className="flex gap-1 items-center" onMouseLeave={interactive ? () => setHoveredStar(0) : undefined}>
      {[1, 2, 3, 4, 5].map(starNum => {
        const displayRating = interactive && hoveredStar ? hoveredStar : rating;
        const isActive = displayRating >= starNum;
        const isHovered = interactive && hoveredStar >= starNum;
        return (
          <Star
            key={starNum}
            size={size}
            fill={isActive ? (isHovered ? '#FCD34D' : '#F59E0B') : 'none'}
            style={{
              color: isActive ? (isHovered ? '#FCD34D' : '#F59E0B') : '#D1D5DB',
              cursor: interactive ? 'pointer' : 'default',
              transition: 'all 0.2s ease-out',
              padding: '2px',
              transform: interactive && ratingFlash && Math.round(rating) >= starNum ? 'scale(1.2)' : 'scale(1)'
            }}
            onMouseEnter={interactive ? () => setHoveredStar(starNum) : undefined}
            onClick={interactive ? () => handleRating(starNum) : undefined}
          />
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F3F4F6 0%, #F9FAFB 100%)' }}>
        <header
          className="fixed top-0 left-0 right-0 z-50 px-8 py-4 flex items-center gap-3"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
          }}
        >
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', transition: 'all 0.2s ease-out' }}>
            <ArrowLeft size={20} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>返回首页</span>
          </button>
        </header>
        <div className="max-w-7xl mx-auto px-8 pt-28 pb-16">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-3/5 animate-pulse" style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
              <div className="h-8 rounded mb-6" style={{ background: '#E5E7EB', width: '60%' }} />
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="h-4 rounded mb-4" style={{ background: i % 3 === 0 ? '#F3F4F6' : '#E5E7EB', width: `${70 + Math.random() * 30}%` }} />
              ))}
            </div>
            <div className="md:w-2/5 space-y-6">
              <div className="h-48 rounded-2xl animate-pulse" style={{ background: '#fff', border: '1px solid #E5E7EB' }} />
              <div className="h-64 rounded-2xl animate-pulse" style={{ background: '#fff', border: '1px solid #E5E7EB' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F3F4F6 0%, #F9FAFB 100%)' }}>
        <div className="text-center">
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#6B7280' }}>游戏不存在</p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              borderRadius: '12px',
              background: '#3B82F6',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              transition: 'all 0.2s ease-out'
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F3F4F6 0%, #F9FAFB 100%)' }}>
      <header
        className="fixed top-0 left-0 right-0 z-50 px-8 py-4 flex items-center justify-between"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#4B5563',
            padding: '8px 12px',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F3F4F6';
            e.currentTarget.style.color = '#1F2937';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#4B5563';
          }}
        >
          <ArrowLeft size={20} />
          返回首页
        </button>
        <div className="flex items-center gap-3">
          <Dice6 size={24} style={{ color: '#F59E0B' }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: '#1F2937' }}>桌游集市</span>
        </div>
      </header>

      <main className="pt-24">
        <div className="max-w-7xl mx-auto px-8 pb-16">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-3/5">
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div
                  className="rounded-2xl overflow-hidden mb-8"
                  style={{ height: '280px', marginBottom: '32px' }}
                >
                  <img
                    src={game.coverImage}
                    alt={game.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '16px'
                    }}
                  />
                </div>

                <article
                  className="prose max-w-none"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#374151', lineHeight: 1.8 }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: '32px',
                            fontWeight: 700,
                            color: '#1F2937',
                            marginBottom: '24px',
                            marginTop: 0,
                            borderBottom: '2px solid #F59E0B',
                            paddingBottom: '12px'
                          }}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: '24px',
                            fontWeight: 600,
                            color: '#1F2937',
                            marginTop: '32px',
                            marginBottom: '16px'
                          }}
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: '20px',
                            fontWeight: 600,
                            color: '#374151',
                            marginTop: '24px',
                            marginBottom: '12px'
                          }}
                        >
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p style={{ marginBottom: '16px', fontSize: '15px', color: '#4B5563' }}>
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ marginBottom: '16px', paddingLeft: '24px', color: '#4B5563' }}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ marginBottom: '16px', paddingLeft: '24px', color: '#4B5563' }}>
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: '8px', fontSize: '15px' }}>
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ color: '#1F2937', fontWeight: 600 }}>
                          {children}
                        </strong>
                      )
                    }}
                  >
                    {game.fullRules}
                  </ReactMarkdown>
                </article>
              </div>
            </div>

            <div className="md:w-2/5">
              <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="flex items-center gap-4">
                    {game.designer.avatar && (
                      <img
                        src={game.designer.avatar}
                        alt={game.designer.name}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #E5E7EB'
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#1F2937',
                          margin: 0,
                          marginBottom: '4px'
                        }}
                      >
                        {game.designer.name}
                      </p>
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13px',
                          color: '#6B7280',
                          margin: 0,
                          lineHeight: 1.5
                        }}
                      >
                        {game.designer.bio || '桌游设计师'}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <h4
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      margin: 0,
                      marginBottom: '16px'
                    }}
                  >
                    游戏标签
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {game.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-block',
                          padding: '6px 16px',
                          borderRadius: '9999px',
                          background: '#F3F4F6',
                          color: '#4B5563',
                          fontSize: '13px',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 500
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        margin: 0
                      }}
                    >
                      游戏评分
                    </h4>
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '28px',
                        fontWeight: 700,
                        color: '#F59E0B'
                      }}
                    >
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    {renderStars(averageRating, true, 24)}
                  </div>

                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#6B7280', margin: 0 }}>
                    点击星星进行评分
                  </p>
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={handleLike}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4"
                      style={{
                        borderRadius: '12px',
                        border: isLiked ? '1px solid #FECACA' : '1px solid #E5E7EB',
                        background: isLiked ? '#FEF2F2' : '#F9FAFB',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-out',
                        color: isLiked ? '#EF4444' : '#6B7280',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: '14px',
                        minHeight: '48px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isLiked) {
                          e.currentTarget.style.background = '#F3F4F6';
                          e.currentTarget.style.color = '#1F2937';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLiked) {
                          e.currentTarget.style.background = '#F9FAFB';
                          e.currentTarget.style.color = '#6B7280';
                        }
                      }}
                    >
                      <Heart
                        size={20}
                        fill={isLiked ? '#EF4444' : 'none'}
                        style={{
                          color: isLiked ? '#EF4444' : 'currentColor',
                          transition: 'all 0.2s ease-out',
                          transform: likeAnimating ? 'scale(0.8)' : 'scale(1)',
                          animation: likeAnimating ? 'heartBounce 0.4s ease-out' : 'none'
                        }}
                      />
                      {isLiked ? '已点赞' : '点赞'} · {likeCount}
                    </button>

                    <button
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4"
                      style={{
                        borderRadius: '12px',
                        border: 'none',
                        background: isGeneratingPdf
                          ? 'linear-gradient(135deg, #93C5FD 0%, #60A5FA 100%)'
                          : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                        color: '#FFFFFF',
                        cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease-out',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: '14px',
                        boxShadow: isGeneratingPdf ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)',
                        minHeight: '48px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isGeneratingPdf) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isGeneratingPdf ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)';
                      }}
                    >
                      <Download size={20} style={{ animation: isGeneratingPdf ? 'spin 1s linear infinite' : 'none' }} />
                      {isGeneratingPdf ? '生成中...' : '生成PDF'}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <h4
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      margin: 0,
                      marginBottom: '20px'
                    }}
                  >
                    发表评论
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      value={commentUserName}
                      onChange={(e) => setCommentUserName(e.target.value)}
                      placeholder="你的昵称"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #E5E7EB',
                        background: '#F9FAFB',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '14px',
                        color: '#1F2937',
                        outline: 'none',
                        transition: 'all 0.2s ease-out',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#3B82F6';
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.background = '#F9FAFB';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />

                    <div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#6B7280', margin: 0, marginBottom: '8px' }}>
                        你的评分：
                      </p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <Star
                            key={starNum}
                            size={24}
                            fill={commentRating >= starNum ? '#F59E0B' : 'none'}
                            style={{
                              color: commentRating >= starNum ? '#F59E0B' : '#D1D5DB',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-out',
                              padding: '2px'
                            }}
                            onClick={() => setCommentRating(starNum)}
                          />
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={commentContent}
