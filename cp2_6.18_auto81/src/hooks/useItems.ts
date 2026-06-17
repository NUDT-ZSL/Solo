import { useState, useEffect, useCallback } from 'react';
import type { Item } from '../types';
import { fetchItems, createItem, applyForItem, updateItemStatus } from '../utils/api';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = useCallback(
    async (item: Omit<Item, 'id' | 'publishTime' | 'applications' | 'status'>) => {
      setLoading(true);
      setError(null);
      try {
        const newItem = await createItem(item);
        setItems((prev) => [newItem, ...prev]);
        return newItem;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create item');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const applyItem = useCallback(async (itemId: string, applicant: string) => {
    setLoading(true);
    setError(null);
    try {
      const updatedItem = await applyForItem(itemId, applicant);
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? updatedItem : item))
      );
      return updatedItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply for item');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setItemStatus = useCallback(async (itemId: string, status: string) => {
    setLoading(true);
    setError(null);
    try {
      const updatedItem = await updateItemStatus(itemId, status);
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? updatedItem : item))
      );
      return updatedItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    loadItems,
    addItem,
    applyItem,
    setItemStatus,
  };
}
