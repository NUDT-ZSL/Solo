import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, RecipeStep, Ingredient } from '../types/recipe';

const mockRecipes: Recipe[] = [
  {
    id: 'demo-1',
    title: '番茄炒蛋',
    servings: 2,
    baseServings: 2,
    confidence: 0.92,
    createdAt: new Date().toISOString(),
    steps: [
      {
        id: 'step-1',
        title: '准备食材',
        description: '将番茄洗净切块，鸡蛋打散备用。葱切成葱花。',
        duration: 300,
        stepOrder: 1,
        ingredients: [
          { id: 'ing-1', name: '番茄', amount: 2, unit: '个' },
          { id: 'ing-2', name: '鸡蛋', amount: 3, unit: '个' },
          { id: 'ing-3', name: '葱', amount: 1, unit: '根' },
        ],
      },
      {
        id: 'step-2',
        title: '炒鸡蛋',
        description: '热锅倒油，油热后倒入蛋液，快速翻炒至凝固，盛出备用。',
        duration: 180,
        stepOrder: 2,
        ingredients: [
          { id: 'ing-4', name: '食用油', amount: 2, unit: '勺' },
        ],
      },
      {
        id: 'step-3',
        title: '炒番茄',
        description: '锅中再加少许油，放入番茄块翻炒，加少许盐，炒出汁后加入白糖调味。',
        duration: 360,
        stepOrder: 3,
        ingredients: [
          { id: 'ing-5', name: '盐', amount: 1, unit: '小勺' },
          { id: 'ing-6', name: '白糖', amount: 1, unit: '勺' },
        ],
      },
      {
        id: 'step-4',
        title: '混合翻炒',
        description: '将炒好的鸡蛋倒回锅中，与番茄一起翻炒均匀，撒上葱花即可出锅。',
        duration: 120,
        stepOrder: 4,
        ingredients: [],
      },
    ],
  },
  {
    id: 'demo-2',
    title: '红烧肉',
    servings: 4,
    baseServings: 4,
    confidence: 0.87,
    createdAt: new Date().toISOString(),
    steps: [
      {
        id: 'step-1',
        title: '处理五花肉',
        description: '五花肉洗净切块，冷水下锅焯水，去除血沫后捞出沥干。',
        duration: 600,
        stepOrder: 1,
        ingredients: [
          { id: 'ing-1', name: '五花肉', amount: 500, unit: '克' },
          { id: 'ing-2', name: '生姜', amount: 3, unit: '片' },
          { id: 'ing-3', name: '料酒', amount: 1, unit: '勺' },
        ],
      },
      {
        id: 'step-2',
        title: '炒糖色',
        description: '锅中放少许油，加入冰糖小火炒至焦糖色，注意不要炒糊。',
        duration: 300,
        stepOrder: 2,
        ingredients: [
          { id: 'ing-4', name: '冰糖', amount: 30, unit: '克' },
          { id: 'ing-5', name: '食用油', amount: 1, unit: '勺' },
        ],
      },
      {
        id: 'step-3',
        title: '煸炒肉块',
        description: '放入焯好水的五花肉翻炒，让每块肉都裹上糖色。加入姜片、八角、桂皮炒香。',
        duration: 240,
        stepOrder: 3,
        ingredients: [
          { id: 'ing-6', name: '八角', amount: 2, unit: '个' },
          { id: 'ing-7', name: '桂皮', amount: 1, unit: '小块' },
        ],
      },
      {
        id: 'step-4',
        title: '炖煮',
        description: '加入生抽、老抽、料酒翻炒上色，倒入热水没过肉块，大火烧开后转小火炖煮50分钟。',
        duration: 3000,
        stepOrder: 4,
        ingredients: [
          { id: 'ing-8', name: '生抽', amount: 2, unit: '勺' },
          { id: 'ing-9', name: '老抽', amount: 1, unit: '勺' },
        ],
      },
      {
        id: 'step-5',
        title: '收汁出锅',
        description: '打开锅盖，加盐调味，开大火收汁，待汤汁浓稠包裹在肉块上即可出锅。',
        duration: 360,
        stepOrder: 5,
        ingredients: [
          { id: 'ing-10', name: '盐', amount: 0.5, unit: '小勺' },
        ],
      },
    ],
  },
];

