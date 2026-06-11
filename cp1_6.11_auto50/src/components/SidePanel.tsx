import { useMemo } from 'react';
import type { SankeyData, SankeyNode, SankeyLink, SelectionState, FilterState, NodeStats } from '../types';

interface SidePanelProps {
  data: SankeyData | null;
  selection: SelectionState;
  filterState: FilterState;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  onNodeClick: (nodeId: string) => void;
  onRestoreLink: (linkIndex: number) => void;
  onRestoreAll: () => void;
}

function getNodeStats(
  nodeId: string,
  data: SankeyData,
  filteredLinks: number[]
): NodeStats | null {
  const node = data.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const validLinks = data.links.filter((_, i) => !filteredLinks.includes(i));

  const incomingLinks = validLinks.filter(l => {
    const target = typeof l.target === 'string' ? l.target : l.target.id;
    return target === nodeId;
  });

  const outgoingLinks = validLinks.filter(l => {
    const source = typeof l.source === 'string' ? l.source : l.source.id;
    return source === nodeId;
  });

  const totalIn = incomingLinks.reduce((sum, l) => sum + l.value, 0);
  const totalOut = outgoingLinks.reduce((sum, l) => sum + l.value, 0);

  const upstreamNodes = incomingLinks.map(l => {
    const sourceNode = data.nodes.find(n => n.id === (typeof l.source === 'string' ? l.source : l.source.id));
    return {
      id: sourceNode?.id || '',
      label: sourceNode?.label || '',
      value: l.value
    };
  }).filter(n => n.id);

  const downstreamNodes = outgoingLinks.map(l => {
    const targetNode = data.nodes.find(n => n.id === (typeof l.target === 'string' ? l.target : l.target.id));
    return {
      id: targetNode?.id || '',
      label: targetNode?.label || '',
      value: l.value
    };
  }).filter(n => n.id);

  return {
    id: node.id,
    label: node.label,
    totalIn,
    totalOut,
    upstreamNodes,
    downstreamNodes
  };
}

export default function SidePanel({
  data,
  selection,
  filterState,
  fileName,
  isOpen,
  onClose,
  onNodeClick,
  onRestoreLink,
  onRestoreAll
}: SidePanelProps) {
  const selectedNodeStats = useMemo(() => {
    if (!data || selection.type !== 'node' || !selection.data) return null;
    const node = selection.data as SankeyNode;
    return getNodeStats(node.id, data, filterState.filteredLinks);
  }, [data, selection, filterState.filteredLinks]);

  const selectedLinkInfo = useMemo(() => {
    if (!data || selection.type !== 'link' || !selection.data) return null;
    const link = selection.data as SankeyLink;
    const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
    const sourceNode = data.nodes.find(n => n