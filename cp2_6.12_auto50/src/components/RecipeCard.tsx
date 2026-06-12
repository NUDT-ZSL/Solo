import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Recipe {
  id: string;
  name: string;
  matchScore: number;
  description: string;
  requiredIngredients: string;
  steps: string;
  ingredients: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onStartCooking: (recipe: Recipe) => void;
}

interface RequiredIngredientItem {
  name: string;
  amount: string;
}

interface StepItem {
  step: string;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  index,
  isExpanded,
  onToggleExpand,
  onStartCooking,
}) => {
  let parsedIngredients: RequiredIngredientItem[] = [];
  let parsedSteps: StepItem[] = [];

  try {
    parsedIngredients = JSON.parse(recipe.requiredIngredients);
  } catch {
    parsedIngredients = [];
  }

  try {
    parsedSteps = JSON.parse(recipe.steps);
  } catch {
    parsedSteps = [];
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.15, duration: 0.4 }}
      whileHover={{
        y: -8,
        boxShadow: '0 16px 32px rgba(139, 69, 19, 0.15)',
        transition: { duration: 0.2 },
      }}
      onClick={() => onToggleExpand(recipe.id)}
      style={{
        backgroundColor: '#FFF0DB',
        border: '1px solid #F4A460',
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(139, 69, 19, 0.08)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#8B4513', flex: 1 }}>
          {recipe.name}
        </h3>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: '#F4A460',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start',
          }}
        >
          {recipe.matchScore}% 匹配
        </span>
      </div>

      <p style={{ margin: 0, color: '#A0522D', fontSize: '14px', lineHeight: 1.6 }}>
        {recipe.description}
      </p>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ paddingTop: '20px', marginTop: '20px', borderTop: '1px dashed #F4A460' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold', color: '#8B4513' }}>
                🥘 所需食材
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '8px',
                  marginBottom: '24px',
                }}
              >
                {parsedIngredients.map((ing, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#FFFAF0',
                      borderRadius: '8px',
                      border: '1px solid #FFE4B5',
                      fontSize: '14px',
                      color: '#8B4513',
                    }}
                  >
                    {ing.name} <strong style={{ color: '#D2691E' }}>{ing.amount}</strong>
                  </div>
                ))}
              </div>

              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: '#8B4513' }}>
                👨‍🍳 烹饪步骤
              </h4>
              <div style={{ position: 'relative', paddingLeft: '36px' }}>
                {parsedSteps.map((s, i) => (
                  <div key={i} style={{ position: 'relative', marginBottom: i === parsedSteps.length - 1 ? 0 : '20px' }}>
                    {i < parsedSteps.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '-24px',
                          top: '28px',
                          bottom: '-20px',
                          width: '2px',
                          backgroundColor: '#F4A460',
                          opacity: 0.4,
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-36px',
                        top: '0',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: '#F4A460',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div
                      style={{
                        backgroundColor: '#FFFAF0',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #FFE4B5',
                        fontSize: '14px',
                        color: '#8B4513',
                        lineHeight: 1.6,
                      }}
                    >
                      {s.step}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '24px' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCooking(recipe);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#F4A460',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  🍳 开始烹饪
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RecipeCard;
