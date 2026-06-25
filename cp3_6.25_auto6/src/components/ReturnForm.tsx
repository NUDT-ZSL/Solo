import { useState, useCallback } from 'react';
import { BorrowRecord } from '../types';
import { searchRecords } from '../api';
import dayjs from 'dayjs';

interface ReturnFormProps {
  onReturn: (recordId: string) => void;
  loading: boolean;
}

function ReturnForm({ onReturn, loading }: ReturnFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setErrors({ search: '请输入读者姓名或书籍名称' });
      return;
    }
    setErrors({});
    setSearching(true);
    setSearchError('');
    try {
      const results = await searchRecords(searchQuery.trim());
      setRecords(results.filter(r => !r.returnDate));
      setHasSearched(true);
    } catch (err) {
      setSearchError('搜索失败，请稍后重试');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleReturn = (recordId: string) => {
    onReturn(recordId);
  };

  const isOverdue = (dueDate: string) => {
    return dayjs().isAfter(dayjs(dueDate));
  };

  return (
    <div className="page">
      <h1 className="page-title">归还书籍</h1>
      
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div className="form-group">
          <label className="form-label">搜索借阅记录</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              className={`form-input ${errors.search ? 'error' : ''}`}
              placeholder="输入读者姓名或书籍名称"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? '搜索中...' : '搜索'}
            </button>
          </div>
          {errors.search && <div className="form-error">{errors.search}</div>}
        </div>

        {searchError && <div className="error-message" style={{ padding: '16px' }}>{searchError}</div>}

        {searching && <div className="loading-spinner"></div>}

        {!searching && hasSearched && (
          <div className="records-list">
            {records.length === 0 ? (
              <div className="empty-state">
                没有找到未归还的借阅记录
              </div>
            ) : (
              records.map((record) => {
                const overdue = isOverdue(record.dueDate);
                return (
                  <div key={record.id} className="record-card">
                    <div className="record-info">
                      <div className="record-title">{record.bookTitle}</div>
                      <div className="record-detail">
                        借阅人: {record.readerName} | 借阅日期: {dayjs(record.borrowDate).format('YYYY-MM-DD')}
                      </div>
                      <div className="record-detail">
                        ISBN: {record.bookIsbn} | 应还日期: {dayjs(record.dueDate).format('YYYY-MM-DD')}
                      </div>
                      {overdue && (
                        <div className="record-overdue">
                          已超期 {dayjs().diff(dayjs(record.dueDate), 'day')} 天
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleReturn(record.id)}
                      disabled={loading}
                    >
                      归还
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {!hasSearched && (
          <div className="empty-state">
            请输入读者姓名或书籍名称搜索借阅记录
          </div>
        )}
      </div>
    </div>
  );
}

export default ReturnForm;
