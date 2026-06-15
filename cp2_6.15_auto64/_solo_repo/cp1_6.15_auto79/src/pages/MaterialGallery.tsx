import { useState, useEffect, useCallback, useRef } from 'react';
import { dataService, Material } from '../services/DataService';

interface MaterialGalleryProps {
  onNavigateEditor: () => void;
}

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  tags: string[];
  name: string;
  category: string;
}

const CATEGORIES_ALL = ['全部', '手绘', '复古', '和风', '简约', '节日'];

export default function MaterialGallery({ onNavigateEditor }: MaterialGalleryProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [presetTags, setPresetTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [animKey, setAnimKey] = useState(0);
  const [heartAnimIds, setHeartAnimIds] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState(4);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateColumns = () => {
      const w = window.innerWidth;
      if (w < 768) setColumns(2);
      else if (w < 1024) setColumns(3);
      else setColumns(4);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  useEffect(() => {
    dataService.fetchCategories().then(setCategories).catch(console.error);
    dataService.fetchTags().then(setPresetTags).catch(console.error);
    setFavorites(new Set(dataService.getFavorites()));
  }, []);

  const loadMaterials = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const actualCategory = category === '全部' ? undefined : category;
      const actualSearch = search || undefined;
      const result = await dataService.fetchMaterials(
        actualCategory,
        actualSearch,
        currentPage,
        6
      );
      if (reset) {
        setMaterials(result.data);
        setPage(2);
      } else {
        setMaterials(prev => [...prev, ...result.data]);
        setPage(prev => prev + 1);
      }
      setHasMore(result.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [category, search, page, loading]);

  useEffect(() => {
    setMaterials([]);
    setPage(1);
    setHasMore(true);
    setAnimKey(prev => prev + 1);
    loadMaterials(true);
  }, [category, search]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMaterials();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMaterials]);

  const handleToggleFavorite = (id: string) => {
    const isFav = dataService.toggleFavorite(id);
    setFavorites(new Set(dataService.getFavorites()));
    if (isFav) {
      setHeartAnimIds(prev => new Set(prev).add(id));
      setTimeout(() => {
        setHeartAnimIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newItems: UploadItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
      tags: [],
      name: file.name.replace(/\.[^.]+$/, ''),
      category: categories[0] || '手绘'
    }));
    setUploadItems(prev => [...prev, ...newItems]);
  };

  const handleRemoveUploadItem = (id: string) => {
    setUploadItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleToggleTag = (itemId: string, tag: string) => {
    setUploadItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const hasTag = item.tags.includes(tag);
      return {
        ...item,
        tags: hasTag ? item.tags.filter(t => t !== tag) : [...item.tags, tag]
      };
    }));
  };

  const handleAddCustomTag = (itemId: string, tag: string) => {
    if (!tag.trim()) return;
    setUploadItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      if (item.tags.includes(tag)) return item;
      return { ...item, tags: [...item.tags, tag] };
    }));
  };

  const handleCategoryChange = (itemId: string, cat: string) => {
    setUploadItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, category: cat } : item
    ));
  };

  const handleSubmitUpload = async () => {
    const validItems = uploadItems.filter(i => i.tags.length > 0);
    for (const item of validItems) {
      if (item.status === 'done') continue;
      setUploadItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i
      ));
      await new Promise<void>((resolve) => {
        let p = 0;
        const interval = setInterval(() => {
          p += 10;
          setUploadItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, progress: Math.min(p, 100) } : i
          ));
          if (p >= 100) {
            clearInterval(interval);
            resolve();
          }
        }, 80);
      });
      try {
        await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(item.file);
        }).then(async (base64) => {
          await dataService.uploadMaterial(
            base64,
            item.name,
            item.category,
            item.tags
          );
        });
        setUploadItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'done' } : i
        ));
      } catch (e) {
        setUploadItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'error' } : i
        ));
      }
    }
    setTimeout(() => {
      setUploadItems([]);
      setShowUpload(false);
      setMaterials([]);
      setPage(1);
      setHasMore(true);
      loadMaterials(true);
    }, 1000);
  };

  const displayedMaterials = showFavorites
    ? materials.filter(m => favorites.has(m.id))
    : materials;

  const waterfalls: Material[][] = Array.from({ length: columns }, () => []);
  const heights: number[] = Array(columns).fill(0);
  displayedMaterials.forEach(mat => {
    const shortestCol = heights.indexOf(Math.min(...heights));
    waterfalls[shortestCol].push(mat);
    heights[shortestCol] += (mat.height / mat.width) * 200 + 60;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#F5F0EB',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid #E0D8C8',
        boxShadow: '0 2px 6px #E0D8C8'
      }}>
        <h1 style={{
          fontSize: 22, color: '#8B7355', fontWeight: 700,
          marginRight: 8, whiteSpace: 'nowrap',
          fontFamily: 'Georgia, serif', fontStyle: 'italic'
        }}>✿ 手帐素材</h1>

        <div style={{
          flex: 1, maxWidth: 400, position: 'relative',
          display: 'flex', alignItems: 'center',
          background: '#FFF8F0',
          borderRadius: 8,
          padding: '0 12px',
          boxShadow: '0 2px 6px #E0D8C8',
          border: '1px solid #E0D8C8'
        }}>
          <span style={{ color: '#8B7355', marginRight: 8 }}>🔍</span>
          <input
            type="text"
            placeholder="搜索素材名称或标签..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', padding: '10px 0',
              fontSize: 14, color: '#4A3F35'
            }}
          />
        </div>

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: 8,
            border: '1px solid #E0D8C8',
            background: '#FFF8F0', color: '#4A3F35',
            fontSize: 14, cursor: 'pointer', outline: 'none',
            boxShadow: '0 2px 6px #E0D8C8'
          }}
        >
          {CATEGORIES_ALL.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          onClick={() => setShowFavorites(!showFavorites)}
          title={showFavorites ? '显示全部' : '显示收藏'}
          style={{
            padding: '10px 14px', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            background: showFavorites ? '#C19A6B' : '#D4A574',
            color: '#FFF8F0', fontSize: 14, fontWeight: 600,
            boxShadow: '0 2px 6px #E0D8C8',
            transition: 'all 0.2s'
          }}
          onMouseDown={e => e.currentTarget.style.boxShadow = '0 4px 8px #C19A6B'}
          onMouseUp={e => e.currentTarget.style.boxShadow = '0 2px 6px #E0D8C8'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 6px #E0D8C8'}
        >
          {showFavorites ? '★ 已收藏' : '☆ 收藏'}
        </button>

        <button
          onClick={() => setShowUpload(true)}
          title="上传素材"
          style={{
            width: 40, height: 40, borderRadius: 8,
            border: 'none', cursor: 'pointer',
            background: '#D4A574', color: '#FFF8F0',
            fontSize: 22, fontWeight: 700,
            boxShadow: '0 2px 6px #E0D8C8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#C19A6B'}
          onMouseLeave={e => e.currentTarget.style.background = '#D4A574'}
          onMouseDown={e => e.currentTarget.style.background = '#A07D56'}
          onMouseUp={e => e.currentTarget.style.background = '#C19A6B'}
        >+</button>

        <button
          onClick={onNavigateEditor}
          style={{
            padding: '10px 18px', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            background: '#8B7355', color: '#FFF8F0',
            fontSize: 14, fontWeight: 600,
            boxShadow: '0 2px 6px #E0D8C8',
            whiteSpace: 'nowrap', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#7A6449'}
          onMouseLeave={e => e.currentTarget.style.background = '#8B7355'}
        >
          拼贴编辑 →
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{
          width: sidebarOpen ? 260 : 0,
          flexShrink: 0,
          background: '#FFF8F0',
          borderRight: '1px solid #E0D8C8',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{
            padding: 16,
            borderBottom: '1px solid #E0D8C8',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <h3 style={{ color: '#8B7355', fontSize: 16 }}>我的收藏</h3>
            <span style={{
              fontSize: 12, color: '#8B7355',
              background: '#F0EDE8', padding: '2px 8px', borderRadius: 10
            }}>{favorites.size}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {favorites.size === 0 ? (
              <div style={{
                textAlign: 'center', color: '#8B7355',
                padding: '40px 20px', fontSize: 13, opacity: 0.6
              }}>
                还没有收藏的素材<br />点击卡片上的♥收藏吧
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {materials.filter(m => favorites.has(m.id)).map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 8, borderRadius: 8,
                    background: '#F5F0EB', cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EDE4DA'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F5F0EB'}
                  >
                    <img src={m.thumbnail} alt={m.name} style={{
                      width: 44, height: 44, borderRadius: 6,
                      objectFit: 'cover', flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, color: '#4A3F35',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>{m.name}</div>
                      <div style={{
                        fontSize: 11, color: '#8B7355', marginTop: 2
                      }}>{m.category}</div>
                    </div>
                    <span
                      onClick={e => { e.stopPropagation(); handleToggleFavorite(m.id); }}
                      style={{ color: '#D4A574', cursor: 'pointer', fontSize: 16 }}
                    >♥</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main style={{
          flex: 1, overflowY: 'auto', padding: 24,
          animation: 'fadeIn 0.3s ease'
        }}>
          {displayedMaterials.length === 0 && !loading ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              color: '#8B7355', fontSize: 16
            }}>
              {showFavorites ? '还没有收藏的素材' : '暂无匹配的素材'}
            </div>
          ) : (
            <div key={animKey} style={{
              display: 'flex', gap: 16, alignItems: 'flex-start'
            }}>
              {waterfalls.map((col, colIdx) => (
                <div key={colIdx} style={{
                  flex: 1, display: 'flex',
                  flexDirection: 'column', gap: 16
                }}>
                  {col.map((mat, idx) => {
                    const staggerDelay = (colIdx + idx * columns) * 0.05;
                    return (
                      <div
                        key={mat.id}
                        style={{
                          background: '#FFF8F0',
                          borderRadius: 8,
                          boxShadow: '0 4px 6px #E0D8C8',
                          overflow: 'hidden',
                          position: 'relative',
                          cursor: 'pointer',
                          animation: `staggerFadeIn 0.3s ease ${staggerDelay}s both`,
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 16px #D4C8B8';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 6px #E0D8C8';
                        }}
                      >
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          paddingBottom: `${(mat.height / mat.width) * 100}%`,
                          background: '#F0EDE8',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center',
                            color: '#D4A574', fontSize: 28,
                            fontStyle: 'italic', fontFamily: 'Georgia, serif',
                            animation: 'spin 3s linear infinite'
                          }}>✿</div>
                          <img
                            src={mat.thumbnail}
                            alt={mat.name}
                            loading="lazy"
                            style={{
                              position: 'absolute', inset: 0,
                              width: '100%', height: '100%',
                              objectFit: 'cover',
                              animation: 'fadeIn 0.3s ease'
                            }}
                          />
                          {heartAnimIds.has(mat.id) && (
                            <div style={{
                              position: 'absolute', left: 10, bottom: 10,
                              color: '#E57373', fontSize: 24,
                              animation: 'heartPop 0.2s ease forwards'
                            }}>♥</div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleToggleFavorite(mat.id); }}
                            style={{
                              position: 'absolute', left: 10, bottom: 10,
                              background: 'rgba(255,248,240,0.9)',
                              border: 'none', borderRadius: '50%',
                              width: 32, height: 32,
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer', fontSize: 16,
                              color: favorites.has(mat.id) ? '#E57373' : '#D4A574',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              opacity: heartAnimIds.has(mat.id) ? 0 : 1
                            }}
                          >
                            {favorites.has(mat.id) ? '♥' : '♡'}
                          </button>
                        </div>
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{
                            fontSize: 13, color: '#4A3F35',
                            fontWeight: 500, marginBottom: 4,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{mat.name}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {mat.tags.slice(0, 3).map(t => (
                              <span key={t} style={{
                                fontSize: 10, padding: '2px 6px',
                                borderRadius: 4, background: '#F0EDE8',
                                color: '#8B7355'
                              }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          <div ref={sentinelRef} style={{ height: 40 }} />
          {loading && (
            <div style={{
              textAlign: 'center', padding: 20,
              color: '#8B7355'
            }}>
              <span style={{
                display: 'inline-block',
                animation: 'spin 1s linear infinite',
                fontSize: 20, marginRight: 8
              }}>✿</span>
              加载中...
            </div>
          )}
        </main>
      </div>

      {showUpload && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(74, 63, 53, 0.5)',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 60
        }}>
          <div
            ref={uploadPanelRef}
            style={{
              width: '90%', maxWidth: 720,
              maxHeight: '80vh',
              background: '#FFF8F0', borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              animation: 'slideDown 0.3s ease',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E0D8C8',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ color: '#8B7355', fontSize: 18 }}>上传素材</h2>
              <button
                onClick={() => { setShowUpload(false); setUploadItems([]); }}
                style={{
                  border: 'none', background: 'transparent',
                  cursor: 'pointer', fontSize: 22,
                  color: '#8B7355'
                }}
              >×</button>
            </div>

            <div style={{
              flex: 1, overflowY: 'auto', padding: 20
            }}>
              {uploadItems.length === 0 ? (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    handleFileSelect(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #D4A574',
                    borderRadius: 12,
                    padding: '60px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#F5F0EB',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EDE4DA'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F5F0EB'}
                >
                  <div style={{
                    fontSize: 48, marginBottom: 12,
                    color: '#D4A574', fontStyle: 'italic',
                    fontFamily: 'Georgia, serif'
                  }}>✿</div>
                  <div style={{ color: '#8B7355', fontSize: 16, fontWeight: 500 }}>
                    点击或拖拽图片到这里上传
                  </div>
                  <div style={{ color: '#8B7355', fontSize: 12, marginTop: 8, opacity: 0.7 }}>
                    支持 JPG、PNG、SVG 格式
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={e => handleFileSelect(e.target.files)}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {uploadItems.map(item => (
                    <div key={item.id} style={{
                      background: '#F5F0EB',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      gap: 12
                    }}>
                      <div style={{
                        width: 80, height: 80, flexShrink: 0,
                        borderRadius: 6, overflow: 'hidden',
                        background: '#F0EDE8', position: 'relative'
                      }}>
                        <img src={item.preview} alt="" style={{
                          width: '100%', height: '100%',
                          objectFit: 'cover'
                        }} />
                        {item.status === 'uploading' && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(255,248,240,0.9)',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              width: 40, height: 40,
                              borderRadius: '50%',
                              background: `conic-gradient(#D4A574 ${item.progress}%, #E0D8C8 ${item.progress}%)`,
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <div style={{
                                width: 28, height: 28,
                                borderRadius: '50%',
                                background: '#FFF8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10, color: '#8B7355',
                                fontWeight: 600
                              }}>
                                {item.progress}%
                              </div>
                            </div>
                          </div>
                        )}
                        {item.status === 'done' && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(212,165,116,0.9)',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFF8F0', fontSize: 24
                          }}>✓</div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          gap: 8, marginBottom: 8
                        }}>
                          <input
                            value={item.name}
                            onChange={e => setUploadItems(prev =>
                              prev.map(i => i.id === item.id
                                ? { ...i, name: e.target.value }
                                : i
                              )
                            )}
                            style={{
                              flex: 1, padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid #E0D8C8',
                              background: '#FFF8F0',
                              outline: 'none', fontSize: 13,
                              color: '#4A3F35'
                            }}
                          />
                          <select
                            value={item.category}
                            onChange={e => handleCategoryChange(item.id, e.target.value)}
                            style={{
                              padding: '6px 10px', borderRadius: 6,
                              border: '1px solid #E0D8C8',
                              background: '#FFF8F0',
                              outline: 'none', fontSize: 13,
                              color: '#4A3F35'
                            }}
                          >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button
                            onClick={() => handleRemoveUploadItem(item.id)}
                            style={{
                              border: 'none', background: 'transparent',
                              cursor: 'pointer', fontSize: 18,
                              color: '#8B7355', padding: 4
                            }}
                          >×</button>
                        </div>

                        <div style={{
                          display: 'flex', flexWrap: 'wrap',
                          gap: 6, marginBottom: 8
                        }}>
                          {presetTags.slice(0, 15).map(tag => (
                            <button
                              key={tag}
                              onClick={() => handleToggleTag(item.id, tag)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 12,
                                border: item.tags.includes(tag)
                                  ? '1px solid #D4A574'
                                  : '1px solid #E0D8C8',
                                background: item.tags.includes(tag)
                                  ? '#D4A574'
                                  : '#FFF8F0',
                                color: item.tags.includes(tag)
                                  ? '#FFF8F0'
                                  : '#8B7355',
                                fontSize: 12, cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >{tag}</button>
                          ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            placeholder="自定义标签，回车添加..."
                            style={{
                              flex: 1, padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid #E0D8C8',
                              background: '#FFF8F0',
                              outline: 'none', fontSize: 12,
                              color: '#4A3F35'
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleAddCustomTag(item.id, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                        </div>
                        {item.tags.length > 0 && (
                          <div style={{
                            display: 'flex', flexWrap: 'wrap',
                            gap: 4, marginTop: 8
                          }}>
                            {item.tags.map(t => (
                              <span key={t} style={{
                                display: 'inline-flex',
                                alignItems: 'center', gap: 4,
                                padding: '2px 8px',
                                borderRadius: 10,
                                background: '#D4A574',
                                color: '#FFF8F0',
                                fontSize: 11
                              }}>
                                {t}
                                <span
                                  onClick={() => handleToggleTag(item.id, t)}
                                  style={{ cursor: 'pointer' }}
                                >×</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {item.tags.length === 0 && (
                          <div style={{
                            fontSize: 11, color: '#E57373',
                            marginTop: 6
                          }}>至少选择1个标签</div>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '10px', borderRadius: 8,
                      border: '1px dashed #D4A574',
                      background: 'transparent',
                      color: '#8B7355', cursor: 'pointer',
                      fontSize: 13
                    }}
                  >
                    + 添加更多图片
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={e => handleFileSelect(e.target.files)}
                  />
                </div>
              )}
            </div>

            {uploadItems.length > 0 && (
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid #E0D8C8',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12
              }}>
                <button
                  onClick={() => { setShowUpload(false); setUploadItems([]); }}
                  style={{
                    padding: '8px 20px', borderRadius: 8,
                    border: '1px solid #E0D8C8',
                    background: '#FFF8F0', color: '#8B7355',
                    cursor: 'pointer', fontSize: 14
                  }}
                >取消</button>
                <button
                  onClick={handleSubmitUpload}
                  disabled={uploadItems.some(i => i.tags.length === 0) || uploadItems.every(i => i.status === 'done')}
                  style={{
                    padding: '8px 20px', borderRadius: 8,
                    border: 'none',
                    background: uploadItems.some(i => i.tags.length === 0) || uploadItems.every(i => i.status === 'done')
                      ? '#C8B6A6'
                      : '#D4A574',
                    color: '#FFF8F0', cursor: uploadItems.some(i => i.tags.length === 0) || uploadItems.every(i => i.status === 'done')
                      ? 'not-allowed'
                      : 'pointer',
                    fontSize: 14, fontWeight: 600,
                    boxShadow: '0 2px 6px #E0D8C8'
                  }}
                >
                  {uploadItems.every(i => i.status === 'done') ? '上传完成' : '提交上传'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
