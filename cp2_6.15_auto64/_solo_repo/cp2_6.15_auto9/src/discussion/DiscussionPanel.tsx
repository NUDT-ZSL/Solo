import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Send, Plus, X, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store';
import { wsClient, type NewPostData, type NewReplyData } from './WebSocketClient';

interface ReplyItem {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
  relativeTime: string;
  floor: number;
  author: { id: number; name: string; avatar?: string };
}

interface PostItem {
  id: number;
  groupId: number;
  userId: number;
  chapter: string;
  title: string;
  content: string;
  replyCount: number;
  createdAt: string;
  relativeTime: string;
  author: { id: number; name: string; avatar?: string };
}

interface DiscussionPanelProps {
  groupId: number;
}

function UserAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase();
  const colors = [
    '#ff7043',
    '#ff8a65',
    '#ffab91',
    '#ffcc80',
    '#ffd54f'
  ];
  const colorIndex = name.length % colors.length;
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: colors[colorIndex],
        fontSize: size * 0.4
      }}
    >
      {initial}
    </div>
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  maxHeight = 200,
  width = '80%'
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxHeight?: number;
  width?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  }, [value, maxHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      style={{
        width,
        maxHeight,
        resize: 'none',
        overflow: value ? 'auto' : 'hidden',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        fontSize: '14px',
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color 0.2s',
        backgroundColor: '#fff'
      }}
      onFocus={(e) => (e.target.style.borderColor = '#ff7043')}
      onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
    />
  );
}

