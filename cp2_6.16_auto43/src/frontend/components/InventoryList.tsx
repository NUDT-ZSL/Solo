import React from 'react';
import { Trash2 } from 'lucide-react';
import type { InventoryItem } from '../types';

interface InventoryListProps {
  items: InventoryItem[];
  onDelete: (id: string) => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ items, onDelete }) => {
  const isExpiringSoon = (dateStr: string): boolean => {
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
      {items.length === 0 ? (
        <div className="text-gray-500 text-center py-8 text-sm">暂无库存，请添加食材</div>
      ) : (
        items.map((item) => {
          const expiring = isExpiringSoon(item.expiryDate);
          return (
            <div
              key={item.id}
              className="fade-in flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
              style={{ backgroundColor: expiring ? '#3a2020' : '#1e1e2e' }}
            >
              {expiring && (
                <div
                  className="pulse-dot rounded-full flex-shrink-0"
                  style={{ width: 8, height: 8, backgroundColor: '#ff5252' }}
                />
              )}
              {!expiring && <div style={{ width: 8 }} />}

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-200 truncate">{item.name}</div>
                <div className="text-xs text-gray-500">
                  {item.quantity} {item.unit} · {formatDate(item.expiryDate)}到期
                </div>
              </div>

              <button
                onClick={() => onDelete(item.id)}
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
};

export default InventoryList;
