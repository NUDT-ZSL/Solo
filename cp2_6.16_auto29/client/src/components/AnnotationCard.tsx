import React, { useState } from 'react';
import { likeAnnotation, getComments, addComment } from '../api';
import type { Annotation, Comment } from '../types';

interface AnnotationCardProps {
  annotation: Annotation;
  currentUserId: string;
  currentUserName: string;
}

export default function AnnotationCard({ annotation, currentUserId, currentUserName }: AnnotationCardProps) {
  const [likes, setLikes] = useState(annotation.likes);
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  const handleLike = async () => {
    const res = await likeAnnotation(annotation.id, currentUserId);
    if (res.iked !== undefined || res.liked !== undefined) {
      setLiked(res.liked ?? res.iked);
      setLikes(prev => prev + (res.likes || (res.liked ?? res.iked ? 1 : -1)));
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setCommentsLoading(true);
    setShowComments(true);
    const data = await getComments(annotation.id);
    setComments(data);
    setCommentsLoading(false);
  };

  const handleSubmitComment = async (parentId: string | null, body: string) => {
    const newCm = await addComment({
      annotationId: annotation.id,
      parentId,
      userId: currentUserId,
      userName: currentUserName,
      body: body.trim(),
    });
    setComments(prev => [...prev, newCm]);
    return newCm;
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div
      id={`annotation-${annotation.id}`}
      style={{
        background: '#fafafa',
        borderRadius: 12,
        padding: 16,
        borderLeft: `3px solid ${annotation.highlight_color}`,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid #7e57c2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ede7f6',
            color: '#4a148c',
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {annotation.user_name[0]}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#4a148c', fontSize: 14 }}>{annotation.user_name}</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>{formatRelativeTime(annotation.created_at)}</div>
        </div>
      </div>

      <div
        style={{
          background: '#f0f0f0',
          borderRadius: 6,
          padding: '6px 10px',
          marginBottom: 8,
          fontStyle: 'italic',
          fontSize: 13,
          color: '#666',
          lineHeight: 1.5,
        }}
      >
        "{annotation.selected_text}"
      </div>

      <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, marginBottom: 10 }}>
        {annotation.body}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={handleLike}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: liked ? '#e91e63' : '#999',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: 0,
            transition: 'all 0.2s ease',
          }}
        >
          {liked ? '❤️' : '🤍'} {likes}
        </button>
        <button
          onClick={loadComments}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: '#999',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: 0,
            transition: 'all 0.2s ease',
          }}
        >
          💬 {comments.length || '回复'}
        </button>
      </div>

      {showComments && (
        <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
          {commentsLoading ? (
            <div style={{ fontSize: 12, color: '#aaa' }}>加载评论...</div>
          ) : (
            <>
              {topLevelComments.map(cm => (
                <div key={cm.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: '#7e57c2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {cm.user_name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#4a148c' }}>{cm.user_name}</span>
                        <span style={{ fontSize: 10, color: '#aaa' }}>{formatRelativeTime(cm.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.4, marginTop: 2 }}>{cm.body}</div>
                      <button
                        onClick={() => setReplyTo(cm.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#7e57c2',
                          fontSize: 11,
                          cursor: 'pointer',
                          padding: '2px 0',
                          marginTop: 2,
                        }}
                      >
                        回复
                      </button>
                    </div>
                  </div>
                  {getReplies(cm.id).map(reply => (
                    <div key={reply.id} style={{ marginLeft: 36, marginTop: 6, display: 'flex', gap: 8 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: '#9575cd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 10,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {reply.user_name[0]}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#4a148c' }}>{reply.user_name}</span>
                          <span style={{ fontSize: 10, color: '#aaa' }}>{formatRelativeTime(reply.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.4, marginTop: 2 }}>{reply.body}</div>
                      </div>
                    </div>
                  ))}
                  {replyTo === cm.id && (
                    <div style={{ marginLeft: 36, marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={replyBody}
                        onChange={e => setReplyBody(e.target.value)}
                        placeholder="回复..."
                        autoFocus
                        style={{
                          flex: 1,
                          border: '1px solid #ddd',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 12,
                          outline: 'none',
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && replyBody.trim()) {
                            handleSubmitComment(cm.id, replyBody).then(() => {
                              setReplyTo(null);
                              setReplyBody('');
                            });
                          }
                          if (e.key === 'Escape') {
                            setReplyTo(null);
                            setReplyBody('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (replyBody.trim()) {
                            handleSubmitComment(cm.id, replyBody).then(() => {
                              setReplyTo(null);
                              setReplyBody('');
                            });
                          }
                        }}
                        style={{
                          background: '#7e57c2',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        发送
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="添加评论..."
                  style={{
                    flex: 1,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    outline: 'none',
                  }}
                  onKeyDown={e => {
                    const target = e.target as HTMLInputElement;
                    if (e.key === 'Enter' && target.value.trim()) {
                      handleSubmitComment(null, target.value).then(() => {
                        target.value = '';
                      });
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
