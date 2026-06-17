import { useState, useEffect } from 'react';
import type { Recipe } from '@/types';
import dayjs from 'dayjs';
import { Plus, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipeListProps {
  recipes: Recipe[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export default function RecipeList({ recipes, selectedId, onSelect, onCreate }: RecipeListProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelect = (id: string) => {
    onSelect(id);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const listContent = (
    <div
      className={cn(
        'bg-white rounded-lg shadow-lg flex flex-col overflow-hidden',
        !isMobile && 'sticky',
        isMobile && 'h-full'
      )}
      style={!isMobile ? { width: '280px', top: '80px', maxHeight: 'calc(100vh - 100px)' } : {}}
    >
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={onCreate}
          className="btn w-full flex items-center justify-center gap-2"
        >
          <Plus size={18} /> 创建新食谱
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recipes.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            暂无食谱，点击上方按钮创建
          </div>
        ) : (
          recipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => handleSelect(recipe.id)}
              className={cn(
                'px-4 py-3 cursor-pointer transition-all duration-200',
                selectedId === recipe.id
                  ? 'border-l-4'
                  : 'border-l-4 border-transparent hover:bg-[#fff3e0]'
              )}
              style={
                selectedId === recipe.id
                  ? { background: '#f5deb3', borderLeftColor: '#8b4513' }
                  : {}
              }
            >
              <div className="font-semibold text-[#3e2723] truncate">
                {recipe.name || '未命名食谱'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {dayjs(recipe.createdAt).format('YYYY-MM-DD')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-20 left-4 z-40 btn shadow-lg"
          style={{ background: 'white' }}
        >
          <Menu size={20} />
        </button>

        <div
          className={cn(
            'fixed inset-0 bg-black z-40 transition-opacity duration-300',
            isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setIsOpen(false)}
        />

        <div
          className={cn(
            'fixed top-0 left-0 h-full w-72 z-50 transition-transform duration-300',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="relative h-full">
            {listContent}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 p-2 text-gray-500 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </>
    );
  }

  return listContent;
}
