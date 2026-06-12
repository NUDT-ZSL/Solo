import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  X,
} from 'lucide-react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const navigate = useNavigate();
  const { kbId } = useParams();
  const knowledgeBases = useKnowledgeStore((s) => s.knowledgeBases);
  const categories = useKnowledgeStore((s) => s.categories);
  const documents = useKnowledgeStore((s) => s.documents);
  const sidebarCollapsed = useKnowledgeStore((s) => s.sidebarCollapsed);
  const expandedCategories = useKnowledgeStore((s) => s.expandedCategories);
  const toggleSidebar = useKnowledgeStore((s) => s.toggleSidebar);
  const toggleCategory = useKnowledgeStore((s) => s.toggleCategory);
  const fetchDocuments = useKnowledgeStore((s) => s.fetchDocuments);
  const setCurrentKB = useKnowledgeStore((s) => s.setCurrentKB);

  const handleKBClick = (kb: typeof knowledgeBases[0]) => {
    setCurrentKB(kb);
    navigate(`/kb/${kb.id}`);
  };

  const handleCategoryToggle = (catId: string) => {
    const isExpanded = expandedCategories.has(catId);
    toggleCategory(catId);
    if (!isExpanded) {
      fetchDocuments(catId);
    }
  };

  const catDocs = (catId: string) => documents.filter((d) => d.categoryId === catId);
  const kbCategories = kbId
    ? categories.filter((c) => c.knowledgeBaseId === kbId).sort((a, b) => a.order - b.order)
    : [];

  return (
    <>
      {sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'h-full bg-white border-r border-slate-200 flex flex-col shrink-0 z-40',
          'transition-all duration-300 ease-in-out overflow-hidden',
          sidebarCollapsed ? 'w-0' : 'w-60'
        )}
      >
        <div className="w-60 min-w-[240px] h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-text">知识库</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-1 rounded hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-2 mb-1">
              <p className="px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                全部知识库
              </p>
            </div>
            {knowledgeBases.map((kb) => (
              <div key={kb.id}>
                <button
                  onClick={() => handleKBClick(kb)}
                  className={cn(
                    'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors text-left',
                    kb.id === kbId
                      ? 'bg-blue-50 text-primary border-l-2 border-l-primary'
                      : 'text-text hover:bg-slate-50 border-l-2 border-l-transparent'
                  )}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="truncate">{kb.name}</span>
                </button>

                {kb.id === kbId && kbCategories.length > 0 && (
                  <div className="ml-2">
                    {kbCategories.map((cat) => {
                      const isExpanded = expandedCategories.has(cat.id);
                      const docs = catDocs(cat.id);
                      return (
                        <div key={cat.id}>
                          <button
                            onClick={() => handleCategoryToggle(cat.id)}
                            className={cn(
                              'w-full flex items-center gap-1.5 px-4 py-1.5 text-sm transition-colors text-left',
                              'text-text hover:bg-slate-50 border-l-2 border-l-transparent'
                            )}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            )}
                            <span className="truncate">{cat.name}</span>
                          </button>

                          <div
                            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                            style={{ maxHeight: isExpanded ? `${Math.max(docs.length * 36, 36) + 4}px` : '0px' }}
                          >
                            {docs.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => navigate(`/doc/${doc.id}`)}
                                className="w-full flex items-center gap-1.5 pl-9 pr-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors text-left border-l-2 border-l-transparent"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{doc.title}</span>
                              </button>
                            ))}
                            {docs.length === 0 && isExpanded && (
                              <p className="pl-9 pr-4 py-1.5 text-xs text-slate-400">
                                暂无文档
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {knowledgeBases.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                暂无知识库
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-primary hover:bg-blue-50 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建知识库
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
