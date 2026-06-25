import { useState, useCallback } from 'react';
import { BorrowRecord } from '../types';
import { getBorrowHistory } from '../api';
import dayjs from 'dayjs';

function BorrowHistory() {
  const [readerId, setReaderId] = useState('');
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [inputError, setInputError] = useState('');

  const handleSearch = useCallback(async () => {
    if (!readerId.trim()) {
      setInputError('请输入读者编号');
      return;
    }
    setInputError('');
    setLoading(true);
    setError(null);
    try {
      const data = await getBorrowHistory(readerId.trim());
      setRecords(data);
      setHasSearched(true);
    } catch (err) {
      setError('获取借阅历史失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [readerId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const isOverdue = (record: BorrowRecord) => {
    if (record.returnDate) return false;
    return dayjs().isAfter(dayjs(record.dueDate));
  };

  return (
    <div className="page">
      <h1 className="page-title">借阅历史</h1>

      <div className="reader-input-section">
        <div className="form-group">
          <label className="form-label">读者编号</label>
          <input
            type="text"
            className={`form-input ${inputError ? 'error' : ''}`}
            placeholder="请输入读者编号"
            value={readerId}
            onChange={(e) => setReaderId(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {inputError && <div className="form-error">{inputError}</div>}
        </div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? '查询中...' : '查询'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading-spinner"></div>}

      {!loading && hasSearched && (
        records.length === 0 ? (
          <div className="empty-state">该读者暂无借阅记录</div>
        ) : (
          <table className="borrow-history-table">
            <thead>
              <tr>
                <th>书名</th>
                <th>借阅日期</th>
                <th>应归还日期</th>
                <th>实际归还日期</th>
                <th>滞纳金</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const overdue = isOverdue(record);
                return (
                  <tr key={record.id} className={overdue ? 'overdue' : ''}>
                    <td>{record.bookTitle}</td>
                    <td>{dayjs(record.borrowDate).format('YYYY-MM-DD')}</td>
                    <td>{dayjs(record.dueDate).format('YYYY-MM-DD')}</td>
                    <td>
                      {record.returnDate ? dayjs(record.returnDate).format('YYYY-MM-DD') : '-'}
                    </td>
                    <td className="fine-amount-cell">
                      {record.fineAmount !== undefined && record.fineAmount > 0
                        ? `¥${record.fineAmount.toFixed(2)}`
                        : '-'}
                    </td>
                    <td>
                      {overdue && <span className="overdue-tag">超期</span>}
                      {!overdue && !record.returnDate && '借阅中'}
                      {record.returnDate && '已归还'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      )}

      {!hasSearched && !loading && (
        <div className="empty-state">请输入读者编号查询借阅历史</div>
      )}
    </div>
  );
}

export default BorrowHistory;
