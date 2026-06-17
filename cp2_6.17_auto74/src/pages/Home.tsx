import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Tool, BorrowRecord } from '../types';

interface ToolDetailResponse {
  tool: Tool;
  recentBorrows: Array<{
    id: string;
    userName: string;
    startTime: string;
    endTime: string;
    status: BorrowRecord['status'];
    condition: string | null;
  }>;
}

const statusLabels: Record<Tool['status'], string> = {
  available: '可用',
  borrowed: '已借出',
  repairing: '维修中',
};

const conditionLabels: Record<string, string> = {
  normal: '正常',
  wear: '轻微磨损',
  damaged: '损坏',
};

function Home() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<ToolDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const startTime = performance.now();
    fetch('/api/tools')
      .then((res) => res.json())
      .then((data: Tool[]) => {
        setTools(data);
        setLoading(false);
        const elapsed = performance.now() - startTime;
        console.log(`[Perf] 工具列表渲染耗时: ${elapsed.toFixed(1)}ms`);
      })
      .catch(() => setLoading(false));
  }, []);

  const openToolDetail = useCallback(async (toolId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/tools/${toolId}`);
      const data = await res.json();
      setSelectedTool(data);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedTool(null);
  }, []);

  const goBorrow = useCallback(
    (toolId: string) => {
      closeDetail();
      navigate(`/borrow/${toolId}`);
    },
    [navigate, closeDetail]
  );

  const filteredTools = tools.filter((tool) => {
    if (!searchText.trim()) return true;
    const keyword = searchText.toLowerCase();
    return (
      tool.name.toLowerCase().includes(keyword) ||
      tool.category.toLowerCase().includes(keyword) ||
      tool.description.toLowerCase().includes(keyword)
    );
  });

  return (
    <div>
      <h1 className="page-title">🛠️ 工坊工具大厅</h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="搜索工具名称、分类..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">正在加载工具列表...</div>
      ) : filteredTools.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">没有找到匹配的工具</div>
        </div>
      ) : (
        <div className="tool-grid">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="tool-card"
              onClick={() => openToolDetail(tool.id)}
            >
              <div className="tool-card-photo">
                <img src={tool.photo} alt={tool.name} loading="lazy" />
              </div>
              <div className="tool-card-name">{tool.name}</div>
              <div className="tool-card-category">{tool.category}</div>
              <div className={`tool-card-status ${tool.status}`}>
                {statusLabels[tool.status]}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTool && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetail} aria-label="关闭">
              ✕
            </button>

            {detailLoading ? (
              <div className="loading">加载中...</div>
            ) : (
              <>
                <div className="detail-header">
                  <div className="detail-photo">
                    <img src={selectedTool.tool.photo} alt={selectedTool.tool.name} />
                  </div>
                  <div className="detail-info">
                    <h2>{selectedTool.tool.name}</h2>
                    <div className="category">分类：{selectedTool.tool.category}</div>
                    <span
                      className={`tool-card-status ${selectedTool.tool.status}`}
                      style={{ marginTop: 4, display: 'inline-block' }}
                    >
                      {statusLabels[selectedTool.tool.status]}
                    </span>
                  </div>
                </div>

                <div className="section">
                  <div className="section-title">📝 工具简介</div>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: '#444' }}>
                    {selectedTool.tool.description}
                  </p>
                </div>

                <div className="section">
                  <div className="section-title">⚠️ 使用说明</div>
                  <div className="usage-text">{selectedTool.tool.usageInstructions}</div>
                </div>

                <div className="section">
                  <div className="section-title">📚 最近三次借用记录</div>
                  {selectedTool.recentBorrows.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#888', padding: '12px 0' }}>
                      暂无借用记录
                    </div>
                  ) : (
                    <div className="borrow-history">
                      {selectedTool.recentBorrows.map((record) => (
                        <div key={record.id} className="borrow-history-item">
                          <div>
                            <span className="user">{record.userName}</span>
                            {record.condition && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 10,
                                  background:
                                    record.condition === 'damaged'
                                      ? '#ffebee'
                                      : record.condition === 'wear'
                                      ? '#fff3e0'
                                      : '#e8f5e9',
                                  color:
                                    record.condition === 'damaged'
                                      ? '#e53935'
                                      : record.condition === 'wear'
                                      ? '#f57c00'
                                      : '#4caf50',
                                }}
                              >
                                {conditionLabels[record.condition] || record.condition}
                              </span>
                            )}
                          </div>
                          <div className="time">
                            {dayjs(record.startTime).format('MM-DD HH:mm')} ~{' '}
                            {dayjs(record.endTime).format('MM-DD HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-secondary" onClick={closeDetail}>
                    关闭
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={selectedTool.tool.status !== 'available'}
                    onClick={() => goBorrow(selectedTool.tool.id)}
                  >
                    {selectedTool.tool.status === 'available' ? '发起借用' : '暂不可借用'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
