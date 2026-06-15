import { useState, useEffect, useCallback } from 'react';
import CharacterPreview from './components/CharacterPreview';
import DescriptionPanel from './components/DescriptionPanel';
import AccessoryGrid from './components/AccessoryGrid';
import SaveDialog from './components/SaveDialog';
import LoadDialog from './components/LoadDialog';
import CompareMode from './components/CompareMode';
import { OutfitState, PartType, SavedOutfit, ParseResult } from './types';
import {
  DEFAULT_OUTFIT, HAIR_PARTS, TOP_PARTS, BOTTOM_PARTS, SHOES_PARTS, ACCESSORY_PARTS, COLORS,
} from './data';
import { outfitToDescription } from './utils/parser';

const TABS: { type: PartType; label: string }[] = [
  { type: 'hair', label: '发型' },
  { type: 'top', label: '上衣' },
  { type: 'bottom', label: '下装' },
  { type: 'shoes', label: '鞋子' },
  { type: 'accessory', label: '配饰' },
];

export default function App() {
  const [outfit, setOutfit] = useState<OutfitState>(DEFAULT_OUTFIT);
  const [description, setDescription] = useState<string>('');
  const [activeTab, setActiveTab] = useState<PartType>('hair');
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showCompareMode, setShowCompareMode] = useState(false);
  const [lastOutfit, setLastOutfit] = useState<OutfitState | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    const stored = localStorage.getItem('savedOutfits');
    if (stored) {
      try {
        setSavedOutfits(JSON.parse(stored));
      } catch {
        setSavedOutfits([]);
      }
    }
    const elapsed = performance.now() - startTime;
    if (elapsed > 5) {
      console.warn(`localStorage read took ${elapsed.toFixed(1)}ms, target < 5ms`);
    }
  }, []);

  const outfitsEqual = useCallback((a: OutfitState, b: OutfitState): boolean => {
    return JSON.stringify(a) === JSON.stringify(b);
  }, []);

  const generateRandomOutfit = useCallback((): OutfitState => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    return {
      bodyType: 'normal',
      hair: { partId: pick(HAIR_PARTS).id, colorId: pick(COLORS).id },
      top: { partId: pick(TOP_PARTS).id, colorId: pick(COLORS).id },
      bottom: { partId: pick(BOTTOM_PARTS).id, colorId: pick(COLORS).id },
      shoes: { partId: pick(SHOES_PARTS).id, colorId: pick(COLORS).id },
      accessory: { partId: pick(ACCESSORY_PARTS).id, colorId: pick(COLORS).id },
    };
  }, []);

  const handleRandomize = useCallback(() => {
    let newOutfit = generateRandomOutfit();
    let attempts = 0;
    while (lastOutfit && outfitsEqual(newOutfit, lastOutfit) && attempts < 10) {
      newOutfit = generateRandomOutfit();
      attempts++;
    }
    setLastOutfit(outfit);
    setOutfit(newOutfit);
    setDescription('');
  }, [generateRandomOutfit, lastOutfit, outfit, outfitsEqual]);

  const handlePartChange = useCallback((type: PartType, partId: string) => {
    setOutfit(prev => ({
      ...prev,
      [type]: { ...prev[type], partId },
    }));
  }, []);

  const handleColorChange = useCallback((type: PartType, colorId: string) => {
    setOutfit(prev => ({
      ...prev,
      [type]: { ...prev[type], colorId },
    }));
  }, []);

  const handleParse = useCallback((result: ParseResult) => {
    if (result.success) {
      setOutfit(prev => ({
        ...prev,
        ...result.partialUpdates,
      }));
    }
  }, []);

  const handleSave = useCallback((name: string) => {
    const startTime = performance.now();
    const newOutfit: SavedOutfit = {
      id: Date.now().toString(),
      name,
      description: outfitToDescription(outfit),
      outfit,
      timestamp: Date.now(),
    };
    const updated = [...savedOutfits, newOutfit].slice(-10);
    setSavedOutfits(updated);
    localStorage.setItem('savedOutfits', JSON.stringify(updated));
    const elapsed = performance.now() - startTime;
    if (elapsed > 5) {
      console.warn(`localStorage write took ${elapsed.toFixed(1)}ms, target < 5ms`);
    }
  }, [outfit, savedOutfits]);

  const handleLoad = useCallback((saved: SavedOutfit) => {
    setOutfit(saved.outfit);
    setDescription(saved.description);
    setShowLoadDialog(false);
  }, []);

  const currentTabState = outfit[activeTab];

  return (
    <div className="app">
      <header className="app-header">
        <h1>角色装扮搭配游戏</h1>
      </header>

      <main className="app-main">
        <section className="preview-section">
          <CharacterPreview outfit={outfit} />
        </section>

        <section className="control-section">
          <div className="description-area">
            <DescriptionPanel
              description={description}
              onDescriptionChange={setDescription}
              onParse={handleParse}
              outfit={outfit}
            />
          </div>

          <div className="parts-area">
            <div className="tabs">
              {TABS.map(tab => (
                <button
                  key={tab.type}
                  className={`tab ${activeTab === tab.type ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.type)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="tab-content">
              <AccessoryGrid
                type={activeTab}
                selectedPartId={currentTabState.partId}
                selectedColorId={currentTabState.colorId}
                onPartSelect={(partId) => handlePartChange(activeTab, partId)}
                onColorSelect={(colorId) => handleColorChange(activeTab, colorId)}
              />
            </div>
          </div>

          <div className="actions-area">
            <button className="action-btn random-btn" onClick={handleRandomize}>
              随机搭配
            </button>
            <button className="action-btn save-btn" onClick={() => setShowSaveDialog(true)}>
              保存方案
            </button>
            <button className="action-btn load-btn" onClick={() => setShowLoadDialog(true)}>
              加载方案
            </button>
            <button className="action-btn compare-btn" onClick={() => setShowCompareMode(true)}>
              对比模式
            </button>
          </div>
        </section>
      </main>

      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSave}
        savedOutfits={savedOutfits}
      />

      <LoadDialog
        isOpen={showLoadDialog}
        onClose={() => setShowLoadDialog(false)}
        savedOutfits={savedOutfits}
        onLoad={handleLoad}
      />

      <CompareMode
        isOpen={showCompareMode}
        onClose={() => setShowCompareMode(false)}
        savedOutfits={savedOutfits}
      />
    </div>
  );
}
