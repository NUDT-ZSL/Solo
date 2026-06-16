import React from 'react';
import { BonsaiState, CardData, generateCardData } from '../utils/bonSaiLogic';

interface CardModalProps {
  isOpen: boolean;
  state: BonsaiState;
  onClose: () => void;
}

const CardModal: React.FC<CardModalProps> = ({ isOpen, state, onClose }) => {
  const cardData: CardData = generateCardData(state);

  if (!isOpen) return null;

  return (
    <div className="card-modal-overlay" onClick={onClose}>
      <div className="card-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="card-close-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        
        <div className="bonsai-card">
          <div className="card-header">
            <div className="card-title">🌿 盆栽搭配方案</div>
            <div className="card-subtitle">Virtual Bonsai Studio</div>
          </div>
          
          <div className="card-preview">
            <CardPreview state={state} />
          </div>
          
          <div className="card-divider" />
          
          <div className="card-details">
            {cardData.potInfo && (
              <div className="detail-row">
                <span className="detail-label">花盆</span>
                <div className="detail-value">
                  <span className="detail-name">{cardData.potInfo.name}</span>
                  <span className="detail-color">
                    <span 
                      className="color-swatch" 
                      style={{ backgroundColor: cardData.potInfo.colorCode }}
                    />
                    {cardData.potInfo.colorCode}
                  </span>
                  <div className="detail-dimensions">
                    <span className="dim-item">
                      <span className="dim-label">宽</span>
                      <span className="dim-value">{cardData.potInfo.widthCm}</span>
                    </span>
                    <span className="dim-item">
                      <span className="dim-label">高</span>
                      <span className="dim-value">{cardData.potInfo.heightCm}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {cardData.plantInfo && (
              <div className="detail-row">
                <span className="detail-label">植物</span>
                <div className="detail-value">
                  <span className="detail-name">{cardData.plantInfo.name}</span>
                  <span className="detail-color">
                    <span 
                      className="color-swatch" 
                      style={{ backgroundColor: cardData.plantInfo.colorCode }}
                    />
                    {cardData.plantInfo.colorCode}
                  </span>
                  <div className="detail-dimensions">
                    <span className="dim-item">
                      <span className="dim-label">宽</span>
                      <span className="dim-value">{cardData.plantInfo.widthCm}</span>
                    </span>
                    <span className="dim-item">
                      <span className="dim-label">高</span>
                      <span className="dim-value">{cardData.plantInfo.heightCm}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {cardData.decorations.length > 0 && (
              <div className="detail-row">
                <span className="detail-label">装饰</span>
                <div className="detail-value deco-values">
                  {cardData.decorations.map((deco, i) => (
                    <span key={i} className="deco-tag">
                      <span 
                        className="color-swatch small" 
                        style={{ backgroundColor: deco.colorCode }}
                      />
                      {deco.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="detail-row total-row">
              <span className="detail-label">整体尺寸</span>
              <span className="total-size">{cardData.totalSize}</span>
            </div>
          </div>
          
          <div className="card-footer">
            <span className="footer-text">设计于 虚拟盆栽工作室</span>
          </div>
        </div>
      </div>

      <style>{`
        .card-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(93, 64, 55, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .card-modal-content {
          position: relative;
          animation: cardBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes cardBounce {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-10deg);
          }
          50% {
            transform: scale(1.05) rotate(3deg);
          }
          70% {
            transform: scale(0.98) rotate(-1deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        
        .card-close-btn {
          position: absolute;
          top: -12px;
          right: -12px;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: #8D6E63;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .card-close-btn:hover {
          background: #5D4037;
          transform: scale(1.1);
        }
        
        .card-close-btn svg {
          width: 20px;
          height: 20px;
        }
        
        .bonsai-card {
          width: 360px;
          background: #E8E0D5;
          border: 2px solid #C0A080;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(93, 64, 55, 0.3);
        }
        
        .card-header {
          text-align: center;
          margin-bottom: 16px;
        }
        
        .card-title {
          font-size: 20px;
          font-weight: 700;
          color: #5D4037;
          margin-bottom: 4px;
        }
        
        .card-subtitle {
          font-size: 11px;
          color: #A1887F;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        .card-preview {
          background: #F5F0E1;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
          border: 1px solid #D7CCC8;
        }
        
        .card-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #C0A080, transparent);
          margin: 16px 0;
        }
        
        .card-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .detail-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        
        .detail-label {
          width: 50px;
          font-size: 13px;
          color: #8D6E63;
          font-weight: 500;
          flex-shrink: 0;
          padding-top: 2px;
        }
        
        .detail-value {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .detail-name {
          font-size: 14px;
          font-weight: 600;
          color: #5D4037;
        }
        
        .detail-color {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6D4C41;
          font-family: monospace;
        }
        
        .color-swatch {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 1px solid rgba(0,0,0,0.1);
          display: inline-block;
        }
        
        .color-swatch.small {
          width: 10px;
          height: 10px;
        }
        
        .detail-size {
          font-size: 12px;
          color: #8B7355;
        }
        
        .detail-dimensions {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }
        
        .dim-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .dim-label {
          font-size: 11px;
          color: #8B7355;
          font-weight: 500;
          background: #F5F0E1;
          padding: 1px 6px;
          border-radius: 3px;
        }
        
        .dim-value {
          font-size: 12px;
          color: #8B7355;
          font-family: monospace;
          font-weight: 600;
        }
        
        .deco-values {
          flex-direction: row;
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .deco-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: #D7CCC8;
          border-radius: 4px;
          font-size: 12px;
          color: #5D4037;
        }
        
        .total-row {
          align-items: center;
          padding-top: 8px;
          border-top: 1px dashed #C0A080;
        }
        
        .total-size {
          font-size: 16px;
          font-weight: 700;
          color: #558B2F;
        }
        
        .card-footer {
          text-align: center;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #D7CCC8;
        }
        
        .footer-text {
          font-size: 11px;
          color: #A1887F;
        }
      `}</style>
    </div>
  );
};

const CardPreview: React.FC<{ state: BonsaiState }> = ({ state }) => {
  return (
    <div className="card-preview-inner">
      <div className="card-preview-pot-area">
        {state.plant && (
          <div className="card-preview-plant">
            <svg viewBox="0 0 120 160" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="card-plant-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={state.plant.gradientStart} />
                  <stop offset="100%" stopColor={state.plant.gradientEnd} />
                </linearGradient>
              </defs>
              {state.plant.type === 'pothos' && (
                <>
                  <path d="M60 150 Q50 110 30 90 Q20 70 40 50" stroke="url(#card-plant-grad)" strokeWidth="5" fill="none" />
                  <path d="M60 150 Q70 110 90 90 Q100 70 80 50" stroke="url(#card-plant-grad)" strokeWidth="5" fill="none" />
                  <ellipse cx="36" cy="70" rx="16" ry="10" fill="url(#card-plant-grad)" transform="rotate(-30 36 70)" />
                  <ellipse cx="84" cy="70" rx="16" ry="10" fill="url(#card-plant-grad)" transform="rotate(30 84 70)" />
                  <ellipse cx="50" cy="100" rx="14" ry="8" fill="url(#card-plant-grad)" transform="rotate(-15 50 100)" />
                  <ellipse cx="70" cy="100" rx="14" ry="8" fill="url(#card-plant-grad)" transform="rotate(15 70 100)" />
                </>
              )}
              {state.plant.type === 'succulent' && (
                <>
                  <ellipse cx="60" cy="100" rx="45" ry="25" fill="url(#card-plant-grad)" />
                  <ellipse cx="40" cy="90" rx="18" ry="22" fill="url(#card-plant-grad)" />
                  <ellipse cx="80" cy="90" rx="18" ry="22" fill="url(#card-plant-grad)" />
                  <ellipse cx="60" cy="75" rx="15" ry="20" fill="url(#card-plant-grad)" />
                  <ellipse cx="50" cy="110" rx="13" ry="16" fill="url(#card-plant-grad)" />
                  <ellipse cx="70" cy="110" rx="13" ry="16" fill="url(#card-plant-grad)" />
                </>
              )}
              {state.plant.type === 'cactus' && (
                <>
                  <rect x="48" y="40" width="24" height="110" rx="12" fill="url(#card-plant-grad)" />
                  <rect x="20" y="70" width="20" height="45" rx="10" fill="url(#card-plant-grad)" />
                  <rect x="80" y="60" width="20" height="55" rx="10" fill="url(#card-plant-grad)" />
                  <circle cx="60" cy="40" r="6" fill="#FF7043" />
                </>
              )}
            </svg>
          </div>
        )}
        {state.pot && (
          <div className="card-preview-pot">
            <div 
              className="card-preview-pot-rim"
              style={{
                background: `linear-gradient(180deg, ${state.pot.gradientStart} 0%, ${state.pot.gradientEnd} 100%)`,
                opacity: state.pot.type === 'glass' ? 0.7 : 1
              }}
            />
            <div 
              className="card-preview-pot-body"
              style={{
                background: `linear-gradient(180deg, ${state.pot.gradientStart} 0%, ${state.pot.gradientEnd} 100%)`,
                opacity: state.pot.type === 'glass' ? 0.5 : 1
              }}
            />
          </div>
        )}
        {!state.pot && !state.plant && (
          <div className="card-preview-empty">暂无搭配</div>
        )}
      </div>

      <style>{`
        .card-preview-inner {
          width: 200px;
          height: 200px;
          background: #F5F0E1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .card-preview-pot-area {
          position: relative;
          width: 160px;
          height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
        }
        
        .card-preview-plant {
          position: absolute;
          bottom: 70px;
          width: 120px;
          height: 130px;
          z-index: 0;
        }
        
        .card-preview-pot {
          position: relative;
          width: 110px;
          height: 90px;
          z-index: 1;
        }
        
        .card-preview-pot-rim {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 110px;
          height: 14px;
          border-radius: 3px 3px 2px 2px;
        }
        
        .card-preview-pot-body {
          position: absolute;
          top: 11px;
          left: 50%;
          transform: translateX(-50%);
          width: 96px;
          height: 79px;
          border-radius: 0 0 12px 12px;
          clip-path: polygon(7% 0%, 93% 0%, 100% 100%, 0% 100%);
        }
        
        .card-preview-empty {
          color: #BCAAA4;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default CardModal;
