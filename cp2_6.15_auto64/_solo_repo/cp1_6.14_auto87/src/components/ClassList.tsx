import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import http from '../services/http';
import { FitnessClass } from '../types';

interface ClassListProps {
  userId: string;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onBookingChange: () => void;
}

interface Coach {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

function ClassList({ userId, onToast, onBookingChange }: ClassListProps) {
  const [classes, setClasses] = useState<FitnessClass[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<FitnessClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCoach, setSelectedCoach] = useState('all');
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isCoach = userId.startsWith('coach');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [classesData, typesData, coachesData] = await Promise.all([
        http.get<any, FitnessClass[]>('/classes'),
        http.get<any, string[]>('/class-types'),
        http.get<any, Coach[]>('/coaches'),
      ]);
      setClasses(classesData);
      setFilteredClasses(classesData);
      setClassTypes(typesData);
      setCoaches(coachesData);
    } catch (error: any) {
      onToast(error.response?.data?.message || '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let result = [...classes];
    
    if (selectedType !== 'all') {
      result = result.filter(c => c.type === selectedType);
    }
    if (selectedCoach !== 'all') {
      result = result.filter(c => c.coachId === selectedCoach);
    }
    
    setFilteredClasses(result);
    setVisibleCount(PAGE_SIZE);
  }, [selectedType, selectedCoach, classes]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredClasses.length));
    }
  }, [filteredClasses.length]);

  const handleBook = async (classId: string) => {
    if (isCoach || bookingId) return;
    
    const fitnessClass = classes.find(c => c.id === classId);
    if (!fitnessClass) return;

    if (fitnessClass.participants.includes(userId)) {
      onToast('您已预约该课程', 'info');
      return;
    }

    if (fitnessClass.participants.length >= fitnessClass.capacity) {
      onToast('名额已满', 'info');
      return;
    }

    setBookingId(classId);
    try {
      await http.post(`/classes/${classId}/book`, { userId });
      setClasses(prev => prev.map(c => 
        c.id === classId 
          ? { ...c, participants: [...c.participants, userId] }
          : c
      ));
      onToast('预约成功', 'success');
      onBookingChange();
    } catch (error: any) {
      onToast(error.response?.data?.message || '预约失败', 'error');
    } finally {
      setBookingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  const getRemaining = (fitnessClass: FitnessClass) => {
    return fitnessClass.capacity - fitnessClass.participants.length;
  };

  const isBooked = (fitnessClass: FitnessClass) => {
    return fitnessClass.participants.includes(userId);
  };

  const visibleClasses = useMemo(() => 
    filteredClasses.slice(0, visibleCount),
    [filteredClasses, visibleCount]
  );

  return (
    <div className="class-list-page">
      <div className="page-header">
        <h1 className="page-title">本周课表</h1>
        <p className="page-subtitle">选择心仪的课程，开启健身之旅</p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">课程类型</label>
          <select
            className="filter-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">全部类型</option>
            {classTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">教练</label>
          <select
            className="filter-select"
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
          >
            <option value="all">全部教练</option>
            {coaches.map(coach => (
              <option key={coach.id} value={coach.id}>{coach.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-stats">
          共 <span className="stats-number">{filteredClasses.length}</span> 节课程
        </div>
      </div>

      <div 
        className="class-grid"
        ref={listRef}
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        ) : visibleClasses.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>暂无符合条件的课程</p>
          </div>
        ) : (
          visibleClasses.map((fitnessClass, index) => {
            const remaining = getRemaining(fitnessClass);
            const booked = isBooked(fitnessClass);
            const isFull = remaining <= 0;

            return (
              <div 
                key={fitnessClass.id}
                className="class-card"
                style={{ 
                  animationDelay: `${index * 0.03}s`,
                  opacity: 1,
                  transform: 'translateY(0)',
                }}
              >
                <div className="card-header">
                  <span className="class-type-badge">{fitnessClass.type}</span>
                  <span className={`class-status ${isFull ? 'full' : booked ? 'booked' : 'available'}`}>
                    {isFull ? '已满员' : booked ? '已预约' : `${remaining}个名额`}
                  </span>
                </div>

                <h3 className="class-name">{fitnessClass.name}</h3>

                <div className="class-info">
                  <div className="info-item">
                    <span className="info-icon">📅</span>
                    <span>{formatDate(fitnessClass.date)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">⏰</span>
                    <span>{fitnessClass.time} · {fitnessClass.duration}分钟</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">👨‍🏫</span>
                    <span>{fitnessClass.coach}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-icon">🔥</span>
                    <span>{fitnessClass.calories} 卡路里</span>
                  </div>
                </div>

                <div className="card-footer">
                  <div className="capacity-bar">
                    <div 
                      className="capacity-fill"
                      style={{ 
                        width: `${(fitnessClass.participants.length / fitnessClass.capacity) * 100}%`,
                        background: isFull ? '#f44336' : booked ? '#ff9800' : '#4caf50',
                      }}
                    />
                  </div>
                  
                  {!isCoach && (
                    <button
                      className={`book-btn ${booked ? 'booked' : ''} ${isFull ? 'full' : ''}`}
                      onClick={() => handleBook(fitnessClass.id)}
                      disabled={booked || isFull || bookingId === fitnessClass.id}
                    >
                      {bookingId === fitnessClass.id ? '处理中...' : 
                       booked ? '已预约' : 
                       isFull ? '名额已满' : '立即预约'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {!loading && visibleCount < filteredClasses.length && (
          <div className="load-more-trigger">
            <div className="spinner small"></div>
          </div>
        )}
      </div>

      <style>{`
        .class-list-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header {
          text-align: center;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #fff, #a5b4fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }

        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-end;
          padding: 20px;
          background: rgba(30, 30, 46, 0.6);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 500;
        }

        .filter-select {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #e0e0e0;
          font-size: 14px;
          cursor: pointer;
          min-width: 140px;
          transition: all 0.25s ease-out;
        }

        .filter-select:hover {
          border-color: rgba(76, 175, 80, 0.5);
          background: rgba(76, 175, 80, 0.1);
        }

        .filter-select:focus {
          outline: none;
          border-color: #4caf50;
          box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
        }

        .filter-select option {
          background: #1e1e2e;
          color: #e0e0e0;
        }

        .filter-stats {
          margin-left: auto;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .stats-number {
          color: #4caf50;
          font-weight: 700;
          font-size: 16px;
          margin: 0 4px;
        }

        .class-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-height: calc(100vh - 280px);
          overflow-y: auto;
          padding: 4px;
        }

        .class-card {
          background: #1e1e2e;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.25s ease-out;
          display: flex;
          flex-direction: column;
          gap: 14px;
          cursor: default;
          animation: fadeInUp 0.4s ease-out both;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .class-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
          border-color: rgba(76, 175, 80, 0.3);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .class-type-badge {
          padding: 4px 12px;
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
          color: #4caf50;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .class-status {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .class-status.available {
          color: #4caf50;
          background: rgba(76, 175, 80, 0.15);
        }

        .class-status.booked {
          color: #ff9800;
          background: rgba(255, 152, 0, 0.15);
        }

        .class-status.full {
          color: #f44336;
          background: rgba(244, 67, 54, 0.15);
        }

        .class-name {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .class-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        }

        .info-icon {
          font-size: 14px;
          width: 20px;
        }

        .card-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .capacity-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .capacity-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .book-btn {
          position: relative;
          padding: 12px 24px;
          background: #4caf50;
          color: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.25s ease-out;
          overflow: hidden;
          width: 100%;
        }

        .book-btn::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.4s, height 0.4s;
        }

        .book-btn:active::after {
          width: 200px;
          height: 200px;
        }

        .book-btn:hover:not(:disabled) {
          background: #66bb6a;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(76, 175, 80, 0.4);
        }

        .book-btn.booked {
          background: #ff9800;
        }

        .book-btn.booked:hover {
          background: #ffa726;
        }

        .book-btn.full {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
          cursor: not-allowed;
        }

        .book-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .loading-container {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          gap: 16px;
          color: rgba(255, 255, 255, 0.6);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #4caf50;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .spinner.small {
          width: 24px;
          height: 24px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          gap: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .empty-icon {
          font-size: 48px;
        }

        .load-more-trigger {
          grid-column: 1 / -1;
          display: flex;
          justify-content: center;
          padding: 20px;
        }

        @media (max-width: 1024px) {
          .class-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .class-grid {
            grid-template-columns: 1fr;
            max-height: none;
            overflow-y: visible;
          }

          .filter-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-stats {
            margin-left: 0;
            text-align: center;
          }

          .page-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}

export default ClassList;
