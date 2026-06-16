import { useState, useEffect, useCallback } from 'react';
import type { WindowType, Season } from '@/data/roomConfig';

const API_BASE = '/api';

interface UserPreferences {
  windowType: WindowType;
  orientation: number;
  time: number;
  season: Season;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  windowType: 'circle',
  orientation: 180,
  time: 12,
  season: 'summer',
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/preferences`);
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...data.preferences });
        }
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = useCallback(async (prefs: UserPreferences) => {
    setPreferences(prefs);
    try {
      await fetch(`${API_BASE}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      });
    } catch {
      // silent fail
    }
  }, []);

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      const newPrefs = { ...preferences, [key]: value };
      savePreferences(newPrefs);
    },
    [preferences, savePreferences]
  );

  return { preferences, updatePreference, loading };
}
