import type { CodeSnippet, Comment, HeatmapData, PaginatedResponse } from '../../client/types';

const AUTHORS = [
  { id: 'u1', name: '张三', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan' },
  { id: 'u2', name: '李四', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi' },
  { id: 'u3', name: '王五', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu' },
  { id: 'u4', name: '赵六', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoliu' },
  { id: 'u5', name: '陈七', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenqi' },
];

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust'];

const TAGS = ['算法', '前端', '后端', '数据库', '性能优化', '最佳实践', '设计模式', '安全', '测试', 'DevOps'];

const CODE_SAMPLES: Record<string, string[]> = {
  JavaScript: [
    `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}`,
    `const debounce = (fn, delay) => {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};`,
    `async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network error');
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}`,
  ],
  TypeScript: [
    `interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

function validateUser(user: Partial<User>): user is User {
  return !!(user.id && user.name && user.email && user.role);
}`,
    `type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

function safeDivide(a: number, b: number): Result<number, string> {
  if (b === 0) return { success: false, error: 'Division by zero' };
  return { success: true, data: a / b };
}`,
  ],
  Python: [
    `def fibonacci(n, memo=None):
    if memo is None:
        memo = {}
    if n in memo:
        return memo[n]
    if n <= 2:
        return 1
    memo[n] = fibonacci(n-1, memo) + fibonacci(n-2, memo)
    return memo[n]`,
    `class Singleton:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance`,
    `from contextlib import contextmanager

@contextmanager
def database_connection():
    conn = create_connection()
    try:
        yield conn
    finally:
        conn.close()`,
  ],
  Go: [
    `func MergeSort(arr []int) []int {
    if len(arr) <= 1 {
        return arr
    }
    mid := len(arr) / 2
    left := MergeSort(arr[:mid])
    right := MergeSort(arr[mid:])
    return merge(left, right)
}

func merge(left, right []int) []int {
    result := make([]int, 0, len(left)+len(right))
    i, j := 0, 0
    for i < len(left) && j < len(right) {
        if left[i] < right[j] {
            result = append(result, left[i])
            i++
        } else {
            result = append(result, right[j])
            j++
        }
    }
    result = append(result, left[i:]...)
    result = append(result, right[j:]...)
    return result
}`,
    `type Pool struct {
    jobs    chan Job
    results chan Result
    workers int
}

func NewPool(workers int) *Pool {
    return &Pool{
        jobs:    make(chan Job, 100),
        results: make(chan Result, 100),
        workers: workers,
    }
}`,
  ],
  Rust: [
    `use std::collections::HashMap;

fn count_chars(s: &str) -> HashMap<char, usize> {
    let mut counts = HashMap::new();
    for c in s.chars() {
        *counts.entry(c).or_insert(0) += 1;
    }
    counts
}`,
    `struct User {
    id: Uuid,
    name: String,
    email: String,
}

impl User {
    pub fn new(name: String, email: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            email,
        }
    }
}`,
  ],
};

const COMMENT_CONTENTS = [
  '这个实现很优雅，学习了！',
  '建议考虑一下边界情况的处理',
  '性能上有没有优化空间？',
  '代码可读性很好，注释也很清晰',
  '这里可以用更简洁的写法',
  '测试用例覆盖了吗？',
  '异常处理做得不错',
  '命名很规范，符合团队约定',
  '这个算法的时间复杂度是多少？',
  '可以考虑抽成一个通用工具函数',
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateComments(snippetId: string, count: number): Comment[] {
  const comments: Comment[] = [];
  for (let i = 0; i < count; i++) {
    const author = randomItem(AUTHORS);
    comments.push({
      id: generateId(),
      snippetId,
      author,
      content: randomItem(COMMENT_CONTENTS),
      lineNumber: Math.random() > 0.5 ? Math.floor(Math.random() * 20) + 1 : undefined,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  return comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function generateMockSnippets(): CodeSnippet[] {
  const snippets: CodeSnippet[] = [];
  const statuses: CodeSnippet['status'][] = ['pending', 'approved', 'changes_requested'];
  
  for (let i = 0; i < 20; i++) {
    const language = randomItem(LANGUAGES);
    const codeSamples = CODE_SAMPLES[language] || CODE_SAMPLES['JavaScript'];
    const code = randomItem(codeSamples);
    const author = randomItem(AUTHORS);
    const commentCount = Math.floor(Math.random() * 6) + 3;
    const id = generateId();
    
    snippets.push({
      id,
      title: `${language} 代码示例 #${i + 1}`,
      code,
      language,
      tags: randomItems(TAGS, 1, 3),
      author,
      likes: Math.floor(Math.random() * 100),
      status: randomItem(statuses),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      comments: generateComments(id, commentCount),
    });
  }
  
  return snippets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export class SnippetStore {
  private snippets: Map<string, CodeSnippet>;
  
  constructor() {
    this.snippets = new Map();
    this.initializeMockData();
  }
  
  private initializeMockData(): void {
    const mockSnippets = generateMockSnippets();
    mockSnippets.forEach(snippet => {
      this.snippets.set(snippet.id, snippet);
    });
  }
  
  getSnippets(
    filters?: { tags?: string[]; language?: string },
    page: number = 1,
    limit: number = 20
  ): PaginatedResponse<CodeSnippet> {
    let items = Array.from(this.snippets.values());
    
    if (filters?.tags && filters.tags.length > 0) {
      items = items.filter(snippet => 
        filters.tags!.some(tag => snippet.tags.includes(tag))
      );
    }
    
    if (filters?.language) {
      items = items.filter(snippet => snippet.language === filters.language);
    }
    
    const total = items.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedItems = items.slice(start, end);
    
    return {
      items: paginatedItems,
      total,
      page,
      limit,
      hasMore: end < total,
    };
  }
  
  getSnippetById(id: string): CodeSnippet | undefined {
    return this.snippets.get(id);
  }
  
  getComments(
    snippetId: string,
    page: number = 1,
    limit: number = 10
  ): PaginatedResponse<Comment> {
    const snippet = this.snippets.get(snippetId);
    if (!snippet) {
      return { items: [], total: 0, page, limit, hasMore: false };
    }
    
    const comments = snippet.comments;
    const total = comments.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedItems = comments.slice(start, end);
    
    return {
      items: paginatedItems,
      total,
      page,
      limit,
      hasMore: end < total,
    };
  }
  
  getHeatmapData(): HeatmapData[] {
    const languageMap = new Map<string, { commentCount: number; snippetCount: number }>();
    
    for (const snippet of this.snippets.values()) {
      const existing = languageMap.get(snippet.language) || { commentCount: 0, snippetCount: 0 };
      languageMap.set(snippet.language, {
        commentCount: existing.commentCount + snippet.comments.length,
        snippetCount: existing.snippetCount + 1,
      });
    }
    
    return Array.from(languageMap.entries()).map(([language, data]) => ({
      language,
      commentCount: data.commentCount,
      snippetCount: data.snippetCount,
    }));
  }
  
  getAllTags(): string[] {
    const tagSet = new Set<string>();
    for (const snippet of this.snippets.values()) {
      snippet.tags.forEach(tag => tagSet.add(tag));
    }
    return Array.from(tagSet).sort();
  }
  
  createSnippet(data: {
    code: string;
    language: string;
    tags: string[];
    title?: string;
  }): CodeSnippet {
    const id = generateId();
    const author = AUTHORS[0];
    const snippet: CodeSnippet = {
      id,
      title: data.title || `${data.language} 代码片段`,
      code: data.code,
      language: data.language,
      tags: data.tags,
      author,
      likes: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      comments: [],
    };
    this.snippets.set(id, snippet);
    return snippet;
  }
  
  updateSnippetStatus(
    id: string,
    status: CodeSnippet['status']
  ): CodeSnippet | undefined {
    const snippet = this.snippets.get(id);
    if (!snippet) return undefined;
    
    const updated = { ...snippet, status };
    this.snippets.set(id, updated);
    return updated;
  }
  
  addComment(
    snippetId: string,
    data: {
      content: string;
      lineNumber?: number;
      authorId: string;
    }
  ): Comment | undefined {
    const snippet = this.snippets.get(snippetId);
    if (!snippet) return undefined;
    
    const author = AUTHORS.find(a => a.id === data.authorId) || AUTHORS[0];
    const comment: Comment = {
      id: generateId(),
      snippetId,
      author,
      content: data.content,
      lineNumber: data.lineNumber,
      createdAt: new Date().toISOString(),
    };
    
    snippet.comments.unshift(comment);
    return comment;
  }
  
  incrementLikes(id: string): CodeSnippet | undefined {
    const snippet = this.snippets.get(id);
    if (!snippet) return undefined;
    
    const updated = { ...snippet, likes: snippet.likes + 1 };
    this.snippets.set(id, updated);
    return updated;
  }
}

export const snippetStore = new SnippetStore();
