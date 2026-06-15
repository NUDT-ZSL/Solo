import { Menu, User, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import SearchBar from './SearchBar';
import { cn } from '@/lib/utils';

export default function TopNav() {
  const sidebarCollapsed = useKnowledgeStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useKnowledgeStore((s) => s.toggleSidebar);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0 z-30">
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-text" />
        </button>
      )}

      <div className="flex-1 flex justify-center">
        <SearchBar />
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
            U
          </div>
          <span className="text-sm text-text hidden sm:inline">用户</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-text">演示用户</p>
              <p className="text-xs text-slate-400">user@example.com</p>
            </div>
            <button className="w-full px-4 py-2 text-left text-sm text-text hover:bg-slate-50 transition-colors flex items-center gap-2">
              <User className="w-4 h-4" />
              个人设置
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
