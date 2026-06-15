import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAppContext, BorrowRecord as BorrowRecordType, Reservation } from '../context/AppContext';
import './BorrowRecord.css';

const BorrowRecord: React.FC = () => {
  const { user, borrowRecords, fetchBorrowRecords, reservations, fetchReservations } = useAppContext();
  const [activeTab, setActiveTab] = useState<'borrowing' | 'history' | 'reservations'>('borrowing');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBorrowRecords();
    fetchReservations();
  }, []);

  const activeBorrows = borrowRecords.filter(r => r.current_status !== 'returned');
  const historyBorrows = borrowRecords.filter(r => r.current_status === 'returned');
  const pendingReservations = reservations.filter(r => r.status === 'pending' || r.status === 'approved');

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCancelReservation = async (reservationId: string) => {
    setCancellingId(reservationId);
    try {
      await axios.delete(`/api/books/reserve/${reservationId}`);
      fetchReservations();
    } catch (error: any) {
      alert(error.response?.data?.message || '取消失败');
    } finally {
      setCancellingId(null);
    }
  };

  const renderStatusBadge = (record: BorrowRecordType) => {
    if (record.current_status === 'overdue' || record.status === 'overdue') {
      return <span className="status-badge overdue">已逾期</span>;
    }
    if (record.current_status === 'returned' || record.status === 'returned') {
      return <span className="status-badge returned">已归还</span>;
    }
    return <span className="status-badge borrowing">借阅中</span>;
  };

  const renderReservationStatus = (status: string) => {
    switch (status) {
      case 'pending': return <span className="status-badge pending">待确认</span>;
      case 'approved': return <span className="status-badge approved">已确认</span>;
      case 'cancelled': return <span className="status-badge cancelled">已取消</span>;
      case 'completed': return <span className="status-badge returned">已完成</span>;
      default: return null;
    }
  };

  return (
    <div className="borrow-record-page">
      <div className="page-header">
        <h1 className="page-title">借阅记录</h1>
        <p className="page-subtitle">查看您的借阅历史和预约情况</p>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'borrowing' ? 'active' : ''}`}
          onClick={() => setActiveTab('borrowing')}
        >
          在借图书 <span className="tab-count">{activeBorrows.length}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('reservations')}
        >
          我的预约 <span className="tab-count">{pendingReservations.length}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          借阅历史 <span className="tab-count">{historyBorrows.length}</span>
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'borrowing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="record-list"
          >
            {activeBorrows.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📚</span>
                <p>您当前没有在借图书</p>
              </div>
            ) : (
              activeBorrows.map((record, index) => (
                <motion.div
                  key={record.id}
                  className="record-card"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="record-cover">
                    <span className="record-emoji">{record.cover_emoji}</span>
                  </div>
                  <div className="record-info">
                    <div className="record-header">
                      <h3 className="record-title">{record.title}</h3>
                      {renderStatusBadge(record)}
                    </div>
                    <p className="record-author">{record.author}</p>
                    <div className="record-meta">
                      <div className="meta-item">
                        <span className="meta-label">借阅日期</span>
                        <span className="meta-value">{formatDate(record.borrow_date)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">应还日期</span>
                        <span className={`meta-value ${getDaysRemaining(record.due_date) < 0 ? 'danger' : ''}`}>
                          {formatDate(record.due_date)}
                        </span>
                      </div>
                      {getDaysRemaining(record.due_date) >= 0 && record.current_status !== 'overdue' && (
                        <div className="meta-item">
                          <span className="meta-label">剩余天数</span>
                          <span className="meta-value highlight">{getDaysRemaining(record.due_date)} 天</span>
                        </div>
                      )}
                      {getDaysRemaining(record.due_date) < 0 && (
                        <div className="meta-item">
                          <span className="meta-label">已逾期</span>
                          <span className="meta-value danger">{Math.abs(getDaysRemaining(record.due_date))} 天</span>
                        </div>
                      )}
                      {(record.current_fine || 0) > 0 && (
                        <div className="meta-item">
                          <span className="meta-label">滞纳金</span>
                          <span className="meta-value danger">¥{(record.current_fine || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'reservations' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="record-list"
          >
            {pendingReservations.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>您当前没有预约</p>
              </div>
            ) : (
              pendingReservations.map((reservation, index) => (
                <motion.div
                  key={reservation.id}
                  className="record-card"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="record-cover">
                    <span className="record-emoji">{reservation.cover_emoji}</span>
                  </div>
                  <div className="record-info">
                    <div className="record-header">
                      <h3 className="record-title">{reservation.title}</h3>
                      {renderReservationStatus(reservation.status)}
                    </div>
                    <p className="record-author">{reservation.author}</p>
                    <div className="record-meta">
                      <div className="meta-item">
                        <span className="meta-label">取书日期</span>
                        <span className="meta-value highlight">{formatDate(reservation.pickup_date)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">馆藏位置</span>
                        <span className="meta-value">{reservation.location}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">预约时间</span>
                        <span className="meta-value">{formatDate(reservation.created_at)}</span>
                      </div>
                    </div>
                    {reservation.status === 'pending' && (
                      <div className="record-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => handleCancelReservation(reservation.id)}
                          disabled={cancellingId === reservation.id}
                        >
                          {cancellingId === reservation.id ? '取消中...' : '取消预约'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="record-list"
          >
            {historyBorrows.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📖</span>
                <p>您还没有借阅历史</p>
              </div>
            ) : (
              historyBorrows.map((record, index) => (
                <motion.div
                  key={record.id}
                  className="record-card"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="record-cover">
                    <span className="record-emoji">{record.cover_emoji}</span>
                  </div>
                  <div className="record-info">
                    <div className="record-header">
                      <h3 className="record-title">{record.title}</h3>
                      {renderStatusBadge(record)}
                    </div>
                    <p className="record-author">{record.author}</p>
                    <div className="record-meta">
                      <div className="meta-item">
                        <span className="meta-label">借阅日期</span>
                        <span className="meta-value">{formatDate(record.borrow_date)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">归还日期</span>
                        <span className="meta-value">{record.return_date ? formatDate(record.return_date) : '-'}</span>
                      </div>
                      {record.fine_amount > 0 && (
                        <div className="meta-item">
                          <span className="meta-label">滞纳金</span>
                          <span className="meta-value danger">¥{record.fine_amount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BorrowRecord;
