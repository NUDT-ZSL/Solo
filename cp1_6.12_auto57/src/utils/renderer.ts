import { linkHorizontal } from 'd3-shape'
import type { TreeNode } from '../types/index.ts'
import { truncateSummary } from './parser.ts'

export interface LayoutNode {
  id: string
  text: string
  fullText: string
  x: number
  y: number
  width: number
  height: number
  level: number
  parentId: string | null
  children: LayoutNode[]
  collapsed: boolean
  isList?: boolean
  hasChildren: boolean
}

export interface LayoutEdge {
  source: LayoutNode
  target: LayoutNode
  path: string
}

export interface LayoutResult {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 60
const H_GAP = 80
const V_GAP = 24

const collectVisibleNodes = (
  node: TreeNode,
  parentId: string | null,
  result: { node: TreeNode; parentId: string | null }[]
): void => {
  result.push({ node, parentId })
  if (!node.collapsed) {
    for (const child of node.children) {
      collectVisibleNodes(child, node.id, result)
    }
  }
}

const buildTreeStructure = (
  visibleNodes: { node: TreeNode; parentId: string | null }[]
): Map<string, string[]> => {
  const childrenMap = new Map<string, string[]>()
  for (const { node, parentId } of visibleNodes) {
    if (parentId !== null) {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, [])
      }
      childrenMap.get(parentId)!.push(node.id)
    }
  }
  return childrenMap
}

const calculateSubtreeHeight = (
  nodeId: string,
  childrenMap: Map<string, string[]>
): number => {
  const children = childrenMap.get(nodeId) || []
  if (children.length === 0) {
    return NODE_HEIGHT + V_GAP
  }
  let totalHeight = 0
  for (const childId of children) {
    totalHeight += calculateSubtreeHeight(childId, childrenMap)
  }
  return Math.max(totalHeight, NODE_HEIGHT + V_GAP)
}

export const layoutTree = (tree: TreeNode[]): LayoutResult => {
  if (tree.length === 0) {
    return { nodes: [], edges: [], width: 800, height: 600 }
  }

  const visibleNodes: { node: TreeNode; parentId: string | null }[] = []
  const roots = tree.length === 1 ? tree : [tree[0]]

  for (const root of roots) {
    collectVisibleNodes(root, null, visibleNodes)
  }

  const nodeMap = new Map<string, { node: TreeNode; parentId: string | null }>()
  for (const item of visibleNodes) {
    nodeMap.set(item.node.id, item)
  }

  const childrenMap = buildTreeStructure(visibleNodes)
  const layoutNodes = new Map<string, LayoutNode>()
  const edges: LayoutEdge[] = []

  let maxY = 0
  let maxX = 0

  const layout = (
    nodeId: string,
    depth: number,
    yStart: number
  ): { centerY: number; height: number } => {
    const item = nodeMap.get(nodeId)!
    const children = childrenMap.get(nodeId) || []
    const x = depth * (NODE_WIDTH + H_GAP)

    let subtreeHeight = calculateSubtreeHeight(nodeId, childrenMap)

    if (children.length === 0) {
      const y = yStart + subtreeHeight / 2
      const layoutNode: LayoutNode = {
        id: item.node.id,
        text: truncateSummary(item.node.text),
        fullText: item.node.text,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        level: item.node.level,
        parentId: item.parentId,
        children: [],
        collapsed: item.node.collapsed,
        isList: item.node.isList,
        hasChildren: item.node.children.length > 0
      }
      layoutNodes.set(nodeId, layoutNode)
      maxX = Math.max(maxX, x + NODE_WIDTH)
      maxY = Math.max(maxY, y + NODE_HEIGHT / 2)
      return { centerY: y, height: subtreeHeight }
    }

    let currentY = yStart
    const childCenters: number[] = []

    for (const childId of children) {
      const result = layout(childId, depth + 1, currentY)
      childCenters.push(result.centerY)
      currentY += result.height
    }

    const centerY = childCenters.length > 0
      ? (childCenters[0] + childCenters[childCenters.length - 1]) / 2
      : yStart + subtreeHeight / 2

    const layoutNode: LayoutNode = {
      id: item.node.id,
      text: truncateSummary(item.node.text),
      fullText: item.node.text,
      x,
      y: centerY,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      level: item.node.level,
      parentId: item.parentId,
      children: children.map((id) => layoutNodes.get(id)!),
      collapsed: item.node.collapsed,
      isList: item.node.isList,
      hasChildren: item.node.children.length > 0
    }
    layoutNodes.set(nodeId, layoutNode)

    maxX = Math.max(maxX, x + NODE_WIDTH)
    maxY = Math.max(maxY, centerY + NODE_HEIGHT / 2)

    return { centerY, height: subtreeHeight }
  }

  let totalHeight = 0
  for (const root of roots) {
    totalHeight += calculateSubtreeHeight(root.id, childrenMap)
  }

  let currentY = V_GAP
  for (const root of roots) {
    const result = layout(root.id, 0, currentY)
    currentY += result.height
  }

  for (const layoutNode of layoutNodes.values()) {
    if (layoutNode.parentId !== null) {
      const parent = layoutNodes.get(layoutNode.parentId)
      if (parent) {
        const linkGenerator = linkHorizontal<LayoutNode, LayoutNode>()
          .x((d: any) => d.x)
          .y((d: any) => d.y)

        const sourcePoint = { x: parent.x + parent.width, y: parent.y }
        const targetPoint = { x: layoutNode.x, y: layoutNode.y }

        const path = generateBezierPath(sourcePoint, targetPoint)

        edges.push({
          source: parent,
          target: layoutNode,
          path
        })
      }
    }
  }

  const nodes = Array.from(layoutNodes.values())

  return {
    nodes,
    edges,
    width: maxX + 100,
    height: Math.max(maxY + 100, 600)
  }
}

