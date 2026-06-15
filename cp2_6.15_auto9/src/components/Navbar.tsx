import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Home, Sparkles, Bookmark, Menu, X } from 'lucide-react';
import { useAppStore } from '../store';

const navItems = [
  { to: '/', label: '发现小组', icon: <Home size={17} /> },
  { to: '/recommendations', label: '我的荐书', icon: <Sparkles size={17} /> }
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, toggleSidebar, sidebarOpen } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const activeKey =
      location.pathname === '/'
        ? '/'
        : location.pathname.startsWith('/recommendations')
        ? '/recommendations'
        : null;

    if (activeKey && tabRefs.current[activeKey]) {
      const el = tabRefs.current[activeKey]!;
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement!.getBoundingClientRect();
      setIndicator({
        left: rect.left - parentRect.left,
        width: rect.width,
        opacity: 1
      });
    } else {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname]);

  function getInitial(name: string) {
    const initial = name.charAt(0).toUpperCase();
    const colors = ['#fff3e0', '#ffe0b2', '#ffcc80'];
    const colorIndex = name.length % colors.length;
    return (
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          backgroundColor: colors[colorIndex],
          color: '#e64a19',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <nav
      style={{
        height: 60,
        background: 'linear-gradient(90deg, #ff7043 0%, #ff8a65 100%)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 12px rgba(255,112,67,0.25)'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          height: '100%',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: 'white',
            flexShrink: 0
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <BookOpen size={20} />
          </div>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              fontWeight: 700
            }}
          >
            读书会
          </span>
        </div>

        <div
          className="nav-tabs-wrap"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '8px'
          }}
        >
          <motion.div
            animate={indicator}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            style={{
              position: 'absolute',
              bottom: -2,
              height: 3,
              backgroundColor: 'white',
              borderRadius: 2
            }}
          />
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              ref={(el) => (tabRefs.current[item.to] = el)}
              style={{
                textDecoration: 'none'
              }}
            >
              {({ isActive }) => (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.85)',
                    fontSize: 14,
                    fontWeight: isActive