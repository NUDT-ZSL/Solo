import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { Project, Comment, FundingRecord } from '../types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

const getFingerprint = (): string => {
  let fp = localStorage.getItem('browser_fingerprint');
  if (!fp) {
    fp = uuidv4();
    localStorage.setItem('browser_fingerprint', fp);
  }
  return fp;
};

const canLike = (projectId: string): boolean => {
  const key = `last_like_${projectId}`;
  const lastTime = localStorage.getItem(key);
  if (!lastTime) return true;
  return Date.now() - parseInt(lastTime) >= TWELVE_HOURS;
};

const recordLike = (projectId: string) => {
  const key = `last_like_${projectId}`;
  localStorage.setItem(key, Date.now().toString());
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [fundingRecords, setFundingRecords] = useState<FundingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageOpacity, setImageOpacity] = useState(1);

  const [likeCount, setLikeCount] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [canLikeThis, setCanLikeThis] = useState(true);

  const [fundAmount, setFundAmount] = useState('10');
  const [fundNickname, setFundNickname] = useState('');
  const [fundAnimating, setFundAnimating] = useState(false);
  const [displayFundedAmount, setDisplayFundedAmount] = useState(0);
  const [buttonAnimating, setButtonAnimating] = useState(false);

  const [commentNickname, setCommentNickname] = useState('');
  const [commentContent, setCommentContent] = useState('');

  const [progressWidth, setProgressWidth] = useState(0);

  const autoPlayRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProject(data.project);
        setComments(data.comments);
        setFundingRecords(data.fundingRecords);
        setLikeCount(data.project.likes);
        setDisplayFundedAmount(data.project.fundedAmount);
        setCanLikeThis(canLike(id));
        setLoading(false);
        setTimeout(() => {
          setProgressWidth(data.project.progress);
        }, 100);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!project || project.screenshots.length <= 1) return;

    autoPlayRef.current = window.setInterval(() => {
      setImageOpacity(0);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % project.screenshots.length);
        setImageOpacity(1);
      }, 500);
    }, 4000);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [project]);

  const handlePrevImage = () => {
    if (!project) return;
    setImageOpacity(0);
    setTimeout(() => {
      setCurrentImageIndex(
        (prev) => (prev - 1 + project.screenshots.length) % project.screenshots.length
      );
      setImageOpacity(1);
    }, 250);
  };

  const handleNextImage = () => {
    if (!project) return;
    setImageOpacity(0);
    setTimeout(() => {
      setCurrentImageIndex((prev) => (prev + 1) % project.screenshots.length);
      setImageOpacity(1);
    }, 250);
  };

  const handleLike = () => {
    if (!id || !canLikeThis || likeAnimating) return;

    setLikeAnimating(true);
    fetch(`/api/projects/${id}/like`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        setLikeCount(data.likes);
        recordLike(id);
        setCanLikeThis(false);
        setTimeout(() => setLikeAnimating(false), 300);
      });
  };

  const animateNumber = (from: number, to: number, duration: number, callback: (val: number) => void) => {
    const startTime = Date.now();
    const diff = to - from;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + diff * easeProgress);
      callback(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  const handleFund = () => {
    if (!id || fundAnimating) return;
    const amount = Number(fundAmount);
    if (amount <= 0) return;

    setButtonAnimating(true);
    setTimeout(() => setButtonAnimating(false), 200);

    setFundAnimating(true);
    fetch(`/api/projects/${id}/fund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, nickname: fundNickname }),
    })
      .then((res) => res.json())
      .then((data) => {
        animateNumber(displayFundedAmount, data.fundedAmount, 600, setDisplayFundedAmount);
        setFundingRecords(data.fundingRecords);
        setFundAnimating(false);
        setFundAmount('10');
        setFundNickname('');
      });
  };

  const handleSubmitComment = () => {
    if (!id || !commentContent.trim()) return;

    fetch(`/api/projects/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: commentNickname || '匿名用户', content: commentContent }),
    })
      .then((res) => res.json())
      .then((data) => {
        setComments((prev) => [...prev, data]);
        setCommentNickname('');
        setCommentContent('');
      });
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          color: '#a0a0b0',
          fontSize: '18px',
        }}
      >
        加载中...
      </div>
    );
  }

  if (!project) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          color: '#a0a0b0',
          fontSize: '18px',
        }}
      >
        项目不存在
      </div>
    );
  }

  const progressPercent = Math.min((project.fundedAmount / project.fundingGoal) * 100, 100);

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '60%',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: '#16213e',
            }}
          >
            <img
              src={project.screenshots[currentImageIndex]}
              alt={project.name}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: imageOpacity,
                transition: 'opacity 0.5s ease',
              }}
            />

            {project.screenshots.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: '#ffffff',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={handleNextImage}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: '#ffffff',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                  }}
                >
                  ›
                </button>

                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  {project.screenshots.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setImageOpacity(0);
                        setTimeout(() => {
                          setCurrentImageIndex(idx);
                          setImageOpacity(1);
                        }, 250);
                      }}
                      style={{
                        width: idx === currentImageIndex ? '24px' : '10px',
                        height: '10px',
                        borderRadius: '5px',
                        backgroundColor: idx === currentImageIndex ? '#e94560' : 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '12px', color: '#ffffff' }}>
            {project.name}
          </h1>
          <p style={{ fontSize: '16px', color: '#a0a0b0', marginBottom: '24px' }}>
            开发者：{project.developer}
          </p>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#a0a0b0', fontSize: '14px' }}>开发进度</span>
              <span style={{ color: '#e94560', fontSize: '14px', fontWeight: 500 }}>{project.progress}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: '#16213e',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressWidth}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #e94560, #ff6b81)',
                  borderRadius: '5px',
                  transition: 'width 1.5s ease-out',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#a0a0b0', fontSize: '14px' }}>众筹进度</span>
              <span style={{ color: '#ffffff', fontSize: '14px' }}>
                ¥{displayFundedAmount.toLocaleString()} / ¥{project.fundingGoal.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: '#16213e',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                  borderRadius: '5px',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={handleLike}
              disabled={!canLikeThis}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: canLikeThis ? '#16213e' : '#0f172a',
                color: canLikeThis ? '#ffffff' : '#666',
                fontSize: '16px',
                cursor: canLikeThis ? 'pointer' : 'not-allowed',
                border: '1px solid #2a3f5f',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (canLikeThis) {
                  e.currentTarget.style.borderColor = '#e94560';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a3f5f';
              }}
            >
              <span>❤️</span>
              <span
                style={{
                  display: 'inline-block',
                  transition: 'transform 0.3s ease',
                  transform: likeAnimating ? 'scale(1.3)' : 'scale(1)',
                }}
              >
                {likeCount}
              </span>
            </button>

            {project.demoLink && (
              <a
                href={project.demoLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  backgroundColor: '#16213e',
                  color: '#ffffff',
                  fontSize: '16px',
                  cursor: 'pointer',
                  border: '1px solid #2a3f5f',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#e94560';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2a3f5f';
                }}
              >
                🎮 试玩Demo
              </a>
            )}
          </div>

          <div
            style={{
              padding: '20px',
              backgroundColor: '#16213e',
              borderRadius: '12px',
              marginTop: 'auto',
            }}
          >
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#ffffff' }}>支持项目</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="昵称（可选）"
                value={fundNickname}
                onChange={(e) => setFundNickname(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #2a3f5f',
                  backgroundColor: '#1a1a2e',
                  color: '#ffffff',
                  fontSize: '14px',
                }}
              />
              <input
                type="number"
                placeholder="金额"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                style={{
                  width: '100px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #2a3f5f',
                  backgroundColor: '#1a1a2e',
                  color: '#ffffff',
                  fontSize: '14px',
                }}
              />
            </div>
            <button
              onClick={handleFund}
              disabled={fundAnimating || !fundAmount || Number(fundAmount) <= 0}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: '#e94560',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 500,
                cursor: fundAnimating ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s ease',
                transform: buttonAnimating ? 'scale(0.95)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (!fundAnimating) {
                  e.currentTarget.style.backgroundColor = '#ff6b81';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#e94560';
              }}
            >
              资助支持
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#ffffff' }}>游戏介绍</h2>
        <p
          style={{
            fontSize: '16px',
            color: '#a0a0b0',
            lineHeight: '2',
            backgroundColor: '#16213e',
            padding: '24px',
            borderRadius: '12px',
          }}
        >
          {project.description}
        </p>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#ffffff' }}>资助记录</h2>
        <div
          style={{
            backgroundColor: '#16213e',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          {fundingRecords.length === 0 ? (
            <p style={{ color: '#a0a0b0', textAlign: 'center', padding: '20px' }}>暂无资助记录</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fundingRecords.map((record) => (
                <div
                  key={record.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: '#1a1a2e',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <span style={{ color: '#ffffff', fontWeight: 500 }}>
                      {record.nickname || '匿名资助者'}
                    </span>
                    <span style={{ color: '#a0a0b0', fontSize: '13px', marginLeft: '12px' }}>
                      {dayjs(record.createdAt).fromNow()}
                    </span>
                  </div>
                  <span style={{ color: '#4ade80', fontWeight: 500 }}>¥{record.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#ffffff' }}>评论区</h2>

        <div
          style={{
            backgroundColor: '#16213e',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <input
            type="text"
            placeholder="你的昵称"
            value={commentNickname}
            onChange={(e) => setCommentNickname(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #2a3f5f',
              backgroundColor: '#1a1a2e',
              color: '#ffffff',
              fontSize: '14px',
              marginBottom: '12px',
            }}
          />
          <textarea
            placeholder="发表你的评论..."
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #2a3f5f',
              backgroundColor: '#1a1a2e',
              color: '#ffffff',
              fontSize: '14px',
              resize: 'vertical',
              marginBottom: '12px',
            }}
          />
          <button
            onClick={handleSubmitComment}
            disabled={!commentContent.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              backgroundColor: '#e94560',
              color: '#ffffff',
              fontSize: '14px',
              cursor: commentContent.trim() ? 'pointer' : 'not-allowed',
              opacity: commentContent.trim() ? 1 : 0.5,
            }}
          >
            发表评论
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {comments.length === 0 ? (
            <p style={{ color: '#a0a0b0', textAlign: 'center', padding: '20px' }}>暂无评论</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f5f5f5',
                  margin: '12px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 500, color: '#333' }}>{comment.nickname}</span>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {dayjs(comment.createdAt).fromNow()}
                  </span>
                </div>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
