import { v4 as uuidv4 } from 'uuid';

export interface LyricFragment {
  id: string;
  content: string;
  charCount: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkareaSlot {
  id: string;
  fragmentId: string;
  order: number;
}

export interface Version {
  id: string;
  name: string;
  createdAt: number;
  slots: WorkareaSlot[];
  fragmentSnapshots: Record<string, LyricFragment>;
}

export const THEME_GRADIENTS: Record<string, [string, string]> = {
  '\u7231\u60C5': ['#FFB7B2', '#E7A8D8'],
  '\u594B\u6597': ['#A8D8EA', '#AA96DA'],
  '\u81EA\u7136': ['#A8E6CF', '#D4E157'],
  '\u5176\u4ED6': ['#FFEAA7', '#FFEAA7'],
};

export const PRESET_TAGS = ['\u7231\u60C5', '\u594B\u6597', '\u81EA\u7136', '\u5176\u4ED6'];

export const MAX_CHAR_COUNT = 200;

export function getGradientForTags(tags: string[]): [string, string] {
  for (const tag of tags) {
    if (THEME_GRADIENTS[tag]) return THEME_GRADIENTS[tag];
  }
  return THEME_GRADIENTS['\u5176\u4ED6'];
}

export function createFragment(content: string, tags: string[]): LyricFragment {
  return {
    id: uuidv4(),
    content,
    charCount: content.length,
    tags,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function updateFragmentContent(
  fragment: LyricFragment,
  newContent: string
): LyricFragment {
  return {
    ...fragment,
    content: newContent,
    charCount: newContent.length,
    updatedAt: Date.now(),
  };
}

export function filterFragmentsByTag(
  fragments: LyricFragment[],
  tag: string | null
): LyricFragment[] {
  if (!tag) return fragments;
  return fragments.filter((f) => f.tags.includes(tag));
}

export function createWorkareaSlot(
  fragmentId: string,
  order: number
): WorkareaSlot {
  return {
    id: uuidv4(),
    fragmentId,
    order,
  };
}

export function reorderSlots(
  slots: WorkareaSlot[],
  fromIndex: number,
  toIndex: number
): WorkareaSlot[] {
  const result = [...slots];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result.map((slot, i) => ({ ...slot, order: i }));
}

export function createVersion(
  slots: WorkareaSlot[],
  fragments: LyricFragment[]
): Version {
  const fragmentSnapshots: Record<string, LyricFragment> = {};
  for (const slot of slots) {
    const frag = fragments.find((f) => f.id === slot.fragmentId);
    if (frag) {
      fragmentSnapshots[frag.id] = { ...frag };
    }
  }
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const name = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return {
    id: uuidv4(),
    name,
    createdAt: Date.now(),
    slots: slots.map((s) => ({ ...s })),
    fragmentSnapshots,
  };
}

export function restoreFromVersion(version: Version): {
  slots: WorkareaSlot[];
  restoredFragments: LyricFragment[];
} {
  const restoredFragments = Object.values(version.fragmentSnapshots).map(
    (f) => ({ ...f })
  );
  const slots = version.slots.map((s) => ({ ...s }));
  return { slots, restoredFragments };
}

export function getTotalCharCount(
  slots: WorkareaSlot[],
  fragments: LyricFragment[]
): number {
  return slots.reduce((sum, slot) => {
    const frag = fragments.find((f) => f.id === slot.fragmentId);
    return sum + (frag ? frag.charCount : 0);
  }, 0);
}
