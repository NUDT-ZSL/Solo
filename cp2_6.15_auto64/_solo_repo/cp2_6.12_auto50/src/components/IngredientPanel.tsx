import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Ingredient {
  id: string;
  name: string;
  category: string;
}

interface IngredientPanelProps {
  allIngredients: Ingredient[];
  selectedIngredients: Ingredient[];
  onAdd: (ingredient: Ingredient) => void;
  onRemove: (id: string) => void;
  maxIngredients: number;
  onGenerate: () => void;
  isGenerating: boolean;
}

const CATEGORIES = ['全部', '蔬菜', '肉类', '海鲜', '调味品', '乳制品'];

const IngredientPanel: React.FC<IngredientPanelProps> = ({
  allIngredients,
  selectedIngredients,
  onAdd,
  onRemove,
  maxIngredients,
  onGenerate,
  isGenerating,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');

  const filteredIngredients = useMemo(() => {
    return allIngredients.filter((ing) => {
      const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === '全部' || ing.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allIngredients, searchTerm, activeCategory]);

  const isSelected = (id: string) => selectedIngredients.some((ing) => ing.id === id);

  const canAdd = selectedIngredients.length < maxIngredients;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#8B4513' }}
      >
        🥕 食材选择
      </motion.h2>

      <input
        type="text"
        placeholder="搜索食材..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #F4A460',
          marginBottom: '16px',
          fontSize: '14px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeCategory === cat ? 'bold' : 'normal',
              backgroundColor: activeCategory === cat ? '#F4A460' : '#FFF0DB',
              color: activeCategory === cat ? '#fff' : '#8B4513',
              transition: 'all 0.2s',
            }}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '10px',
          marginBottom: '24px',
          maxHeight: '240px',
          overflowY: 'auto',
          padding: '4px',
        }}
      >
        {filteredIngredients.map((ing) => {
          const selected = isSelected(ing.id);
          return (
            <motion.button
              key={ing.id}
              whileHover={!selected && canAdd ? { scale: 1.03 } : {}}
              whileTap={!selected && canAdd ? { scale: 0.97 } : {}}
              onClick={() => {
                if (!selected && canAdd) onAdd(ing);
              }}
              disabled={selected || !canAdd}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${selected || !canAdd ? '#ccc' : '#F4A460'}`,
                backgroundColor: selected ? '#E8E8E8' : '#FFF0DB',
                color: selected || !canAdd ? '#999' : '#8B4513',
                cursor: selected || !canAdd ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              {ing.name}
            </motion.button>
          );
        })}
        {filteredIngredients.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999', padding: '20px' }}>
            未找到匹配的食材
          </div>
        )}
      </div>

      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: '#8B4513', fontWeight: 'bold' }}>
          已选 {selectedIngredients.length}/{maxIngredients}
        </span>
      </div>

      <div
        style={{
          minHeight: '80px',
          padding: '12px',
          backgroundColor: '#FFFAF0',
          borderRadius: '12px',
          border: '2px dashed #F4A460',
          marginBottom: '20px',
        }}
      >
        <AnimatePresence mode="popLayout">
          {selectedIngredients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', color: '#ccc', padding: '20px', fontSize: '14px' }}
            >
              点击上方食材添加到这里
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {selectedIngredients.map((ing) => (
                <motion.div
                  key={ing.id}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#FFF0DB',
                    border: '1px solid #F4A460',
                    borderRadius: '20px',
                    color: '#8B4513',
                    fontSize: '14px',
                  }}
                >
                  <span>{ing.name}</span>
                  <button
                    onClick={() => onRemove(ing.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#8B4513',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      padding: '0 2px',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={selectedIngredients.length >= 2 && !isGenerating ? { scale: 1.02 } : {}}
        whileTap={selectedIngredients.length >= 2 && !isGenerating ? { scale: 0.98 } : {}}
        onClick={onGenerate}
        disabled={selectedIngredients.length < 2 || isGenerating}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: 'none',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: selectedIngredients.length >= 2 && !isGenerating ? 'pointer' : 'not-allowed',
          backgroundColor: selectedIngredients.length >= 2 && !isGenerating ? '#F4A460' : '#ccc',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
        }}
      >
        {isGenerating && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ display: 'inline-block', width: '18px', height: '18px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" strokeDasharray="30 60" />
            </svg>
          </motion.span>
        )}
        {isGenerating ? '生成中...' : '生成食谱'}
      </motion.button>
    </div>
  );
};

export default IngredientPanel;