function parseDurationFromText(text: string): number {
  const patterns = [
    { regex: /煮\s*(\d+)\s*分钟/, multiplier: 60 },
    { regex: /炖\s*(\d+)\s*分钟/, multiplier: 60 },
    { regex: /炒\s*(\d+)\s*分钟/, multiplier: 60 },
    { regex: /蒸\s*(\d+)\s*分钟/, multiplier: 60 },
    { regex: /烤\s*(\d+)\s*分钟/, multiplier: 60 },
    { regex: /(\d+)\s*分钟/, multiplier: 60 },
    { regex: /(\d+)\s*秒/, multiplier: 1 },
    { regex: /(\d+)\s*小时/, multiplier: 3600 },
  ];

  for (const { regex, multiplier } of patterns) {
    const match = text.match(regex);
    if (match) {
      return parseInt(match[1], 10) * multiplier;
    }
  }
  return 300;
}

export function useOcr() {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognizeImage = useCallback((_imageFile: File): Promise<Recipe> => {
    return new Promise((resolve, reject) => {
      setIsRecognizing(true);
      setProgress(0);
      setError(null);

      const totalDuration = 2500 + Math.random() * 500;
      const startTime = Date.now();

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / totalDuration) * 100, 95);
        setProgress(newProgress);

        if (elapsed < totalDuration) {
          requestAnimationFrame(updateProgress);
        } else {
          setProgress(100);
          const randomRecipe = mockRecipes[Math.floor(Math.random() * mockRecipes.length)];
          const recipe: Recipe = {
            ...randomRecipe,
            id: uuidv4(),
            confidence: 0.75 + Math.random() * 0.2,
            createdAt: new Date().toISOString(),
            steps: randomRecipe.steps.map((step, index) => ({
              ...step,
              id: uuidv4(),
              stepOrder: index + 1,
              duration: parseDurationFromText(step.description),
              ingredients: step.ingredients.map((ing) => ({
                ...ing,
                id: uuidv4(),
              })),
            })),
          };

          setTimeout(() => {
            setIsRecognizing(false);
            resolve(recipe);
          }, 200);
        }
      };

      requestAnimationFrame(updateProgress);

      setTimeout(() => {
        if (Math.random() < 0.05) {
          setIsRecognizing(false);
          setError('图片识别失败，请重试');
          reject(new Error('识别失败'));
        }
      }, 1000);
    });
  }, []);

  const recognizeText = useCallback((text: string): Recipe => {
    const lines = text.split('\n').filter((line) => line.trim());
    const steps: RecipeStep[] = [];
    const allIngredients: Ingredient[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const duration = parseDurationFromText(trimmed);
      const stepIngredients: Ingredient[] = [];

      const ingredientPatterns = [
        /(\d+)\s*(克|g|公斤|kg)\s*([\u4e00-\u9fa5a-zA-Z]+)/,
        /(\d+)\s*(个|只|颗|根|勺|碗|杯)\s*([\u4e00-\u9fa5a-zA-Z]+)/,
        /([\u4e00-\u9fa5a-zA-Z]+)\s*(\d+)\s*(克|g|个|只|颗|根|勺)/,
      ];

      for (const pattern of ingredientPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const amount = parseFloat(match[1]);
          const unit = match[2];
          const name = match[3];
          if (!allIngredients.some((ing) => ing.name === name)) {
            const ingredient: Ingredient = {
              id: uuidv4(),
              name,
              amount,
              unit,
            };
            stepIngredients.push(ingredient);
            allIngredients.push(ingredient);
          }
        }
      }

      steps.push({
        id: uuidv4(),
        title: `步骤 ${index + 1}`,
        description: trimmed,
        duration,
        stepOrder: index + 1,
        ingredients: stepIngredients,
      });
    });

    return {
      id: uuidv4(),
      title: '自定义菜谱',
      servings: 2,
      baseServings: 2,
      steps,
      confidence: 0.8,
      createdAt: new Date().toISOString(),
    };
  }, []);

  return {
    isRecognizing,
    progress,
    error,
    recognizeImage,
    recognizeText,
  };
}
