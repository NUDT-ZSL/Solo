import { useState, useEffect } from 'react';
import type { Book, DiaryRecord } from '../types';
import { fetchBooks } from '../utils/api';
import DiaryEntry from '../components/DiaryEntry';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface EntryPageProps {
  editingRecord?: DiaryRecord | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function EntryPage({ editingRecord, onSuccess, onCancel }: EntryPageProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await fetchBooks();
        setBooks(data);
      } catch (err) {
        console.error('加载书籍失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, []);

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-6" style={{ color: '#5d4037' }}>
        {editingRecord ? '编辑阅读记录' : '记录今天的阅读'}
      </h2>

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton count={1} height="60px" />
          <LoadingSkeleton count={1} height="80px" />
          <LoadingSkeleton count={1} height="120px" />
        </div>
      ) : (
        <DiaryEntry
          books={books}
          editingRecord={editingRecord}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}
