import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Material } from '../types';

interface AddMaterialFormProps {
  onAdd: (material: Omit<Material, 'id'>) => void;
  onClose: () => void;
  materials: Material[];
}

const PRESET_COLORS = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E67E22', '#34495E', '#BDC3C7', '#ECF0F1',
];

export const AddMaterialForm: React.FC<AddMaterialFormProps> = ({ onAdd, onClose, materials }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('颗');
  const [color, setColor] = useState('#E74C3C');
  const [quantity, setQuantity] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [price, setPrice] = useState(0);
  const [showSupplierList, setShowSupplierList] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const uniqueSuppliers = useMemo(() => {
    const suppliers = materials
      .map((m) => m.supplier?.trim())
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    return Array.from(new Set(suppliers));
  }, [materials]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSupplierList(false);
      }
    };

    if (showSupplierList) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSupplierList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name, unit, color, quantity, supplier, price });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>添加新材料</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>材料名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入材料名称"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>单位</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="如：颗、米、个"
                required
              />
            </div>
            <div className="form-group">
              <label>库存数量</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>颜色</label>
            <div className="color-picker">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <div className="preset-colors">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>单价</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                min="0"
                step="0.01"
                placeholder="元/单位"
                required
              />
            </div>
            <div className="form-group">
              <label>供应商</label>
              <div className="supplier-input-wrapper">
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="请输入供应商名称"
                />
                <button
                  type="button"
                  className="supplier-list-btn"
                  onClick={() => setShowSupplierList(!showSupplierList)}
                  title="查看已有供应商"
                >
                  📋
                </button>
              </div>
              {showSupplierList && (
                <div ref={supplierDropdownRef} className="supplier-list-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="supplier-list-header">
                    <span>已有供应商</span>
                    <button
                      type="button"
                      className="supplier-list-close"
                      onClick={() => setShowSupplierList(false)}
                    >
                      ×
                    </button>
                  </div>
                  {uniqueSuppliers.length > 0 ? (
                    <div className="supplier-list-items">
                      {uniqueSuppliers.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="supplier-list-item"
                          onClick={() => {
                            setSupplier(s);
                            setShowSupplierList(false);
                          }}
                        >
                          🏪 {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="supplier-list-empty">暂无已有供应商</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
