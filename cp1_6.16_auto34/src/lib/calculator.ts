import { Ingredient, RecipeStep, IngredientWithPercentage } from './types';

export function calculatePercentages(
  ingredients: Ingredient[]
): { ingredients: IngredientWithPercentage[]; totalWeight: number } {
  const totalWeight = ingredients.reduce((sum, ing) => sum + (ing.weight || 0), 0);

  if (totalWeight === 0) {
    return {
      ingredients: ingredients.map((ing) => ({ ...ing, percentage: 0 })),
      totalWeight: 0,
    };
  }

  const ingredientsWithPercentage = ingredients.map((ing) => ({
    ...ing,
    percentage: Math.round((ing.weight / totalWeight) * 10000) / 100,
  }));

  return { ingredients: ingredientsWithPercentage, totalWeight };
}

export function formatToRecipeCard(
  recipeName: string,
  steps: RecipeStep[],
  totalWeight: number,
  ingredientPercentages: { name: string; percentage: number }[]
): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push(`🍰 ${recipeName}`);
  lines.push('='.repeat(60));
  lines.push(`总重量: ${totalWeight}g`);
  lines.push('');

  lines.push('--- 食材百分比 ---');
  const sortedPercentages = [...ingredientPercentages].sort((a, b) => b.percentage - a.percentage);
  sortedPercentages.forEach((item) => {
    lines.push(`  ${item.name.padEnd(12)} ${item.percentage.toFixed(2)}%`);
  });
  lines.push('');

  lines.push('--- 制作步骤 ---');
  steps.forEach((step, index) => {
    lines.push(`【步骤 ${index + 1}】${step.title}`);
    if (step.description) {
      lines.push(`  说明: ${step.description}`);
    }
    if (step.timerHours > 0 || step.timerMinutes > 0) {
      const timeStr = [];
      if (step.timerHours > 0) timeStr.push(`${step.timerHours}小时`);
      if (step.timerMinutes > 0) timeStr.push(`${step.timerMinutes}分钟`);
      lines.push(`  定时: ${timeStr.join(' ')}`);
    }
    if (step.ingredients.length > 0) {
      lines.push('  食材:');
      step.ingredients.forEach((ing) => {
        const tempStr = ing.temperature ? ` (${ing.temperature}°C)` : '';
        lines.push(`    - ${ing.name}: ${ing.weight}g${tempStr}`);
      });
    }
    lines.push('');
  });

  lines.push('='.repeat(60));
  lines.push('配方由烘焙配方编辑器生成');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

export function validateSteps(steps: RecipeStep[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (steps.length === 0) {
    errors.push('配方至少需要一个步骤');
  }

  steps.forEach((step, index) => {
    if (!step.title || step.title.trim() === '') {
      errors.push(`步骤 ${index + 1} 的标题不能为空`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function getAllIngredients(steps: RecipeStep[]): Ingredient[] {
  return steps.flatMap((step) => step.ingredients);
}

export function aggregateIngredientPercentages(
  ingredients: IngredientWithPercentage[]
): { name: string; percentage: number }[] {
  const aggregated: Record<string, number> = {};

  ingredients.forEach((ing) => {
    if (aggregated[ing.name] === undefined) {
      aggregated[ing.name] = 0;
    }
    aggregated[ing.name] += ing.percentage;
  });

  return Object.entries(aggregated).map(([name, percentage]) => ({
    name,
    percentage: Math.round(percentage * 100) / 100,
  }));
}

export function getProgressBarColor(percentage: number): string {
  if (percentage < 5) return '#87CEEB';
  if (percentage < 20) return '#98FB98';
  return '#FFD700';
}
