import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BookOpen, User, Menu, X } from 'lucide-react';

const navLinks = [
  { to: '/', label: '首页', icon: Home },
  { to: '/create', label: '记录', icon: BookOpen },
  { to: '/profile', label: '个人', icon: User },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div
        className="bg-white/40 backdrop-blur-[20px] border-b border-warm-gold/20"
        style={{
          boxShadow: '0 1px 0 0 rgba(212,162,78,0.3), 0 4px 20px rgba(180,141,94,0.1)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍵</span>
            <span className="font-serif text-xl font-semibold text-tea-800">
              茶语时光
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-warm-gold'
                      : 'text-tea-600 hover:text-tea-800 hover:bg-white/30'
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-warm-gold/10 rounded-lg"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-tea-700 hover:bg-white/30"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/60 backdrop-blur-xl border-b border-warm-gold/20 overflow-hidden"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-warm-gold/15 text-warm-gold'
                        : 'text-tea-600 hover:bg-white/40'
                    }`}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
