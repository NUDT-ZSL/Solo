import { v4 as uuidv4 } from 'uuid'
import type { TreeNode } from '../types/index.ts'

const SUMMARY_MAX_LENGTH = 15

export const truncateSummary = (text: string): string => {
  const clean = text.replace(/[#*`_~\[\]()-]/g, '').trim()
  if (clean.length <= SUMMARY_MAX_LENGTH) return clean
  return clean.slice(0, SUMMARY_MAX_LENGTH) + '...'
}

export const parseMarkdown = (markdown: string): TreeNode[] => {
  const lines = markdown.split('\n')
  const roots: TreeNode[] = []
  const stack: { node: TreeNode; level: number }[] = []

  const addNode = (node: TreeNode) => {
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }
    if (stack.length === 0) {
      roots.push(node)
    } else {
      stack[stack.length - 1].node.children.push(node)
    }
    stack.push({ node, level: node.level })
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      const node: TreeNode = {
        id: uuidv4(),
        text,
        level,
        children: [],
        collapsed: false
      }
      addNode(node)
      i++
      continue
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const indent = listMatch[1].length
      const text = listMatch[3].trim()
      const baseLevel = stack.length > 0 ? stack[stack.length - 1].level : 0
      const level = baseLevel + 1 + Math.floor(indent / 2)

      const node: TreeNode = {
        id: uuidv4(),
        text,
        level,
        children: [],
        collapsed: false,
        isList: true
      }
      addNode(node)
      i++
      continue
    }

    i++
  }

  return roots
}

const serializeNode = (node: TreeNode, parentLevel: number = 0): string => {
  let result = ''
  const indent = Math.max(0, node.level - parentLevel - 1)
  const spaces = '  '.repeat(indent)

  if (node.isList) {
    result += `${spaces}- ${node.text}\n`
  } else {
    const hashes = '#'.repeat(Math.min(6, node.level))
    result += `${hashes} ${node.text}\n`
  }

  if (!node.collapsed && node.children.length > 0) {
    for (const child of node.children) {
      result += serializeNode(child, node.level)
    }
  }

  return result
}

export const treeToMarkdown = (tree: TreeNode[]): string => {
  let result = ''
  for (const node of tree) {
    result += serializeNode(node, 0)
  }
  return result.trim()
}

export const findNodeById = (tree: TreeNode[], id: string): TreeNode | null => {
  for (const node of tree) {
    if (node.id === id) return node
    const found = findNodeById(node.children, id)
    if (found) return found
  }
  return null
}

export const findParentNode = (
  tree: TreeNode[],
  id: string,
  parent: TreeNode | null = null
): { node: TreeNode; parent: TreeNode | null } | null => {
  for (const node of tree) {
    if (node.id === id) return { node, parent }
    const found = findParentNode(node.children, id, node)
    if (found) return found
  }
  return null
}

export const removeNodeFromTree = (tree: TreeNode[], id: string): TreeNode[] => {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeNodeFromTree(node.children, id)
    }))
}

export const isDescendant = (ancestor: TreeNode, targetId: string): boolean => {
  if (ancestor.id === targetId) return true
  return ancestor.children.some((child) => isDescendant(child, targetId))
}

export const reorderNodes = (
  tree: TreeNode[],
  draggedId: string,
  targetId: string
): TreeNode[] => {
  const draggedInfo = findParentNode(tree, draggedId)
  const targetInfo = findParentNode(tree, targetId)

  if (!draggedInfo || !targetInfo) return tree

  const draggedNode = draggedInfo.node
  const targetNode = targetInfo.node

  if (isDescendant(draggedNode, targetId)) return tree

  let newTree = removeNodeFromTree(tree, draggedId)

  const insertIntoNode = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.map((node) => {
      if (node.id === targetId) {
        return {
          ...node,
          collapsed: false,
          children: [...node.children, { ...draggedNode, level: node.level + 1 }]
        }
      }
      return {
        ...node,
        children: insertIntoNode(node.children)
      }
    })
  }

  newTree = insertIntoNode(newTree)
  return newTree
}

interface DiffResult {
  type: 'insert' | 'delete' | 'equal'
  value: string
}

export const diffMarkdown = (oldText: string, newText: string): DiffResult[] => {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffResult[] = []

  let i = 0
  let j = 0

  while (i < oldLines.length && j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: 'equal', value: oldLines[i] })
      i++
      j++
    } else {
      let foundOld = -1
      for (let k = j; k < Math.min(j + 5, newLines.length); k++) {
        if (oldLines[i] === newLines[k]) {
          foundOld = k
          break
        }
      }
      let foundNew = -1
      for (let k = i; k < Math.min(i + 5, oldLines.length); k++) {
        if (oldLines[k] === newLines[j]) {
          foundNew = k
          break
        }
      }

      if (foundOld !== -1 && foundOld < (foundNew === -1 ? Infinity : foundNew)) {
        for (let k = j; k < foundOld; k++) {
          result.push({ type: 'insert', value: newLines[k] })
        }
        j = foundOld
      } else if (foundNew !== -1) {
        for (let k = i; k < foundNew; k++) {
          result.push({ type: 'delete', value: oldLines[k] })
        }
        i = foundNew
      } else {
        result.push({ type: 'delete', value: oldLines[i] })
        result.push({ type: 'insert', value: newLines[j] })
        i++
        j++
      }
    }
  }

  while (i < oldLines.length) {
    result.push({ type: 'delete', value: oldLines[i] })
    i++
  }
  while (j < newLines.length) {
    result.push({ type: 'insert', value: newLines[j] })
    j++
  }

  return result
}
