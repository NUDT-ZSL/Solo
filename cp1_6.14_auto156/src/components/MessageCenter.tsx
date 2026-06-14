import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ExchangeRequest, Skill, User } from '../types';
import { apiService } from '../services/apiService';
import './MessageCenter.css';

interface RequestWithDetails extends ExchangeRequest {
  fromUser?: User;
  toUser?: User;
  fromSkill?: Skill;
  toSkill?: Skill;
}

interface MessageCenterProps {
  requests: RequestWithDetails[];
  currentUserId: string;
  onUpdate: () => void;
}

const ITEM_HEIGHT = 120;
const BUFFER = 20;

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: '#f59e0b' },
  accepted: { text: '已接受', color: '#22c55e' },
  rejected: { text: '已拒绝', color: '#ef4444' },
  modified: { text: '已修改', color: '#3b82f6' },
  confirmed: { text: '已确认', color: '#22c55e' },
  completed: { text: '已完成', color: '#64748b' },
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

const MessageItem: React.FC<{
  request: RequestWithDetails;
  currentUserId: string;
  onUpdate: () => void;
}> = ({ request, currentUserId, onUpdate }) => {
  const [showModify, setShowModify] = useState(false);
  const [modifiedHours, setModifiedHours] = useState(request.proposedHours);
  const isReceiver = request.toUserId === currentUserId;
  const otherUser = isReceiver ? request.fromUser : request.toUser;
  const mySkill = isReceiver ? request.toSkill : request.fromSkill;
  const otherSkill = isReceiver ? request.fromSkill : request.toSkill;

  const handleAccept = useCallback(async () => {
    await apiService.updateRequest(request.id, { status: 'accepted' });
    onUpdate();
  }, [request.id, onUpdate]);

  const handleReject = useCallback(async () => {
    await apiService.updateRequest(request.id, { status: 'rejected' });
    onUpdate();
  }, [request.id, onUpdate]);

  const handleModify = useCallback(async () => {
    if (showModify) {
      await apiService.updateRequest(request.id, {
        status: 'modified',
        proposedHours: modifiedHours,
      });
      setShowModify(false);
      onUpdate();
    } else {
      setShowModify(true);
    }
  }, [request.id, showModify, modifiedHours, onUpdate]);

  const handleConfirm = useCallback(async () => {
    await apiService.updateRequest(request.id, { status: 'confirmed' });
    onUpdate();
  }, [request.id, onUpdate]);

  const statusInfo = statusMap[request.status];

  return (
    <div className="message-card">
      <div className="message-header">
        <img src={otherUser?.avatar} alt="" className="message-avatar" />
        <div className="message-user-info">
          <span className="message-username">{otherUser?.nickname}</span>
          <span className="message-status" style={{ color: statusInfo.color }}>
            {statusInfo.text}
          </span>
        </div>
        <span className="message-time">{formatTime(request.createdAt)}</span>
      </div>
      
      <div className="message-content">
        <div className="exchange-info">
          <span className="skill-badge">{otherSkill?.name}</span>
          <span className="exchange-arrow">→</span>
          <span className="skill-badge my">{mySkill?.name}</span>
          <span className="hours-badge">{request.proposedHours}小时</span>
        </div>
        <p className="message-text">{request.message}</p>
      </div>

      {showModify && (
        <div className="modify-section">
          <label>提议时长：</label>
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            value={modifiedHours}
            onChange={(e) => setModifiedHours(Number(e.target.value))}
          />
          <span className="hours-display">{modifiedHours}小时</span>
        </div>
      )}

      {isReceiver && request.status === 'pending' && (
        <div className="message-actions">
          <button className="btn btn-reject" onClick={handleReject}>拒绝</button>
          <button className="btn btn-modify" onClick={handleModify}>
            {showModify ? '发送修改' : '修改时长'}
          </button>
          <button className="btn btn-accept" onClick={handleAccept}>接受</button>
        </div>
      )}

      {!isReceiver && request.status === 'modified' && (
        <div className="message-actions">
          <button className="btn btn-reject" onClick={handleReject}>拒绝</button>
          <button className="btn btn-accept" onClick={handleConfirm}>确认兑换</button>
        </div>
      )}

      {request.status === 'accepted' && (
        <div className="message-actions">
          <button className="btn btn-confirm" onClick={handleConfirm}>确认预约</button>
        </div>
      )}
    </div>
  );
};

const MessageCenter: React.FC<MessageCenterProps> = ({ requests, currentUserId, onUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const [tab, setTab] = useState<'all' | 'received' | 'sent'>('all');

  const filteredRequests = useMemo(() => {
    switch (tab) {
      case 'received':
        return requests.filter(r => r.toUserId === currentUserId);
      case 'sent':
        return requests.filter(r => r.fromUserId === currentUserId);
      default:
        return requests;
    }
  }, [requests, tab, currentUserId]);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const endIndex = Math.min(
      filteredRequests.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, filteredRequests.length]);

  const visibleRequests = useMemo(() => {
    return filteredRequests.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [filteredRequests, visibleRange]);

  const totalHeight = filteredRequests.length * ITEM_HEIGHT;
  const offsetY = visibleRange.startIndex * ITEM_HEIGHT;

  return (
    <div className="message-center">
      <h2 className="page-title">消息中心</h2>
      
      <div className="tabs">
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          全部 ({requests.length})
        </button>
        <button className={`tab ${tab === 'received' ? 'active' : ''}`} onClick={() => setTab('received')}>
          收到的
        </button>
        <button className={`tab ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>
          发出的
        </button>
      </div>

      <div
        className="message-list-container"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleRequests.map((request) => (
              <div key={request.id} style={{ height: ITEM_HEIGHT, paddingBottom: 12 }}>
                <MessageItem
                  request={request}
                  currentUserId={currentUserId}
                  onUpdate={onUpdate}
                />
              </div>
            ))}
          </div>
        </div>
        
        {filteredRequests.length === 0 && (
          <div className="empty-state">
            <p>暂无消息</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageCenter;
