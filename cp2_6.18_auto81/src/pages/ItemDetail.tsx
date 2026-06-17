import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { fetchItem } from '../utils/api';
import { useItems } from '../hooks/useItems';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/components.css';
import type { Item, Application } from '../types';

const statusMap: Record<string, { text: string; color: string }> = {
  published: { text: '已发布', color: '#4caf50' },
  applied: { text: '已申请', color: '#ff9800' },
  claimed: { text: '已领取', color: '#9e9e9e' },
};

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { applyItem } = useItems();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchItem(id);
        setItem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取物品详情失败');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [id]);

  const handleApply = () => {
    setModalVisible(true);
  };

  const handleConfirmApply = async (applicant: string) => {
    if (!item) return;

    setApplyLoading(true);
    try {
      await applyItem(item.id, applicant);
      setHasApplied(true);
      setModalVisible(false);
      const updatedItem = await fetchItem(item.id);
      setItem(updatedItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : '申请失败');
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div style={errorContainerStyle}>
        <p style={errorTextStyle}>{error || '物品不存在'}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
          返回首页
        </Link>
      </div>
    );
  }

  const statusInfo = statusMap[item.status] || statusMap.published;

  return (
    <div style={containerStyle}>
      <button className="btn" onClick={() => navigate(-1)} style={backButtonStyle}>
        ← 返回
      </button>

      <div style={mainContentStyle}>
        <div style={imageContainerStyle}>
          {item.image ? (
            <img src={item.image} alt={item.title} style={imageStyle} />
          ) : (
            <div style={imagePlaceholderStyle}>暂无图片</div>
          )}
        </div>

        <div style={infoContainerStyle}>
          <div style={headerStyle}>
            <h1 style={titleStyle}>{item.title}</h1>
            <span style={{ ...statusTagStyle, backgroundColor: statusInfo.color }}>
              {statusInfo.text}
            </span>
          </div>

          <div style={publisherStyle}>
            <img
              src={item.publisherAvatar || 'https://via.placeholder.com/48'}
              alt={item.publisher}
              style={avatarStyle}
            />
            <div>
              <p style={publisherNameStyle}>{item.publisher}</p>
              <p style={publishTimeStyle}>
                发布于 {dayjs(item.publishTime).format('YYYY-MM-DD HH:mm')}
              </p>
            </div>
          </div>

          <div style={categoryStyle}>
            <span style={categoryLabelStyle}>分类：</span>
            <span style={categoryValueStyle}>{item.category}</span>
          </div>

          <div style={descriptionStyle}>
            <h3 style={sectionTitleStyle}>物品描述</h3>
            <p style={descriptionTextStyle}>{item.description || '暂无描述'}</p>
          </div>

          {item.status === 'published' && (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleApply}
              disabled={hasApplied || applyLoading}
              style={hasApplied ? appliedButtonStyle : applyButtonStyle}
            >
              {applyLoading ? '申请中...' : hasApplied ? '已申请' : '申请领取'}
            </button>
          )}
        </div>
      </div>

      <div style={applicationsStyle}>
        <h3 style={sectionTitleStyle}>申请历史</h3>
        {item.applications.length === 0 ? (
          <p style={emptyTextStyle}>暂无申请记录</p>
        ) : (
          <div style={applicationListStyle}>
            {item.applications.map((app: Application) => (
              <div key={app.id} style={applicationItemStyle}>
                <div style={applicationInfoStyle}>
                  <span style={applicantNameStyle}>{app.applicant}</span>
                  <span style={applyTimeStyle}>
                    {dayjs(app.applyTime).format('YYYY-MM-DD HH:mm')}
                  </span>
                </div>
                {app.status === 'expired' && (
                  <span style={expiredTagStyle}>已过期</span>
                )}
                {app.status === 'claimed' && (
                  <span style={claimedTagStyle}>已领取</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmApply}
        title="确认申请领取"
        itemName={item.title}
        defaultApplicant="当前用户"
      />
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '24px 16px',
};

const backButtonStyle: React.CSSProperties = {
  marginBottom: 24,
};

const mainContentStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 32,
  marginBottom: 32,
};

const imageContainerStyle: React.CSSProperties = {
  width: '100%',
  paddingTop: '75%',
  position: 'relative',
  backgroundColor: '#f5f5f5',
  borderRadius: 8,
  overflow: 'hidden',
};

const imageStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
};

const imagePlaceholderStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#999',
  fontSize: 16,
};

const infoContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  color: 'var(--text-primary)',
  flex: 1,
  marginRight: 16,
};

const statusTagStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: 4,
  color: '#fff',
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const publisherStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
  paddingBottom: 16,
  borderBottom: '1px solid #e0e0e0',
};

const avatarStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  objectFit: 'cover',
};

const publisherNameStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 500,
  color: 'var(--text-primary)',
  marginBottom: 2,
};

const publishTimeStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
};

const categoryStyle: React.CSSProperties = {
  marginBottom: 16,
};

const categoryLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-secondary)',
};

const categoryValueStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-primary)',
  fontWeight: 500,
  backgroundColor: '#e6f7ff',
  padding: '2px 8px',
  borderRadius: 4,
};

const descriptionStyle: React.CSSProperties = {
  marginBottom: 24,
  flex: 1,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 12,
};

const descriptionTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-secondary)',
  lineHeight: 1.8,
};

const applyButtonStyle: React.CSSProperties = {
  width: '100%',
};

const appliedButtonStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#bdbdbd',
  borderColor: '#bdbdbd',
  cursor: 'not-allowed',
};

const applicationsStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-background)',
  borderRadius: 8,
  padding: 24,
  boxShadow: 'var(--shadow-sm)',
};

const emptyTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-secondary)',
  textAlign: 'center',
  padding: 24,
};

const applicationListStyle: React.CSSProperties = {
  borderTop: '1px solid #e0e0e0',
};

const applicationItemStyle: React.CSSProperties = {
  height: 60,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 8px',
  borderBottom: '1px solid #e0e0e0',
};

const applicationInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const applicantNameStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text-primary)',
};

const applyTimeStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
};

const expiredTagStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#9e9e9e',
};

const claimedTagStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#4caf50',
};

const errorContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 40,
};

const errorTextStyle: React.CSSProperties = {
  color: 'var(--error-color)',
  fontSize: 14,
};

export default ItemDetail;
