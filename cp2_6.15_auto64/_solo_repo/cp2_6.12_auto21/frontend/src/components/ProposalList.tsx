import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Proposal {
  id: string;
  title: string;
  updatedAt: string;
  collaborators: { userId: string; username: string; avatarColor: string }[];
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date().getTime();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

function ProposalList() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creatorName, setCreatorName] = useState('');

  useEffect(() => {
    axios.get('/api/proposals').then((res) => setProposals(res.data));
  }, []);

  const handleSubmit = async () => {
    const res = await axios.post('/api/proposals', { title, content, creatorName });
    navigate(`/proposal/${res.data.id}`);
  };

  return (
    <div style={{ background: '#ECF0F1', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#2C3E50', margin: 0, fontSize: 28, fontWeight: 700 }}>提案列表</h1>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: '#2C3E50',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 15,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            新建提案
          </button>
        </div>

        {proposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#7f8c8d', fontSize: 16 }}>
            还没有提案，点击上方按钮创建第一个提案
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
            }}
          >
            {proposals.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/proposal/${p.id}`)}
                style={{
                  background: '#fff',
                  borderRadius: 10,
                  padding: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
              >
                <h3 style={{ color: '#2C3E50', margin: '0 0 8px 0', fontSize: 17 }}>{p.title}</h3>
                <div style={{ color: '#95a5a6', fontSize: 13, marginBottom: 12 }}>
                  {formatRelativeTime(p.updatedAt)}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {p.collaborators.map((c) => (
                    <div
                      key={c.userId}
                      title={c.username}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: c.avatarColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {c.username.charAt(0)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 32,
              width: 480,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <h2 style={{ color: '#2C3E50', marginTop: 0, marginBottom: 20 }}>新建提案</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#2C3E50', fontSize: 14, fontWeight: 600 }}>
                标题
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #bdc3c7',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#2C3E50', fontSize: 14, fontWeight: 600 }}>
                内容
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# 提案标题&#10;&#10;## 背景&#10;&#10;描述..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #bdc3c7',
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#2C3E50', fontSize: 14, fontWeight: 600 }}>
                创建者姓名
              </label>
              <input
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #bdc3c7',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #bdc3c7',
                  borderRadius: 6,
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#2C3E50',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: 6,
                  background: '#2C3E50',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          div[style*="gridTemplateColumns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ProposalList;
