import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import type { Material, Pattern, ProduceResult } from './types';
import { filterMaterials, filterPatterns } from './logic/inventoryLogic';
import { MaterialList } from './components/MaterialList';
import { PatternList } from './components/PatternList';
import { AddMaterialForm } from './components/AddMaterialForm';
import { PatternDetailModal } from './components/PatternDetailModal';
import { SearchFilter, materialColorOptions, patternTypeOptions } from './components/SearchFilter';
import './App.css';

function App() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [materialSearch, setMaterialSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [patternSearch, setPatternSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [missingMaterialIds, setMissingMaterialIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [materialsRes, patternsRes] = await Promise.all([
        axios.get<Material[]>('/api/materials'),
        axios.get<Pattern[]>('/api/patterns'),
      ]);
      setMaterials(materialsRes.data);
      setPatterns(patternsRes.data);
      setError('');
    } catch (err) {
      setError('加载数据失败，请确保后端服务已启动');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = useMemo(
    () => filterMaterials(materials, materialSearch, colorFilter),
    [materials, materialSearch, colorFilter]
  );

  const filteredPatterns = useMemo(
    () => filterPatterns(patterns, patternSearch, typeFilter),
    [patterns, patternSearch, typeFilter]
  );

  const handleAddMaterial = async (materialData: Omit<Material, 'id'>) => {
    try {
      const response = await axios.post<Material>('/api/materials', materialData);
      setMaterials((prev) => [...prev, response.data]);
    } catch (err) {
      setError('添加材料失败');
      console.error(err);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await axios.delete(`/api/materials/${id}`);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError('删除材料失败');
      console.error(err);
    }
  };

  const handleProduce = async (patternId: string): Promise<{ result: ProduceResult; updatedMaterials: Material[] }> => {
    try {
      const response = await axios.post(`/api/patterns/${patternId}/produce`);
      const { result, updatedMaterials } = response.data;
      setMaterials(updatedMaterials);
      
      if (!result.success) {
        setMissingMaterialIds(result.missingMaterials);
        setTimeout(() => setMissingMaterialIds([]), 3000);
      }
      
      return { result, updatedMaterials };
    } catch (err: any) {
      if (err.response?.data) {
        const result = err.response.data as ProduceResult;
        setMissingMaterialIds(result.missingMaterials);
        setTimeout(() => setMissingMaterialIds([]), 3000);
        return { result, updatedMaterials: materials };
      }
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>手作工坊管理系统</h1>
        <p className="subtitle">材料库存 · 图纸管理 · 成本核算</p>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <main className="main-content">
        <section className="materials-section">
          <div className="section-header">
            <h2>材料库存</h2>
            <button
              className="btn btn-primary add-btn"
              onClick={() => setShowAddMaterial(true)}
            >
              + 添加材料
            </button>
          </div>
          
          <SearchFilter
            searchPlaceholder="搜索材料名称..."
            searchValue={materialSearch}
            onSearchChange={setMaterialSearch}
            filterOptions={materialColorOptions}
            filterValue={colorFilter}
            onFilterChange={setColorFilter}
            filterLabel="颜色"
          />

          <MaterialList
            materials={filteredMaterials}
            missingMaterialIds={missingMaterialIds}
            onDelete={handleDeleteMaterial}
          />
        </section>

        <section className="patterns-section">
          <div className="section-header">
            <h2>成品图纸</h2>
          </div>

          <SearchFilter
            searchPlaceholder="搜索图纸名称..."
            searchValue={patternSearch}
            onSearchChange={setPatternSearch}
            filterOptions={patternTypeOptions}
            filterValue={typeFilter}
            onFilterChange={setTypeFilter}
            filterLabel="类型"
          />

          <PatternList
            patterns={filteredPatterns}
            onSelect={setSelectedPattern}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>© 2024 手作工坊管理系统 | 共 {materials.length} 种材料 · {patterns.length} 份图纸</p>
      </footer>

      {showAddMaterial && (
        <AddMaterialForm
          onAdd={handleAddMaterial}
          onClose={() => setShowAddMaterial(false)}
          materials={materials}
        />
      )}

      {selectedPattern && (
        <PatternDetailModal
          pattern={selectedPattern}
          materials={materials}
          onClose={() => setSelectedPattern(null)}
          onProduce={handleProduce}
        />
      )}
    </div>
  );
}

export default App;
