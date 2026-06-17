import { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { Music, Users, ClipboardList, BarChart3, Menu, X } from 'lucide-react';

interface SidebarProps {
  memberId?: string;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}

function NavItem({ to, icon, label, disabled }: NavItemProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      const target = e.currentTarget as HTMLAnchorElement;
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      ripple.classList.add('ripple-effect');
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 300);
    },
    [disabled]
  );

  if (disabled) {
    return (
      <div
        className="flex items-center gap-3 px-5 py-3 cursor-not-allowed"
        style={{ opacity: 0.4 }}
      >
        <span style={{ color: '#8a8a9a' }}>{icon}</span>
        <span style={{ color: '#8a8a9a', fontSize: '14px' }}>{label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={handleClick}
      data-ripple="true"
      className={({ isActive }) =>
        `flex items-center gap-3 px-5 py-3 relative overflow-hidden transition-colors duration-200`
      }
      style={({ isActive }) => ({
        backgroundColor: isActive ? 'rgba(124, 77, 255, 0.2)' : 'transparent',
        borderLeft: isActive ? '3px solid #7c4dff' : '3px solid transparent',
        color: isActive ? '#e0e0e0' : '#8a8a9a',
      })}
    >
      {({ isActive }) => (
        <>
          <span style={{ color: isActive ? '#7c4dff' : '#8a8a9a' }}>{icon}</span>
          <span style={{ color: isActive ? '#e0e0e0' : '#8a8a9a', fontSize: '14px' }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ memberId }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/', icon: <Users size={20} />, label: '团员管理' },
    { to: '/rehearsal', icon: <ClipboardList size={20} />, label: '排演记录' },
    {
      to: memberId ? `/member/${memberId}` : '/member/:id',
      icon: <BarChart3 size={20} />,
      label: '个人详情',
      disabled: !memberId,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Music size={24} style={{ color: '#7c4dff' }} />
        <span style={{ color: '#e0e0e0', fontSize: '16px', fontWeight: 600 }}>
          合唱团排演管理
        </span>
      </div>
      <nav className="flex flex-col gap-1 py-4">
        {navItems.map((item) => (
          <NavItem
            key={item.label}
            to={item.to}
            icon={item.icon}
            label={item.label}
            disabled={item.disabled}
          />
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <aside
        className="hidden md:flex md:flex-col fixed left-0 top-0"
        style={{
          width: '240px',
          height: '100vh',
          backgroundColor: '#16213e',
          zIndex: 40,
        }}
      >
        {sidebarContent}
      </aside>

      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{
          backgroundColor: '#16213e',
          color: '#e0e0e0',
          border: 'none',
        }}
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={24} />
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className="md:hidden fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300"
        style={{
          width: '240px',
          height: '100vh',
          backgroundColor: '#16213e',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <Music size={24} style={{ color: '#7c4dff' }} />
            <span style={{ color: '#e0e0e0', fontSize: '16px', fontWeight: 600 }}>
              合唱团排演管理
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            style={{ color: '#8a8a9a', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 py-4">
          {navItems.map((item) => (
            <NavItem
              key={item.label}
              to={item.to}
              icon={item.icon}
              label={item.label}
              disabled={item.disabled}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
