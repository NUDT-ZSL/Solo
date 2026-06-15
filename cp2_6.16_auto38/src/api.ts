export type Language = 'JavaScript' | 'Python' | 'HTML/CSS' | 'TypeScript';

export interface Snippet {
  id: string;
  title: string;
  language: Language;
  code: string;
  createdAt: number;
}

const STORAGE_KEY = 'smart_code_snippets';

export function loadSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Snippet[];
  } catch {
    return [];
  }
}

export function saveSnippets(snippets: Snippet[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

export function addSnippet(snippet: Snippet): Snippet[] {
  const snippets = loadSnippets();
  snippets.unshift(snippet);
  saveSnippets(snippets);
  return snippets;
}

export function deleteSnippet(id: string): Snippet[] {
  const snippets = loadSnippets().filter((s) => s.id !== id);
  saveSnippets(snippets);
  return snippets;
}

export function searchSnippets(keyword: string): Snippet[] {
  const snippets = loadSnippets();
  if (!keyword.trim()) return snippets;
  const lower = keyword.toLowerCase();
  return snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(lower) ||
      s.code.toLowerCase().includes(lower) ||
      s.language.toLowerCase().includes(lower)
  );
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
