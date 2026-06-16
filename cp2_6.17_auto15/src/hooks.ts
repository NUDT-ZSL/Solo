import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PlantDetail, RecognitionResult, FavoriteItem } from './types';
import { fetchPlants, fetchPlantById } from './mockData';
import {
  recognizeLeaf,
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  getViewedPlantIdsThisWeek,
  markPlantViewed,
} from './utils';

export function usePlantList() {
  const [plants, setPlants] = useState<PlantDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchPlants().then((data) => {
      if (mounted) {
        setPlants(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const searchPlants = useCallback(
    (keyword: string) => {
      if (!keyword.trim()) return plants;
      const lower = keyword.toLowerCase();
      return plants.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.scientificName.toLowerCase().includes(lower)
      );
    },
    [plants]
  );

  return { plants, loading, searchPlants };
}

export function usePlantDetail(id: string | undefined) {
  const [plant, setPlant] = useState<PlantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    fetchPlantById(id).then((data) => {
      if (mounted) {
        setPlant(data ?? null);
        setLoading(false);
        if (data) {
          markPlantViewed(data.id);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, [id]);

  return { plant, loading };
}

export function useRecognition() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plants, setPlants] = useState<PlantDetail[]>([]);

  useEffect(() => {
    fetchPlants().then(setPlants);
  }, []);

  const recognize = useCallback(
    async (dataUrl: string) => {
      setImageDataUrl(dataUrl);
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await recognizeLeaf(dataUrl, plants);
        setResult(res);
        markPlantViewed(res.plant.id);
      } catch (e) {
        setError('识别失败，请重试');
      } finally {
        setLoading(false);
      }
    },
    [plants]
  );

  const reset = useCallback(() => {
    setImageDataUrl(null);
    setResult(null);
    setError(null);
  }, []);

  return { imageDataUrl, result, loading, error, recognize, reset };
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const add = useCallback((plantId: string) => {
    const updated = addFavorite(plantId);
    setFavorites(updated);
  }, []);

  const remove = useCallback((plantId: string) => {
    const updated = removeFavorite(plantId);
    setFavorites(updated);
  }, []);

  const check = useCallback((plantId: string) => isFavorite(plantId), []);

  const sortedByDate = useMemo(
    () => [...favorites].sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1)),
    [favorites]
  );

  return { favorites, sortedByDate, add, remove, check };
}

export function useDiscovery() {
  const [plants, setPlants] = useState<PlantDetail[]>([]);
  const [discovery, setDiscovery] = useState<PlantDetail | null>(null);

  useEffect(() => {
    fetchPlants().then((data) => {
      setPlants(data);
      const viewed = getViewedPlantIdsThisWeek();
      const unviewed = data.filter((p) => !viewed.has(p.id));
      const pool = unviewed.length > 0 ? unviewed : data;
      const random = pool[Math.floor(Math.random() * pool.length)];
      setDiscovery(random ?? null);
    });
  }, []);

  const refreshDiscovery = useCallback(() => {
    if (plants.length === 0) return;
    const viewed = getViewedPlantIdsThisWeek();
    const unviewed = plants.filter((p) => !viewed.has(p.id));
    const pool = unviewed.length > 0 ? unviewed : plants;
    const random = pool[Math.floor(Math.random() * pool.length)];
    setDiscovery(random ?? null);
    if (random) {
      markPlantViewed(random.id);
    }
  }, [plants]);

  const getConfusablePairs = useCallback(() => {
    const pairs: { a: PlantDetail; b: PlantDetail }[] = [];
    for (let i = 0; i < plants.length; i += 2) {
      if (i + 1 < plants.length) {
        pairs.push({ a: plants[i], b: plants[i + 1] });
      }
    }
    return pairs;
  }, [plants]);

  return { discovery, plants, refreshDiscovery, getConfusablePairs };
}
