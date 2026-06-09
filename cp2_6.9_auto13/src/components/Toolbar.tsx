import { useRef, useState } from 'react';
import type { NodeType, FlowNode, FlowEdge } from '../types';
import { exportSVG, exportPNG } from '../utils/export';

interface ToolbarProps {
  selectedTool: NodeType | null;
  onToolSelect: (tool: NodeType | null) => void;
  onClear: () => void;
  onAutoArrange: () => void;
  onDelete: () => void;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const tools: { type: NodeType; icon: string; label: string }[] = [
  { type: 'rectangle', icon: '▭', label: '矩形' },
  { type: 'diamond', icon: '◆', label: '菱形' },
  { type: 'circle', icon: '●', label: '圆形' },
];

export default function Toolbar({
  selectedTool,
  onToolSelect,
  onClear,
  onAutoArrange,
  onDelete,
  nodes,
  edges,
}: ToolbarProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleExportSVG = () => {
    const svg = document.querySelector('.canvas-svg') as SVGSVGElement;
    if (svg) {
      svgRef.current = svg;
      exportSVG(svg, nodes, edges);
    }
  };

  const handleExportPNG = () => {
    const svg = document.querySelector('.canvas-svg') as SVGSVGElement;
    if (svg) {
      svgRef.current = svg;
      exportPNG(svg, nodes, edges);
    }
  };

  return (
    <div className="toolbar">
      {tools.map((tool) => (
        <button
          key={tool.type}
          className={selectedTool === tool.type ? 'active' : ''}
          onClick={() => onToolSelect(tool.type)}
          title={`添加${tool.label}`}
        >
          {tool.icon}
        </button>
      ))}
      <div className="toolbar-divider" />
      <button onClick={onAutoArrange} title="自动排列">
        ⇅
      </button>
      <button onClick={onDelete} title="删除选中 (Delete)">
        ✕
      </button>
      <button onClick={onClear} title="清空画布">
        🗑
      </button>
      <div className="toolbar-divider" />
      <button onClick={handleExportPNG} title="导出PNG">
        🖼
      </button>
      <button onClick={handleExportSVG} title="导出SVG">
        ⬇
      </button>
    </div>
  );
}
