import { useState, useEffect, useCallback } from 'react';
import { getPuzzleById, submitSolution, getCollection } from './api';
import type { Puzzle, SolveResult } from './types';

export const usePuzzle = (artifactId: string | null) => {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artifactId) {
      setPuzzle(null);
      return;
    }
    setLoading(true);
    setError(null);
    getPuzzleById(artifactId)
      .then(setPuzzle)
      .catch((err) => setError(err.message || 'Failed to load puzzle'))
      .finally(() => setLoading(false));
  }, [artifactId]);

  return { puzzle, loading, error };
};

export const useCollection = () => {
  const [collection, setCollection] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCollection();
      setCollection(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  return { collection, loading, refresh: fetchCollection };
};

export const useSubmitSolution = () => {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SolveResult | null>(null);

  const submit = useCallback(async (id: string, sequence: number[]) => {
    setSubmitting(true);
    setResult(null);
    try {
      const data = await submitSolution(id, sequence);
      setResult(data);
      return data;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return { submitting, result, submit, reset };
};
