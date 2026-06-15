import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, MessageSquare, ArrowLeft, Flame, ChevronRight, BookOpen } from 'lucide-react';
import { useAppStore } from '../store';
import type { Group, GroupMember } from '../types';
import DiscussionPanel from '../discussion/DiscussionPanel';

interface HotPost {
  id: number;
  groupId: number;
  userId: number;
  chapter: string;
  title: string;
  content: string;
  replyCount: number;
  createdAt: string;
  author: { id: number; name: string; avatar?: string };
  isHot: boolean;
}

interface GroupDetail {
  group: Group;
  members: GroupMember[];
  hotPosts: HotPost[];
}

export default function GroupHome() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAppStore();
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const groupId = Number(id);
  const isDiscussion = location.pathname.endsWith('/discussion');

  const fetchDetail = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      setDetail(data);
    } catch (e) {
      console.error('Failed to fetch group detail:', e);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#888' }}>加载中...</div>
    );
  }

  if (!detail) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#888' }}>小组不存在</div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: '#fffbf0' }}>
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '24px'
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 14px',
            backgroundColor: 'white',
            color: '#666',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
          }}
        >
          <ArrowLeft size={14} />
          返回小组列表
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
          }}
        >
          <div className="group-header"
            style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
              flexWrap: 'wrap'
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #ff7043, #ff8a65, #ffab91)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}
            >
              <BookOpen size={32} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '28px',
                  fontFamily: "'Playfair Display', serif",
                  color: '#3e2723'
                }}
              >
                {detail.group.name}
              </h1>
              <p
                style={{
                  margin: '0 0 14px 0',
                  fontSize: '15px',
                  color: '#6d4c41',
                  lineHeight: 1.6
                }}
              >
                {detail.group.description || '暂无简介'}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  flexWrap: 'wrap'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: '#888'
                  }}
                >
                  <Users size={15} />
                  <span>{detail.group.memberCount} 位成员</span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginTop: '24px',
              padding: '4px',
              backgroundColor: '#fafafa',
              borderRadius: '12px',
              width: 'fit-content'
            }}
          >
            <NavTab
              label="小组主页"
              icon={<MessageSquare size={15} />}
              active={!isDiscussion}
              to={`/group/${groupId}`}
            />
            <NavTab
              label="讨论区"
              icon={<MessageSquare size={15} />}
              active={isDiscussion}
              to={`/group/${groupId}/discussion`}
            />
          </div>
        </motion.div>

        <Routes>
          <Route index element={<GroupOverview detail={detail} />} />
          <Route path="discussion" element={<DiscussionPanel groupId={groupId} />} />
        </Routes>
      </div>
    </div>
  );
}

function NavTab({
  label,
  icon,
  active,
  to
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  to: string;
}) {
  return (
    <Link
      to={to}
      style={{ textDecoration: 'none' }}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 18px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: active ? 600 : 500,
          cursor: 'pointer',
          backgroundColor: active ? '#ff7043' : 'transparent',
          color: active ? 'white' : '#555',
          transition: 'all 0.2s'
        }}
      >
        {icon}
        {label}
      </motion.div>
    </Link>
  );
}

function GroupOverview({ detail }: { detail: GroupDetail }) {
  const navigate = useNavigate();
  const { hotPosts, members, group } = detail;
  const sortedPosts = [...hotPosts].sort((a, b) => b.replyCount - a.replyCount);

  function getInitial(name: string, size = 36) {
    const initial = name.charAt(0).toUpperCase();
    const colors = ['#ff7043', '#ff8a65', '#ffab91', '#ffcc80', '#ffd54f'];
    const colorIndex = name.length % colors.length;
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: colors[colorIndex],
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.38,
          fontWeight: 600,
          flexShrink: 0
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: '24px',
        alignItems: 'flex-start'
      }}
      className="overview-grid"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} style={{ color: '#ff5722' }} />
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: '#3e2723',
                fontFamily: "'Playfair Display', serif"
              }}
            >
              本周热门讨论
            </h2>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              backgroundColor: 'white',
              color: '#ff7043',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            按回复数排序
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedPosts.length === 0 && (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '14px',
                padding: '40px',
                textAlign: 'center',
                color: '#888',
                fontSize: '14px'
              }}
            >
              本周还没有讨论帖，去讨论区发起第一个话题吧！
            </div>
          )}

          {sortedPosts.map((post, idx) => {
            const topRank = idx < 3;
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * idx }}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                onClick={() => navigate(`/group/${group.id}/discussion`)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  border: post.isHot
                    ? '1.5px solid rgba(255,112,67,0.25)'
                    : '1.5px solid transparent',
                  position: 'relative'
                }}
              >
                {topRank && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: 14,
                      fontSize: '20px'
                    }}
                  >
                    {idx === 0 ? '🔥' : idx === 1 ? '🔥' : '🔥'}
                  </div>
                )}

                {getInitial(post.author.name, 40)}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                      flexWrap: 'wrap'
                    }}
                  >
                    {post.chapter && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          backgroundColor: '#fff3e0',
                          color: '#e64a19',
                          borderRadius: '10px',
                          fontWeight: 600
                        }}
                      >
                        {post.chapter}
                      </span>
                    )}
                    {post.isHot && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          backgroundColor: '#ffebee',
                          color: '#e53935',
                          borderRadius: '10px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        🔥 热帖
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      margin: '4px 0 6px 0',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#3e2723',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {post.title}
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginTop: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#888' }}>
                      <span style={{ fontWeight: 500, color: '#666' }}>{post.author.name}</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          backgroundColor: '#fff3e0',
                          color: '#ff7043',
                          borderRadius: '10px',
                          fontWeight: 600
                        }}
                      >
                        💬 {post.replyCount}
                      </span>
                    </div>
                    <ChevronRight size={16} style={{ color: '#ccc' }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: '80px'
        }}
        className="members-sidebar"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}
        >
          <Users size={18} style={{ color: '#ff7043' }} />
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#3e2723',
              fontFamily: "'Playfair Display', serif"
            }}
          >
            小组成员
          </h3>
          <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>
            {members.length}/{group.memberCount}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {members.map((m, idx) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px'
              }}
            >
              {getInitial(m.user?.name || 'U', 36)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#3e2723',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {m.user?.name || '用户'}
                </div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>
                  {idx === 0 ? '组长' : `成员 #${idx + 1}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          .overview-grid {
            grid-template-columns: 1fr !important;
          }
          .members-sidebar {
            position: static !important;
            top: 0 !important;
          }
          .group-header {
            flex-direction: column;
          }
          h1 {
            font-size: 22px !important;
          }
        }
      `}</style>
    </div>
  );
}
