import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  InstrumentType,
  EnsembleMode,
  Note,
  EnsembleResult,
  Measure,
  INSTRUMENTS,
  MODE_COLORS,
  TOTAL_MEASURES,
} from '@/types'
import { NotesBuffer } from '@/engine/NotesBuffer'
import { mergeEnsemble } from '@/engine/MergeEngine'
import { AudioEngine } from '@/engine/AudioEngine'

interface RehearsalRoomProps {
  instrument: InstrumentType
  onComplete: (result: EnsembleResult) => void
}

function genId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export default function RehearsalRoom({ instrument, onComplete }: RehearsalRoomProps) {
  const [mode, setMode] = useState<EnsembleMode>('align')
  const [currentMeasure, setCurrentMeasure] = useState(1)
  const [notes, setNotes] = useState<Note[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [draggingNote, setDraggingNote] = useState<Note | null>(null)
  const [dragPath, setDragPath] = useState<{ x: number; y: number }[]>([])
  const [showModePanel, setShowModePanel] = useState(false)
  const [completedMeasures, setCompletedMeasures] = useState<Measure[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const staffRef = useRef<HTMLDivElement>(null)
  const velocityRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const bufferRef = useRef<NotesBuffer>(new NotesBuffer(instrument))
  const audioRef = useRef<AudioEngine>(AudioEngine.getInstance())
  const startTimeRef = useRef<number>(Date.now())
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  const instrumentConfig = INSTRUMENTS.find((i) => i.id === instrument)!
  const modeColor = MODE_COLORS[mode]

  useEffect(() => {
    audioRef.current.init()
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleDragMove(e)
    const onUp = (e: MouseEvent) => handleDragEnd(e)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  })

  const handleStaffClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!staffRef.current || draggingNote) return
      const rect = staffRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const pitch = Math.max(0, Math.min(11, Math.floor((1 - y / rect.height) * 12)))
      const beat = Math.max(0, Math.min(3, Math.floor((x / rect.width) * 4)))

      const canPlace = checkModeConstraint(beat)
      if (!canPlace) return

      const newNote: Note = {
        id: genId(),
        instrument,
        pitch,
        beat,
        duration: 1,
        x,
        y,
      }
      setNotes((prev) => [...prev, newNote])
      bufferRef.current.addNote(newNote, currentMeasure)
      audioRef.current.playNote(instrument, pitch, 0.5)
    },
    [instrument, draggingNote, currentMeasure, mode]
  )

  const checkModeConstraint = (beat: number): boolean => {
    if (mode === 'align') {
      return beat === 0
    }
    if (mode === 'follow') {
      const lastNote = notes[notes.length - 1]
      if (lastNote && beat <= lastNote.beat) return false
      return true
    }
    return true
  }

  const handleNoteMouseDown = useCallback((e: React.MouseEvent, note: Note) => {
    e.stopPropagation()
    e.preventDefault()
    setDraggingNote(note)
    dragStartRef.current = { x: note.x, y: note.y }
    velocityRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    setDragPath([{ x: note.x, y: note.y }])
  }, [])

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingNote || !staffRef.current) return
      const rect = staffRef.current.getBoundingClientRect()
      const x = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left))
      const y = Math.max(14, Math.min(rect.height - 14, e.clientY - rect.top))
      const pitch = Math.max(0, Math.min(11, Math.floor((1 - y / rect.height) * 12)))
      const beat = Math.max(0, Math.min(3, Math.floor((x / rect.width) * 4)))

      setDragPath((prev) => [...prev, { x, y }])
      velocityRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }

      setNotes((prev) =>
        prev.map((n) =>
          n.id === draggingNote.id ? { ...n, x, y, pitch, beat } : n
        )
      )
    },
    [draggingNote]
  )

  const handleDragEnd = useCallback(
    (e: MouseEvent) => {
      if (!draggingNote) return

      if (velocityRef.current) {
        const dt = (Date.now() - velocityRef.current.time) / 1000
        if (dt > 0 && dt < 0.15) {
          const dx = e.clientX - velocityRef.current.x
          const dy = e.clientY - velocityRef.current.y
          const speed = Math.sqrt(dx * dx + dy * dy) / dt
          if (speed > 800) {
            setDeletingId(draggingNote.id)
            setTimeout(() => {
              setNotes((prev) => prev.filter((n) => n.id !== draggingNote.id))
              bufferRef.current.removeNote(draggingNote.id, currentMeasure)
              setDeletingId(null)
            }, 300)
            setDraggingNote(null)
            setDragPath([])
            return
          }
        }
      }

      bufferRef.current.updateNote(draggingNote.id, {
        x: draggingNote.x,
        y: draggingNote.y,
        pitch: draggingNote.pitch,
        beat: draggingNote.beat,
      })

      setDraggingNote(null)
      setDragPath([])
    },
    [draggingNote, currentMeasure]
  )

  const handleNoteDoubleClick = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    setDeletingId(noteId)
    setTimeout(() => {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      bufferRef.current.removeNote(noteId, currentMeasure)
      setDeletingId(null)
    }, 300)
  }, [currentMeasure])

  const handleCompleteMeasure = useCallback(() => {
    audioRef.current.playBell()
    bufferRef.current.completeMeasure(currentMeasure)

    const newMeasure: Measure = {
      measureNumber: currentMeasure,
      notes: [...notes],
      completed: true,
    }

    const updated = [...completedMeasures, newMeasure]
    setCompletedMeasures(updated)

    if (currentMeasure >= TOTAL_MEASURES) {
      bufferRef.current.completeMeasure(currentMeasure)
      const result = mergeEnsemble([bufferRef.current], mode, TOTAL_MEASURES)
      result.totalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      result.instrumentActivity = {
        piano: 0,
        violin: 0,
        cello: 0,
        flute: 0,
        percussion: 0,
      }
      updated.forEach((m) => {
        m.notes.forEach((n) => {
          result.instrumentActivity[n.instrument]++
        })
      })
      onComplete(result)
    } else {
      setCurrentMeasure((prev) => prev + 1)
      setNotes([])
    }
  }, [currentMeasure, notes, completedMeasures, mode, onComplete])

  const handlePlay = useCallback(() => {
    if (notes.length === 0) return
    setIsPlaying(true)
    setProgress(0)
    const tempMeasures: Measure[] = [
      { measureNumber: currentMeasure, notes, completed: false },
    ]
    const tempResult: EnsembleResult = {
      sessionId: 'preview',
      totalDuration: 2,
      measures: tempMeasures,
      instrumentActivity: { piano: 0, violin: 0, cello: 0, flute: 0, percussion: 0 },
      mode,
      createdAt: Date.now(),
    }
    audioRef.current.playEnsemble(tempResult, (p) => {
      setProgress(p)
      if (p >= 100) {
        setIsPlaying(false)
      }
    })
  }, [notes, currentMeasure, mode])

  const renderStaffLines = () => {
    const lines = []
    for (let i = 0; i < 5; i++) {
      lines.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${20 + i * 15}%`,
            height: '1px',
            backgroundColor: 'rgba(255,255,255,0.25)',
            pointerEvents: 'none',
          }}
        />
      )
    }
    return lines
  }

  const renderBeatMarkers = () => {
    const markers = []
    for (let i = 0; i < 4; i++) {
      markers.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${(i + 0.5) * 25}%`,
            width: '1px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }}
        />
      )
    }
    return markers
  }

  const renderDragPath = () => {
    if (dragPath.length < 2 || !draggingNote) return null
    const pathData = dragPath
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')
    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        <path
          d={pathData}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="3"
          strokeDasharray="6,4"
          fill="none"
        />
      </svg>
    )
  }

  const modes: { id: EnsembleMode; name: string; desc: string }[] = [
    { id: 'align', name: '对齐', desc: '仅小节开头触发' },
    { id: 'follow', name: '跟随', desc: '顺序节拍触发' },
    { id: 'free', name: '自由', desc: '无限制触发' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100vh',
        padding: '24px 32px',
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #1e1e2e 0%, #2b2b3c 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: 'bold',
            fontFamily: "'Playfair Display', serif",
            letterSpacing: '1px',
          }}
        >
          小节 {String(currentMeasure).padStart(3, '0')} /{' '}
          {String(TOTAL_MEASURES).padStart(3, '0')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '12px',
              backgroundColor: instrumentConfig.color + '33',
            }}
          >
            <span style={{ fontSize: '20px' }}>{instrumentConfig.icon}</span>
            <span style={{ color: instrumentConfig.color, fontSize: '14px', fontWeight: 600 }}>
              {instrumentConfig.name}
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${modeColor}, ${modeColor}bb)`,
                transition: 'transform 0.2s ease-out',
              }}
              onClick={() => setShowModePanel(!showModePanel)}
            >
              {modes.find((m) => m.id === mode)?.name}模式 ▾
            </button>

            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                overflow: 'hidden',
                height: showModePanel ? 'auto' : '0',
                opacity: showModePanel ? 1 : 0,
                transition: 'height 0.3s ease-out, opacity 0.3s ease-out',
              }}
            >
              {modes.map((m) => (
                <button
                  key={m.id}
                  style={{
                    height: '36px',
                    padding: '0 20px',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background:
                      mode === m.id
                        ? `linear-gradient(135deg, ${MODE_COLORS[m.id]}, ${MODE_COLORS[m.id]}99)`
                        : `linear-gradient(135deg, #37474f, #37474fbb)`,
                    transition:
                      'background 0.3s ease-out, height 0.3s ease-out, opacity 0.3s ease-out',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onClick={() => {
                    setMode(m.id)
                    setShowModePanel(false)
                  }}
                >
                  <span>{m.name}</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={staffRef}
        style={{
          width: '85%',
          height: '60%',
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'crosshair',
          flexShrink: 0,
        }}
        onClick={handleStaffClick}
      >
        {renderStaffLines()}
        {renderBeatMarkers()}
        {renderDragPath()}
        {notes.map((note) => {
          const isDragging = draggingNote?.id === note.id
          const isDeleting = deletingId === note.id
          return (
            <div
              key={note.id}
              style={{
                position: 'absolute',
                width: '40px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: instrumentConfig.color + 'cc',
                left: note.x - 20,
                top: note.y - 14,
                cursor: isDragging ? 'grabbing' : 'grab',
                transform: isDragging
                  ? 'scale(1.2)'
                  : isDeleting
                  ? 'scale(0.5) translateX(40px)'
                  : 'scale(1)',
                opacity: isDeleting ? 0 : 1,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.3s ease-out, opacity 0.3s ease-out',
                zIndex: isDragging ? 100 : 10,
                border: `2px solid ${instrumentConfig.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
              onMouseDown={(e) => handleNoteMouseDown(e, note)}
              onDoubleClick={(e) => handleNoteDoubleClick(e, note.id)}
            >
              <span
                style={{
                  fontSize: '10px',
                  color: '#37474f',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                }}
              >
                {note.pitch}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ width: '100%', marginTop: '20px', flexShrink: 0 }}>
        <div
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            backgroundColor: '#4a4a5a',
            overflow: 'hidden',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '3px',
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${modeColor}, ${modeColor}aa)`,
              transition: 'width 0.1s linear',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            style={{
              padding: '12px 32px',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              backgroundColor: isPlaying ? '#4a4a5a' : modeColor,
              opacity: isPlaying ? 0.6 : 1,
              transition: 'background-color 0.2s ease-out, opacity 0.2s ease-out',
            }}
            onClick={handlePlay}
            disabled={isPlaying}
          >
            {isPlaying ? '播放中...' : '播放预览'}
          </button>
          <button
            style={{
              padding: '12px 32px',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${modeColor}, ${modeColor}cc)`,
              transition: 'background-color 0.2s ease-out',
            }}
            onClick={handleCompleteMeasure}
          >
            完成小节 ({currentMeasure}/{TOTAL_MEASURES})
          </button>
        </div>
      </div>
    </div>
  )
}
