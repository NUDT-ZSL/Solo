export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  comment: string;
  createdAt: number;
}

export const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS'] as const;
export type Language = typeof LANGUAGES[number];
