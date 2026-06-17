import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useItems } from '../hooks/useItems';
import { exportCSV } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Item } from '../types';

const statusMap: Record<string, { text: string; color: string }> = {
  published: { text: '已发布', color: '#4caf50' },
  applied: { text: '已申请', color: '#ff9800' },
  claimed: { text: '已领取', color: '#9e9e9e' },
};

interface ClaimingState {
  [key: string]: {
    shaking: boolean;
    progress: number;
    claimed: boolean;
  };
}

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading, error, setItemStatus, loadItems } = useItems();
  const [claimingState, setClaimingState] = useState<ClaimingState>({});
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleClaimClick = (item: Item) => {
    setSelectedItem(item);
  };

  const handleConfirmClaim = async () => {
    if (!selectedItem) return;

    const itemId = selectedItem.id;
    setClaimingState(prev => ({
      ...prev,
      [itemId]: { shaking: true, progress: 0, claimed: false }
    }));

    setTimeout(() => {
      setClaimingState(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], shaking: false, progress: 100 }
      }));
    }, 300);

    try {
      await setItemStatus(itemId, 'claimed');
      setClaimingState(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], claimed: true }
      }));
    } catch (err) {
      console.error('标记已领取失败:', err);
      alert('标记失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSelectedItem(null);
    }
  };

  const handleCancelClaim = () => {
    setSelectedItem(null);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await exportCSV();
    } catch (err) {
      console.error('导出CSV失败:', err);
      alert('导出失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!document.querySelector('style[data-adminpage-styles]')) {
      const styleSheet = document.createElement('style');
      styleSheet.setAttribute('data-adminpage-styles', 'true');
      styleSheet.textContent = `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @media (max-width: 768px) {
          .admin-table {
            display: block;
            overflow-x: auto;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={errorContainerStyle}>
        <p style={errorTextStyle}>加载失败：{error}</p>
        <button className="btn btn-primary" onClick={loadItems} style={{ marginTop: 16 }}>
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>管理员面板</h1>
        <div style={buttonGroupStyle}>
          <button
            className="btn"
            onClick={handleExportCSV}
            disabled={exporting}
          >
            {exporting ? '导出中...' : '导出CSV'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/publish')}
          >
            + 发布物品
          </button>
        </div>
      </div>

      <div style={tableContainerStyle}>
        <table style={tableStyle} className="admin-table">
          <thead>
            <tr style={tableHeaderStyle}>
              <th style={tableCellStyle}>标题</th>
              <th style={tableCellStyle}>分类</th>
              <th style={tableCellStyle}>发布者</th>
              <th style={tableCellStyle}>状态</th>
              <th style={tableCellStyle}>申请人数</th>
              <th style={tableCellStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: Item) => {
              const statusInfo = statusMap[item.status] || statusMap.published;
              const itemClaimState = claimingState[item.id];
              const isClaimed = item.status === 'claimed' || itemClaimState?.claimed;

              return (
                <tr key={item.id} style={tableRowStyle}>
                  <td style={tableCellStyle}>
                    <Link to={`/items/${item.id}`} style={titleLinkStyle}>
                      {item.title}
                    </Link>
                  </td>
                  <td style={tableCellStyle}>{item.category}</td>
                  <td style={tableCellStyle}>
                    <div style={publisherStyle}>
                      <img
                        src={item.publisherAvatar || 'https://via.placeholder.com/24'}
                        alt={item.publisher}
                        style={smallAvatarStyle}
                      />
                      <span>{item.publisher}</span>
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ ...statusTagStyle, backgroundColor: statusInfo.color }}>
                      {statusInfo.text}
                    </span>
                  </td>
                  <td style={tableCellStyle}>{item.applications.length}</td>
                  <td style={tableCellStyle}>
                    <div style={actionButtonGroupStyle}>
                      <div
                        className="claim-button-wrapper"
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          animation: itemClaimState?.shaking ? 'shake 0.3s ease-in-out' : 'none'
                        }}
                      >
                        {itemClaimState?.progress && itemClaimState.progress > 0 && !isClaimed && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              height: '100%',
                              width: `${itemClaimState.progress}%`,
                              backgroundColor: '#4caf50',
                              opacity: 0.3,
                              transition: 'width 0.3s ease-out'
                            }}
                          />
                        )}
                        <button
                          className="btn btn-sm"
                          onClick={() => handleClaimClick(item)}
                          disabled={isClaimed}
                          style={isClaimed ? disabledButtonStyle : {}}
                        >
                          {isClaimed ? '已领取' : '标记已领取'}
                        </button>
                      </div>
                      <button
                        className="btn btn-sm"
                        onClick={() => navigate(`/items/${item.id}`)}
                      >
                        查看详情
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {items.length === 0 && (
          <div style={emptyContainerStyle}>
            <p style={emptyTextStyle}>暂无物品数据</p>
          </div>
        )}
      </div>

      {selectedItem && (
        <div style={confirmMaskStyle}>
          <div style={confirmModalStyle}>
            <h3 style={confirmTitleStyle}>确认标记</h3>
            <p style={confirmContentStyle}>
              确定要将"{selectedItem.title}"标记为已领取吗？
            </p>
            <div style={confirmButtonContainerStyle}>
              <button className="btn" onClick={handleCancelClaim}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleConfirmClaim}>
                确认标记
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '24px 16px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
};

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-background)',
  borderRadius: 8,
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const tableHeaderStyle: React.CSSProperties = {
  backgroundColor: '#fafafa',
  borderBottom: '1px solid var(--border-color)',
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--border-color)',
  transition: 'background-color 0.2s',
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 14,
};

const titleLinkStyle: React.CSSProperties = {
  color: 'var(--primary-color)',
  textDecoration: 'none',
  fontWeight: 500,
};

const publisherStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const smallAvatarStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  objectFit: 'cover',
};

const statusTagStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: 4,
  color: '#fff',
  fontSize: 12,
  fontWeight: 500,
};

const actionButtonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
};

const disabledButtonStyle: React.CSSProperties = {
  backgroundColor: '#bdbdbd',
  borderColor: '#bdbdbd',
  color: '#fff',
  cursor: 'not-allowed',
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

const emptyContainerStyle: React.CSSProperties = {
  padding: 48,
  textAlign: 'center',
};

const emptyTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-secondary)',
};

const confirmMaskStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const confirmModalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 8,
  padding: 24,
  minWidth: 320,
  maxWidth: 480,
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

const confirmTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 12,
  color: 'var(--text-primary)',
};

const confirmContentStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-secondary)',
  marginBottom: 24,
  lineHeight: 1.6,
};

const confirmButtonContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
};

export default AdminPage;
