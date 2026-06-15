import type { FC } from 'react'

interface NavbarProps {
  activeTab: 'submit' | 'report'
  onTabChange: (tab: 'submit' | 'report') => void
}

const Navbar: FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="navbar">
      <div className="navbar-title">团队晴雨表</div>
      <div className="navbar-tabs">
        <button
          className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => onTabChange('submit')}
        >
          提交心情
        </button>
        <button
          className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => onTabChange('report')}
        >
          查看报告
        </button>
      </div>
    </nav>
  )
}

export default Navbar
