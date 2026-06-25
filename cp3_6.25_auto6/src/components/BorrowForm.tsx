import { useState, useEffect } from 'react';
import { Book, Reader } from '../types';
import { getReaders } from '../api';
import dayjs from 'dayjs';

interface BorrowFormProps {
  book: Book | null;
  onSubmit: (reader: Reader) => void;
  onCancel: () => void;
  loading: boolean;
}

function BorrowForm({ book, onSubmit, onCancel, loading }: BorrowFormProps) {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [selectedReaderId, setSelectedReaderId] = useState('');
  const [readerId, setReaderId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [readersLoading, setReadersLoading] = useState(false);

  useEffect(() => {
    if (book) {
      const fetchReaders = async () => {
        setReadersLoading(true);
        try {
          const data = await getReaders();
          setReaders(data);
        } catch (err) {
          console.error('获取读者列表失败:', err);
        } finally {
          setReadersLoading(false);
        }
      };
      fetchReaders();
      setSelectedReaderId('');
      setReaderId('');
      setName('');
      setPhone('');
      setErrors({});
    }
  }, [book]);

  useEffect(() => {
    if (selectedReaderId) {
      const reader = readers.find(r => r.readerId === selectedReaderId);
      if (reader) {
        setReaderId(reader.readerId);
        setName(reader.name);
        setPhone(reader.phone);
      }
    }
  }, [selectedReaderId, readers]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!readerId.trim()) newErrors.readerId = '请输入读者编号';
    if (!name.trim()) newErrors.name = '请输入读者姓名';
    if (!phone.trim()) newErrors.phone = '请输入联系方式';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ readerId, name, phone });
  };

  if (!book) return null;

  const dueDate = dayjs().add(14, 'day').format('YYYY-MM-DD');

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">借阅书籍</h2>
        <div className="modal-body">
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{book.title}</div>
            <div style={{ fontSize: '13px', color: '#616161' }}>{book.author}</div>
            <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '4px' }}>
              预计归还日期: {dueDate}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">常用读者</label>
              <select
                className="form-select"
                value={selectedReaderId}
                onChange={(e) => setSelectedReaderId(e.target.value)}
                disabled={readersLoading}
              >
                <option value="">-- 选择常用读者 --</option>
                {readers.map((reader) => (
                  <option key={reader.readerId} value={reader.readerId}>
                    {reader.name} ({reader.readerId})
                  </option>
                ))}
              </select>
              {readersLoading && (
                <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '4px' }}>
                  加载读者列表中...
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">读者编号 *</label>
              <input
                type="text"
                className={`form-input ${errors.readerId ? 'error' : ''}`}
                value={readerId}
                onChange={(e) => setReaderId(e.target.value)}
                placeholder="请输入读者编号"
              />
              {errors.readerId && <div className="form-error">{errors.readerId}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">读者姓名 *</label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入读者姓名"
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">联系方式 *</label>
              <input
                type="tel"
                className={`form-input ${errors.phone ? 'error' : ''}`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入联系方式"
              />
              {errors.phone && <div className="form-error">{errors.phone}</div>}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '提交中...' : '确认借阅'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BorrowForm;
