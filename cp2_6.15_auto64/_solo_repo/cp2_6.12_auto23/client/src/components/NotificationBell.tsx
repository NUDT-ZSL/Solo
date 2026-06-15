import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getTodos } from '../api';
import type { TodoItem, FlowType } from '../types';

const flowTypeMap: Record<FlowType, string> = {
  leave: '请假申请',
  expense: '报销申请',
  business: '出差申请',
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { todoCount, setTodos, user } = useStore();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const loadTodos = async () => {
    try {
      const res: any = await getTodos(user.userId);
      if (res.code === 0 || res.success) {
        setTodos(res.data || []);
      }
    } catch (error) {
      console.error('加载待办失败:', error);
    }
  };

  useEffect(() => {
    loadTodos();
  }, [user.userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        bellRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTodoClick = (todo: TodoItem) => {
    setIsOpen(false);
    navigate(`/flows/${todo.flowId}`);
  };

  const displayTodos = useStore.getState().todos.slice(0, 5);

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
      >
        <Bell className="w-5 h-5" />
        {todoCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1">
            {todoCount > 99 ? '99+' : todoCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 animate-modal-enter"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">待办审批</h3>
            <p className="text-sm text-gray-500 mt-0.5">共 {todoCount} 条待处理</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {displayTodos.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                暂无待办事项
              </div>
            ) : (
              displayTodos.map((todo) => (
                <div
                  key={todo.flowId}
                  onClick={() => handleTodoClick(todo)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse-dot" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {todo.title}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(todo.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                          {flowTypeMap[todo.type as FlowType]}
                        </span>
                        <span>{todo.applicantName}</span>
                        <span>·</span>
                        <span>{todo.nodeName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {todoCount > 5 && (
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/todos');
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                查看全部待办
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
