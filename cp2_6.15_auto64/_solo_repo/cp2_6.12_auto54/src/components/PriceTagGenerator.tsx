import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, CATEGORY_COLORS } from '@/types';

interface PriceTagGeneratorProps {
  product: Product | null;
  onClose: () => void;
}

const PriceTagGenerator: React.FC<PriceTagGeneratorProps> = ({ product, onClose }) => {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) {
      setQuantity(1);
    }
  }, [product]);

  if (!product) return null;

  const categoryColor = CATEGORY_COLORS[product.category];

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-4 flex items-center justify-between">
            <h2 className="text-white text-lg font-bold">价签生成器</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-gray-700 font-medium">打印数量：</label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-24 px-3 py-2 rounded-lg border border-gray-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
              />
            </div>

            <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
              <p className="text-gray-500 text-sm mb-3 text-center">预览效果</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(quantity, 3)}, 1fr)` }}>
                {Array.from({ length: Math.min(quantity, 6) }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="h-1.5" style={{ backgroundColor: categoryColor }} />
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                      <p className="text-orange-500 font-bold text-sm mt-1">¥{product.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {quantity > 6 && (
                <p className="text-gray-400 text-xs text-center mt-2">共 {quantity} 张（仅显示前6张预览）</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-gray-50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 rounded-full text-white font-medium transition-colors"
              style={{ backgroundColor: '#FF8C00' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E67300')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FF8C00')}
            >
              打印价签
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default memo(PriceTagGenerator);
