import React, { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  username: string;
  nickname: string;
}

interface Topic {
  id: string;
  clubId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  content: string;
  createdAt: string;
}

interface Reply {
  id: string;
  topicId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface ClubDetail {
  id: string;
  name: string;
  bookTitle: string;
  bookAuthor: string;
  description: string;
  hostId: string;
  hostName: string;
  members: { id: string; nickname: string }[];
  memberIds: string[];
  createdAt: string;
}

interface DiscussionBoardProps {
  clubId: string;
  topicId?: string;
  mode: 'club' | 'topic';
  onBack: () => void;
  onSelectTopic?: (topicId: string) => void;
  user: User | null;
  onRequireLogin: () => void;
}

function DiscussionBoard({
  clubId,
  topicId,
  mode,
  onBack,
  onSelectTopic,
  user,
  onRequireLogin
}: DiscussionBoardProps) {
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAIQuestions, setShowAIQuestions] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isTopicCreator, setIsTopicCreator] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchClubDetail();
    fetchTopics();
  }, [clubId]);

  useEffect(() => {
    if (mode === 'topic' && topicId) {
      fetchTopicDetail(topicId);
      fetchReplies(topicId);
    }
  }, [mode, topicId]);

  useEffect(() => {
    if (repliesEndRef.current) {
      repliesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies]);

  useEffect(() => {
    if (club && user) {
      setIsMember(club.memberIds?.includes(user.id) || false);
      setIsHost(club.hostId === user.id);
    } else {
      setIsMember(false);
      setIsHost(false);
    }
  }, [club, user]);

  useEffect(() => {
    if (currentTopic && user) {
      setIsTopicCreator(currentTopic.creatorId === user.id);
    } else {
      setIsTopicCreator(false);
    }
  }, [currentTopic, user]);

  const fetchClubDetail = async () => {
    try {
      const res = await fetch(`/api/bookclubs/${clubId}`);
      const data = await res.json();
      if (data.bookClub) {
        setClub(data.bookClub);
      }
    } catch (error) {
      console.error('获取读书会详情失败:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`/api/bookclubs/${clubId}/topics`);
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error('获取话题列表失败:', error);
    }
  };

  const fetchTopicDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/topics/${id}`);
      const data = await res.json();
      if (data.topic) {
        setCurrentTopic(data.topic);
      }
    } catch (error) {
      console.error('获取话题详情失败:', error);
    }
  };

  const fetchReplies = async (id: string) => {
    try {
      const res = await fetch(`/api/topics/${id}/replies`);
      const data = await res.json();
      setReplies(data.replies || []);
    } catch (error) {
      console.error('获取回复列表失败:', error);
    }
  };

  const handleJoinClub = async () => {
    if (!user) {
      onRequireLogin();
      return;
    }
    try {
      const res = await fetch(`/api/bookclubs/${clubId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.bookClub) {
        setClub(data.bookClub);
      }
    } catch (error) {
      console.error('加入读书会失败:', error);
    }
  };

  const handleLeaveClub = async () => {
    if (!user) return;
    if (!confirm('确定要离开这个读书会吗？')) return;
    
    try {
      const res = await fetch(`/api/bookclubs/${clubId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.bookClub) {
        setClub(data.bookClub);
        onBack();
      }
    } catch (error) {
      console.error('离开读书会失败:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !isHost) return;
    if (!confirm('确定要移除这位成员吗？')) return;
    
    try {
      const res = await fetch(`/api/bookclubs/${clubId}/remove-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removerId: user.id, memberId })
      });
      const data = await res.json();
      if (data.bookClub) {
        setClub(data.bookClub);
      }
    } catch (error) {
      console.error('移除成员失败:', error);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireLogin();
      return;
    }

    try {
      const res = await fetch(`/api/bookclubs/${clubId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTopicTitle,
          content: newTopicContent,
          userId: user.id
        })
      });
      const data = await res.json();
      if (data.topic) {
        setTopics([data.topic, ...topics]);
        setShowNewTopicModal(false);
        setNewTopicTitle('');
        setNewTopicContent('');
        if (onSelectTopic) {
          onSelectTopic(data.topic.id);
        }
      }
    } catch (error) {
      console.error('创建话题失败:', error);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !topicId) return;
    if (!replyContent.trim()) return;

    try {
      const res = await fetch(`/api/topics/${topicId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          userId: user.id
        })
      });
      const data = await res.json();
      if (data.reply) {
        setReplies([...replies, data.reply]);
        setReplyContent('');
      }
    } catch (error) {
      console.error('发送回复失败:', error);
    }
  };

  const handleGenerateAIQuestions = async () => {
    if (!user || !topicId || !currentTopic) return;
    if (!isHost && !isTopicCreator) return;

    setAiLoading(true);
    setShowAIQuestions(true);
    setAiQuestions([]);

    try {
      const res = await fetch(`/api/topics/${topicId}/ai-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.questions) {
        setAiQuestions(data.questions);
      }
    } catch (error) {
      console.error('生成AI问题失败:', error);
      setAiQuestions(['生成问题失败，请稍后再试。']);
    } finally {
      setAiLoading(false);
    }
  };

  const insertFormat = (format: 'bold' | 'italic' | 'list') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = replyContent.substring(start, end);
    
    let prefix = '';
    let suffix = '';
    let newText = '';

    switch (format) {
      case 'bold':
        prefix = '**';
        suffix = '**';
        newText = replyContent.substring(0, start) + prefix + (selectedText || '粗体文字') + suffix + replyContent.substring(end);
        break;
      case 'italic':
        prefix = '*';
        suffix = '*';
        newText = replyContent.substring(0, start) + prefix + (selectedText || '斜体文字') + suffix + replyContent.substring(end);
        break;
      case 'list':
        if (selectedText) {
          const lines = selectedText.split('\n').map(line => `- ${line}`).join('\n');
          newText = replyContent.substring(0, start) + lines + replyContent.substring(end);
        } else {
          newText = replyContent.substring(0, start) + '- 列表项\n- 列表项' + replyContent.substring(end);
        }
        break;
    }

    setReplyContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + (selectedText ? selectedText.length : (format === 'list' ? 6 : 4));
      textarea.setSelectionRange(newPos, newPos + (selectedText ? 0 : 0));
    }, 0);
  };

  const formatContent = (content: string) => {
    let formatted = content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>');
    
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    formatted = formatted.replace(/\n/g, '<br/>');
    
    return { __html: formatted };
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNewTopicClick = () => {
    if (!user) {
      onRequireLogin();
    } else if (!isMember) {
      alert('请先加入读书会');
    } else {
      setShowNewTopicModal(true);
    }
  };

  if (!club) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="discussion-board">
      <div className="club-header">
        <button className="btn-back" onClick={onBack}>
          ← 返回
        </button>
        <div className="club-header-info">
          <h2>{club.name}</h2>
          <p className="club-book">
            《{club.bookTitle}》 - {club.bookAuthor}
          </p>
        </div>
        <div className="club-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowMembersModal(true)}>
            👥 {club.members?.length || 0} 成员
          </button>
          {!isMember ? (
            <button className="btn btn-primary" onClick={handleJoinClub}>
              加入读书会
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handleLeaveClub}>
              退出读书会
            </button>
          )}
        </div>
      </div>

      <div className="board-content">
        <div className="topics-sidebar">
          <div className="sidebar-header">
            <h3>讨论话题</h3>
            <button className="btn btn-primary btn-small" onClick={handleNewTopicClick}>
              + 新话题
            </button>
          </div>
          <div className="topics-list">
            {topics.length === 0 ? (
              <p className="empty-text">暂无话题</p>
            ) : (
              topics.map(topic => (
                <div
                  key={topic.id}
                  className={`topic-item ${currentTopic?.id === topic.id ? 'active' : ''}`}
                  onClick={() => onSelectTopic?.(topic.id)}
                >
                  <h4 className="topic-title">{topic.title}</h4>
                  <p className="topic-meta">
                    {topic.creatorName} · {formatTime(topic.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="discussion-main">
          {mode === 'topic' && currentTopic ? (
            <>
              <div className="topic-detail">
                <h3 className="topic-detail-title">{currentTopic.title}</h3>
                <p className="topic-detail-meta">
                  由 {currentTopic.creatorName} 发起 · {formatTime(currentTopic.createdAt)}
                </p>
                <div 
                  className="topic-detail-content"
                  dangerouslySetInnerHTML={formatContent(currentTopic.content)}
                />
                {(isHost || isTopicCreator) && (
                  <div className="topic-actions">
                    <button
                      className="btn btn-primary btn-small"
                      onClick={handleGenerateAIQuestions}
                      disabled={aiLoading}
                    >
                      {aiLoading ? (
                        <>
                          <span className="btn-spinner"></span>
                          生成中...
                        </>
                      ) : (
                        '🤖 AI 建议问题'
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="replies-section">
                <h4 className="replies-title">回复 ({replies.length})</h4>
                <div className="replies-list">
                  {replies.length === 0 ? (
                    <p className="empty-text">暂无回复，来说点什么吧～</p>
                  ) : (
                    replies.map((reply, index) => (
                      <div 
                        key={reply.id} 
                        className="reply-card"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="reply-avatar">
                          {reply.authorName.charAt(0)}
                        </div>
                        <div className="reply-content">
                          <div className="reply-header">
                            <span className="reply-author">{reply.authorName}</span>
                            <span className="reply-time">{formatTime(reply.createdAt)}</span>
                          </div>
                          <div 
                            className="reply-text"
                            dangerouslySetInnerHTML={formatContent(reply.content)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={repliesEndRef} />
                </div>

                {isMember && user && (
                  <form className="reply-form" onSubmit={handleSubmitReply}>
                    <div className="reply-toolbar">
                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => insertFormat('bold')}
                        title="粗体"
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => insertFormat('italic')}
                        title="斜体"
                      >
                        <em>I</em>
                      </button>
                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => insertFormat('list')}
                        title="列表"
                      >
                        • 列表
                      </button>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder="写下你的想法..."
                      rows={3}
                    />
                    <div className="reply-form-actions">
                      <span className="format-hint">支持 **粗体**、*斜体*、- 列表</span>
                      <button type="submit" className="btn btn-primary" disabled={!replyContent.trim()}>
                        发送
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="empty-discussion">
              <p className="empty-icon">💬</p>
              <p>选择一个话题开始讨论</p>
              {topics.length === 0 && isMember && (
                <button className="btn btn-primary" onClick={handleNewTopicClick}>
                  发起第一个话题
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showNewTopicModal && (
        <div className="modal-overlay" onClick={() => setShowNewTopicModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>发起新话题</h2>
            <form onSubmit={handleCreateTopic}>
              <div className="form-group">
                <label>话题标题</label>
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={e => setNewTopicTitle(e.target.value)}
                  placeholder="给你的话题起个标题"
                  required
                />
              </div>
              <div className="form-group">
                <label>话题内容</label>
                <textarea
                  value={newTopicContent}
                  onChange={e => setNewTopicContent(e.target.value)}
                  placeholder="详细描述你想讨论的内容..."
                  rows={5}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewTopicModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  发布
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMembersModal && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>成员列表</h2>
            <div className="members-list">
              {club.members?.map(member => (
                <div key={member.id} className="member-item">
                  <div className="member-avatar">{member.nickname.charAt(0)}</div>
                  <div className="member-info">
                    <span className="member-name">{member.nickname}</span>
                    {member.id === club.hostId && (
                      <span className="member-badge">主持人</span>
                    )}
                  </div>
                  {isHost && member.id !== club.hostId && user && member.id !== user.id && (
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      移除
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowMembersModal(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showAIQuestions && (
        <div className="modal-overlay" onClick={() => setShowAIQuestions(false)}>
          <div className="modal ai-modal" onClick={e => e.stopPropagation()}>
            <h2>🤖 AI 建议的讨论问题</h2>
            {aiLoading ? (
              <div className="ai-loading">
                <div className="spinner"></div>
                <p>正在生成启发式问题，请稍候...</p>
              </div>
            ) : (
              <div className="ai-questions">
                {aiQuestions.map((question, index) => (
                  <div key={index} className="ai-question-card">
                    <span className="question-number">Q{index + 1}</span>
                    <p className="question-text">{question}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAIQuestions(false)}>
                关闭
              </button>
              {!aiLoading && (
                <button className="btn btn-primary" onClick={handleGenerateAIQuestions}>
                  重新生成
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscussionBoard;
