import { NavLink, useNavigate } from 'react-router-dom';

interface NavbarProps {
  currentUserId: string;
  onSelectUser: (id: string) => void;
  userName: string;
}

export default function Navbar({ currentUserId, onSelectUser, userName }: NavbarProps) {
  const navigate = useNavigate();

  const linkBase =
    'relative text-sm text-slate-300 hover:text-white transition-colors duration-300 px-1 py-2';
  const linkActive = '!text-white after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-full after:h-0.5 after:bg-gradient-to-r after:from-blue-500 after:to-blue-400 after:rounded-full';

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSelectUser(e.target.value);
    if (location.hash.startsWith('#/profile')) {
      navigate('/profile');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-[60px] bg-[#1e293b] z-50 flex items-center justify-between px-8 shadow-md">
      <div
        className="flex items-center gap-2 text-white font-bold text-lg tracking-wide cursor-pointer"
        onClick={() => navigate('/overview')}
      >
        <span className="inline-block w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white text-xs shadow-md">
          DS
        </span>
        设备共享站
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6">
          <NavLink to="/overview" className={({ isActive }) => linkBase + (isActive ? ' ' + linkActive : '')}>
            总览
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => linkBase + (isActive ? ' ' + linkActive : '')}>
            我的档案
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => linkBase + (isActive ? ' ' + linkActive : '')}>
            管理面板
          </NavLink>
        </div>

        <div className="flex items-center gap-3 border-l border-slate-600 pl-6">
          <span className="text-xs text-slate-400">当前用户:</span>
          <select
            value={currentUserId}
            onChange={handleUserChange}
            className="bg-slate-700 text-white text-sm rounded-md px-3 py-1.5 outline-none border border-slate-600 focus:border-blue-400 transition-colors cursor-pointer"
          >
            <option value="user-001">张明 (98分)</option>
            <option value="user-002">李华 (75分)</option>
            <option value="user-003">王芳 (100分)</option>
          </select>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-xs font-semibold uppercase">
            {userName.charAt(0)}
          </div>
        </div>
      </div>
    </nav>
  );
}
