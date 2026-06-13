import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Collectible, statusLabels, StatusType } from './types';
import { UserContext, ToastContext } from './App';

function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);

  const [collectible, setCollectible] = useState<Collectible | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    series: '',
    purchaseDate: '',
    price: 0,
    status: 'new' as StatusType,
    notes: ''
  });

  const fetchCollectible = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/collectibles/${id}`);
      setCollectible(response.data);
      setEditForm({
        name: response.data.name,
        series: response.data.series,
        purchaseDate: response.data.purchaseDate,
        price: response.data.price,
        status: response.data.status,
        notes: response.data.notes
      });
    } catch (error) {
      console.error('获取藏品详情失败:', error);
      showToast('获取藏品详情失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCollectible();
    }
  }, [id]);

  const handleSave = async () => {
    try {
      const response = await axios.put(`/api/collectibles/${id}`, editForm);
      setCollectible(response.data);
      setIsEditing(false);
      window.dispatchEvent(new Event('collectionUpdated'));
      showToast('保存成功', 'success');
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/collectibles/${id}`);
      window.dispatchEvent(new Event('collectionUpdated'));
      showToast('删除成功', 'success');
      navigate('/');
    } catch (error) {
      console.error('删除失败:', error);
      showToast('删除失败', 'error');
    }
    setShowDeleteDialog(false);
  };

  const handleStatusChange = async (newStatus: StatusType) => {
    try {
      const response = await axios.put(`/api/collectibles/${id}`, {
        status: newStatus
      });
      setCollectible(response.data);
      window.dispatchEvent(new Event('collectionUpdated'));
      showToast('状态已更新', 'success');
    } catch (error) {
      console.error('更新状态失败:', error);
      showToast('更新状态失败', 'error');
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!collectible) {
    return (
      <div className="detail-container">
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <p>藏品不存在</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/')}
          >
            返回藏品墙
          </button>
        </div>
      </div>
    );
  }

  const isOwner = collectible.owner === currentUser;

  return (
    <div className="detail-container">
      <div className="back-link" onClick={() => navigate('/')}>
        ← 返回藏品墙
      </div>

      <div className="detail-card" style={{ animation: 'fadeInUp 0.5s ease forwards' }}>
        <div className="detail-image">
          <img src={collectible.image} alt={collectible.name} />
        </div>
        <div className="detail-content">
          {isEditing ? (
            <div className="detail-edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>藏品名称</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>系列</label>
                  <input
                    type="text"
                    value={editForm.series}
                    onChange={(e) =>
                      setEditForm({ ...editForm, series: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>购买日期</label>
                  <input
                    type="date"
                    value={editForm.purchaseDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, purchaseDate: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>入手价格 (元)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label>状态</label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value as StatusType
                    })
                  }
                >
                  <option value="new">全新</option>
                  <option value="opened">拆封</option>
                  <option value="swap">待交换</option>
                </select>
              </div>
              <div className="form-group">
                <label>备注</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                />
              </div>
              <div className="detail-actions">
                <button className="btn btn-primary" onClick={handleSave}>
                  保存修改
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <div>
                  <h1 className="detail-title">{collectible.name}</h1>
                  <p className="detail-series">{collectible.series}</p>
                </div>
                {isOwner && (
                  <span
                    className={`status-tag status-${collectible.status}`}
                    style={{ cursor: 'pointer', fontSize: 14, padding: '6px 12px' }}
                  >
                    <select
                      value={collectible.status}
                      onChange={(e) =>
                        handleStatusChange(e.target.value as StatusType)
                      }
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="new">全新</option>
                      <option value="opened">拆封</option>
                      <option value="swap">待交换</option>
                    </select>
                  </span>
                )}
                {!isOwner && (
                  <span className={`status-tag status-${collectible.status}`}>
                    {statusLabels[collectible.status]}
                  </span>
                )}
              </div>

              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <span className="detail-info-label">所有者</span>
                  <span className="detail-info-value">@{collectible.owner}</span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-info-label">购买日期</span>
                  <span className="detail-info-value">
                    {new Date(collectible.purchaseDate).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-info-label">入手价格</span>
                  <span className="detail-info-value" style={{ color: '#f97316' }}>
                    ¥{collectible.price}
                  </span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-info-label">创建时间</span>
                  <span className="detail-info-value">
                    {new Date(collectible.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>

              {collectible.notes && (
                <div className="detail-notes">
                  <strong style={{ display: 'block', marginBottom: 8 }}>备注</strong>
                  {collectible.notes}
                </div>
              )}

              {isOwner && (
                <div className="detail-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    ✏️ 编辑藏品
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    🗑️ 删除藏品
                  </button>
                </div>
              )}

              {!isOwner && collectible.status === 'swap' && (
                <div className="detail-actions">
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      try {
                        await axios.post('/api/swap/request', {
                          collectibleId: id,
                          requester: currentUser
                        });
                        showToast('交换请求已发送', 'success');
                      } catch (error) {
                        console.error('发送请求失败:', error);
                        showToast('发送请求失败', 'error');
                      }
                    }}
                  >
                    🤝 请求交换
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="确认删除"
        message={`确定要删除「${collectible.name}」吗？此操作不可撤销。`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
