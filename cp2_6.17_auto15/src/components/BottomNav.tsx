import React from 'react';
import type { PageKey } from '../types';
import { Camera, BookOpen, Heart, Compass } from 'lucide-react';

interface BottomNavProps {
  active: PageKey;
  onChange: (page: PageKey) => void;
}

const navItems: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'recognition',
    label: '识别',
    icon: <Camera size={22} strokeWidth={1.8} />,
  },
  {
    key: 'encyclopedia',
    label: '百科',
    icon: <BookOpen size={22} strokeWidth={1.8} />,
  },
  {
    key: 'favorites',
    label: '收藏',
    icon: <Heart size={22} strokeWidth={1.8} />,
  },
  {
    key: 'discovery',
    label: '发现',
    icon: <Compass size={22} strokeWidth={1.8} />,
  },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-gray-100">
      <div className="max-w-5xl mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className="flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-lg transition-all duration-200"
              style={{ color: isActive ? '#22c55e' : '#9ca3af' }}
            >
              <div
                className="transition-transform duration-200"
                style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
              >
                {item.icon}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
