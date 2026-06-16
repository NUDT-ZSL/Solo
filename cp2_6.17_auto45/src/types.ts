export interface LanguageDataPoint {
  language: string;
  monthIndex: number;
  monthLabel: string;
  repos: number;
  contributors: number;
  newIssues: number;
  resolvedIssues: number;
}

export type LanguageName = 'JavaScript' | 'TypeScript' | 'Python' | 'Java' | 'Go' | 'all';

export const LANGUAGES: LanguageName[] = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go'];

export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3776ab',
  Java: '#b07219',
  Go: '#00add8'
};
