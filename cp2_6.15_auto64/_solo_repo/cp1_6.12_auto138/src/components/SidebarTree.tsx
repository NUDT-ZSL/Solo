import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, Box } from 'lucide-react'
import type { ComponentMeta, TreeNode, FolderNode, ComponentNode } from '@/types'

interface SidebarTreeProps {
  components: ComponentMeta[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function buildTree(components: ComponentMeta[]): TreeNode[] {
  const root: Map<string, { name: string; components: ComponentMeta[] }> = new Map()
  for (const comp of components) {
    const parts = comp.category.split('/').filter(Boolean)
    const folderName = parts.join('/') || 'Uncategorized'
    if (!root.has(folderName)) {
      root.set(folderName, { name: folderName, components: [] })
    }
    root.get(folderName)!.components.push(comp)
  }

  const folders: Map<string, FolderNode> = new Map()
  for (const [folderPath, data] of root) {
    const parts = folderPath.split('/')
    let current = folders
    let path = ''
    for (let i = 0; i < parts.length; i++) {
      path += '/' + parts[i]
      if (!current.has(path)) {
        current.set(path, {
          id: `folder-${path}`,
          name: parts[i],
          type: 'folder',
          children: [],
          expanded: i === 0,
        })
      }
      if (i < parts.length - 1) {
        const folder = current.get(path)!
        const nextMap = new Map<string, FolderNode>()
        for (const child of folder.children) {
          if (child.type === 'folder') {
            nextMap.set(child.id, child as FolderNode)
          }
        }
        current = nextMap
      }
    }
  }

  function insertIntoTree(nodes: TreeNode[], folderPath: string, parts: string[], components: ComponentMeta[]): TreeNode[] {
    if (parts.length === 0) {
      for (const comp of components) {
        nodes.push({
          id: comp.id,
          name: comp.name,
          type: 'component',
          componentId: comp.id,
          tags: comp.tags,
          version: comp.version,
        } as ComponentNode)
      }
      return nodes
    }

    const folderName = parts[0]
    let folder = nodes.find(
      (n): n is FolderNode => n.type === 'folder' && n.name === folderName
    )

    if (!folder) {
      folder = {
        id: `folder-${folderPath}`,
        name: folderName,
        type: 'folder',
        children: [],
        expanded: true,
      }
      nodes.push(folder)
    }

    folder.children = insertIntoTree(folder.children, folderPath, parts.slice(1), components)
    return nodes
  }

  let tree: TreeNode[] = []
  for (const [folderPath, data] of root) {
    const parts = folderPath.split('/').filter(Boolean)
    tree = insertIntoTree(tree, folderPath, parts, data.components)
  }

  return tree
}

function TreeFolder({ node, selectedId, onSelect, depth }: { node: FolderNode; selectedId: string | null; onSelect: (id: string) => void; depth: number }) {
  const [expanded, setExpanded] = useState(node.expanded ?? true)

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 cursor-pointer hover:bg-gray-50 select-none rounded-md mx-1 transition-colors duration-200"
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
        {expanded ? <FolderOpen size={15} className="text-amber-500 shrink-0" /> : <Folder size={15} className="text-amber-400 shrink-0" />}
        <span className="text-sm font-medium text-gray-700 truncate">{node.name}</span>
      </div>
      {expanded && (
        <div>
          {node.children.map((child) =>
            child.type === 'folder' ? (
              <TreeFolder key={child.id} node={child as FolderNode} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
            ) : (
              <TreeComponent key={child.id} node={child as ComponentNode} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
            )
          )}
        </div>
      )}
    </div>
  )
}

function TreeComponent({ node, selectedId, onSelect, depth }: { node: ComponentNode; selectedId: string | null; onSelect: (id: string) => void; depth: number }) {
  const isSelected = selectedId === node.componentId

  return (
    <div
      className={`flex items-center gap-2 py-1.5 cursor-pointer select-none rounded-md mx-1 transition-all duration-200 ${
        isSelected ? 'bg-[#e6f0ff]' : 'hover:bg-gray-50'
      }`}
      style={{
        paddingLeft: depth * 16 + 8,
        borderLeft: isSelected ? '1px solid #4A90D9' : '1px solid transparent',
      }}
      onClick={() => onSelect(node.componentId)}
    >
      <Box size={14} className={isSelected ? 'text-[#4A90D9] shrink-0' : 'text-gray-400 shrink-0'} />
      <span className={`text-sm truncate ${isSelected ? 'text-[#4A90D9] font-semibold' : 'text-gray-600'}`}>
        {node.name}
      </span>
      <div className="ml-auto flex gap-1 pr-2 shrink-0">
        {node.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              background: tag === 'React' ? '#e6f0ff' : tag === 'TS' ? '#d4edda' : '#f0f0f0',
              color: tag === 'React' ? '#4A90D9' : tag === 'TS' ? '#2d8a4e' : '#666',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function SidebarTree({ components, selectedId, onSelect }: SidebarTreeProps) {
  const tree = React.useMemo(() => buildTree(components), [components])

  return (
    <div className="h-full overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
      {tree.map((node) =>
        node.type === 'folder' ? (
          <TreeFolder key={node.id} node={node as FolderNode} selectedId={selectedId} onSelect={onSelect} depth={0} />
        ) : (
          <TreeComponent key={node.id} node={node as ComponentNode} selectedId={selectedId} onSelect={onSelect} depth={0} />
        )
      )}
    </div>
  )
}
