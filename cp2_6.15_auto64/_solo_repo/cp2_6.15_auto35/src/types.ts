export interface Project {
  id: string;
  name: string;
  language: string;
  targetLanguage: string;
  createdAt: string;
}

export interface TranslationItem {
  id: string;
  projectId: string;
  sourceText: string;
  translatedText: string;
  category: string;
  status: 'pending' | 'translated' | 'reviewed';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationHistory {
  id: string;
  translationId: string;
  translatedText: string;
  version: number;
  createdAt: string;
}

export interface TranslationPagination {
  items: TranslationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UIStyleConfig {
  dialogBgColor: string;
  textColor: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
  borderRadius: number;
  avatarSize: number;
}

export interface UIStyle {
  id: string;
  projectId: string;
  config: UIStyleConfig;
  createdAt: string;
}

export interface ProgressData {
  total: number;
  translated: number;
  percentage: number;
}

export type ThemeMode = 'light' | 'dark';
