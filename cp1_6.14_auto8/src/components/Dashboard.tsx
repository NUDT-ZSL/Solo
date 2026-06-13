import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { Form } from '../types';

const navItems = [
  { key: 'dashboard', label: '仪表盘', icon: '📊' },
  { key: 'create', label: '创建表单', icon: '➕' },
  { key: 'templates', label: '模板中心', icon: '📋' },
  { key: 'submissions', label: '提交记录', icon: '📝' },
  { key: 'analytics', label: '数据分析', icon: '📈' },
  { key: 'team', label: '团队管理', icon: '👥' },
  { key: 'settings', label: '系统设置', icon: '⚙️' },
];

const fieldTypeIcons: Record<string, string> = {
  text: '📝',
  textarea: '📄',
  radio: '🔘',
  checkbox: '☑️',
  select: '📑',
  file: '📎',
  number: '🔢',
  date: '📅',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [clickedNav, setClickedNav] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    const loadForms = async () => {
      try {
        const res = await axios.get('/api/forms');
        setForms(res.data);
      } catch (e) {
        const mockForms: Form[] = [
          {
            _id: '1',
            title: '员工满意度调查',
            description: '了解团队成员的工作满意度',
            fields: [
              { id: 'f1', type: 'radio', title: '整体满意度', description: '', required: true, options: ['非常满意', '满意', '一般', '不满意'] },
              { id: 'f2', type: 'text', title: '改进建议', description: '', required: false },
            ],
            shareId: 'abc123',
            isPublished: true,
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            updatedAt: new Date().toISOString(),
            submissionCount: 42,
          },
          {
            _id: '2',
            title: '项目进度周报',
            description: '每周项目进展汇报',
            fields: [
              { id: 'f3', type: 'text', title: '本周完成', description: '', required: true },
              { id: 'f4', type: 'textarea', title: '下周计划', description: '', required: true },
            ],
            shareId: 'def456',
            isPublished: true,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
            submissionCount: 18,
          },
          {
            _id: '3',
            title: '会议反馈收集',
            description: '会议效果和改进意见',
            fields: [
              { id: 'f5', type: 'checkbox', title: '会议议题', description: '', required: false, options: ['产品', '技术', '运营', '其他'] },
            ],
            shareId: 'ghi789',
            isPublished: false,
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            updatedAt: new Date().toISOString(),
            submissionCount: 0,
          },
          {
            _id: '4',
            title: '请假申请表单',
            description: '员工请假申请流程',
            fields: [
              { id: 'f6', type: 'date', title: '开始日期', description: '', required: true },
              { id: 'f7', type: 'date', title: '结束日期', description: '', required: true },
            ],
            shareId: 'jkl012',
            isPublished: true,
            createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
            updatedAt: new Date().toISOString(),
            submissionCount: 7,
          },
        ];
        setForms(mockForms);
      } finally {
        setLoading(false);
      }
    };
    loadForms();
  }, []);

  const handleNavClick = (key: string) => {
    setClickedNav(key);
    setTimeout(() => setClickedNav(null), 150);
    setActiveNav(key);
    if (key === 'create') navigate('/forms/new');
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* 左侧导航栏 */}
      <nav style={{
        width: '260px',
        minWidth: '260px',
        background: '#1e293b',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>F</span>
            FormFlow
          </div>
        </div>

        <div style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = activeNav === item.key;
            const isHovered = hoveredNav === item.key;
            const isClicked = clickedNav === item.key;
            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredNav(item.key)}
                onMouseLeave={() => setHoveredNav(null)}
                onClick={() => handleNavClick(item.key)}
                style={{
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  gap: '12px',
                  position: 'relative',
                  background: isClicked ? '#475569' : (isActive || isHovered ? '#334155' : 'transparent'),
                  color: isActive ? '#ffffff' : (isHovered ? '#ffffff' : '#cbd5e1'),
                  opacity: isClicked ? 0.9 : 1,
                  transition: 'background-color 0.15s ease-out, color 0.15s ease-out, opacity 0.15s ease-out',
                  userSelect: 'none',
                }}
              >
                {/* 紫色指示条 - 仅在悬停或激活时显示 */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background: '#8b5cf6',
                  opacity: isActive || isHovered ? 1 : 0,
                  transform: 'scaleY(isActive || isHovered ? 1 : 0)',
                  transition: 'opacity 0.15s ease-out',
                }} />
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: '14px',
            }}>A</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>管理员</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>admin@formflow.io</div>
            </div>
          </div>
        </div>
      </nav>

      {/* 右侧主区域 */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: '#f1f5f9',
        padding: '32px 40px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>仪表盘</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>查看和管理你创建的所有表单</p>
          </div>
          <button
            onClick={() => navigate('/forms/new')}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out, filter 0.15s ease-out',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 92, 246, 0.4)';
              e.currentTarget.style.filter = 'brightness(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
          >
            + 创建新表单
          </button>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '20px' }}>
          近期表单
        </h2>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 280px)', gap: '20px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                width: '280px', height: '200px', borderRadius: '16px',
                background: '#ffffff',
                border: '0.5px solid rgba(0,0,0,0.06)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 280px)',
            gap: '20px',
          }}>
            {forms.map((form) => {
              const isHovered = hoveredCard === form._id;
              return (
                <div
                  key={form._id}
                  onMouseEnter={() => setHoveredCard(form._id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => navigate(`/forms/${form._id}/edit`)}
                  style={{
                    width: '280px',
                    height: '200px',
                    borderRadius: '16px',
                    background: '#ffffff',
                    border: '0.5px solid rgba(0, 0, 0, 0.06)',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                    boxShadow: isHovered
                      ? '0 6px 24px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04)'
                      : '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: form.isPublished ? 'rgba(20, 184, 166, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: form.isPublished ? '#14b8a6' : '#f59e0b',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}>
                      {form.isPublished ? '已发布' : '草稿'}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                    }}>
                      {formatDate(form.createdAt)}
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '8px',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {form.title}
                  </h3>

                  <p style={{
                    fontSize: '13px',
                    color: '#64748b',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 'auto',
                  }}>
                    {form.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {form.fields.slice(0, 3).map((f, idx) => (
                        <span key={idx} style={{
                          fontSize: '12px',
                          background: '#f8fafc',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}>{fieldTypeIcons[f.type] || '📝'}</span>
                      ))}
                      {form.fields.length > 3 && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', padding: '2px 4px' }}>+{form.fields.length - 3}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📥</span>
                      <b style={{ color: '#8b5cf6' }}>{form.submissionCount || 0}</b>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 新建表单卡片 */}
            <div
              onClick={() => navigate('/forms/new')}
              onMouseEnter={() => setHoveredCard('new')}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                width: '280px',
                height: '200px',
                borderRadius: '16px',
                background: '#ffffff',
                border: '2px dashed #cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transform: hoveredCard === 'new' ? 'translateY(-3px)' : 'translateY(0)',
                boxShadow: hoveredCard === 'new'
                  ? '0 6px 24px rgba(139, 92, 246, 0.15)'
                  : '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out',
                borderColor: hoveredCard === 'new' ? '#8b5cf6' : '#cbd5e1',
              }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: hoveredCard === 'new' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f1f5f9',
                color: hoveredCard === 'new' ? '#ffffff' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px',
                transition: 'all 0.2s ease-out',
              }}>+</div>
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>创建新表单</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
