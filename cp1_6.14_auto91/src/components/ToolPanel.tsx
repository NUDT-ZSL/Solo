import React from 'react';
import { TOOL_NODES, NodeType } from '../types';

interface ToolPanelProps {
  isOpen?: boolean;
}

const ToolPanel: React.FC<ToolPanelProps> = ({ isOpen = true }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, nodeType: NodeType) => {
    e.dataTransfer.setData('application/flowcanvas-node-type', nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className={`tool-panel ${isOpen ? 'open' : ''}`}>
      <h2 className="tool-panel-title">节点工具</h2>
      <div className="tool-node-list">
        {TOOL_NODES.map((node) => (
          <div
            key={node.type}
            className="tool-node-card"
            draggable
            onDragStart={(e) => handleDragStart(e, node.type)}
          >
            <div className="tool-node-icon">{node.icon}</div>
            <div className="tool-node-info">
              <div className="tool-node-label">{node.label}</div>
              <div className="tool-node-desc">{node.description}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default ToolPanel;
