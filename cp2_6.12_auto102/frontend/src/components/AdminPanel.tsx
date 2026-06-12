import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAppContext, Reservation } from '../context/AppContext';
import './AdminPanel.css';

interface BorrowRecord {
  id: string;
  book_id: string;
  user_id: string;
  user_name: string;
  title: string;
  author: string;
  cover_emoji: string;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  fine_amount: number;
  status: string;
}

const AdminPanel: React.FC = () => {
  const { fetchReservations } = useAppContext();
  const [activeTab, setActiveTab] = useState<'reservations' | 'all-borrows'>('reservations');
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [allBorrows, setAllBorrows] = useState<BorrowRecord[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'reservations') {
      try {
        const res = await axios.get('/api/books/reservations/pending');
        if (res.data.success) {
          setPendingReservations(res.data.data);
        }
      } catch (error) {
        console.error('获取待处理预约失败', error);
      }
    } else {
      try {
        const res = await axios.get('/api/borrow/all');
        if (res.data.success) {
          setAllBorrows(res.data.data);
        }
      } catch (error) {
        console.error('获取借阅记录失败', error);
      }
    }
  };

  const handleConfirmBorrow = async (reservationId: string, bookId: string, userId: string) => {
    setProcessing(reservationId);
    try {
      const res = await axios.post('/api/borrow/checkout', {
        book_id: bookId,
        user_id: userId,
        reservation_id: reservationId
      });
      if (res.data.success) {
        alert('借阅确认成功！');
        fetchData();
        fetchReservations();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '确认借阅失败');
    } finally {
      setProcessing(null);
    }
  };

  const handleReturnBook = async (recordId: string) => {
    setProcessing(recordId);
    try {
      const res = await axios.post(`/api/borrow/return/${recordId}`);
      if (res.data.success) {
        const fine = res.data.fine || 0;
        if (fine > 0) {
          alert(`归还成功！滞纳金：¥${fine.toFixed(2)}`);
        } else {
          alert('归还成功！');
        }
        fetchData();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '归还失败');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="page-title">管理后台</h1>
        <p className="page-subtitle">处理预约申请和管理借阅流水</p>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('reservations')}
        >
          待处理预约 <span className="admin-tab-count">{pendingReservations.length}</span>
        </button>
        <button
          className={`admin-tab ${activeTab === 'all-borrows' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-borrows')}
        >
          借阅流水
        </button>
      </div>

      {activeTab === 'reservations' && (
        <div className="admin-list">
          {pendingReservations.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✅</span>
              <p>暂无待处理的预约申请</p>
            </div>
          ) : (
            pendingReservations.map((reservation, index) => (
              <motion.div
                key={reservation.id}
                className="admin-card card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="admin-card-content">
                  <div className="admin-book-info">
                    <span className="admin-emoji">{reservation.cover_emoji}</span>
                    <div>
                      <h4>{reservation.title}</h4>
                      <p className="admin-author">{reservation.author}</p>
                    </div>
                  </div>
                  <div className="admin-meta">
                    <div className="admin-meta-item">
                      <span className="admin-meta-label">预约用户</span>
                      <span className="admin-meta-value">{reservation.user_name}</span>
                    </div>
                    <div className="admin-meta-item">
                      <span className="admin-meta-label">取书日期</span>
                      <span className="admin-meta-value">{formatDate(reservation.pickup_date)}</span>
                    </div>
                    <div className="admin-meta-item">
                      <span className="admin-meta-label">预约时间</span>
                      <span className="admin-meta-value">{formatDate(reservation.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="admin-card-actions">
                  <button
                    className="btn-primary"
                    onClick={() => handleConfirmBorrow(reservation.id, reservation.book_id, reservation.user_id)}
                    disabled={processing === reservation.id}
                  >
                    {processing === reservation.id ? '处理中...' : '确认借阅'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'all-borrows' && (
        <div className="admin-list">
          {allBorrows.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📖</span>
              <p>暂无借阅记录</p>
            </div>
          ) : (
            allBorrows.map((record, index) => (
              <motion.div
                key={record.id}
                className="admin-card card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="admin-card-content">
                  <div className="admin-book-info">
                    <span className="admin-emoji">{record.cover_emoji}</span>
                    <div>
                      <h4>{record.title}</h4>
                      <p className="admin-author">{record.author}</p>
                    </div>
                  </div>
                  <div className="admin-meta">
                    <div className="admin-meta-item">
                      <span className="admin-meta-label">借阅人</span>
                      <span className="admin-meta-value">{record.user_name}</span>
                    </div>
                    <div className="admin-meta-item">
                      <span className="admin-meta-label">借阅日期</span>
                      <span className="admin-meta-value">{formatDate(record.borrow_date)}</span>
                    </div>
                    <div className="admin-meta-item">
                      <span className="admin-meta-label">应还日期</span>
                      <span className="admin-meta-value">{formatDate(record.due_date)}</span>
                    </div>
                    <div className="admin-meta-item">
                      <span className="admin-meta-label">状态</span>
                      <span className={`admin-meta-value status-${record.status}`}>
                        {record.status === 'borrowed' ? '借阅中' :
                         record.status === 'overdue' ? '已逾期' :
                         record.status === 'returned' ? '已归还' : record.status}
                      </span>
                    </div>
                    {record.fine_amount > 0 && (
                      <div className="admin-meta-item">
                        <span className="admin-meta-label">滞纳金</span>
                        <span className="admin-meta-value danger">¥{record.fine_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
                {record.status !== 'returned' && (
                  <div className="admin-card-actions">
                    <button
                      className="btn-primary"
                      onClick={() => handleReturnBook(record.id)}
                      disabled={processing === record.id}
                    >
                      {processing === record.id ? '处理中...' : '确认归还'}
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
