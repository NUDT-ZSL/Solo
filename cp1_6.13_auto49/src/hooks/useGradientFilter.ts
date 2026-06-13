
import { useMemo } from 'react';
import type { Gradient } from '../data/demoGradients';

export function useGradientFilter(gradients: Gradient[], searchTerm: string): Gradient[] {
  return useMemo(() => {
    if (!searchTerm.trim()) {
      return gradients;
    }
    const term = searchTerm.toLowerCase().trim();
    return gradients.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        g.tags.some((tag) => tag.toLowerCase().includes(term))
    );
  }, [gradients, searchTerm]);
}