export default function DiscussionPanel({ groupId }: DiscussionPanelProps) {
  const { currentUser } = useAppStore();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostChapter, setNewPostChapter] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [postReplies, setPostReplies] = useState<Record<number, ReplyItem[]>>({});
  const [replyContents, setReplyContents] = useState<Record<number, string>>({});
  const [newPostIds, setNewPostIds] = useState<Set<number>>(new Set());
  const [newReplyMap, setNewReplyMap] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${groupId}/posts`);
      const data: PostItem[] = await res.json();
      setPosts(data);
    } catch (e) {
      console.error('Failed to fetch posts:', e);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const fetchReplies = useCallback(async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/replies`);
      const data: ReplyItem[] = await res.json();
      setPostReplies((prev) => ({ ...prev, [postId]: data }));
    } catch (e) {
      console.error('Failed to fetch replies:', e);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const handleNewPost = (data: NewPostData) => {
      if (data.groupId !== groupId) return;
      setPosts((prev) => [data.post, ...prev.filter((p) => p.id !== data.post.id)]);
      setNewPostIds((prev) => {
        const next = new Set(prev);
        next.add(data.post.id);
        return next;
      });
      setTimeout(() => {
        setNewPostIds((prev) => {
          const next = new Set(prev);
          next.delete(data.post.id);
          return next;
        });
      }, 1000);
    };

    const handleNewReply = (data: NewReplyData) => {
      const key = `${data.postId}-${data.reply.id}`;
      setNewReplyMap((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      setTimeout(() => {
        setNewReplyMap((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 1000);

      setPostReplies((prev) => {
        const existing = prev[data.postId] || [];
        if (existing.some((r) => r.id === data.reply.id)) return prev;
        return { ...prev, [data.postId]: [...existing, data.reply] };
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === data.postId ? { ...p, replyCount: p.replyCount + 1 } : p
        )
      );
    };

    wsClient.connect({
      onNewPost: handleNewPost,
      onNewReply: handleNewReply
    });

    return () => {
      wsClient.disconnect();
    };
  }, [groupId]);

  const handleCreatePost = async () => {
    if (!currentUser || !newPostTitle.trim() || !newPostContent.trim()) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          chapter: newPostChapter,
          title: newPostTitle.slice(0, 80),
          content: newPostContent
        })
      });
      if (res.ok) {
        setShowNewPostModal(false);
        setNewPostTitle('');
        setNewPostChapter('');
        setNewPostContent('');
      }
    } catch (e) {
      console.error('Failed to create post:', e);
    }
  };

  const handleToggleExpand = async (postId: number) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!postReplies[postId]) {
        await fetchReplies(postId);
      }
    }
  };

  const handleSubmitReply = async (postId: number) => {
    if (!currentUser) return;
    const content = replyContents[postId]?.trim();
    if (!content) return;
    try {
      const res = await fetch(`/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, content })
      });
      if (res.ok) {
        setReplyContents((prev) => ({ ...prev, [postId]: '' }));
      }
    } catch (e) {
      console.error('Failed to submit reply:', e);
    }
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const avatarColors = ['#ff7043', '#ff8a65', '#ffab91', '#ffcc80', '#ffd54f'];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '28px',
            color: '#3e2723',
            margin: 0
          }}
        >
          小组讨论
        </h2>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowNewPostModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#ff7043',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255,112,67,0.3)'
          }}
        >
          <Plus size={18} />
          发起新讨论
        </motion.button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          加载中...
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <AnimatePresence>
          {posts.map((post) => {
            const isNew = newPostIds.has(post.id);
            const isExpanded = expandedPost === post.id;
            const replies = postReplies[post.id] || [];
            const replyContent = replyContents[post.id] || '';

            return (
              <motion.div
                key={post.id}
                initial={isNew ? { x: 300, opacity: 0 } : false}
                animate={isNew ? { x: 0, opacity: 1 } : {}}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  backgroundColor: '#fff8e1',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
              >
                <div style={{ display: 'flex', gap: '16px' }}>
                  <UserAvatar name={post.author.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div>
                        {post.chapter && (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 10px',
                              backgroundColor: '#fff3e0',
                              color: '#e64a19',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              marginRight: '8px'
                            }}
                          >
                            {post.chapter}
                          </span>
                        )}
                        <h3
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: '17px',
                            fontWeight: 600,
                            color: '#3e2723',
                            lineHeight: 1.4
                          }}
                        >
                          {post.title}
                        </h3>
                      </div>
                      <span style={{ fontSize: '12px', color: '#888', flexShrink: 0 }}>
                        {post.relativeTime}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '13px',
                        color: '#5d4037',
                        marginBottom: '6px',
                        fontWeight: 500
                      }}
                    >
                      {post.author.name}
                    </div>

                    <div
                      onClick={() => handleToggleExpand(post.id)}
                      style={{
                        cursor: 'pointer',
                        padding: '10px 14px',
                        backgroundColor: 'rgba(255,255,255,0.6)',
                        borderRadius: '8px',
                        margin: '8px 0'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#4e342e',
                          lineHeight: 1.6,
                          display: '-webkit-box',
                          WebkitLineClamp: isExpanded ? 'unset' : 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: isExpanded ? 'visible' : 'hidden'
                        }}
                      >
                        <ReactMarkdown>{post.content}</ReactMarkdown>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#ff7043'
                        }}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={16} /> 收起
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} /> 展开查看详情
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        marginTop: '12px',
                        color: '#666',
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageCircle size={16} />
                        <span>{post.replyCount} 条回复</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          marginTop: '16px',
                          paddingTop: '16px',
                          borderTop: '1px solid #e0e0e0'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            marginBottom: '16px'
                          }}
                        >
                          {replies.length === 0 && (
                            <div
                              style={{
                                textAlign: 'center',
                                padding: '20px',
                                color: '#999',
                                fontSize: '13px'
                              }}
                            >
                              还没有回复，来说两句吧~
                            </div>
                          )}

                          <AnimatePresence>
                            {replies.map((reply) => {
                              const key = `${post.id}-${reply.id}`;
                              const isNewReply = newReplyMap.has(key);
                              return (
                                <motion.div
                                  key={reply.id}
                                  initial={
                                    isNewReply
                                      ? { y: 30, opacity: 0, scaleY: 0.8 }
                                      : false
                                  }
                                  animate={
                                    isNewReply
                                      ? {
                                          y: 0,
                                          opacity: 1,
                                          scaleY: 1,
                                          transition: {
                                            type: 'spring',
                                            stiffness: 200,
                                            damping: 18,
                                            duration: 0.4
                                          }
                                        }
                                      : {}
                                  }
                                  style={{
                                    display: 'flex',
                                    gap: '12px',
                                    padding: '12px',
                                    backgroundColor: 'rgba(255,255,255,0.7)',
                                    borderRadius: '10px'
                                  }}
                                >
                                  <UserAvatar name={reply.author.name} size={32} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '4px',
                                        flexWrap: 'wrap',
                                        gap: '4px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            color: '#3e2723'
                                          }}
                                        >
                                          {reply.author.name}
                                        </span>
                                        <span className="floor-label"
                                          style={{
                                            fontSize: '11px',
                                            color: '#999',
                                            backgroundColor: '#f5f5f5',
                                            padding: '1px 6px',
                                            borderRadius: '4px'
                                          }}
                                        >
                                          {reply.floor}楼
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '11px', color: '#999' }}>
                                        {reply.relativeTime}
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '13px',
                                        color: '#5d4037',
                                        lineHeight: 1.5,
                                        wordBreak: 'break-word'
                                      }}
                                    >
                                      {reply.content}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '8px',
                            alignItems: 'flex-end'
                          }}
                        >
                          <AutoResizeTextarea
                            value={replyContent}
                            onChange={(v) =>
                              setReplyContents((prev) => ({ ...prev, [post.id]: v }))
                            }
                            placeholder="发表你的回复..."
                            maxHeight={200}
                            width="80%"
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSubmitReply(post.id)}
                            disabled={!replyContent.trim()}
                            style={{
                              padding: '10px 16px',
                              backgroundColor: replyContent.trim() ? '#ff7043' : '#ccc',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              cursor: replyContent.trim() ? 'pointer' : 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: '44px'
                            }}
                          >
                            <Send size={16} />
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showNewPostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={(e) => e.target === e.currentTarget && setShowNewPostModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.25 }}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '28px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    fontFamily: "'Playfair Display', serif",
                    color: '#3e2723'
                  }}
                >
                  发起新讨论
                </h3>
                <button
                  onClick={() => setShowNewPostModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#666'
                  }}
                >
                  <X size={22} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                    章节（可选）
                  </label>
                  <input
                    type="text"
                    value={newPostChapter}
                    onChange={(e) => setNewPostChapter(e.target.value)}
                    placeholder="例如：第一章"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e0e0e0',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                    标题（最多80字）
                  </label>
                  <input
                    type="text"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value.slice(0, 80))}
                    placeholder="讨论标题..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e0e0e0',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
                    {newPostTitle.length}/80
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                    正文（支持 Markdown）
                  </label>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="分享你的想法...可以使用 #标签 标记话题"
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e0e0e0',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '8px'
                  }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewPostModal(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#f5f5f5',
                      color: '#555',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    取消
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreatePost}
                    disabled={!newPostTitle.trim() || !newPostContent.trim()}
                    style={{
                      padding: '10px 24px',
                      backgroundColor:
                        newPostTitle.trim() && newPostContent.trim() ? '#ff7043' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor:
                        newPostTitle.trim() && newPostContent.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    发布讨论
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .floor-label {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
