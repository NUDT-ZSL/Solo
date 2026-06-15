import { useEffect, useCallback } from 'react'
import type { Shape } from '../types'

interface UseEditorKeyboardOptions {
  selectedId: string | null
  graphics: Shape[]
  onGraphicsChange: (graphics: Shape[]) => void
  onSelectionChange: (id: string | null) => void
  onCommitChange: () => void
  onUndo: () => void
  onRedo: () => void
  onToolChange: (tool: 'select' | 'rect' | 'circle' | 'line') => void
  onSpaceChange: (pressed: boolean) => void
  isSpacePressed: boolean
  isInteracting: boolean
  onCursorChange: (cursor: string) => void
}

interface UseEditorKeyboardResult {}

export function useEditorKeyboard({
  selectedId,
  graphics,
  onGraphicsChange,
  onSelectionChange,
  onCommitChange,
  onUndo,
  onRedo,
  onToolChange,
  onSpaceChange,
  isSpacePressed,
  isInteracting,
  onCursorChange
}: UseEditorKeyboardOptions): UseEditorKeyboardResult {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        onRedo()
        return
      }

      if (e.code === 'Space' && !e.repeat) {
        onSpaceChange(true)
        if (!isInteracting) {
          onCursorChange('grab')
        }
        return
      }

      if (e.code === 'Escape') {
        onSelectionChange(null)
        return
      }

      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'INPUT') {
          onGraphicsChange(graphics.filter((s) => s.id !== selectedId))
          onSelectionChange(null)
          onCommitChange()
        }
        return
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        if (e.key === 'v' || e.key === 'V') onToolChange('select')
        else if (e.key === 'r' || e.key === 'R') onToolChange('rect')
        else if (e.key === 'c' || e.key === 'C') onToolChange('circle')
        else if (e.key === 'l' || e.key === 'L') onToolChange('line')
      }
    },
    [
      selectedId,
      graphics,
      onGraphicsChange,
      onSelectionChange,
      onCommitChange,
      onUndo,
      onRedo,
      onToolChange,
      isInteracting
    ]
  )

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        onSpaceChange(false)
        if (!isSpacePressed || isInteracting) {
          onCursorChange('default')
        }
      }
    },
    [isSpacePressed, isInteracting]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  return {}
}
