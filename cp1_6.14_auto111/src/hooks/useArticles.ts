import { useState, useEffect } from 'react';
import { Article } from '../types';
import { mockArticles } from '../data/mockArticles';

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setArticles(mockArticles);
      setLoading(false);
    };

    fetchArticles();
  }, []);

  return { articles, loading };
}
