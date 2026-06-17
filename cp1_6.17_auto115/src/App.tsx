import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Brand } from './types';
import { api, BrandsResponse } from './api';
import BrandEditor from './components/BrandEditor';
import PreviewPanel from './components/PreviewPanel';

export default function App() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const avatarCacheRef = useRef<Map<string, string>>(new Map());

  const activeBrand = useMemo(
    () => brands.find(b => b.id === activeBrandId) || null,
    [brands, activeBrandId]
  );

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    try {
      setLoading(true);
      let response: BrandsResponse;
      try {
        response = await api.getBrands();
      } catch {
        const defaultBrand = await api.ensureDefaultBrand();
        response = { brands: [defaultBrand], lastActiveBrandId: defaultBrand.id };
      }
      setBrands(response.brands);
      if (response.brands.length === 0) {
        const defaultBrand = await api.ensureDefaultBrand();
        setBrands([defaultBrand]);
        setActiveBrandId(defaultBrand.id);
      } else {
        setActiveBrandId(response.lastActiveBrandId || response.brands[0].id);
      }
    } catch (error) {
      console.error('Failed to load brands:', error);
    } finally {
      setLoading(false);
    }
  }

  const debouncedSave = useCallback(async (id: string, data: Partial<Brand>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const updated = await api.updateBrand(id, data);
        setBrands(prev => prev.map(b => (b.id === id ? updated : b)));
      } catch (error) {
        console.error('Failed to save brand:', error);
      }
    }, 150);
  }, []);

  async function handleCreateBrand() {
    try {
      const newBrand = await api.createBrand({
        name: 'New Brand',
        primaryColor: '#6366F1',
        secondaryColor: '#10B981',
        headingFont: 'Playfair Display',
        bodyFont: 'Inter',
        spacingUnit: 8
      });
      setBrands(prev => [...prev, newBrand]);
      setActiveBrandId(newBrand.id);
    } catch (error) {
      console.error('Failed to create brand:', error);
    }
  }

  function handleSelectBrand(id: string) {
    setActiveBrandId(id);
    setSidebarOpen(false);
  }

  function handleBrandUpdate(data: Partial<Brand>) {
    if (!activeBrandId) return;
    setBrands(prev => prev.map(b => (b.id === activeBrandId ? { ...b, ...data, updatedAt: Date.now() } : b)));
    debouncedSave(activeBrandId, data);
  }

  async function handleDeleteBrand(id: string) {
    if (brands.length <= 1) return;
    try {
      await api.deleteBrand(id);
      const newBrands = brands.filter(b => b.id !== id);
      setBrands(newBrands);
      if (activeBrandId === id) {
        setActiveBrandId(newBrands[newBrands.length - 1].id);
      }
      avatarCacheRef.current.delete(id);
    } catch (error) {
      console.error('Failed to delete brand:', error);
    }
  }

  async function handleExportCSS() {
    if (!activeBrand) return;
    try {
      await api.exportCSS(activeBrand.id, activeBrand.name);
    } catch (error) {
      console.error('Failed to export CSS:', error);
    }
  }

  function getAvatarDataUrl(brand: Brand): string {
    const cacheKey = `${brand.id}-${brand.name}-${brand.primaryColor}`;
    if (avatarCacheRef.current.has(cacheKey)) {
      return avatarCacheRef.current.get(cacheKey)!;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(40, 40, 0, 40, 40, 40);
    gradient.addColorStop(0, lightenColor(brand.primaryColor, 20));
    gradient.addColorStop(1, brand.primaryColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(40, 40, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = brand.name.charAt(0).toUpperCase() || '?';
    ctx.fillText(initial, 40, 42);
    const dataUrl = canvas.toDataURL();
    avatarCacheRef.current.set(cacheKey, dataUrl);
    return dataUrl;
  }

  function lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="skeleton skeleton-header" />
        <div className="loading-content">
          <div className="skeleton-sidebar" />
          <div className="skeleton-main" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="mobile-header">
        <button
          className="menu-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="mobile-title">Brand Identity Kit</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-title">品牌项目</h2>
          </div>
          <button
            className="btn-create-brand"
            onClick={handleCreateBrand}
          >
            + 新建品牌
          </button>
          <div className="brand-list">
            {brands.map(brand => (
              <div
                key={brand.id}
                className={`brand-item ${brand.id === activeBrandId ? 'active' : ''}`}
                onClick={() => handleSelectBrand(brand.id)}
              >
                <img
                  src={getAvatarDataUrl(brand)}
                  alt={brand.name}
                  className="brand-avatar"
                />
                <span className="brand-name" title={brand.name}>
                  {brand.name}
                </span>
                {brands.length > 1 && (
                  <button
                    className="brand-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBrand(brand.id);
                    }}
                    aria-label="Delete brand"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="main-content">
          <div className="editor-section">
            <BrandEditor
              brand={activeBrand}
              onUpdate={handleBrandUpdate}
              onExport={handleExportCSS}
            />
          </div>
          <div className="preview-section">
            <PreviewPanel brand={activeBrand} />
          </div>
        </main>
      </div>
    </div>
  );
}
