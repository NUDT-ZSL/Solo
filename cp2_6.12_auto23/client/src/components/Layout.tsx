import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { FileText, ClipboardList, Settings, User } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useStore } from '../store/useStore';
import { getTodos } from '../api';

export default function Layout() {
  const location = useLocation();
  const { user, setTodos, refreshTodos } = useStore();

  useEffect(() => {
    refreshTodos();

    let socket: any = null;
    const initSocket = async () => {
      try {
        const io = (await import('socket.io-client')).default;
        socket = io({
          path: '/socket.io',
          transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
          console.log('Socket 已连接');
          socket.emit('join', { userId: user.userId });
        });

        socket.on('new-todo', async () => {
          try {
            const res = await getTodos();
            if (res.code === 0) {
              setTodos(res.data || []);
            }
          } catch (error) {
            console.error('刷新待办失败:', error);
          }
        });

        socket.on('disconnect', () => {
          console.log('Socket 已断开');
        });
      } catch (error) {
        console.warn('Socket.io 客户端未加载，实时功能不可用');
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user.userId, setTodos, refreshTodos]);

  const navItems = [
    {
      path: '/create',
      label: '创建审批',
      icon: FileText,
    },
    {
      path: '/my-flows',
      label: '我的审批',
      icon: ClipboardList,
    },
    {
      path: '/admin',
      label: '管理员控制台',
      icon: Settings,
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">审批系统</span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />

              <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.userName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700">
                  {user.userName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
