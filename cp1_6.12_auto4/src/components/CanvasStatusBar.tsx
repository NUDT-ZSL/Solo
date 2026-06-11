import React from 'react'

interface CanvasStatusBarProps {
  zoom: number
  mousePos: { x: number; y: number }
  graphicsCount: number
}

export const CanvasStatusBar: React.FC<CanvasStatusBarProps> = ({
  zoom,
  mousePos,
  graphicsCount
}) => {
  return (
    <div className="canvas-status-bar">
      <span>缩放: {(zoom * 100).toFixed(0)}%</span>
      <span>坐标: ({Math.round(mousePos.x)}, {Math.round(mousePos.y)})</span>
      <span>图形数: {graphicsCount}</span>
    </div>
  )
}
