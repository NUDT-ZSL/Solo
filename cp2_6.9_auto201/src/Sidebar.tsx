import React from 'react';
import type { CoffeeBean, Flavor, Combination } from './api';

interface SidebarProps {
  selectedBean: CoffeeBean | null;
  flavorList: Flavor[];
  selectedFlavorId: number | null;
  combination: Combination | null;
  onAddFlavor: (flavorId: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedBean,
  flavorList,
  selectedFlavorId,
  onAddFlavor
}) => {
  return (
    <div className="sidebar">
      <div className="bean-detail">
        {selectedBean ? (
          <>
            <div className="bean-detail-title">{selectedBean.name}</div>
            <div className="bean-detail-origin">产地：{selectedBean.origin}</div>
            <div className="bean-detail-desc">{selectedBean.description}</div>
          </>
        ) : (
          <div className="bean-detail-placeholder">
            转动轮盘选择咖啡豆 ☕
          </div>
        )}
      </div>

      <div className="flavor-cards">
        {flavorList.map((flavor) => (
          <div
            key={flavor.id}
            className={`flavor-card ${selectedFlavorId === flavor.id ? 'selected' : ''}`}
            data-flavor={flavor.id}
            onClick={() => onAddFlavor(flavor.id)}
            style={{
              background: `linear-gradient(135deg, ${flavor.gradient[0]}, ${flavor.gradient[1]})`
            }}
          >
            <span className="flavor-emoji">{flavor.emoji}</span>
            <span className="flavor-name">{flavor.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
