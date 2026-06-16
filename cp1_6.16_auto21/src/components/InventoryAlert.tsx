import React from 'react';

export interface InventoryAlertItem {
  beanId: string;
  beanName: string;
  currentStock: number;
  message?: string;
}

interface InventoryAlertProps {
  alerts: InventoryAlertItem[];
  onAlertClick?: (beanId: string) => void;
}

const InventoryAlert: React.FC<InventoryAlertProps> = ({ alerts, onAlertClick }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="inventory-alert-container">
      {alerts.map((alert, index) => (
        <div
          key={alert.beanId}
          className="inventory-alert-bubble animate-bounce-in"
          style={{ animationDelay: `${index * 0.1}s` }}
          onClick={() => onAlertClick?.(alert.beanId)}
        >
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <div className="alert-title">库存不足：{alert.beanName}</div>
            <div className="alert-detail">
              剩余 {alert.currentStock.toFixed(1)} kg
              {alert.message && <span className="alert-msg"> - {alert.message}</span>}
            </div>
          </div>
          <div className="alert-arrow">→</div>
        </div>
      ))}
    </div>
  );
};

export default InventoryAlert;
