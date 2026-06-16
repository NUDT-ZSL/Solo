import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Clock, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import dayjs from 'dayjs';
import { useBookDetail } from '../hooks/useBooks';
import ConfirmDialog from '../components/ConfirmDialog';

function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { book, driftRecords, loading, error, applying, handleApply } = useBookDetail(id);

  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [location, setLocation] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [hoveredRecord, setHoveredRecord] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const displayRecords = useMemo(() => {
    if (expanded || driftRecords.length <= 5) {
      return driftRecords;
    }
    return driftRecords.slice(-5);
  }, [driftRecords, expanded]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return '可申请';
      case 'drifting':
        return '漂流中';
      case 'offline':
        return '已下架';
      default:
        return status;
    }
  };

  const getTimelineDotClass = (status: string) => {
    switch (status) {
      case 'start':
        return 'start';
      case 'current':
        return 'current';
      default:
        return 'middle';
    }
  };

  const handleApplyClick = () => {
    setApplicantName('');
    setLocation('');
    setApplyMessage(null);
    setShowApplyDialog(true);
  };

  const handleConfirmApply = async () => {
    if (!applicantName.trim() || !location.trim()) {
      setApplyMessage({ type: 'error', text: '请填写完整信息' });
      return;
    }

    const result = await handleApply(
      'current-user',
      applicantName.trim(),
      location.trim()
    );

    if (result.success) {
      setApplyMessage({ type: 'success', text: result.message });
      setTimeout(() => {
        setShowApplyDialog(false);
      }, 1500);
    } else {
      setApplyMessage({ type: 'error', text: result.message });
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div>加载中...</div>
      </div>
    );
  }

  if (error || !book) {
    return <div className="error-message">{error || '图书不存在'}</div>;
  }

  return (
    <div className="book-detail-page">
      <div className="book-info-section">
        <button className="back-button" onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          返回列表
        </button>
        <img
          src={book.coverUrl}
          alt={book.title}
          className="book-detail-cover"
        />
        <h1 className="book-detail-title">{book.title}</h1>
        <p className="book-detail-author">
          <User size={14} style={{ marginRight: 4 }} />
          {book.author}
        </p>
        <div className="book-detail-status">
          <span className={`status-tag status-${book.status}`}>
            {getStatusLabel(book.status)}
          </span>
        </div>
        <p className="book-detail-description">{book.description}</p>
        <div className="book-detail-publish-info">
          <div style={{ marginBottom: 8 }}>
            <strong>出版信息：</strong>
            {book.publishInfo}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>当前持有者：</strong>
            {book.currentHolder}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>发布者：</strong>
            {book.publisherName}
          </div>
          <div>
            <BookOpen size={14} style={{ marginRight: 4 }} />
            已漂流 {book.driftCount} 次
          </div>
        </div>
        {book.status === 'available' && (
          <button className="apply-button" onClick={handleApplyClick}>
            申请漂流传阅
          </button>
        )}
        {book.status !== 'available' && (
          <button className="apply-button" disabled>
            {book.status === 'drifting' ? '图书正在漂流中' : '图书已下架'}
          </button>
        )}
      </div>

      <div className="drift-timeline-section">
        <h2 className="section-title">
          <MapPin size={20} />
          漂流轨迹
        </h2>

        {driftRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📍</div>
            <div>暂无漂流记录</div>
          </div>
        ) : (
          <>
            <div className="drift-timeline">
              {displayRecords.map((record) => (
                <div key={record.id} className="timeline-item">
                  <div
                    className={`timeline-dot ${getTimelineDotClass(record.status)}`}
                    onMouseEnter={() => setHoveredRecord(record.id)}
                    onMouseLeave={() => setHoveredRecord(null)}
                  >
                    {hoveredRecord === record.id && (
                      <div className="timeline-tooltip">
                        {dayjs(record.time).format('YYYY年MM月DD日 HH:mm')}
                        <br />
                        {record.fromLocation} → {record.toLocation}
                      </div>
                    )}
                  </div>
                  <div className="timeline-line"></div>
                  <div className="timeline-content">
                    <div className="timeline-location">
                      {record.fromLocation} → {record.toLocation}
                    </div>
                    <div className="timeline-holder">
                      持有者：{record.holderName}
                    </div>
                    <div className="timeline-time">
                      <Clock size={12} style={{ marginRight: 4 }} />
                      {dayjs(record.time).format('YYYY年MM月DD日')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {driftRecords.length > 5 && (
              <button
                className="expand-button"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp size={16} style={{ marginRight: 6 }} />
                    收起部分记录
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} style={{ marginRight: 6 }} />
                    查看全部 {driftRecords.length} 条记录
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={showApplyDialog}
        title="申请漂流传阅"
        description={`确认申请借阅《${book.title}》？申请成功后图书将漂流向您所在的位置。`}
        onClose={() => setShowApplyDialog(false)}
        onConfirm={handleConfirmApply}
        confirmText="确认申请"
        cancelText="取消"
        loading={applying}
      >
        {applyMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '16px',
              backgroundColor: applyMessage.type === 'success' ? '#d4edda' : '#f8d7da',
              color: applyMessage.type === 'success' ? '#155724' : '#721c24',
            }}
          >
            {applyMessage.text}
          </div>
        )}
        <div className="dialog-form-group">
          <label className="dialog-label">您的昵称</label>
          <input
            type="text"
            className="dialog-input"
            placeholder="请输入您的昵称"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            disabled={applying}
          />
        </div>
        <div className="dialog-form-group">
          <label className="dialog-label">所在城市/地点</label>
          <input
            type="text"
            className="dialog-input"
            placeholder="请输入您所在的城市或地点"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={applying}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default BookDetailPage;
