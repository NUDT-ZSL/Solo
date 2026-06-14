import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Home, Headphones, Sparkles } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";

  const handleNavClick = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-primary transition-opacity hover:opacity-80 sm:text-xl"
        >
          <Sparkles size={20} className="sm:hidden" />
          <span className="hidden sm:inline">AriaVault</span>
          <span className="sm:hidden">AriaVault</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              isHome ? "text-primary" : "text-gray-600 hover:text-primary"
            }`}
          >
            <Home size={16} />
            发现
          </Link>
          <a
            href="#"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-primary"
            onClick={(e) => e.preventDefault()}
          >
            <Headphones size={16} />
            我的播客
          </a>
          <a
            href="#"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-primary"
            onClick={(e) => e.preventDefault()}
          >
            <Sparkles size={16} />
            精彩时刻
          </a>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
          aria-label={isOpen ? "关闭菜单" : "打开菜单"}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            <button
              onClick={() => handleNavClick("/")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isHome
                  ? "bg-primary-bg text-primary"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Home size={18} />
              发现播客
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            >
              <Headphones size={18} />
              我的播客
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            >
              <Sparkles size={18} />
              精彩时刻
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
