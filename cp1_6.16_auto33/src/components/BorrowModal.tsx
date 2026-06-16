import { useState } from 'react';
import { Book, Member } from '../types';
import { borrowBook } from '../services/api';

interface BorrowModalProps {
  book: Book;
  members: Member[];
  onClose: () => void;
  onSuccess: () => void;
}

function BorrowModal({ book, members, onClose, onSuccess }: BorrowModalProps) {
  const [memberId, setMemberId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleBorrow = async () => {
    if (!memberId) {
      setError('请选择会员');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await borrowBook(book.id, memberId);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || '借阅失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <h2 className="modal-title">借阅图书</h2>

        <div style={{ marginBottom: 16, padding: 16, background: '#FDF5E6', borderRadius: 8, border: '1px solid #8B4513' }}>
          <div style={{ fontWeight: 'bold', color: '#8B4513', marginBottom: 4 }}>{book.title}</div>
          <div style={{ fontSize: 14, color: '#6D4C41' }}>{book.author} · {book.publisher}</div>
          <div style={{ fontSize: 14, color: '#6D4C41', marginTop: 4 }}>当前库存: {book.quantity}本</div>
        </div>

        <div className="form-group">
          <label>选择会员</label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">请选择会员</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.phone}) - 信用分: {m.creditScore}
              </option>
            ))}
          </select>
        </div>

        {error && <div style={{ color: '#DC143C', fontSize: 14, marginBottom: 12 }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn" onClick={handleBorrow} disabled={submitting}>
            {submitting ? '处理中...' : '确认借出'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BorrowModal;
