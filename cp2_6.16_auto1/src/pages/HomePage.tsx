import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { DiaryRecord, Book, Recommendation } from '../types';
import { fetchDiaryRecords, fetchBooks, fetchRecommendation, clearAllRecords } from '../utils/api';
import RecommendCard from '../components/RecommendCard';
import DiaryList from '../components/DiaryList';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface HomePageProps {
  onAddRecord: () => void;
  onEditRecord: (record: DiaryRecord) => void;
}

export default function HomePage({ onAddRecord, onEditRecord }: HomePageProps) {
  const [records, setRecords] = useState<DiaryRecord[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsData, booksData, recData] = await Promise.all([
        fetchDiaryRecords(),
        fetchBooks(),
        fetchRecommendation(),
      ]);
      setRecords(recordsData);
      setBooks(booksData);
      setRecommendation(recData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClear = async () => {
    try {
      await clearAllRecords();
      setRecords([]);
      setShowClearModal(false);
      const newRec = await fetchRecommendation();
      setRecommendation(newRec);
    } catch (err) {
      console.error('清空记录失败:', err);
    }
  };

  const handleEdit = (record: DiaryRecord) => {
    onEditRecord(record);
  };

  return (
    <div className="w-full space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#5d4037' }}>
            为你推荐
          </h2>
          {records.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: '#f44336', color: '#fff' }}
            >
              <Trash2 size={16} />
              清空记录
            </button>
          )}
        </div>
        {recommendation && (
          <p className="text-sm mb-4" style={{ color: '#8d6e63' }}>
            {recommendation.reason}
          </p>
        )}
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ flexShrink: 0 }}>
                <LoadingSkeleton count={1} height="280px" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {recommendation?.books.map((book) => (
              <div key={book.id} style={{ flexShrink: 0 }}>
                <RecommendCard book={book} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#5d4037' }}>
            阅读记录
          </h2>
          <button
            onClick={onAddRecord}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: '#ff9800' }}
          >
            <Plus size={18} />
            新增记录
          </button>
        </div>
        {loading ? (
          <LoadingSkeleton count={3} height="80px" />
        ) : (
          <DiaryList records={records} books={books} onEdit={handleEdit} />
        )}
      </div>

      <ConfirmModal
        isOpen={showClearModal}
        title="确认清空"
        message="确定要清空所有阅读记录吗？此操作不可恢复。"
        onConfirm={handleClear}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
}
