import { NavLink } from 'react-router-dom';
import { BookOpen, User, BarChart3, PlusCircle, Home } from 'lucide-react';

const NavBar = () => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-[#1976D2] text-white shadow-md'
        : 'text-[#424242] hover:bg-white hover:shadow-sm'
    }`;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#fff',
        borderBottom: '1px solid #EEEEEE',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 20, color: '#1976D2' }}>
          <BookOpen size={28} strokeWidth={2.2} />
          <span>读书会</span>
        </NavLink>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NavLink to="/" className={linkClass}>
            <Home size={17} /> 首页
          </NavLink>
          <NavLink to="/profile" className={linkClass}>
            <User size={17} /> 个人中心
          </NavLink>
          <NavLink to="/dashboard" className={linkClass}>
            <BarChart3 size={17} /> 数据分析
          </NavLink>
          <NavLink to="/create" className={linkClass}>
            <PlusCircle size={17} /> 创建活动
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
