import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CreativeCard from './components/CreativeCard';
import Sidebar from './components/Sidebar';
import { Idea, Category, SortType, FilterCategory, CATEGORY_CONFIG } from './logic/types';
import { filterAndSortIdeas, getAverageScore } from './logic/evaluator';
import { fetchMockIdeas } from './mock/mockApi';

const App: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [sortType, setSortType] = useState<SortType>('score');
  const [loading, setLoading] = useState(true);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<Category>('growth');
  const [formScore, setFormScore] = useState(50);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/ideas');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setIdeas(result.data);
          } else {
            const mockData = await fetchMockIdeas();
            setIdeas(mockData);
          }
        } else {
          const mockData = await fetchMockIdeas();
          setIdeas(mockData);
        }
      } catch {
        try {
          const mockData = await fetchMockIdeas();
          setIdeas(mockData);
        } catch (err) {
          console.error('Failed to load ideas:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const displayedIdeas = useMemo(
    () => filterAndSortIdeas(ideas, filterCategory, sortType),
    [ideas, filterCategory, sortType]
  );

  const averageScore = useMemo(
    () => getAverageScore(displayedIdeas),
    [displayedIdeas]
  );

  const handleSubmit = useCallback(() => {
    if (!formTitle.trim()) {
      alert('请输入创意标题');
      return;
    }
    if (!formDescription.trim()) {
      alert('请输入创意描述');
      return;
    }

    const newIdea: Idea = {
      id: uuidv4(),
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      intuitionScore: formScore,
      createdAt: new Date().toISOString()
    };

    setIdeas((prev) => [newIdea, ...prev]);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('growth');
    setFormScore(50);
    setModalOpen(false);
  }, [formTitle, formDescription, formCategory, formScore]);

  const toggleModal = useCallback(() => {
    setModalOpen((prev) => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(to right, #E74C3C, #F1C40F, #2ECC71);
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 3px solid #3498DB;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: all 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 12px rgba(0,0,0,0.25);
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 3px solid #3498DB;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
      `}</style>

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        filterCategory={filterCategory}
        onFilterChange={setFilterCategory}
        sortType={sortType}
        onSortChange={setSortType}
        totalCount={displayedIdeas.length}
        averageScore={averageScore}
      />

      <div
        style={{
          marginLeft: sidebarOpen ? '240px' : '0',
          transition: 'margin-left 0.3s ease-out',
          minHeight: '100vh',
          borderLeft: sidebarOpen ? '1px solid #E0E0E0' : 'none'
        }}
      >
        <div
          style={{
            padding: '20px 32px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E0E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={toggleSidebar}
              style={{
                padding: '8px 12px',
                border: '1px solid #E0E0E0',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'all 0.15s ease',
                lineHeight: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = '#F8F9FA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              {sidebarOpen ? '◀' : '☰'}
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#2C3E50' }}>
                💡 创意项目管理
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#7F8C8D' }}>
                收集灵感，评估价值，优先落地
              </p>
            </div>
          </div>
          <button
            onClick={toggleModal}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3498DB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(52, 152, 219, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.backgroundColor = '#2980B9';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(52, 152, 219, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#3498DB';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(52, 152, 219, 0.3)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            添加创意
          </button>
        </div>

        <div style={{ padding: '32px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #ECF0F1',
                    borderTop: '4px solid #3498DB',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }}
                />
                <p style={{ color: '#7F8C8D', fontSize: '14px' }}>加载创意数据中...</p>
              </div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : displayedIdeas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
              <h3 style={{ color: '#2C3E50', marginBottom: '8px' }}>暂无创意</h3>
              <p style={{ color: '#7F8C8D', fontSize: '14px' }}>点击右上角"添加创意"按钮，记录你的第一个好点子！</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
                maxWidth: '100%'
              }}
            >
              {displayedIdeas.map((idea) => (
                <CreativeCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <>
          <div
            onClick={toggleModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 2000,
              animation: 'overlayIn 0.3s ease'
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderRadius: '24px 24px 0 0',
              padding: '32px 40px 40px',
              zIndex: 2001,
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.2)',
              animation: 'slideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#2C3E50' }}>
                  ✨ 提交新创意
                </h2>
                <button
                  onClick={toggleModal}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#F5F7FA',
                    color: '#7F8C8D',
                    fontSize: '18px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E74C3C';
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F7FA';
                    e.currentTarget.style.color = '#7F8C8D';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#2C3E50', marginBottom: '8px' }}>
                  创意标题 <span style={{ color: '#E74C3C' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="用一句话概括你的创意..."
                  maxLength={100}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #E0E0E0',
                    borderRadius: '10px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3498DB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E0E0E0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#BDC3C7', marginTop: '6px' }}>
                  {formTitle.length}/100
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#2C3E50', marginBottom: '8px' }}>
                  详细描述 <span style={{ color: '#E74C3C' }}>*</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setFormDescription(e.target.value);
                    }
                  }}
                  placeholder="详细描述你的创意，包括背景、目标、预期效果等..."
                  maxLength={500}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #E0E0E0',
                    borderRadius: '10px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.6
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3498DB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E0E0E0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: formDescription.length >= 480 ? '#E74C3C' : '#BDC3C7', marginTop: '6px' }}>
                  {formDescription.length}/500
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#2C3E50', marginBottom: '12px' }}>
                  所属分类
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => {
                    const config = CATEGORY_CONFIG[cat];
                    const isActive = formCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFormCategory(cat)}
                        style={{
                          padding: '14px 12px',
                          border: isActive ? `2px solid ${config.color}` : '2px solid #E0E0E0',
                          backgroundColor: isActive ? config.bgColor : '#FFFFFF',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          fontSize: '14px',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? config.color : '#2C3E50',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.transform = 'scale(1.03)';
                            e.currentTarget.style.borderColor = config.color;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.borderColor = '#E0E0E0';
                          }
                        }}
                      >
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '3px',
                            backgroundColor: config.color
                          }}
                        />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#2C3E50' }}>
                    直觉评分
                  </label>
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: formScore >= 70 ? '#2ECC71' : formScore >= 40 ? '#F39C12' : '#E74C3C'
                    }}
                  >
                    {formScore}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formScore}
                  onChange={(e) => setFormScore(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#BDC3C7' }}>
                  <span>0 - 不太行</span>
                  <span>50 - 一般般</span>
                  <span>100 - 超棒！</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={toggleModal}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    backgroundColor: '#F5F7FA',
                    color: '#7F8C8D',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.backgroundColor = '#E0E0E0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#F5F7FA';
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  style={{
                    flex: 2,
                    padding: '14px 24px',
                    backgroundColor: '#3498DB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(52, 152, 219, 0.35)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.backgroundColor = '#2980B9';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#3498DB';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.35)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.98)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                >
                  🚀 提交创意
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
