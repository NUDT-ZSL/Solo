export type Language = 'JavaScript' | 'TypeScript' | 'Python' | 'HTML' | 'CSS' | 'JSON';

export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: Language;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

export interface SnippetFormData {
  title: string;
  code: string;
  language: Language;
  tags: string[];
}

export interface SearchParams {
  lang?: string;
  tags?: string;
  keyword?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export const LANGUAGES: Language[] = [
  'JavaScript',
  'TypeScript',
  'Python',
  'HTML',
  'CSS',
  'JSON',
];

export const LANGUAGE_COLORS: Record<Language, { bg: string; text: string }> = {
  JavaScript: { bg: '#f7df1e', text: '#000000' },
  TypeScript: { bg: '#3178c6', text: '#ffffff' },
  Python: { bg: '#3776ab', text: '#ffffff' },
  HTML: { bg: '#e34f26', text: '#ffffff' },
  CSS: { bg: '#1572b6', text: '#ffffff' },
  JSON: { bg: '#888888', text: '#ffffff' },
};
