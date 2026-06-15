export interface BriefModuleData {
  id: string;
  title: string;
  content: string;
  type: 'headline' | 'local' | 'international' | 'finance';
}

export interface User {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface EditorCursor {
  userId: string;
  moduleId: string;
  position: number;
}
