export type PropType = 'text' | 'slider' | 'color' | 'boolean';

export interface PropSchema {
  name: string;
  type: PropType;
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

export interface PropsMap {
  [key: string]: string | number | boolean;
}

export interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  error: string | null;
  onError: (error: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export interface PreviewProps {
  code: string;
  props: PropsMap;
  onError: (error: string | null) => void;
}

export interface PropsPanelProps {
  schema: PropSchema[];
  values: PropsMap;
  onChange: (name: string, value: string | number | boolean) => void;
}

export interface SandboxMessage {
  type: 'render' | 'error' | 'ready';
  code?: string;
  props?: PropsMap;
  error?: string;
}

export interface AppState {
  code: string;
  props: PropsMap;
  schema: PropSchema[];
  error: string | null;
  editorWidth: number;
  isDragging: boolean;
  isMobile: boolean;
  mobileEditorOpen: boolean;
}

declare global {
  interface Window {
    Babel: typeof import('@babel/standalone');
  }
}
