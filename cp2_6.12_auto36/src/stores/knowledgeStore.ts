import { create } from 'zustand';
import axios from 'axios';
import type {
  KnowledgeBase,
  Category,
  Document,
  DocumentVersion,
  Annotation,
  SearchResult,
} from '@/types';

const api = axios.create({ baseURL: '/api' });

const docCache = new Map<string, { doc: Document; timestamp: number }>();
const DOC_CACHE_TTL = 5000;

const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const SEARCH_CACHE_TTL = 3000;

const versionCache = new Map<string, { content: string; timestamp: number }>();
const VERSION_CACHE_TTL = 30000;

const mapAnnotation = (a: any): Annotation => ({
  id: a.id,
  documentId: a.documentId,
  paragraphIndex: a.paragraphIndex,
  content: a.content,
  userId: a.userId,
  createdAt: a.createdAt,
  isRead: typeof a.isRead === 'number' ? a.isRead === 1 : Boolean(a.isRead),
  parentId: a.parentId ?? a.parent_id ?? null,
  replies: a.replies ? a.replies.map(mapAnnotation) : [],
});

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error';
  exiting?: boolean;
}

interface KnowledgeState {
  knowledgeBases: KnowledgeBase[];
  categories: Category[];
  documents: Document[];
  currentKB: KnowledgeBase | null;
  currentDocument: Document | null;
  versions: DocumentVersion[];
  annotations: Annotation[];
  searchResults: SearchResult[];
  searchQuery: string;
  toasts: ToastItem[];
  sidebarCollapsed: boolean;
  expandedCategories: Set<string>;
  versionPanelOpen: boolean;

  fetchKnowledgeBases: () => Promise<void>;
  createKnowledgeBase: (name: string, description: string) => Promise<void>;
  updateKnowledgeBase: (id: string, name: string, description: string) => Promise<void>;
  deleteKnowledgeBase: (id: string) => Promise<void>;
  setCurrentKB: (kb: KnowledgeBase | null) => void;

  fetchCategories: (kbId: string) => Promise<void>;
  createCategory: (kbId: string, name: string) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  toggleCategory: (catId: string) => void;

