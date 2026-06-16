import React, { useState, useCallback } from 'react';
import { BonsaiState, CardData, generateCardData } from '../utils/bonSaiLogic';

interface PropertyPanelProps {
  state: BonsaiState;
  onGenerateCard: () => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ state, onGenerateCard }) => {
  const cardData: CardData = generateCardData(state);
  const [previewKey, setPreviewKey] = useState(0);

  const handleRefreshPreview = useCallback(() => {
    setPreviewKey(prev => prev + 1);
  }, []);

  return (
    <div className="property-panel">
      <div className="panel-section preview-section">
        <h3 className="section-title">实时预览</h3>
        <div className="preview-container">
          <div className="preview-frame">
            <div className="preview-inner" key={previewKey}>
              <MiniPreview state={state} />
            </div>
          </div>
          <div className="preview-actions">
            <div className="preview-size">{cardData.totalSize}</div>
            <button className="refresh-preview-btn" onClick={handleRefreshPreview} title="刷新预览">
              <svg viewBox="0 0 24 24" className="refresh-icon">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor" />
              </svg>
              刷新
            </button>
          </div>
        </div>
      </div>

      <div className="panel-section info-section">
        <h3 className="section-title">搭配信息</h3>
        
        {cardData.potInfo && (
          <div className="info-item">
            <div className="info-icon pot-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 7H5L3 19h18l-2-12zM8 17l-1-5h2l.5 2.5L10.5 14l1 3H8z" />
              </svg>
            </div>
            <div className="info-content">
              <div className="info-name">{cardData.potInfo.name}</div>
              <div className="info-details">
                <span 
                  className="color-dot" 
                  style={{ backgroundColor: cardData.potInfo.colorCode }}
                />
                <span className="color-code">{cardData.potInfo.colorCode}</span>
                <span className="info-size">{cardData.potInfo.size}</span>
              </div>
            </div>
          </div>
        )}

        {cardData.plantInfo && (
          <div className="info-item">
            <div className="info-icon plant-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c-4.97 0-9-4.03-9-9 0-3.61 2.18-6.72 5.35-8.08C9.69 5.01 11 6.47 11 8.5V22h1zm0 0c4.97 0 9-4.03 9-9 0-3.61-2.18-6.72-5.35-8.08C14.31 5.01 13 6.47 13 8.5V22h-1z" />
              </svg>
            </div>
            <div className="info-content">
              <div className="info-name">{cardData.plantInfo.name}</div>
              <div className="info-details">
                <span 
                  className="color-dot" 
                  style={{ backgroundColor: cardData.plantInfo.colorCode }}
                />
                <span className="color-code">{cardData.plantInfo.colorCode}</span>
                <span className="info-size">{cardData.plantInfo.size}</span>
              </div>
            </div>
          </div>
        )}

        {cardData.decorations.length > 0 && (
          <div className="deco-list">
            <div className="deco-list-title">装饰元素 ({cardData.decorations.length})</div>
            {cardData.decorations.map((deco, index) => (
              <div key={index} className="deco-item">
                <span className="deco-name">{deco.name}</span>
                <span className="deco-color">{deco.colorCode}</span>
              </div>
            ))}
          </div>
        )}

        {!cardData.potInfo && !cardData.plantInfo && cardData.decorations.length === 0 && (
          <div className="empty-hint">
            <div className="empty-icon">🌱</div>
            <p>从左侧选择素材开始搭配</p>
          </div>
        )}
      </div>

      <div className="panel-section action-section">
        <button 
          className="generate-btn"
          onClick={onGenerateCard}
          disabled={!state.pot && !state.plant && state.decorations.length === 0}
        >
          <span className="btn-icon">🎴</span>
          生成搭配卡片
        </button>
      </div>

      <style>{`
        .property-panel {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #FFFAF0;
          border-left: 1px solid #E8E0D5;
          padding: 16px;
          gap: 16px;
          overflow-y: auto;
        }
        
        .panel-section {
          background: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(141, 110, 99, 0.1);
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #5D4037;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #E8E0D5;
        }
        
        .preview-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .preview-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .preview-frame {
          width: 150px;
          height: 150px;
          border: 2px solid #E8E0D5;
          border-radius: 8px;
          overflow: hidden;
          background: #F5F0E1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .preview-inner {
          width: 150px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          object-fit: contain;
        }
        
        .preview-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 8px;
        }
        
        .preview-size {
          font-size: 12px;
          color: #8D6E63;
          font-weight: 500;
        }
        
        .refresh-preview-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border: 1px solid #E8E0D5;
          border-radius: 6px;
          background: white;
          color: #8D6E63;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }
        
        .refresh-preview-btn:hover {
          background: #F5F0E1;
          border-color: #D2B48C;
        }
        
        .refresh-icon {
          width: 14px;
          height: 14px;
        }
        
        .info-section {
          flex: 1;
        }
        
        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px dashed #E8E0D5;
        }
        
        .info-item:last-child {
          border-bottom: none;
        }
        
        .info-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .info-icon svg {
          width: 20px;
          height: 20px;
        }
        
        .pot-icon {
          background: #EFEBE9;
          color: #8D6E63;
        }
        
        .plant-icon {
          background: #E8F5E9;
          color: #66BB6A;
        }
        
        .info-content {
          flex: 1;
          min-width: 0;
        }
        
        .info-name {
          font-size: 14px;
          font-weight: 500;
          color: #5D4037;
          margin-bottom: 4px;
        }
        
        .info-details {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .color-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        .color-code {
          font-size: 12px;
          color: #8D6E63;
          font-family: monospace;
        }
        
        .info-size {
          font-size: 12px;
          color: #A1887F;
        }
        
        .deco-list {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed #E8E0D5;
        }
        
        .deco-list-title {
          font-size: 13px;
          font-weight: 500;
          color: #6D4C41;
          margin-bottom: 8px;
        }
        
        .deco-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 12px;
        }
        
        .deco-name {
          color: #5D4037;
        }
        
        .deco-color {
          color: #8D6E63;
          font-family: monospace;
          font-size: 11px;
        }
        
        .empty-hint {
          text-align: center;
          padding: 20px 0;
          color: #A1887F;
        }
        
        .empty-icon {
          font-size: 36px;
          margin-bottom: 8px;
        }
        
        .empty-hint p {
          margin: 0;
          font-size: 13px;
        }
        
        .action-section {
          margin-top: auto;
        }
        
        .generate-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 6px;
          background: linear-gradient(135deg, #7CB342 0%, #558B2F 100%);
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease-out;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(124, 179, 66, 0.4);
        }
        
        .generate-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .generate-btn:disabled {
          background: #BDBDBD;
          cursor: not-allowed;
        }
        
        .btn-icon {
          font-size: 18px;
        }
        
        .property-panel::-webkit-scrollbar {
          width: 6px;
        }
        
        .property-panel::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .property-panel::-webkit-scrollbar-thumb {
          background: #D2B48C;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

const MiniPreview: React.FC<{ state: BonsaiState }> = ({ state }) => {
  const hasContent = state.pot || state.plant;
  
  return (
    <div className="mini-preview">
      {!hasContent && <div className="mini-preview-empty">暂无搭配</div>}
      {hasContent && (
        <svg viewBox="0 0 200 300" className="mini-preview-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            {state.plant && (
              <linearGradient id="mini-plant-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={state.plant.gradientStart} />
                <stop offset="100%" stopColor={state.plant.gradientEnd} />
              </linearGradient>
            )}
            {state.pot && (
              <linearGradient id="mini-pot-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={state.pot.gradientStart} />
                <stop offset="100%" stopColor={state.pot.gradientEnd} />
              </linearGradient>
            )}
          </defs>
          
          {state.plant && state.plant.type === 'pothos' && (
            <>
              <path d="M100 220 Q85 175 55 150 Q40 125 65 95" stroke="url(#mini-plant-grad)" strokeWidth="6" fill="none" />
              <path d="M100 220 Q115 175 145 150 Q160 125 135 95" stroke="url(#mini-plant-grad)" strokeWidth="6" fill="none" />
              <ellipse cx="60" cy="120" rx="22" ry="14" fill="url(#mini-plant-grad)" transform="rotate(-30 60 120)" />
              <ellipse cx="140" cy="120" rx="22" ry="14" fill="url(#mini-plant-grad)" transform="rotate(30 140 120)" />
              <ellipse cx="80" cy="160" rx="18" ry="10" fill="url(#mini-plant-grad)" transform="rotate(-15 80 160)" />
              <ellipse cx="120" cy="160" rx="18" ry="10" fill="url(#mini-plant-grad)" transform="rotate(15 120 160)" />
            </>
          )}
          {state.plant && state.plant.type === 'succulent' && (
            <>
              <ellipse cx="100" cy="160" rx="55" ry="30" fill="url(#mini-plant-grad)" />
              <ellipse cx="75" cy="148" rx="22" ry="28" fill="url(#mini-plant-grad)" />
              <ellipse cx="125" cy="148" rx="22" ry="28" fill="url(#mini-plant-grad)" />
              <ellipse cx="100" cy="130" rx="18" ry="24" fill="url(#mini-plant-grad)" />
              <ellipse cx="85" cy="172" rx="16" ry="20" fill="url(#mini-plant-grad)" />
              <ellipse cx="115" cy="172" rx="16" ry="20" fill="url(#mini-plant-grad)" />
            </>
          )}
          {state.plant && state.plant.type === 'cactus' && (
            <>
              <rect x="82" y="60" width="36" height="160" rx="18" fill="url(#mini-plant-grad)" />
              <rect x="35" y="100" width="30" height="65" rx="15" fill="url(#mini-plant-grad)" />
              <rect x="135" y="85" width="30" height="80" rx="15" fill="url(#mini-plant-grad)" />
              <circle cx="100" cy="60" r="8" fill="#FF7043" />
            </>
          )}
          
          {state.pot && (
            <>
              <rect x="30" y="220" width="140" height="22" rx="6" fill="url(#mini-pot-grad)" opacity={state.pot.type === 'glass' ? 0.7 : 1} />
              <rect x="40" y="240" width="120" height="55" rx="4" fill="url(#mini-pot-grad)" opacity={state.pot.type === 'glass' ? 0.5 : 1}
                style={{ clipPath: 'polygon(7% 0%, 93% 0%, 100% 100%, 0% 100%)' }} />
              <ellipse cx="100" cy="298" rx="70" ry="5" fill="rgba(0,0,0,0.08)" />
            </>
          )}
        </svg>
      )}

      <style>{`
        .mini-preview {
          width: 100%;
          height: 100%;
          background: #F5F0E1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .mini-preview-svg {
          width: 100%;
          height: 100%;
        }
        
        .mini-preview-empty {
          color: #BCAAA4;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default PropertyPanel;
