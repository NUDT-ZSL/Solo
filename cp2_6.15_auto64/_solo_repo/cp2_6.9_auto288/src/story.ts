import { generateRandomPosition, type Point } from './utils';

export interface StoryFragment {
  id: number;
  text: string;
  collected: boolean;
  position: Point;
  hovered: boolean;
}

export interface StoryState {
  fragments: StoryFragment[];
  totalCount: number;
  collectedCount: number;
  allCollected: boolean;
  activeFragment: StoryFragment | null;
  activeCard: ActiveCardState | null;
  endingState: EndingState | null;
}

export interface ActiveCardState {
  fragmentId: number;
  startPosition: Point;
  startTime: number;
  duration: number;
  cardAppearTime: number;
}

export interface EndingState {
  startTime: number;
  waveProgress: number;
  textProgress: number;
}

const STORY_TEXTS: string[] = [
  '这座灯塔建于1847年，由一位孤独的老水手亲手砌成。他说，海雾里总有迷途的灵魂需要指引。',
  '守望者埃德加在灯塔里度过了三十七个春秋。他的日记里写满了雾中听到的奇异歌声。',
  '1901年的一个冬夜，灯塔的光束突然熄灭。当渔民赶到时，埃德加已不知所踪，桌上只剩半杯热茶。',
  '人们说雾里藏着另一个世界。每当灯塔闪烁三次，就会有一艘幽灵船从浓雾中缓缓驶出。',
  '当地渔夫从不靠近灯塔周围的礁石。他们说那些石头会在满月时低声吟唱古老的航海歌谣。',
  '1952年，一位年轻的女作家搬进灯塔住了半年。她离开后写下了轰动文坛的《雾中回响》，却再也没回来过。',
  '灯塔的玻璃穹顶下刻着一行小字：「光不熄，等待不灭。」没有人知道这句话是为谁而刻。',
  '每年大雾最浓的那一夜，附近村民会看到灯塔下站着一个白色身影，面朝大海，仿佛在等谁归来。',
  '二十年前，三个少年夜探灯塔，只有两人回来。他们说第三个人追着光跑进了雾里，再没出来。',
  '海洋学家记录到灯塔周围的磁场异常。每到凌晨三点，指南针会疯狂旋转，指向某个不存在的方向。',
];

function generateFragmentCount(): number {
  return 8 + Math.floor(Math.random() * 5);
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createInitialState(canvasW: number, canvasH: number): StoryState {
  const count = generateFragmentCount();
  const selectedTexts = shuffle(STORY_TEXTS).slice(0, count);
  const fragments: StoryFragment[] = [];
  const usedPositions: { x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < count; i++) {
    const pos = generateRandomPosition(canvasW, canvasH, usedPositions);
    if (pos) {
      usedPositions.push({ x: pos.x - 25, y: pos.y - 25, w: 50, h: 50 });
      fragments.push({
        id: i,
        text: selectedTexts[i],
        collected: false,
        position: pos,
        hovered: false,
      });
    }
  }

  return {
    fragments,
    totalCount: fragments.length,
    collectedCount: 0,
    allCollected: false,
    activeFragment: null,
    activeCard: null,
    endingState: null,
  };
}

export function reshuffleFragmentPositions(
  state: StoryState,
  canvasW: number,
  canvasH: number
): void {
  const usedPositions: { x: number; y: number; w: number; h: number }[] = [];

  for (const fragment of state.fragments) {
    if (!fragment.collected) {
      const pos = generateRandomPosition(canvasW, canvasH, usedPositions);
      if (pos) {
        usedPositions.push({ x: pos.x - 25, y: pos.y - 25, w: 50, h: 50 });
        fragment.position = pos;
      }
    }
  }
}

export function collectFragment(state: StoryState, fragmentId: number, now: number): boolean {
  const fragment = state.fragments.find(f => f.id === fragmentId);
  if (!fragment || fragment.collected) return false;

  fragment.collected = true;
  state.collectedCount++;
  state.activeFragment = fragment;
  state.activeCard = {
    fragmentId,
    startPosition: { ...fragment.position },
    startTime: now,
    duration: 600,
    cardAppearTime: now + 300,
  };

  if (state.collectedCount >= state.totalCount) {
    state.allCollected = true;
  }

  return true;
}

export function closeActiveCard(state: StoryState): void {
  state.activeFragment = null;
  state.activeCard = null;

  if (state.allCollected && !state.endingState) {
    state.endingState = {
      startTime: performance.now(),
      waveProgress: 0,
      textProgress: 0,
    };
  }
}

export function resetState(state: StoryState, canvasW: number, canvasH: number): StoryState {
  return createInitialState(canvasW, canvasH);
}

export function updateEndingProgress(state: StoryState, now: number): void {
  if (!state.endingState) return;

  const elapsed = now - state.endingState.startTime;
  state.endingState.waveProgress = Math.min(1, elapsed / 2000);
  state.endingState.textProgress = Math.min(1, Math.max(0, (elapsed - 1500) / 1500));
}

export const ENDING_TEXT = '雾终将散去，而光，永远等待着归航的人。';
