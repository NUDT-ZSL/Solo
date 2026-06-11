import React from 'react';
import { Circle, Triangle, Hexagon, Plus, Trash2, Sliders } from 'lucide-react';
import type { ShapeType, BlendMode } from '../core/shapeRenderer';

interface CanvasImage {
  id: string;
  opacity: number;
  blendMode: BlendMode;
}

interface Shape {
  id: string;
  type: ShapeType;
  size: number;
  rotation: number;
  strokeWidth: number;
  glowColor: string;
}

interface EditorPanelProps {
  selectedImage: CanvasImage | null;
  shapes: Shape[];
  selectedShapeId: string | null;
  onImageChange: (patch: Partial<Pick<CanvasImage, 'opacity' | 'blendMode'>>) => void;
  onAddShape: (type: ShapeType) => void;
  onSelectShape: (id: string | null) => void;
  onShapeChange: (id: string, patch: Partial<Pick<Shape, 'size' | 'rotation' | 'strokeWidth' | 'glowColor'>>) => void;
  onDeleteShape: (id: string) => void;
  mobileOpen: boolean;
}

const shapeLabels: Record<ShapeType, string> = {
  circle: '圆形',
  triangle: '三角',
  hexagon: '六边形'
};

const shapeIcons: Record<ShapeType, React.ReactNode> = {
  circle: <Circle size={18} />,
  triangle: <Triangle size={18} />,
  hexagon: <Hexagon size={18} />
};

const EditorPanel: React.FC<EditorPanelProps> = ({
  selectedImage,
  shapes,
  selectedShapeId,
  onImageChange,
  onAddShape,
  onSelectShape,
  onShapeChange,
  onDeleteShape,
  mobileOpen
}) => {
  const selectedShape = shapes.find((s) => s.id === selectedShapeId) || null;
  const imageShapes = shapes;

  const renderShapeIcon = (type: ShapeType, size = 16) => {
    switch (type) {
      case 'circle':
        return <Circle size={size} />;
      case 'triangle':
        return <Triangle size={size} />;
      case 'hexagon':
        return <Hexagon size={size} />;
    }
  };

  return (
    <aside className={`editor-panel ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="editor-header">
        <div className="editor-title">编辑面板</div>
      </div>

      <div className="editor-body">
        {!selectedImage ? (
          <div className="editor-empty">
            <Sliders size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>点击画布上的图片</div>
            <div>以编辑参数和添加形状</div>
          </div>
        ) : (
          <>
            <div className="section-title">
              <span>图片属性</span>
            </div>

            <div className="field">
              <label className="field-label">
                透明度 <span className="field-value">{selectedImage.opacity}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={selectedImage.opacity}
                onChange={(e) => onImageChange({ opacity: Number(e.target.value) })}
              />
            </div>

            <div className="field">
              <label className="field-label">混合模式</label>
              <select
                value={selectedImage.blendMode}
                onChange={(e) => onImageChange({ blendMode: e.target.value as BlendMode })}
              >
                <option value="normal">正常 (Normal)</option>
                <option value="multiply">正片叠底 (Multiply)</option>
                <option value="screen">滤色 (Screen)</option>
                <option value="overlay">叠加 (Overlay)</option>
              </select>
            </div>

            <div className="section-title">
              <span>几何形状 ({imageShapes.length})</span>
              <span style={{ display: 'flex', gap: 4 }}>
                <button
                  className="add-shape-btn"
                  onClick={() => onAddShape('circle')}
                  title="添加圆形"
                >
                  <Circle size={12} /> 圆
                </button>
                <button
                  className="add-shape-btn"
                  onClick={() => onAddShape('triangle')}
                  title="添加三角形"
                >
                  <Triangle size={12} /> 三
                </button>
                <button
                  className="add-shape-btn"
                  onClick={() => onAddShape('hexagon')}
                  title="添加六边形"
                >
                  <Hexagon size={12} /> 六
                </button>
              </span>
            </div>

            {imageShapes.length === 0 ? (
              <div style={{
                color: '#94a3b8',
                fontSize: '12px',
                textAlign: 'center',
                padding: '16px 8px',
                lineHeight: 1.6
              }}>
                点击上方按钮添加几何形状
              </div>
            ) : (
              <div className="shapes-list">
                {imageShapes.map((shape, idx) => (
                  <div
                    key={shape.id}
                    className={`shape-item ${selectedShapeId === shape.id ? 'active' : ''}`}
                    onClick={() => onSelectShape(selectedShapeId === shape.id ? null : shape.id)}
                  >
                    {shapeIcons[shape.type]}
                    <div className="shape-item-info">
                      <div className="shape-item-name">
                        {shapeLabels[shape.type]} #{idx + 1}
                      </div>
                      <div className="shape-item-sub">
                        {shape.size}px · {shape.rotation}°
                      </div>
                    </div>
                    <button
                      className="shape-item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteShape(shape.id);
                      }}
                      title="删除形状"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedShape && (
              <>
                <div className="section-title">
                  <span>{shapeLabels[selectedShape.type]} 属性</span>
                </div>

                <div className="field">
                  <label className="field-label">
                    类型
                  </label>
                  <div className="shape-buttons">
                    {(['circle', 'triangle', 'hexagon'] as ShapeType[]).map((type) => (
                      <button
                        key={type}
                        className={`shape-btn ${selectedShape.type === type ? 'active' : ''}`}
                        onClick={() => onShapeChange(selectedShape.id, { ...(selectedShape.type !== type ? { type } as any : {}) })}
                      >
                        {renderShapeIcon(type, 18)}
                        <span>{shapeLabels[type]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">
                    大小 <span className="field-value">{selectedShape.size}px</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    value={selectedShape.size}
                    onChange={(e) => onShapeChange(selectedShape.id, { size: Number(e.target.value) })}
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    旋转角度 <span className="field-value">{selectedShape.rotation}°</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={selectedShape.rotation}
                    onChange={(e) => onShapeChange(selectedShape.id, { rotation: Number(e.target.value) })}
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    描边宽度 <span className="field-value">{selectedShape.strokeWidth.toFixed(1)}px</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={Math.round(selectedShape.strokeWidth * 10)}
                    onChange={(e) => onShapeChange(selectedShape.id, { strokeWidth: Number(e.target.value) / 10 })}
                  />
                </div>

                <div className="field">
                  <label className="field-label">发光颜色</label>
                  <input
                    type="color"
                    value={selectedShape.glowColor}
                    onChange={(e) => onShapeChange(selectedShape.id, { glowColor: e.target.value })}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default EditorPanel;