  fetchDocuments: (catId: string) => Promise<void>;
  fetchDocument: (docId: string) => Promise<void>;
  createDocument: (catId: string, title: string) => Promise<Document | null>;
  updateDocument: (id: string, title: string, content: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  fetchVersions: (docId: string) => Promise<void>;
  fetchVersion: (docId: string, versionId: string) => Promise<DocumentVersion | null>;

  fetchAnnotations: (docId: string) => Promise<void>;
  addAnnotation: (docId: string, paragraphIndex: number, content: string, parentId?: string) => Promise<void>;
  updateAnnotation: (id: string, data: Partial<Annotation>) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  replyToAnnotation: (id: string, content: string) => Promise<void>;

  search: (query: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setVersionPanelOpen: (open: boolean) => void;
  addToast: (message: string, type?: 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  knowledgeBases: [],
  categories: [],
  documents: [],
  currentKB: null,
  currentDocument: null,
  versions: [],
  annotations: [],
  searchResults: [],
  searchQuery: '',
  toasts: [],
  sidebarCollapsed: false,
  expandedCategories: new Set(),
  versionPanelOpen: false,

  fetchKnowledgeBases: async () => {
    const res = await api.get('/knowledge-bases');
    set({ knowledgeBases: res.data });
  },

  createKnowledgeBase: async (name, description) => {
    const res = await api.post('/knowledge-bases', { name, description });
    set((s) => ({ knowledgeBases: [...s.knowledgeBases, res.data] }));
    get().addToast('知识库创建成功', 'success');
  },

  updateKnowledgeBase: async (id, name, description) => {
    const res = await api.put(`/knowledge-bases/${id}`, { name, description });
    set((s) => ({
      knowledgeBases: s.knowledgeBases.map((kb) => (kb.id === id ? res.data : kb)),
      currentKB: s.currentKB?.id === id ? res.data : s.currentKB,
    }));
    get().addToast('知识库更新成功', 'success');
  },

  deleteKnowledgeBase: async (id) => {
    await api.delete(`/knowledge-bases/${id}`);
    set((s) => ({
      knowledgeBases: s.knowledgeBases.filter((kb) => kb.id !== id),
      currentKB: s.currentKB?.id === id ? null : s.currentKB,
      categories: s.currentKB?.id === id ? [] : s.categories,
    }));
    get().addToast('知识库已删除', 'success');
  },

  setCurrentKB: (kb) => set({ currentKB: kb }),

  fetchCategories: async (kbId) => {
    const res = await api.get(`/knowledge-bases/${kbId}/categories`);
    set({ categories: res.data });
  },

  createCategory: async (kbId, name) => {
    const res = await api.post(`/knowledge-bases/${kbId}/categories`, { name });
    set((s) => ({ categories: [...s.categories, res.data] }));
    get().addToast('分类创建成功', 'success');
  },

  updateCategory: async (id, name) => {
    const res = await api.put(`/categories/${id}`, { name });
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? res.data : c)),
    }));
    get().addToast('分类更新成功', 'success');
  },

  deleteCategory: async (id) => {
    await api.delete(`/categories/${id}`);
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      documents: s.documents.filter((d) => d.categoryId !== id),
    }));
    get().addToast('分类已删除', 'success');
  },

  toggleCategory: (catId) => {
    set((s) => {
      const next = new Set(s.expandedCategories);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return { expandedCategories: next };
    });
  },

  fetchDocuments: async (catId) => {
    const res = await api.get(`/categories/${catId}/documents`);
    set((s) => {
      const otherDocs = s.documents.filter((d) => d.categoryId !== catId);
      return { documents: [...otherDocs, ...res.data] };
    });
  },

  fetchDocument: async (docId) => {
    console.time('docLoad');
    const now = Date.now();
    const cached = docCache.get(docId);
    if (cached && now - cached.timestamp < DOC_CACHE_TTL) {
      set({ currentDocument: cached.doc });
      console.timeEnd('docLoad');
      return;
    }
    const res = await api.get(`/documents/${docId}`);
    const doc = res.data;
    docCache.set(docId, { doc, timestamp: now });
    set({ currentDocument: doc });
    console.timeEnd('docLoad');
  },

  createDocument: async (catId, title) => {
    const res = await api.post(`/categories/${catId}/documents`, { title });
    set((s) => ({ documents: [...s.documents, res.data] }));
    get().addToast('文档创建成功', 'success');
    return res.data;
  },

  updateDocument: async (id, title, content) => {
    const res = await api.put(`/documents/${id}`, { title, content });
    docCache.delete(id);
    versionCache.forEach((_, key) => {
      if (key.startsWith(`${id}-`)) versionCache.delete(key);
    });
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? res.data : d)),
      currentDocument: s.currentDocument?.id === id ? res.data : s.currentDocument,
    }));
    get().addToast('文档保存成功', 'success');
  },

  deleteDocument: async (id) => {
    await api.delete(`/documents/${id}`);
    docCache.delete(id);
    versionCache.forEach((_, key) => {
      if (key.startsWith(`${id}-`)) versionCache.delete(key);
    });
    set((s) => ({
      documents: s.documents.filter((d) => d.id !== id),
      currentDocument: s.currentDocument?.id === id ? null : s.currentDocument,
    }));
    get().addToast('文档已删除', 'success');
  },

  fetchVersions: async (docId) => {
    const res = await api.get(`/documents/${docId}/versions`);
    set({ versions: res.data });
  },

  fetchVersion: async (docId, versionId) => {
    const cacheKey = `${docId}-${versionId}`;
    const now = Date.now();
    const cached = versionCache.get(cacheKey);
    if (cached && now - cached.timestamp < VERSION_CACHE_TTL) {
      return { id: versionId, documentId: docId, content: cached.content } as DocumentVersion;
    }
    const res = await api.get(`/documents/${docId}/versions/${versionId}`);
    versionCache.set(cacheKey, { content: res.data.content, timestamp: now });
    return res.data;
  },

  fetchAnnotations: async (docId) => {
    const res = await api.get(`/documents/${docId}/annotations`);
    const data = Array.isArray(res.data) ? res.data : [];
    const mapped = data.map(mapAnnotation);
    set({ annotations: mapped });
  },

  addAnnotation: async (docId, paragraphIndex, content, parentId) => {
    const res = await api.post(`/documents/${docId}/annotations`, {
      paragraphIndex,
      content,
      parentId: parentId || null,
    });
    set((s) => ({ annotations: [...s.annotations, mapAnnotation(res.data)] }));
    get().addToast('批注添加成功', 'success');
  },

  updateAnnotation: async (id, data) => {
    const res = await api.put(`/annotations/${id}`, data);
    const updated = mapAnnotation(res.data);
    set((s) => ({
      annotations: s.annotations.map((a) => {
        if (a.id === id) return { ...a, ...updated };
        if (a.replies) {
          return { ...a, replies: a.replies.map((r) => (r.id === id ? { ...r, ...updated } : r)) };
        }
        return a;
      }),
    }));
  },

  deleteAnnotation: async (id) => {
    await api.delete(`/annotations/${id}`);
    set((s) => ({
      annotations: s.annotations
        .filter((a) => a.id !== id)
        .map((a) => ({
          ...a,
          replies: a.replies?.filter((r) => r.id !== id) || [],
        })),
    }));
    get().addToast('批注已删除', 'success');
  },

  replyToAnnotation: async (id, content) => {
    const res = await api.post(`/annotations/${id}/reply`, { content });
    const reply = mapAnnotation(res.data);
    set((s) => ({
      annotations: s.annotations.map((a) => {
        if (a.id === id) return { ...a, replies: [...(a.replies || []), reply] };
        return a;
      }),
    }));
    get().addToast('回复成功', 'success');
  },

  search: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: query });
      return;
    }
    set({ searchQuery: query });

    const now = Date.now();
    const cached = searchCache.get(query);
    if (cached && now - cached.timestamp < SEARCH_CACHE_TTL) {
      set({ searchResults: cached.results });
      return;
    }

    try {
      const res = await api.get('/search', { params: { q: query } });
      const data = Array.isArray(res.data) ? res.data : [];
      searchCache.set(query, { results: data, timestamp: now });
      set({ searchResults: data });
    } catch {
      set({ searchResults: [] });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchResults: [], searchQuery: '' }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setVersionPanelOpen: (open) => set({ versionPanelOpen: open }),

  addToast: (message, type = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      }));
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 300);
    }, 3000);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
