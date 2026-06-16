import React from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import type { ShoppingCategory } from '../types';

interface ShoppingListProps {
  categories: ShoppingCategory[];
  total: number;
  saved: number;
  onTogglePurchased: (categoryName: string, itemId: string) => void;
  onToggleCategory: (categoryName: string) => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({
  categories,
  total,
  saved,
  onTogglePurchased,
  onToggleCategory,
}) => {
  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-5xl mb-3">🛒</div>
          <div>先生成一周食谱，再生成购物清单</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-2 space-y-3 pb-20">
        {categories.map((category) => (
          <div
            key={category.name}
            className="fade-in rounded-xl overflow-hidden"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            <button
              onClick={() => onToggleCategory(category.name)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                {category.collapsed ? (
                  <ChevronRight size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
                <span className="font-semibold text-gray-200">{category.name}</span>
                <span className="text-xs text-gray-500">({category.items.length}项)</span>
              </div>
            </button>

            {!category.collapsed && (
              <div className="border-t border-gray-800">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors ${
                      item.purchased ? 'opacity-60' : ''
                    }`}
                  >
                    <button
                      onClick={() => onTogglePurchased(category.name, item.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.purchased
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-gray-600 hover:border-purple-400'
                      }`}
                    >
                      {item.purchased && <Check size={12} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium ${
                          item.purchased ? 'text-gray-500 line-through' : 'text-gray-200'
                        }`}
                      >
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.quantity} {item.unit}
                      </div>
                    </div>

                    <div
                      className={`text-sm font-medium ${
                        item.purchased ? 'text-gray-600' : 'text-gray-300'
                      }`}
                    >
                      ¥{item.estimatedPrice}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 border-t"
        style={{ height: 60, backgroundColor: '#1a1a2e', borderColor: '#334' }}
      >
        <div className="flex items-center gap-6">
          <div>
            <span className="text-sm text-gray-400">总采购金额：</span>
            <span className="text-xl font-bold text-purple-400">¥{total}</span>
          </div>
          <div>
            <span className="text-sm text-gray-400">预计可省：</span>
            <span className="text-lg font-semibold text-green-400">¥{saved}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingList;
