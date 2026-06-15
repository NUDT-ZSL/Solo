import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  BookOpen,
  FileText,
  X,
  Check,
} from 'lucide-react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { cn } from '@/lib/utils';

export default function KnowledgeBasePage() {
  const { kbId } = useParams();
  const navigate = useNavigate();

  const knowledgeBases = useKnowledgeStore((s) => s.knowledgeBases);
  const categories = useKnowledgeStore((s) => s.categories);
  const documents = useKnowledgeStore((s) => s.documents);
  const currentKB = useKnowledgeStore((s) => s.currentKB);
  const fetchKnowledgeBases = useKnowledgeStore((s) => s.fetchKnowledgeBases);
  const fetchCategories = useKnowledgeStore((s) => s.fetchCategories);
  const fetchDocuments = useKnowledgeStore((s) => s.fetchDocuments);
  const createKnowledgeBase = useKnowledgeStore((s) => s.createKnowledgeBase);
  const updateKnowledgeBase = useKnowledgeStore((s) => s.updateKnowledgeBase);
  const deleteKnowledgeBase = useKnowledgeStore((s) => s.deleteKnowledgeBase);
  const createCategory = useKnowledgeStore((s) => s.createCategory);
  const updateCategory = useKnowledgeStore((s) => s.updateCategory);
  const deleteCategory = useKnowledgeStore((s) => s.deleteCategory);
  const createDocument = useKnowledgeStore((s) => s.createDocument);
  const deleteDocument = useKnowledgeStore((s) => s.deleteDocument);
  const setCurrentKB = useKnowledgeStore((s) => s.setCurrentKB);

  const [showKBForm, setShowKBForm] = useState(false);
  const [kbForm, setKbForm] = useState({ name: '', description: '' });
  const [editingKB, setEditingKB] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: '' });
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [deletingKB, setDeletingKB] = useState<string | null>(null);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    if (kbId) {
      const kb = knowledgeBases.find((k) => k.id === kbId);
      if (kb) setCurrentKB(kb);
      fetchCategories(kbId);
    }
  }, [kbId, knowledgeBases]);

  useEffect(() => {
    if (kbId) {
      categories.forEach((cat) => {
        fetchDocuments(cat.id);
      });
    }
  }, [categories, kbId]);

  const handleCreateKB = async () => {
    if (!kbForm.name.trim()) return;
    await createKnowledgeBase(kbForm.name.trim(), kbForm.description.trim());
    setKbForm({ name: '', description: '' });
    setShowKBForm(false);
  };

  const handleUpdateKB = async (id: string) => {
    if (!kbForm.name.trim()) return;
    await updateKnowledgeBase(id, kbForm.name.trim(), kbForm.description.trim());
    setEditingKB(null);
    setKbForm({ name: '', description: '' });
  };

  const handleCreateCat = async () => {
    if (!catForm.name.trim() || !kbId) return;
    await createCategory(kbId, catForm.name.trim());
    setCatForm({ name: '' });
    setShowCatForm(false);
  };

  const handleUpdateCat = async (id: string) => {
    if (!catForm.name.trim()) return;
    await updateCategory(id, catForm.name.trim());
    setEditingCat(null);
    setCatForm({ name: '' });
  };

  const handleCreateDoc = async (catId: string) => {
    const doc = await createDocument(catId, '新建文档');
    if (doc) navigate(`/doc/${doc.id}`);
  };

  const startEditKB = (kb: typeof knowledgeBases[0]) => {
    setEditingKB(kb.id);
    setKbForm({ name: kb.name, description: kb.description });
  };

  const startEditCat = (cat: typeof categories[0]) => {
    setEditingCat(cat.id);
    setCatForm({ name: cat.name });
  };

  const kbCategories = kbId
    ? categories.filter((c) => c.knowledgeBaseId === kbId).sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {!kbId ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-text">知识库</h1>
              <button
                onClick={() => { setShowKBForm(true); setKbForm({ name: '', description: '' }); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建知识库
              </button>
            </div>

            {showKBForm && (
              <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-text">创建知识库</h3>
                  <button onClick={() => setShowKBForm(false)} className="text-slate-400 hover:text-text">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="知识库名称"
                  value={kbForm.name}
                  onChange={(e) => setKbForm({ ...kbForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm mb-2 focus:outline-none focus:border-primary"
                  autoFocus
                />
                <textarea
                  placeholder="描述（可选）"
                  value={kbForm.description}
                  onChange={(e) => setKbForm({ ...kbForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm mb-3 resize-none h-20 focus:outline-none focus:border-primary"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowKBForm(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-text">取消</button>
                  <button onClick={handleCreateKB} className="px-4 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">创建</button>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {knowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  className="group relative p-5 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/kb/${kb.id}`)}
                >
                  {editingKB === kb.id ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={kbForm.name}
                        onChange={(e) => setKbForm({ ...kbForm, name: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-sm mb-2 focus:outline-none focus:border-primary"
                        autoFocus
                      />
                      <textarea
                        value={kbForm.description}
                        onChange={(e) => setKbForm({ ...kbForm, description: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-sm mb-2 resize-none h-16 focus:outline-none focus:border-primary"
                      />
                      <div className="flex gap-1">
                        <button onClick={() => handleUpdateKB(kb.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingKB(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <BookOpen className="w-8 h-8 text-primary" />
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => startEditKB(kb)} className="p-1 text-slate-400 hover:text-primary rounded"><Pencil className="w-4 h-4" /></button>
                          {deletingKB === kb.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => { deleteKnowledgeBase(kb.id); setDeletingKB(null); }} className="p-1 text-red-500 rounded text-xs">确认</button>
                              <button onClick={() => setDeletingKB(null)} className="p-1 text-slate-400 rounded text-xs">取消</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingKB(kb.id)} className="p-1 text-slate-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                      <h3 className="text-base font-semibold text-text mb-1">{kb.name}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{kb.description || '暂无描述'}</p>
                      <p className="text-xs text-slate-400 mt-2">更新于 {new Date(kb.updatedAt).toLocaleDateString()}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-primary transition-colors">知识库</button>
                <span className="text-slate-300">/</span>
                <span className="text-sm text-text font-medium">{currentKB?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-text">{currentKB?.name}</h1>
                <button
                  onClick={() => { setShowCatForm(true); setCatForm({ name: '' }); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新建分类
                </button>
              </div>
              {currentKB?.description && (
                <p className="text-sm text-slate-500 mt-1">{currentKB.description}</p>
              )}
            </div>

            {showCatForm && (
              <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-text">创建分类</h3>
                  <button onClick={() => setShowCatForm(false)} className="text-slate-400 hover:text-text"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="分类名称"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCat()}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-primary"
                    autoFocus
                  />
                  <button onClick={handleCreateCat} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">创建</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {kbCategories.map((cat) => {
                const catDocs = documents.filter((d) => d.categoryId === cat.id);
                return (
                  <div key={cat.id} className="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-primary" />
                        {editingCat === cat.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={catForm.name}
                              onChange={(e) => setCatForm({ name: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateCat(cat.id)}
                              className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:border-primary"
                              autoFocus
                            />
                            <button onClick={() => handleUpdateCat(cat.id)} className="p-0.5 text-green-600"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingCat(null)} className="p-0.5 text-slate-400"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <h3 className="text-sm font-semibold text-text">{cat.name}</h3>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCreateDoc(cat.id)}
                          className="p-1 text-slate-400 hover:text-primary transition-colors"
                          title="新建文档"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => startEditCat(cat)} className="p-1 text-slate-400 hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                        {deletingCat === cat.id ? (
                          <div className="flex items-center gap-1 ml-1">
                            <button onClick={() => { deleteCategory(cat.id); setDeletingCat(null); }} className="text-xs text-red-500">确认</button>
                            <button onClick={() => setDeletingCat(null)} className="text-xs text-slate-400">取消</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingCat(cat.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>

                    {catDocs.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {catDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                            onClick={() => navigate(`/doc/${doc.id}`)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="text-sm text-text truncate">{doc.title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-slate-400">{new Date(doc.updatedAt).toLocaleDateString()}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                                className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 py-4 text-sm text-slate-400 text-center">
                        暂无文档，点击 + 创建
                      </div>
                    )}
                  </div>
                );
              })}

              {kbCategories.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">暂无分类，请创建分类开始管理文档</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
