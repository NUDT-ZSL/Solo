import React, { useState, useRef, useEffect, useCallback } from 'react'

export interface EditorNote {
  id: string
  pitch: number
  time: number
  duration: number
  velocity: number
}

interface NoteEditorProps {
  notes: EditorNote[]
  onChange: (notes: EditorNote[]) => void
  selectedVelocity: number
  onVelocityChange: (v: number) => void
}

const MIN_PITCH = 48
const MAX_PITCH = 83
const TOTAL_STEPS = 16
const NOTE_WIDTH_PERC = 100 / TOTAL_STEPS
const PITCH_RANGE = MAX_PITCH - MIN_PITCH + 1
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function getNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1
  const name = PITCH_NAMES[pitch % 12]
  return `${name}${octave}`
}

function pitchToHue(pitch: number): number {
  const t = (pitch - MIN_PITCH) / (MAX_PITCH - MIN_PITCH)
  return 240 - t * (240 - 60)
}

function getNoteColor(pitch: number, alpha: number = 0.8): string {
  const hue = pitchToHue(pitch)
  return `hsla(${hue}, 70%, 55%, ${alpha})`
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  notes,
  onChange,
  selectedVelocity,
  onVelocityChange
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [draggingNote, setDraggingNote] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0, startPitch: 0, startTime: 0 })
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const getEditorCoords = useCallback((clientX: number, clientY: number) => {
    const rect = editorRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0, timeStep: 0, pitch: MIN_PITCH }
    const x = clientX - rect.left
    const y = clientY - rect.top
    const timeStep = Math.floor((x / rect.width) * TOTAL_STEPS)
    const pitchIndex = Math.floor((1 - y / rect.height) * PITCH_RANGE)
    const pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, MIN_PITCH + pitchIndex))
    return { x, y, timeStep: Math.max(0, Math.min(TOTAL_STEPS - 1, timeStep)), pitch }
  }, [])

  const generateId = () => `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const handleEditorMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (notes.length >= 16) return

    const point = 'touches' in e ? e.touches[0] : e
    const { timeStep, pitch } = getEditorCoords(point.clientX, point.clientY)

    const existingNote = notes.find(n => n.time === timeStep && n.pitch === pitch)
    if (existingNote) {
      setSelectedNote(existingNote.id)
      onVelocityChange(existingNote.velocity)
      return
    }

    const newNote: EditorNote = {
      id: generateId(),
      pitch,
      time: timeStep,
      duration: 1,
      velocity: selectedVelocity
    }

    setIsCreating(true)
    setDraggingNote(newNote.id)
    setSelectedNote(newNote.id)
    dragOffsetRef.current = { x: 0, y: 0, startPitch: pitch, startTime: timeStep }
    onChange([...notes, newNote])
  }, [notes, onChange, selectedVelocity, getEditorCoords, onVelocityChange])

  const handleNoteMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent, note: EditorNote) => {
    e.preventDefault()
    e.stopPropagation()

    const point = 'touches' in e ? e.touches[0] : e
    const rect = editorRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = point.clientX - rect.left
    const y = point.clientY - rect.top

    const noteLeft = (note.time / TOTAL_STEPS) * rect.width
    const noteTop = (1 - (note.pitch - MIN_PITCH + 1) / PITCH_RANGE) * rect.height

    dragOffsetRef.current = {
      x: x - noteLeft,
      y: y - noteTop,
      startPitch: note.pitch,
      startTime: note.time
    }
    setDraggingNote(note.id)
    setSelectedNote(note.id)
    onVelocityChange(note.velocity)
  }, [getEditorCoords, onVelocityChange])

  const handleNoteDoubleClick = useCallback((e: React.MouseEvent, noteId: string) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(notes.filter(n => n.id !== noteId))
    if (selectedNote === noteId) setSelectedNote(null)
  }, [notes, onChange, selectedNote])

  useEffect(() => {
    if (!draggingNote) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const point = 'touches' in e ? e.touches[0] : (e as MouseEvent)
      const { timeStep, pitch } = getEditorCoords(point.clientX, point.clientY)

      onChange(notes.map(n => {
        if (n.id !== draggingNote) return n
        return { ...n, time: timeStep, pitch }
      }))
    }

    const handleUp = () => {
      setDraggingNote(null)
      setIsCreating(false)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [draggingNote, notes, onChange, getEditorCoords])

  const updateNoteVelocity = useCallback((noteId: string, velocity: number) => {
    onChange(notes.map(n => n.id === noteId ? { ...n, velocity } : n))
  }, [notes, onChange])

  const staffLines = Array.from({ length: 11 }, (_, i) => {
    const pitch = MIN_PITCH + Math.floor(PITCH_RANGE / 2) - 5 + i
    if (pitch % 12 === 0 || pitch % 12 === 7) {
      const top = (1 - (pitch - MIN_PITCH + 0.5) / PITCH_RANGE) * 100
      return <div key={`staff-${i}`} className="editor-staff-line" style={{ top: `${top}%` }} />
    }
    return null
  })

  const timeGrids = Array.from({ length: TOTAL_STEPS + 1 }, (_, i) => (
    <div key={`time-${i}`} className="editor-time-grid" style={{ left: `${(i / TOTAL_STEPS) * 100}%` }} />
  ))

  const pitchLabels = [60, 67, 72, 79].filter(p => p >= MIN_PITCH && p <= MAX_PITCH)

  return (
    <div className="note-editor-wrapper">
      <div
        ref={editorRef}
        className={`note-editor ${isMobile ? 'note-editor-mobile' : 'note-editor-desktop'}`}
        style={{ margin: '0 auto', position: 'relative' }}
        onMouseDown={handleEditorMouseDown}
        onTouchStart={handleEditorMouseDown}
      >
        {staffLines}
        {timeGrids}

        {pitchLabels.map(pitch => (
          <div
            key={`label-${pitch}`}
            style={{
              position: 'absolute',
              left: 4,
              top: `${(1 - (pitch - MIN_PITCH + 0.5) / PITCH_RANGE) * 100}%`,
              transform: 'translateY(-50%)',
              fontSize: 10,
              color: 'rgba(255,255,255,0.5)',
              pointerEvents: 'none',
              fontWeight: 600
            }}
          >
            {getNoteName(pitch)}
          </div>
        ))}

        {notes.map(note => {
          const left = (note.time / TOTAL_STEPS) * 100
          const top = (1 - (note.pitch - MIN_PITCH + 1) / PITCH_RANGE) * 100
          const height = (1 / PITCH_RANGE) * 100
          const isDragging = draggingNote === note.id
          const isSelected = selectedNote === note.id

          return (
            <div
              key={note.id}
              className={`note-block ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
              style={{
                left: `calc(${left}% + 2px)`,
                top: `calc(${top}% + 2px)`,
                width: `calc(${NOTE_WIDTH_PERC}% - 4px)`,
                height: `calc(${height}% - 4px)`,
                background: getNoteColor(note.pitch, isDragging ? 1 : 0.8),
                boxShadow: isSelected ? '0 0 12px rgba(255,255,255,0.5)' : undefined
              }}
              onMouseDown={(e) => handleNoteMouseDown(e, note)}
              onTouchStart={(e) => handleNoteMouseDown(e, note)}
              onDoubleClick={(e) => handleNoteDoubleClick(e, note.id)}
            >
              <span style={{
                position: 'absolute',
                top: 1,
                left: 4,
                fontSize: 9,
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 600,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}>
                {getNoteName(note.pitch)}
              </span>

              {isSelected && (
                <div className="velocity-slider" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={note.velocity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value)
                      updateNoteVelocity(note.id, v)
                      onVelocityChange(v)
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          )
        })}

        {notes.length === 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 14,
            pointerEvents: 'none',
            textAlign: 'center',
            padding: 20
          }}>
            点击任意位置添加音符 · 拖拽移动 · 双击删除 · 选中调整力度
          </div>
        )}
      </div>
    </div>
  )
}

export default NoteEditor
