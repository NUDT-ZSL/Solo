import React from 'react';
import type { ScoreResult, Mode, CharacterClip } from '../../types';

interface ToolPanelProps {
  mode: Mode;
  brushSize: number;
  onBrushSizeChange: (v: number) => void;
  inkOpacity: number;
  onInkOpacityChange: (v: number) => void;
  rubbingOpacity: number;
  onRubbingOpacityChange: (v: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  scoreResult: ScoreResult | null;
  onClipCharacter: () => void;
  characters: CharacterClip[];
  onRemoveCharacter: (id: string) => void;
  onExport: () => void;
  selectedCharId: string | null;
  charScale: number;
  onCharScaleChange: (v: number) => void;
  charRotation: number;
  onCharRotationChange: (v: number) => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  mode,
  brushSize,
  onBrushSizeChange,
  inkOpacity,
  onInkOpacityChange,
  rubbingOpacity,
  onRubbingOpacityChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  scoreResult,
  onClipCharacter,
  characters,
  onRemoveCharacter,
  onExport,
  selectedCharId,
  charScale,
  onCharScaleChange,
  charRotation,
  onCharRotationChange
}) => {
  const selectedChar = characters.find(c => c.id === selectedCharId);

  return (
    <div className="tool-panel">
      {mode === 'copy' ? (
        <>
          <div className="panel-section">
            <div className="section-title">笔刷设置</div>
            <div className="slider-control">
              <div className="slider-label">
                <span>笔刷大小</span>
                <span className="slider-value">{brushSize}px</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={brushSize}
                onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              />
            </div>
            <div className="slider-control">
              <div className="slider-label">
                <span>墨色浓淡</span>
                <span className="slider-value">{Math.round(inkOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={inkOpacity}
                onChange={(e) => onInkOpacityChange(Number(e.target.value))}
              />
            </div>
            <div className="slider-control">
              <div className="slider-label">
                <span>底图透明度</span>
                <span className="slider-value">{Math.round(rubbingOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={rubbingOpacity}
                onChange={(e) => onRubbingOpacityChange(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">操作</div>
            <div className="action-buttons">
              <button className="action-btn" onClick={onUndo} disabled={!canUndo}>
                ↶ 撤销
              </button>
              <button className="action-btn" onClick={onRedo} disabled={!canRedo}>
                ↷ 重做
              </button>
              <button className="action-btn" onClick={onClipCharacter}>
                ✂ 裁剪单字
              </button>
              <button className="action-btn danger" onClick={onClear}>
                🗑 清空
              </button>
            </div>
          </div>

          {scoreResult && (
            <div className="panel-section">
              <div className="section-title">评分结果</div>
              <div className="score-display">
                <div
                  className="score-circle"
                  style={{ ['--progress' as string]: `${scoreResult.score}%` }}
                >
                  <span className="score-number">{scoreResult.score}</span>
                </div>
                <div className="score-breakdown">
                  <div className="score-item">
                    <span>角度偏差</span>
                    <strong>{scoreResult.angleDeviation}°</strong>
                  </div>
                  <div className="score-item">
                    <span>像素重叠</span>
                    <strong>{scoreResult.pixelOverlap}%</strong>
                  </div>
                  <div className="score-item">
                    <span>压力相似度</span>
                    <strong>{scoreResult.pressureSimilarity}%</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="hint-text">
            💡 提示：在画布上按住鼠标或触摸屏幕即可临摹。红色虚线圈标注角度偏差超过15°的区域。
          </div>
        </>
      ) : (
        <>
          <div className="panel-section">
            <div className="section-title">集字调色板</div>
            <div className="clipboard-palette">
              {characters.length === 0 ? (
                <div className="clip-placeholder" style={{ gridColumn: '1 / -1' }}>
                  暂无单字<br />请在临摹模式裁剪
                </div>
              ) : (
                characters.map(char => (
                  <div
                    key={char.id}
                    className="clip-item"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('charId', char.id);
                    }}
                    onClick={() => onRemoveCharacter(char.id)}
                    title="点击删除，拖拽到画布"
                  >
                    <img src={char.imageDataUrl} alt="单字" />
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedChar && (
            <div className="panel-section">
              <div className="section-title">单字调整</div>
              <div className="slider-control">
                <div className="slider-label">
                  <span>缩放</span>
                  <span className="slider-value">{Math.round(charScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={3}
                  step={0.05}
                  value={charScale}
                  onChange={(e) => onCharScaleChange(Number(e.target.value))}
                />
              </div>
              <div className="slider-control">
                <div className="slider-label">
                  <span>旋转</span>
                  <span className="slider-value">{charRotation}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={charRotation}
                  onChange={(e) => onCharRotationChange(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div className="panel-section">
            <div className="section-title">操作</div>
            <div className="action-buttons">
              <button className="action-btn" onClick={onUndo} disabled={!canUndo}>
                ↶ 撤销
              </button>
              <button className="action-btn" onClick={onRedo} disabled={!canRedo}>
                ↷ 重做
              </button>
              <button className="action-btn primary" onClick={onExport} style={{ gridColumn: '1 / -1' }}>
                📥 导出为PNG
              </button>
            </div>
          </div>

          <div className="hint-text">
            💡 提示：在临摹模式点击「裁剪单字」后框选区域，即可将字加入调色板。拖拽调色板中的字到画布，点击可选中并调整缩放旋转。
          </div>
        </>
      )}
    </div>
  );
};
