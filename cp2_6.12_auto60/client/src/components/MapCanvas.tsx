import { useRef, useEffect, useState, useCallback } from 'react'
import type { MapNode } from '@/types'
import { useAppStore } from '@/store'

interface MapCanvasProps {
  nodes: MapNode[]
  selectedNodeId: string | null
  highlightedNodeId: string | null
  onSelectNode: (id: string | null) => void
  onHighlightNode: (id: string | null) => void
  onNodeMove: (id: string, x: number, y: number) => void
  onNodeCreate: (parentId: string | null, x: number, y: number) => void
  onNodeUpdate: (id: string, text: string) => void
  onNodeAddChild: (parentId: string) => void
}

interface ViewState {
  offsetX: number
  offsetY: number
  scale: number
}

interface DragState {
  isDragging: boolean
  nodeId: string | null
  startX: number
  startY: number
  nodeStartX: number
  nodeStartY: number
}

interface PanState {
  isPanning: boolean
  startX: number
  startY: number
  offsetStartX: number
  offsetStartY: number
}

interface EditableState {
  nodeId: string | null
  text: string
  originalText: string
}

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const GRID_SIZE = 10
const NODE_MIN_WIDTH = 120
const NODE_HEIGHT = 48
const NODE_PADDING = 16
const ADD_BUTTON_SIZE = 18
const PULSE_INTERVAL = 500

function getThemeColors(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    return {
      grid: '#444444',
      canvasBg: '#2D2D2D',
      nodeBg: '#3D3D3D',
      nodeBorder: '#555555',
      nodeText: '#ffffff',
      nodeSelectedBorder: '#4A90D9',
      line: '#aaaaaa',
      addBtn: '#4A90D9',
      addBtnBg: '#3D3D3D'
    }
  }
  return {
    grid: '#dddddd',
    canvasBg: '#f5f5f5',
    nodeBg: '#ffffff',
    nodeBorder: '#cccccc',
    nodeText: '#1a1a1a',
    nodeSelectedBorder: '#4A90D9',
    line: '#aaaaaa',
    addBtn: '#4A90D9',
