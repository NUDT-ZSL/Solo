import React, { useState } from 'react';
import { Book } from '../types';
import { useUser } from '../context/UserContext';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';

interface BookCardProps {
  book: Book;
  onDeleted?: () => void;
  showDelete?: boolean;
  animationDelay?: number;
  isNew?: boolean;
}

const BookCard: React.FC<BookCardProps> = ({ book, onDeleted, showDelete = false, animationDelay = 0, isNew = false }) => {
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { currentUser } = useUser();
  const { addNotification } = useSocket();

  const isOwner = book.userId === currentUser.id;

  const handleRequestExchange = async () => {
    setRequesting(true);
    try {
      await axios.post('/api/exchanges', {
        fromUserId: currentUser.id,
        toUserId: book.userId,
        bookId: book.id,
      });
      addNotification('交换请求已发送！', 'success');
      setShowConfirm(false);
      setShowModal(false);
    } catch (error) {
      addNotification('发送请求失败，请重试', 'error');
    } finally {
      setRequesting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('确定要下架这本书吗？相关的交换请求将被取消。')) return;

    setRemoving(true);
    try {
      await axios.delete(`/api/books/${book.id}`);
      setTimeout(() => {
        onDeleted?.();
      }, 500);
    } catch (error) {
      setRemoving(false);
      addNotification('下架失败，请重试', 'error');
    }
  };

  return (
    <>
      <div
        className={`book-card ${removing ? 'removing' : ''} ${isNew ? 'adding' : ''}`}
        style={{ animationDelay: `${animationDelay}ms` }}
        onClick={() => setShowModal(true)}
      >
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="book-cover" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
        ) : (
          <div className="book-cover-placeholder">{book.title}</div>
        )}
        <div className="book-info">
          <h3 className="book-title">{book.title}</h3>
          <p className="book-author">{book.author}</p>
          <span className={`book-status ${book.status}`}>
            {book.status === 'available' ? '可交换' : '已交换'}
          </span>
          {showDelete && isOwner && (
            <button
              className="btn btn-danger"
              style={{ marginTop: '0.75rem', width: '100%', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              onClick={handleDelete}
            >
              下架
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{book.title}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="detail-cover" />
              ) : (
                <div className="book-cover-placeholder" style={{ borderRadius: '8px', marginBottom: '1rem' }}>{book.title}</div>
              )}
              <div className="detail-row">
                <span className="detail-label">作者：</span>
                <span className="detail-value">{book.author}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">ISBN：</span>
                <span className="detail-value">{book.isbn || '未知'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">状态：</span>
                <span className="detail-value">
                  <span className={`book-status ${book.status}`}>
                    {book.status === 'available' ? '可交换' : '已交换'}
                  </span>
                </span>
              </div>
              {book.description && (
                <div className="detail-row">
                  <span className="detail-label">描述：</span>
                  <span className="detail-value">{book.description}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                关闭
              </button>
              {!isOwner && book.status === 'available' && (
                <button className="btn btn-primary" onClick={() => setShowConfirm(true)}>
                  请求交换
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">确认交换请求</h2>
              <button className="modal-close" onClick={() => setShowConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>确定要向《{book.title}》的持有者发起交换请求吗？</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleRequestExchange} disabled={requesting}>
                {requesting ? '发送中...' : '确认请求'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookCard;
