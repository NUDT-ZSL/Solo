import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Share2, Trash2, Menu } from 'lucide-react';

const Sidebar: React.FC = () => {
  const {
    timelines,
    currentTimeline,
    sidebarOpen,
    setSidebarOpen,
    setCurrentTimeline,
    addTimeline,
    deleteTimeline,
  } = useStore();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleCreateTimeline = () => {
    if (!newTitle.trim()) return;
    addTimeline({
      title: newTitle.trim(),
      description: newDescription.trim(),
    });
    setNewTitle('');
    setNewDescription('');
    setShowNewForm(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-[#2C3E50] text-white p-2 rounded-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu size={20} />
      </button>

      <aside
        className={`
          fixed md:relative top-0 left-0 h-full w-[240px] bg-[#1A252F] text-white
          transition-transform duration-300 z-40 flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 border-b border-[#2C3E50]">
          <h1 className="text-xl font-bold text-[#4A90D9]">时间线</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {timelines.map((timeline) => (
            <div
              key={timeline.id}
              className={`
                p-3 rounded-lg cursor-pointer transition-all duration-300
                bg-[#1E3A5F] hover:-translate-y-1
                ${currentTimeline?.id === timeline.id
                  ? 'ring-2 ring-[#4A90D9]'
                  : ''
                }
              `}
              style={{
                boxShadow: '0 0 12px rgba(74, 144, 217, 0.3)',
              }}
              onClick={() => setCurrentTimeline(timeline)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm truncate flex-1">
                  {timeline.title}
                </h3>
                <button
                  className="text-gray-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定删除此时间线？')) {
                      deleteTimeline(timeline.id);
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-300 mb-2 line-clamp-2">
                {timeline.description || '暂无描述'}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Share2 size={12} />
                  <span className="truncate max-w-[100px]">
                    {timeline.shareCode}
                  </span>
                </div>
                <span>{formatDate(timeline.createdAt)}</span>
              </div>
              <div className="mt-2 text-xs text-[#4A90D9]">
                {timeline.events.length} 个事件
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[#2C3E50]">
          {showNewForm ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="时间线标题"
                className="w-full px-3 py-2 bg-[#2C3E50] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
              <textarea
                placeholder="描述（可选）"
                className="w-full px-3 py-2 bg-[#2C3E50] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9] resize-none"
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2 bg-[#4A90D9] rounded-md text-sm font-medium hover:bg-[#3a7bc8] transition-colors"
                  onClick={handleCreateTimeline}
                >
                  创建
                </button>
                <button
                  className="flex-1 py-2 bg-[#2C3E50] rounded-md text-sm font-medium hover:bg-[#3d5166] transition-colors"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewTitle('');
                    setNewDescription('');
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-full py-2 bg-[#4A90D9] rounded-md text-sm font-medium hover:bg-[#3a7bc8] transition-colors flex items-center justify-center gap-2"
              onClick={() => setShowNewForm(true)}
            >
              <Plus size={16} />
              创建新时间线
            </button>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
