import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LinkItem, Category, initialLinks, initialCategories } from '../data/sampleData';

export function useCollections() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const addLink = useCallback((linkData: Omit<LinkItem, 'id' | 'createdAt'>) => {
    const newLink: LinkItem = {
      ...linkData,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    setLinks(prev => [newLink, ...prev]);
    return newLink;
  }, []);

  const deleteLink = useCallback((linkId: string) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
  }, []);

  const addCategory = useCallback((name: string) => {
    const icons = ['🔖', '📁', '🏷️', '⭐', '🎯', '📌'];
    const colors = ['#1A237E', '#3F51B5', '#E91E63', '#009688', '#FF5722', '#673AB7'];
    const randomIndex = Math.floor(Math.random() * icons.length);
    const newCategory: Category = {
      id: uuidv4(),
      name,
      icon: icons[randomIndex],
      color: colors[randomIndex],
    };
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  }, []);

  const getLinksByCategory = useCallback((categoryId: string) => {
    if (categoryId === 'all') return links;
    return links.filter(l => l.categoryId === categoryId);
  }, [links]);

  const getCategoryLinkCount = (categoryId: string): number => {
    if (categoryId === 'all') return links.length;
    return links.filter(l => l.categoryId === categoryId).length;
  };

  const reorderLinks = useCallback((
    startIndex: number,
    endIndex: number,
    categoryId: string
  ) => {
    const targetLinks = getLinksByCategory(categoryId);
    const [removed] = targetLinks.splice(startIndex, 1);
    targetLinks.splice(endIndex, 0, removed);

    const otherLinks = categoryId === 'all'
      ? []
      : links.filter(l => l.categoryId !== categoryId);

    if (categoryId === 'all') {
      setLinks(targetLinks);
    } else {
      const newLinks: LinkItem[] = [];
      const reorderedIds = new Set(targetLinks.map(l => l.id));
      for (const link of links) {
        if (reorderedIds.has(link.id)) continue;
        newLinks.push(link);
      }
      setLinks([...targetLinks, ...newLinks]);
    }
  }, [links, getLinksByCategory]);

  const moveLinkToCategory = useCallback((
    linkId: string,
    newCategoryId: string
  ) => {
    if (newCategoryId === 'all') return;
    setLinks(prev => {
      const result = prev.map(l =>
        l.id === linkId ? { ...l, categoryId: newCategoryId } : l
      );
      const movedLink = result.find(l => l.id === linkId);
      if (movedLink) {
        const withoutMoved = result.filter(l => l.id !== linkId);
        return [movedLink, ...withoutMoved];
      }
      return result;
    });
  }, []);

  return {
    categories,
    links,
    activeCategory,
    setActiveCategory,
    addLink,
    deleteLink,
    addCategory,
    getLinksByCategory,
    getCategoryLinkCount,
    reorderLinks,
    moveLinkToCategory,
  };
}
