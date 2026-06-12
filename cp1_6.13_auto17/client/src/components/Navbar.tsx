import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBell, FaUser, FaBars, FaTimes } from 'react-icons/fa';
import { useAppContext } from '@/context/AppContext';
import { getAvatarColor } from '@/utils';

export default function Navbar() {
  const { currentUser, unreadCount } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('skillswap_user');
    window.location.reload();
  };

  const avatarColor = currentUser ? getAvatarColor(currentUser.nickname) : '#9ca3af';
  const initial = currentUser ? currentUser.nickname.charAt(0) : '?';

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-[100]">
      <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: '#6366f1' }}
          >
            S
          </div>
          <span className="text-xl font-bold text-gray-800 hidden sm:block">SkillSwap</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className={`font-medium transition-colors ${
              location.pathname === '/' ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            发现技能
          </Link>
          {currentUser && (
            <Link
              to="/chat"
              className={`font-medium transition-colors relative ${
                location.pathname === '/chat' ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4">
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initial}
                </div>
                <span className="text-gray-700 font-medium">{currentUser.nickname}</span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 animate-fadeIn z-[100]">
                  <button
                    onClick={() => {
                      navigate(`/p/${currentUser._id}`);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <FaUser className="w-4 h-4" />
                    个人主页
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-red-500 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-500 text-sm">请先注册登录</span>
          )}
        </div>

        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          {showMobileMenu ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
        </button>
      </div>

      {showMobileMenu && (
        <div className="md:hidden bg-white border-t border-gray-200 animate-slideDown">
          <div className="px-6 py-4 space-y-3">
            <Link
              to="/"
              onClick={() => setShowMobileMenu(false)}
              className={`block py-2 font-medium ${
                location.pathname === '/' ? 'text-indigo-600' : 'text-gray-600'
              }`}
            >
              发现技能
            </Link>
            {currentUser && (
              <Link
                to="/chat"
                onClick={() => setShowMobileMenu(false)}
                className={`block py-2 font-medium flex items-center gap-2 ${
                  location.pathname === '/chat' ? 'text-indigo-600' : 'text-gray-600'
                }`}
              >
                <FaBell className="w-4 h-4" />
                消息
                {unreadCount > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            {currentUser ? (
              <>
                <Link
                  to={`/p/${currentUser._id}`}
                  onClick={() => setShowMobileMenu(false)}
                  className="block py-2 font-medium text-gray-600"
                >
                  个人主页
                </Link>
                <button
                  onClick={handleLogout}
                  className="block py-2 font-medium text-red-500"
                >
                  退出登录
                </button>
              </>
            ) : (
              <span className="block py-2 text-gray-500 text-sm">请先注册登录</span>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
