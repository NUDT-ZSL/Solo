import React from 'react';
import { BookOpen, User, ChevronDown } from 'lucide-react';
import { Course, UserRole } from '../types';

interface HeaderProps {
  course: Course | null;
  currentUser: { username: string; role: UserRole } | null;
  allTags: string[];
  filterTag: string | null;
  onFilterChange: (tag: string | null) => void;
  onUserClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  course,
  currentUser,
  allTags,
  filterTag,
  onFilterChange,
  onUserClick,
}) => {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 bg-white flex items-center px-6 border-b"
      style={{ borderBottomColor: '#e0e0e0' }}
    >
      <div className="flex items-center gap-3 flex-1">
        <BookOpen size={24} style={{ color: '#1a237e' }} />
        <h1 className="text-lg font-semibold" style={{ color: '#212121' }}>
          {course?.title || '知识图谱复习系统'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {allTags.length > 0 && (
          <div className="relative">
            <select
              value={filterTag || ''}
              onChange={(e) => onFilterChange(e.target.value || null)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00bcd4] transition-all cursor-pointer"
              style={{ color: '#212121' }}
            >
              <option value="">全部标签</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: '#757575' }}
            />
          </div>
        )}

        {currentUser && (
          <button
            onClick={onUserClick}
            className="flex items-center gap-2 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#1a237e' }}
            >
              <User size={16} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#212121' }}>
                {currentUser.username}
              </p>
              <p className="text-xs" style={{ color: '#757575' }}>
                {currentUser.role === 'teacher' ? '教师' : '学生'}
              </p>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
