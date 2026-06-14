export interface StoryNode {
  id: string;
  text: string;
  background: string;
  ambientSound?: string;
  choices: Choice[];
  isEnding?: boolean;
  endingType?: 'good' | 'normal' | 'bad';
  endingTitle?: string;
  effects?: Effect[];
}

export interface Choice {
  id: string;
  text: string;
  nextNodeId: string;
  condition?: Condition;
  effects?: Effect[];
}

export interface Condition {
  variable: string;
  operator: '==' | '!=' | '>=' | '<=' | '>' | '<';
  value: number | string | boolean;
}

export interface Effect {
  type: 'set' | 'add' | 'subtract';
  variable: string;
  value: number | string | boolean;
}

export interface GameState {
  currentNodeId: string;
  variables: Record<string, number | string | boolean>;
  visitedNodes: string[];
  history: HistoryEntry[];
}

export interface HistoryEntry {
  nodeId: string;
  choiceId?: string;
  timestamp: number;
}

export interface SceneData {
  nodeId: string;
  text: string;
  background: string;
  ambientSound?: string;
  choices: Choice[];
  isEnding?: boolean;
  endingType?: 'good' | 'normal' | 'bad';
  endingTitle?: string;
}

export type EventCallback = (...args: any[]) => void;

export enum GameEvent {
  SCENE_CHANGE = 'scene_change',
  CHOICE_SELECTED = 'choice_selected',
  GAME_START = 'game_start',
  GAME_END = 'game_end',
  SAVE_GAME = 'save_game',
  LOAD_GAME = 'load_game',
  PLAY_SOUND = 'play_sound',
  STOP_SOUND = 'stop_sound',
  FADE_SOUND = 'fade_sound',
}
