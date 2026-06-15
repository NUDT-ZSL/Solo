import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Trash2, Star, Clock, Tag } from 'lucide-react';
import { Snippet, LANGUAGE_COLORS, Language } from '../types';
import { getSnippetById, deleteSnippet, toggleFavorite } from '../api/snippets';
import CodeEditor from '../components/CodeEditor';

const detailPageStyles = `
  .detail-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    animation: fadeIn 0.3s ease;
  }

  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .detail-header-left {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    flex: 1;
  }

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid #334155;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
    flex-shrink: 0;
  }

  .back-btn:hover {
    background: #334155;
  }

  .back-btn:active {
    transform: scale(0.95);
  }

  .detail-title-section {
    flex: 1;
  }

  .detail-title {
    font-size: 24px;
    font-weight: 700;
    color: #e2e8f0;
    line-height: 1.3;
  }

  .detail-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
  }

  .detail-lang-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .detail-meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #94a3b8;
  }

  .detail-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .detail-action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
    border: 1px solid #334155;
    background: #1e293b;
    color: #e2e8f0;
  }

  .detail-action-btn:hover {
    background: #334155;
  }

  .detail-action-btn:active {
    transform: scale(0.97);
  }

  .detail-action-btn.fav-btn.active {
    background: rgba(245, 158, 11, 0.15);
    border-color: rgba(245, 158, 11, 0.3);
    color: #f59e0b;
  }

  .detail-action-btn.delete-btn {
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .detail-action-btn.delete-btn:hover {
    background: rgba(239, 68, 68, 0.15);
  }

  .detail-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .detail-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: 20px;
    background: #e2e8f0;
    color: #1e293b;
    font-size: 12px;
    font-weight: 500;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: fadeIn 0.2s ease;
  }

  .modal-card {
    width: 360px;
    max-width: 90vw;
    background: #ffffff;
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    animation: slideUp 0.25s ease;
  }

  .modal-title {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 12px;
  }

  .modal-text {
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 24px;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .modal-btn {
    padding: 8px 20px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;
    border: none;
  }

  .modal-btn:active {
    transform: scale(0.97);
  }

  .modal-btn-cancel {
    background: #e2e8f0;
    color: #1e293b;
  }

  .modal-btn-cancel:hover {
    background: #cbd5e1;
  }

  .modal-btn-delete {
    background: #ef4444;
    color: #ffffff;
  }

  .modal-btn-delete:hover {
    background: #dc2626;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    gap: 12px;
    color: #94a3b8;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #334155;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 480px) {
    .detail-header {
      flex-direction: column;
    }

    .detail-actions {
      width: 100%;
    }

    .detail-action-btn {
      flex: 1;
      justify-content: center;
    }

    .detail-title {
      font-size: 20px;
    }
  }
`;

export default function SnippetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSnippetById(id)
      .then(setSnippet)
      .catch((err) => {
        console.error('Failed to fetch snippet:', err);
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteSnippet(id);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete snippet:', err);
    }
  };

  const handleFavorite = async () => {
    if (!id) return;
    try {
      const updated = await toggleFavorite(id);
      setSnippet(updated);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  if (loading) {
    return (
      <>
        <style>{detailPageStyles}</style>
        <div className="loading-state">
          <div className="loading-spinner" />
          加载中...
        </div>
      </>
    );
  }

  if (!snippet) return null;

  const langColor = LANGUAGE_COLORS[snippet.language as Language] || {
    bg: '#888888',
    text: '#ffffff',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <style>{detailPageStyles}</style>
      <div className="detail-page">
        <div className="detail-header">
          <div className="detail-header-left">
            <button className="back-btn" onClick={() => navigate('/')}>
              <ArrowLeft size={20} />
            </button>
            <div className="detail-title-section">
              <h1 className="detail-title">{snippet.title}</h1>
              <div className="detail-meta">
                <span
                  className="detail-lang-badge"
                  style={{
                    backgroundColor: langColor.bg,
                    color: langColor.text,
                  }}
                >
                  {snippet.language}
                </span>
                <span className="detail-meta-item">
                  <Clock size={13} />
                  {formatDate(snippet.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-actions">
            <button
              className={`detail-action-btn fav-btn ${snippet.isFavorite ? 'active' : ''}`}
              onClick={handleFavorite}
            >
              <Star
                size={15}
                fill={snippet.isFavorite ? '#f59e0b' : 'none'}
                color={snippet.isFavorite ? '#f59e0b' : 'currentColor'}
              />
              {snippet.isFavorite ? '已收藏' : '收藏'}
            </button>
            <button
              className="detail-action-btn"
              onClick={() => navigate(`/edit/${snippet.id}`)}
            >
              <Edit3 size={15} />
              编辑
            </button>
            <button
              className="detail-action-btn delete-btn"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={15} />
              删除
            </button>
          </div>
        </div>

        {snippet.tags.length > 0 && (
          <div className="detail-tags">
            <Tag size={14} style={{ color: '#94a3b8' }} />
            {snippet.tags.map((tag) => (
              <span key={tag} className="detail-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        <CodeEditor code={snippet.code} language={snippet.language} />

        {showDeleteModal && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">确认删除</h3>
              <p className="modal-text">
                确定要删除代码片段「{snippet.title}」吗？此操作无法撤销。
              </p>
              <div className="modal-actions">
                <button
                  className="modal-btn modal-btn-cancel"
                  onClick={() => setShowDeleteModal(false)}
                >
                  取消
                </button>
                <button
                  className="modal-btn modal-btn-delete"
                  onClick={handleDelete}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
