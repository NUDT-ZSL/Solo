import React, { useState, useCallback, memo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Shape, GradientStop as GradientStopType } from '../types';
import GradientStop from './GradientStop';
import { debounce } from '../utils/performanceUtils';

interface PropertiesPanelProps {
  selectedShape: Shape | null;
  onUpdateShape: (id: string, updates: Partial<Shape>) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = memo(function PropertiesPanel({
  selectedShape,
  onUpdateShape,
}) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const handleFillChange = useCallback(
    debounce((value: string) => {
      if (!selectedShape) return;
      onUpdateShape(selectedShape.id, { ...selectedShape, fill: value });
    }, 100),
    [selectedShape, onUpdateShape]
  );

  const handleUseGradientChange = useCallback((checked: boolean) => {
    if (!selectedShape) return;
    onUpdateShape(selectedShape.id, { ...selectedShape, useGradient: checked });
  }, [selectedShape, onUpdateShape]);

  const handleGradientTypeChange = useCallback((type: 'linear' | 'radial') => {
    if (!selectedShape) return;
    onUpdateShape(selectedShape.id, {
      ...selectedShape, gradient: { ...selectedShape.gradient, type } });
  }, [selectedShape, onUpdateShape]);

  const handleGradientAngleChange = useCallback(
    debounce((value: number) => {
      if (!selectedShape) return;
      onUpdateShape(selectedShape.id, {
        ...selectedShape,
        gradient: { ...selectedShape.gradient, angle: value } });
    }, 100),
    [selectedShape, onUpdateShape]);

  const handleStopUpdate = useCallback((stopId: string, updates: Partial<GradientStopType>) => {
    if (!selectedShape) return;
    const newStops = selectedShape.gradient.stops.map(s =>
      s.id === stopId ? { ...s, ...updates } : s
    );
    onUpdateShape(selectedShape.id, {
      ...selectedShape,
      gradient: { ...selectedShape.gradient, stops: newStops }
    });
  }, [selectedShape, onUpdateShape]);

  const handleAddStop = useCallback(() => {
    if (!selectedShape) return;
    const newStop: GradientStopType = {
      id: uuidv4(),
      offset: 0.5,
      color: '#ffffff'
    };
    const newStops = [...selectedShape.gradient.stops, newStop].sort((a, b) => a.offset - b.offset);
    onUpdateShape(selectedShape.id, {
      ...selectedShape,
      gradient: { ...selectedShape.gradient, stops: newStops }
    });
    setSelectedStopId(newStop.id);
  }, [selectedShape, onUpdateShape]);

  const handleDeleteStop = useCallback(() => {
    if (!selectedShape || selectedShape.gradient.stops.length <= 2) return;
    const stopToDelete = selectedStopId || selectedShape.gradient.stops[selectedShape.gradient.stops.length - 1].id;
    const newStops = selectedShape.gradient.stops.filter(s => s.id !== stopToDelete);
    onUpdateShape(selectedShape.id, {
      ...selectedShape,
      gradient: { ...selectedShape.gradient, stops: newStops }
    });
    setSelectedStopId(null);
  }, [selectedShape, selectedStopId, onUpdateShape]);

  const handleShadowChange = useCallback(
    debounce((updates: Partial<Shape['shadow']>) => {
      if (!selectedShape) return;
      onUpdateShape(selectedShape.id, {
        ...selectedShape,
        shadow: { ...selectedShape.shadow, ...updates }
      });
    }, 100),
    [selectedShape, onUpdateShape]);

  if (!selectedShape) {
    return (
      <aside className="properties-panel">
        <div className="panel-header">
          <h2>属性面板</h2>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
          选择一个形状以编辑属性
        </div>
      </aside>
    );
  }

  const gradientPreviewStyle = selectedShape.gradient.type === 'linear'
    ? `linear-gradient(${selectedShape.gradient.angle}deg, ${
        selectedShape.gradient.stops
          .sort((a, b) => a.offset - b.offset)
          .map(s => `${s.color} ${s.offset * 100}%`)
          .join(', ')}`
    : `radial-gradient(circle, ${
        selectedShape.gradient.stops
          .sort((a, b) => a.offset - b.offset)
          .map(s => `${s.color} ${s.offset * 100}%`)
          .join(', ')}`;

  return (
    <aside className="properties-panel">
      <div className="panel-header">
        <h2>{selectedShape.name} 属性</h2>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">填充</div>
        <div className="input-group">
          <label>填充颜色</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={selectedShape.fill}
              onChange={(e) => handleFillChange(e.target.value)}
            />
            <input
              type="text"
              value={selectedShape.fill}
              onChange={(e) => handleFillChange(e.target.value)}
            />
          </div>
        </div>
        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>使用渐变</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={selectedShape.useGradient}
                onChange={(e) => handleUseGradientChange(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </label>
        </div>
      </div>

      {selectedShape.useGradient && (
        <div className="panel-section">
          <div className="panel-section-title">渐变</div>
          <div className="gradient-editor">
            <div className="gradient-type-selector">
              <button
                className={`gradient-type-btn ${selectedShape.gradient.type === 'linear' ? 'active' : ''}`}
                onClick={() => handleGradientTypeChange('linear')}
              >
                线性
              </button>
              <button
                className={`gradient-type-btn ${selectedShape.gradient.type === 'radial' ? 'active' : ''}`}
                onClick={() => handleGradientTypeChange('radial')}
              >
                径向
              </button>
            </div>
            {selectedShape.gradient.type === 'linear' && (
              <div className="input-group">
                <label>渐变角度</label>
                <div className="angle-input">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={selectedShape.gradient.angle}
                    onChange={(e) => handleGradientAngleChange(Number(e.target.value))}
                  />
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={selectedShape.gradient.angle}
                    onChange={(e) => handleGradientAngleChange(Number(e.target.value))}
                  />
                  <span>°</span>
                </div>
              </div>
            )}
            <div
              className="gradient-preview"
              style={{ background: gradientPreviewStyle }}
            />
            <div className="gradient-stops">
              <div
                className="gradient-stops-track"
                style={{ background: gradientPreviewStyle }}
              />
              {selectedShape.gradient.stops.map((stop) => (
                <GradientStop
                  key={stop.id}
                  stop={stop}
                  isSelected={selectedStopId === stop.id}
                  onSelect={() => setSelectedStopId(stop.id)}
                  onUpdate={(updates) => handleStopUpdate(stop.id, updates)}
                  onDelete={handleDeleteStop}
                />
              ))}
            </div>
            <div className="gradient-stop-actions">
              <button
                className="gradient-stop-btn"
                onClick={handleAddStop}
              >
                + 添加色标
              </button>
              <button
                className="gradient-stop-btn"
                onClick={handleDeleteStop}
                disabled={selectedShape.gradient.stops.length <= 2}
              >
                - 删除色标
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="panel-section">
        <div className="panel-section-title">阴影</div>
        <div
          className="shadow-preview"
        >
          <div
            className="shadow-preview-box"
            style={{
              boxShadow: `${selectedShape.shadow.offsetX}px ${selectedShape.shadow.offsetY}px ${selectedShape.shadow.blur}px ${selectedShape.shadow.color}${Math.round(selectedShape.shadow.opacity * 255).toString(16).padStart(2, '0')}`
            }}
          />
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>X偏移</label>
            <input
              type="number"
              value={selectedShape.shadow.offsetX}
              onChange={(e) => handleShadowChange({ offsetX: Number(e.target.value) })}
            />
          </div>
          <div className="input-group">
            <label>Y偏移</label>
            <input
              type="number"
              value={selectedShape.shadow.offsetY}
              onChange={(e) => handleShadowChange({ offsetY: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="input-group">
          <label>模糊半径</label>
          <input
            type="range"
            min="0"
            max="50"
            value={selectedShape.shadow.blur}
            onChange={(e) => handleShadowChange({ blur: Number(e.target.value) })}
          />
        </div>
        <div className="input-group">
          <label>颜色</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={selectedShape.shadow.color}
              onChange={(e) => handleShadowChange({ color: e.target.value })}
            />
            <input
              type="text"
              value={selectedShape.shadow.color}
              onChange={(e) => handleShadowChange({ color: e.target.value })}
            />
          </div>
        </div>
        <div className="input-group">
          <label>透明度: {Math.round(selectedShape.shadow.opacity * 100)}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={selectedShape.shadow.opacity * 100}
            onChange={(e) => handleShadowChange({ opacity: Number(e.target.value) / 100 })}
          />
        </div>
      </div>
    </aside>
  );
});

export default PropertiesPanel;
