export interface Preset {
  id: string;
  name: string;
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  bodyWeight: number;
  headingSize: number;
  bodySize: number;
  lineHeight: number;
  headingSpacing: number;
  backgroundColor: string;
  createdAt: string;
}

const STORAGE_KEY = 'font-pairing-presets';
const MAX_PRESETS = 6;

export function loadPresets(): Preset[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as Preset[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PRESETS) : [];
  } catch {
    return [];
  }
}

export function savePreset(preset: Omit<Preset, 'id' | 'createdAt' | 'name'>): Preset[] {
  const existing = loadPresets();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const newPreset: Preset = {
    ...preset,
    id: Date.now().toString(),
    name: `${preset.headingFont} + ${preset.bodyFont} · ${dateStr}`,
    createdAt: now.toISOString(),
  };
  const updated = [newPreset, ...existing].slice(0, MAX_PRESETS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn('Failed to save preset to localStorage');
  }
  return updated;
}

export function deletePreset(id: string): Preset[] {
  const existing = loadPresets();
  const updated = existing.filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn('Failed to update presets in localStorage');
  }
  return updated;
}
