import { useState } from 'react';
import CharacterPreview from './CharacterPreview';
import { SavedOutfit } from '../types';

interface CompareModeProps {
  isOpen: boolean;
  onClose: () => void;
  savedOutfits: SavedOutfit[];
}

export default function CompareMode({ isOpen, onClose, savedOutfits }: CompareModeProps) {
  const [selected1, setSelected1] = useState<string | null>(null);
  const [selected2, setSelected2] = useState<string | null>(null);

  if (!isOpen) return null;

  const outfit1 = savedOutfits.find(o => o.id === selected1);
  const outfit2 = savedOutfits.find(o => o.id === selected2);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content compare-modal" onClick={e => e.stopPropagation()}>
        <h3>搭配方案对比</h3>

        <div className="compare-selectors">
          <div className="compare-selector">
            <label>方案 A：</label>
            <select value={selected1 || ''} onChange={e => setSelected1(e.target.value || null)}>
              <option value="">请选择...</option>
              {savedOutfits.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="compare-selector">
            <label>方案 B：</label>
            <select value={selected2 || ''} onChange={e => setSelected2(e.target.value || null)}>
              <option value="">请选择...</option>
              {savedOutfits.filter(o => o.id !== selected1).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>

        {savedOutfits.length < 2 && (
          <p className="warning-message">请至少保存2个方案才能进行对比</p>
        )}

        <div className="compare-canvases">
          <div className="compare-slot">
            {outfit1 ? (
              <>
                <CharacterPreview outfit={outfit1.outfit} width={280} height={420} />
                <div className="compare-info">
                  <h4>{outfit1.name}</h4>
                  <p>{outfit1.description}</p>
                </div>
              </>
            ) : (
              <div className="empty-slot">请选择方案 A</div>
            )}
          </div>

          <div className="vs-divider">VS</div>

          <div className="compare-slot">
            {outfit2 ? (
              <>
                <CharacterPreview outfit={outfit2.outfit} width={280} height={420} />
                <div className="compare-info">
                  <h4>{outfit2.name}</h4>
                  <p>{outfit2.description}</p>
                </div>
              </>
            ) : (
              <div className="empty-slot">请选择方案 B</div>
            )}
          </div>
        </div>

        <button className="close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
