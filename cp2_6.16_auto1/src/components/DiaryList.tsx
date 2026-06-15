import type { DiaryRecord, Book } from '../types';
import { EMOTION_CONFIG } from '../utils/constants';
import { formatDisplayDate } from '../utils/date';

interface DiaryListProps {
  records: DiaryRecord[];
  books: Book[];
  onEdit: (record: DiaryRecord) => void;
}

export default function DiaryList({ records, books, onEdit }: DiaryListProps) {
  const getBookTitle = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.title || '未知书籍';
  };

  if (records.length === 0) {
    return (
      <div className="w-full text-center py-12">
        <p style={{ color: '#8d6e63' }}>还没有阅读记录，快去记录孩子的阅读吧！</p>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col gap-3 overflow-y-auto pr-2"
      style={{ maxHeight: '400px' }}
    >
      {records.map((record) => {
        const emotionConfig = EMOTION_CONFIG[record.emotion];
        return (
          <div
            key={record.id}
            onClick={() => onEdit(record)}
            className="w-full flex items-center justify-between cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
            style={{
              height: '80px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              padding: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            }}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: '#8d6e63', minWidth: '60px' }}>
                {formatDisplayDate(record.date)}
              </div>
              <div className="font-medium truncate flex-1" style={{ color: '#5d4037' }}>
                {getBookTitle(record.bookId)}
              </div>
              <div className="text-sm" style={{ color: '#ff9800', minWidth: '60px', textAlign: 'right' }}>
                {record.duration} 分钟
              </div>
            </div>
            <div
              className="ml-4 flex-shrink-0"
              style={{ fontSize: '32px', lineHeight: 1 }}
            >
              {emotionConfig.emoji}
            </div>
          </div>
        );
      })}
    </div>
  );
}
