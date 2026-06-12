import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, User, ChevronDown, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-coffee text-white z-50 shadow-md">
      <div className="h-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleNavClick('/')}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-lg font-semibold">书会圈子</span>
        </div>

        {!isMobile ? (
          <div className="flex items-center gap-8">
            <button 
              onClick={() => handleNavClick('/')}
              className="hover:text-[#8B5CF6] transition-colors duration-200"
            >
              书会列表
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg border-2"
                  style={{ borderColor: currentUser.avatarBorder, backgroundColor: '#FFF8E7' }}
                >
                  {currentUser.avatar}
                </div>
                <span>{currentUser.name}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white text-coffee rounded-lg shadow-lg py-2"
                  >
                    <button 
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> 个人中心
                    </button>
                    <button 
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                    >
                      我的书会
                    </button>
                    <button 
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                    >
                      设置
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:opacity-80 transition-opacity"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        )}

        <AnimatePresence>
          {isMobile && isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute top-16 left-0 right-0 bg-coffee border-t border-white/20 md:hidden"
            >
              <div className="flex flex-col">
                <button 
                  onClick={() => handleNavClick('/')}
                  className="px-6 py-3 text-left hover:bg-white/10 transition-colors"
                >
                  书会列表
                </button>
                <div className="px-6 py-3 flex items-center gap-3 border-t border-white/20">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2"
                    style={{ borderColor: currentUser.avatarBorder, backgroundColor: '#FFF8E7' }}
                  >
                    {currentUser.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{currentUser.name}</div>
                    <div className="text-sm text-white/70">个人中心</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
