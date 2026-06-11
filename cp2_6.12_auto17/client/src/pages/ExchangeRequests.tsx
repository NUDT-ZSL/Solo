import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ExchangeRequest, USERS } from '../types';
import { useUser } from '../context/UserContext';
import { useSocket } from '../context/SocketContext';

type TabType = 'received' | 'sent';

const ExchangeRequests: React.FC = () => {
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { currentUser } = useUser();
  const { socket, addNotification } = useSocket();

  const getUserName = (userId: string) => {
    return USERS.find((u) => u.id === userId)?.name || '未知用户';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'accepted':
        return '已接受';
      case 'rejected':
        return '已拒绝';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/exchanges', {
        params: { userId: currentUser.id },
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch exchanges:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = () => {
      fetchRequests();
    };

    const handleExchangeUpdated = () => {
      fetchRequests();
    };

    socket.on('new_exchange_request', handleNewRequest);
    socket.on('exchange_updated', handleExchangeUpdated);

    return () => {
      socket.off('new_exchange_request', handleNewRequest);
      socket.off('exchange_updated', handleExchangeUpdated);
    };
  }, [socket, fetchRequests]);

  const handleAction = async (requestId: string, action: 'accept' | 'reject') => {
    setUpdatingId(requestId);
    try {
      await axios.put(`/api/exchanges/${requestId}`, {
        status: action === 'accept' ? 'accepted' : 'rejected',
      });
      addNotification(
        action === 'accept' ? '已接受交换请求' : '已拒绝交换请求',
        action === 'accept' ? 'success' : 'info'
      );
      fetchRequests();
    } catch (error) {
      addNotification('操作失败，请重试', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRequests = requests.filter((req) =>
    activeTab === 'received' ? req.toUserId === currentUser.id : req.fromUserId === currentUser.id
  );

  return (
    <div>
      <h1 className="page-title">交换请求</h1>

      <div className="library-tabs">
        <button
          className={`library-tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          收到的请求
        </button>
        <button
          className={`library-tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          发出的请求
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">
            {activeTab === 'received' ? '暂无收到的交换请求' : '暂无发出的交换请求'}
          </p>
        </div>
      ) : (
        <div className="exchange-list">
          {filteredRequests.map((request) => (
            <div key={request.id} className={`exchange-card ${request.status}`}>
              <div className="exchange-header">
                <div>
                  <strong>
                    {activeTab === 'received'
                      ? `来自 ${getUserName(request.fromUserId)} 的请求`
                      : `发送给 ${getUserName(request.toUserId)} 的请求`}
                  </strong>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                    {new Date(request.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <span className={`exchange-status ${request.status}`}>
                  {getStatusText(request.status)}
                </span>
              </div>

              {request.book && (
                <div className="exchange-book">
                  {request.book.coverUrl ? (
                    <img
                      src={request.book.coverUrl}
                      alt={request.book.title}
                      className="exchange-book-cover"
                    />
                  ) : (
                    <div
                      className="exchange-book-cover"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontSize: '0.7rem',
                        textAlign: 'center',
                        padding: '0.25rem',
                      }}
                    >
                      {request.book.title}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{request.book.title}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      {request.book.author}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'received' && request.status === 'pending' && (
                <div className="exchange-actions">
                  <button
                    className="btn btn-success"
                    onClick={() => handleAction(request.id, 'accept')}
                    disabled={updatingId === request.id}
                  >
                    {updatingId === request.id ? '处理中...' : '接受'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleAction(request.id, 'reject')}
                    disabled={updatingId === request.id}
                  >
                    拒绝
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExchangeRequests;
