import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Book, Member, BorrowRecord } from '../types';
import { fetchBookDetail } from '../services/api';
import { formatDate, getOverdueDays } from '../services/bookService';

interface BookDetailPageProps {
  books: Book[];
  members: Member[];
  borrowRecords: BorrowRecord[];
  onRefresh: () => void;
}

function BookDetailPage({ books, members, borrowRecords, onRefresh }: BookDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bookDetail, setBookDetail] = useState<(Book & { borrowHistory: BorrowRecord[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const data = await fetchBookDetail(id);
        setBookDetail(data);
      } catch {
        const fallback = books.find(b => b.id === id);
        if (fallback) {
          const history = borrowRecords.filter(r => r.bookId === id);
          setBookDetail({ ...fallback, borrowHistory: history });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, books, borrowRecords]);

  if (loading) return <div className="loading">加载中...</div>;
  if (!bookDetail) return <div className="empty-state">图书不存在</div>;

  const memberMap = new Map(members.map(m => [m.id, m]));

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        ← 返回
      </button>

      <div className="book-detail">
        <div className="book-detail-header">
          <div>
            <h1 style={{ fontSize: 24, color: '#8B4513', marginBottom: 8 }}>{bookDetail.title}</h1>
            <span className={`card-status ${bookDetail.quantity > 0 ? 'available' : 'borrowed'}`}>
              {bookDetail.quantity > 0 ? '可借阅' : '已借出'}
            </span>
          </div>
        </div>

        <div className="book-detail-info">
          <div className="info-item"><span className="info-label">作者:</span>{bookDetail.author}</div>
          <div className="info-item"><span className="info-label">ISBN:</span>{bookDetail.isbn}</div>
          <div className="info-item"><span className="info-label">出版社:</span>{bookDetail.publisher}</div>
          <div className="info-item"><span className="info-label">定价:</span>¥{bookDetail.price.toFixed(2)}</div>
          <div className="info-item"><span className="info-label">库存:</span>{bookDetail.quantity}本</div>
          <div className="info-item"><span className="info-label">累计借出:</span>{bookDetail.borrowedCount}次</div>
        </div>

        <h3 style={{ fontSize: 18, color: '#8B4513', marginBottom: 12, marginTop: 24 }}>借阅历史</h3>
        {bookDetail.borrowHistory && bookDetail.borrowHistory.length > 0 ? (
          <div className="timeline">
            {bookDetail.borrowHistory.map((record) => {
              const member = memberMap.get(record.memberId);
              const isReturned = record.status === 'returned';
              const borrowDate = new Date(record.borrowDate);
              const dueDate = new Date(record.dueDate);
              const overdueDays = !isReturned ? getOverdueDays(dueDate) : 0;

              return (
                <div className="timeline-item" key={record.id}>
                  <div className={`dot ${isReturned ? 'returned' : 'borrowed'}`} />
                  <div className="timeline-content">
                    {member ? member.name : '未知会员'} 借阅了此书
                    {overdueDays > 0 && (
                      <span style={{ color: '#DC143C', marginLeft: 8, fontSize: 12 }}>
                        (逾期{overdueDays}天)
                      </span>
                    )}
                  </div>
                  <div className="timeline-date">
                    借出: {formatDate(borrowDate)} · 应还: {formatDate(dueDate)}
                    {record.returnDate && ` · 归还: ${formatDate(new Date(record.returnDate))}`}
                  </div>
                  <span className={`timeline-status ${isReturned ? 'returned' : 'borrowed'}`}>
                    {isReturned ? '已归还' : '借出中'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#6D4C41', fontSize: 14 }}>暂无借阅记录</div>
        )}
      </div>
    </div>
  );
}

export default BookDetailPage;