const generateBezierPath = (
  source: { x: number; y: number },
  target: { x: number; y: number }
): string => {
  const dx = Math.abs(target.x - source.x)
  const controlOffset = Math.max(dx * 0.5, 40)

  const c1x = source.x + controlOffset
  const c1y = source.y
  const c2x = target.x - controlOffset
  const c2y = target.y

  return `M ${source.x} ${source.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${target.x} ${target.y}`
}

const levelColors: Record<number, string> = {
  1: '#1976D2',
  2: '#388E3C',
  3: '#F57C00',
  4: '#7B1FA2',
  5: '#00796B',
  6: '#5D4037'
}

export const getNodeColor = (level: number): string => {
  return levelColors[level] || '#616161'
}

export const generateSvgString = (
  layout: LayoutResult,
  selectedId: string | null = null,
  options: { transparent?: boolean } = {}
): string => {
  const { nodes, edges, width, height } = layout
  const bgColor = options.transparent ? 'transparent' : '#F8F9FA'

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`

  if (!options.transparent) {
    svg += `<rect width="100%" height="100%" fill="${bgColor}"/>`
  }

  for (const edge of edges) {
    const color = getNodeColor(edge.target.level)
    svg += `<path d="${edge.path}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.6"/>`
  }

  for (const node of nodes) {
    const x = node.x
    const y = node.y - node.height / 2
    const isSelected = node.id === selectedId
    const color = getNodeColor(node.level)

    if (isSelected) {
      svg += `<rect x="${x - 4}" y="${y - 4}" width="${node.width + 8}" height="${node.height + 8}" rx="16" ry="16" fill="none" stroke="#2196F3" stroke-width="3" filter="url(#glow)"/>`
    }

    svg += `<defs>`
    svg += `<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">`
    svg += `<feGaussianBlur stdDeviation="4" result="coloredBlur"/>`
    svg += `<feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`
    svg += `</filter>`
    svg += `</defs>`

    svg += `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="12" ry="12" fill="white" stroke="#E0E0E0" stroke-width="1"/>`

    svg += `<rect x="${x}" y="${y}" width="4" height="${node.height}" rx="2" fill="${color}"/>`

    svg += `<text x="${x + 16}" y="${y + node.height / 2 + 5}" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#333" font-weight="${node.level <= 2 ? '600' : '400'}">${escapeXml(node.text)}</text>`

    if (node.hasChildren) {
      const toggleX = x + node.width - 20
      const toggleY = y + node.height / 2
      svg += `<circle cx="${toggleX}" cy="${toggleY}" r="8" fill="#F5F5F5" stroke="#BDBDBD" stroke-width="1"/>`
      svg += `<text x="${toggleX}" y="${toggleY + 4}" font-family="system-ui, sans-serif" font-size="12" fill="#666" text-anchor="middle">${node.collapsed ? '+' : '−'}</text>`
    }
  }

  svg += `</svg>`
  return svg
}

const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export const calculateNodePosition = (
  layout: LayoutResult,
  containerWidth: number,
  containerHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>()

  for (const node of layout.nodes) {
    const screenX = node.x * scale + offsetX + containerWidth / 2 - (layout.width * scale) / 2
    const screenY = node.y * scale + offsetY + containerHeight / 2 - (layout.height * scale) / 2
    positions.set(node.id, { x: screenX, y: screenY })
  }

  return positions
}
