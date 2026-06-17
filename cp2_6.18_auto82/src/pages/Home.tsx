import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import type { Tool, Borrow } from '../types';

const Home: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const startTime = performance.now();
      try {
        const [toolsRes, borrowsRes] = await Promise.all([
          fetch('/api/tools'),
          fetch('/api/borrows'),
        ]);
        const toolsData = await toolsRes.json();
        const borrowsData = await borrowsRes.json();
        setTools(toolsData);
        setBorrows(borrowsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
        const renderTime = performance.now() - startTime;
        console.debug(`Home page rendered in ${renderTime.toFixed(2)}ms`);
      }
    };
    fetchData();
  }, []);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tools, searchQuery]);

  const getToolBorrowHistory = useCallback((toolId: string) => {
    return borrows
      .filter(b => b.toolId === toolId)
      .sort((a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf())
      .slice(0, 3);
  }, [borrows]);

  const getStatusLabel = (status: Tool['status']) => {
    const labels = {
      available: '可用',
      borrowed: '已借出',
      repairing: '维修中',
    };
    return labels[status];
  };

  const handleCardClick = (tool: Tool) => {
    setSelectedTool(tool);
  };

  const handleCloseModal = () => {
    setSelectedTool(null);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  if (loading) {
    return <div className="empty-state">加载中...</div>;
  }

  return (
    <div>
      <h1 className="page-title">工具列表</h1>
      
      <input
        type="text"
        className="search-bar"
        placeholder="搜索工具名称..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="tools-grid">
        {filteredTools.map(tool => (
          <div
            key={tool.id}
            className="tool-card"
            onClick={() => handleCardClick(tool)}
          >
            <div className="tool-card-image">
              <img src={tool.image} alt={tool.name} loading="lazy" />
            </div>
            <div className="tool-card-content">
              <div className="tool-card-name">{tool.name}</div>
              <div className="tool-card-desc">{tool.description}</div>
              <span className={`status-tag ${tool.status}`}>
                {getStatusLabel(tool.status)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>没有找到匹配的工具</p>
        </div>
      )}

      {selectedTool && (
        <div
          className={`modal-overlay${selectedTool ? ' open' : ''}`}
          onClick={handleOverlayClick}
        >
          <div className="modal-content">
            <button className="modal-close" onClick={handleCloseModal}>
              ×
            </button>
            <div className="modal-header">
              <img src={selectedTool.image} alt={selectedTool.name} />
              <div>
                <h2 className="modal-title">{selectedTool.name}</h2>
                <span className={`status-tag ${selectedTool.status}`}>
                  {getStatusLabel(selectedTool.status)}
                </span>
              </div>
            </div>

            <div className="modal-section">
              <h3>工具描述</h3>
              <p>{selectedTool.description}</p>
            </div>

            <div className="modal-section">
              <h3>使用说明</h3>
              <ol>
                {selectedTool.instructions.split('\n').map((step, index) => (
                  <li key={index}>{step.replace(/^\d+\.\s*/, '')}</li>
                ))}
              </ol>
            </div>

            <div className="modal-section">
              <h3>最近借用记录</h3>
              {getToolBorrowHistory(selectedTool.id).length > 0 ? (
                <ul className="borrow-history">
                  {getToolBorrowHistory(selectedTool.id).map(record => (
                    <li key={record.id}>
                      <strong>{record.memberName}</strong> -{' '}
                      {dayjs(record.startTime).format('YYYY-MM-DD HH:mm')}
                      <span style={{ marginLeft: 8, color: '#666' }}>
                        ({record.duration}小时)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#666' }}>暂无借用记录</p>
              )}
            </div>

            {selectedTool.status === 'available' && (
              <a
                href={`/borrow/${selectedTool.id}`}
                className="btn btn-primary"
                style={{ display: 'block', width: '100%' }}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `/borrow/${selectedTool.id}`;
                }}
              >
                立即借用
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
