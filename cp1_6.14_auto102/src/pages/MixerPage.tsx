import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import useAudioEngine from '../hooks/useAudioEngine'
import { soundApi, presetsApi } from '../http'
import AudioMixer from '../components/AudioMixer'
import SoundSourceCard from '../components/SoundSourceCard'
import type { SoundSource, SoundTrackItem, MixState } from '../types'

const MixerPage: React.FC = () => {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const audioEngine = useAudioEngine()

  const [sounds, setSounds] = useState<SoundSource[]>([])
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [dragOverZone, setDragOverZone] = useState(false)
  const [mixState, setMixState] = useState<MixState | null>(null)

  useEffect(() => {
    soundApi.getSounds().then(setSounds).catch(console.error)
  }, [])

  useEffect(() => {
    const { tracks, masterVolume, isPlaying, soloTrackId } = state
    tracks.forEach((track) => {
      const exists = audioEngine.trackLevels[track.id] !== undefined
      if (!exists) {
        audioEngine.addTrack(track.id, track.soundId, track.volume)
      }
    })

    Object.keys(audioEngine.trackLevels).forEach((id) => {
      if (!tracks.find((t) => t.id === id)) {
        audioEngine.removeTrack(id)
      }
    })
  }, [state.tracks])

  useEffect(() => {
    audioEngine.setMasterVolume(state.masterVolume)
  }, [state.masterVolume])

  useEffect(() => {
    state.tracks.forEach((track) => {
      audioEngine.setTrackVolume(track.id, track.muted ? 0 : track.volume)
      audioEngine.setTrackMuted(track.id, track.muted, track.volume)
      audioEngine.setTrackEq(track.id, track.eq)
    })

    if (state.soloTrackId) {
      audioEngine.setSoloMode(
        state.soloTrackId,
        state.tracks.map((t) => ({
          id: t.id,
          volume: t.volume,
          muted: t.muted,
          solo: t.id === state.soloTrackId,
        }))
      )
    } else {
      audioEngine.setSoloMode(null, state.tracks.map((t) => ({
        id: t.id,
        volume: t.volume,
        muted: t.muted,
        solo: false,
      })))
    }
  }, [state.tracks, state.soloTrackId])

  useEffect(() => {
    if (state.isPlaying && !audioEngine.state.isPlaying) {
      audioEngine.play()
    } else if (!state.isPlaying && audioEngine.state.isPlaying) {
      audioEngine.pause()
    }
  }, [state.isPlaying])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOverZone(false)
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json')) as SoundSource
        const trackId = `${data.id}-${Date.now()}`
        const newTrack: SoundTrackItem = {
          id: trackId,
          soundId: data.id,
          name: data.name,
          emoji: data.emoji,
          volume: 70,
          muted: false,
          solo: false,
          eq: { low: 0, mid: 0, high: 0 },
        }
        dispatch({ type: 'ADD_TRACK', payload: newTrack })
      } catch (_) {}
    },
    [dispatch]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOverZone(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverZone(false)
  }, [])

  const handleVolumeChange = useCallback(
    (trackId: string, volume: number) => {
      dispatch({ type: 'SET_TRACK_VOLUME', payload: { id: trackId, volume } })
    },
    [dispatch]
  )

  const handleMuteToggle = useCallback(
    (trackId: string) => {
      dispatch({ type: 'TOGGLE_MUTE', payload: trackId })
    },
    [dispatch]
  )

  const handleSoloToggle = useCallback(
    (trackId: string) => {
      dispatch({ type: 'TOGGLE_SOLO', payload: trackId })
    },
    [dispatch]
  )

  const handleRemoveTrack = useCallback(
    (trackId: string) => {
      audioEngine.removeTrack(trackId)
      dispatch({ type: 'REMOVE_TRACK', payload: trackId })
    },
    [dispatch, audioEngine]
  )

  const handleMasterVolumeChange = useCallback(
    (volume: number) => {
      dispatch({ type: 'SET_MASTER_VOLUME', payload: volume })
    },
    [dispatch]
  )

  const handleTogglePlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' })
  }, [dispatch])

  const handleEqChange = useCallback(
    (trackId: string, eq: { low: number; mid: number; high: number }) => {
      dispatch({ type: 'SET_TRACK_EQ', payload: { id: trackId, eq } })
    },
    [dispatch]
  )

  const handleSave = useCallback(async () => {
    if (!presetName.trim() || state.tracks.length === 0) return
    setIsSaving(true)
    try {
      const result = await presetsApi.createPreset({
        name: presetName.trim(),
        description: presetDescription.trim(),
        tracks: state.tracks,
        masterVolume: state.masterVolume,
      })
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        navigate('/presets')
      }, 1200)
    } catch (err) {
      console.error('保存失败:', err)
    } finally {
      setIsSaving(false)
    }
  }, [presetName, presetDescription, state.tracks, state.masterVolume, navigate])

  const categories = Array.from(new Set(sounds.map((s) => s.category)))

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden',
      }}
    >
      <aside
        style={{
          width: '280px',
          minWidth: '280px',
          background: '#2d2a3e',
          borderRight: '1px solid #3a3650',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 16px 12px',
            borderBottom: '1px solid #3a3650',
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#e0d8f0',
              marginBottom: '4px',
            }}
          >
            🎵 音源库
          </h2>
          <p style={{ fontSize: '12px', color: '#7c7599' }}>
            拖拽音源到右侧混音区
          </p>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
          }}
        >
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: '16px' }}>
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#7c7599',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '8px',
                  paddingLeft: '4px',
                }}
              >
                {cat}
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                {sounds
                  .filter((s) => s.category === cat)
                  .map((sound) => (
                    <SoundSourceCard key={sound.id} sound={sound} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            border: dragOverZone ? '2px dashed #6c5ce7' : '2px solid transparent',
            borderRadius: '12px',
            margin: '8px',
            background: dragOverZone ? 'rgba(108, 92, 231, 0.05)' : 'transparent',
          }}
        >
          <AudioMixer
            tracks={state.tracks}
            masterVolume={state.masterVolume}
            isPlaying={state.isPlaying}
            trackLevels={audioEngine.trackLevels}
            soloTrackId={state.soloTrackId}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={handleMuteToggle}
            onSoloToggle={handleSoloToggle}
            onRemoveTrack={handleRemoveTrack}
            onMasterVolumeChange={handleMasterVolumeChange}
            onTogglePlay={handleTogglePlay}
            onEqChange={handleEqChange}
            onMixStateChange={setMixState}
          />
        </div>

        {state.tracks.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              background: '#16162a',
              borderTop: '1px solid #2d2a3e',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="预设名称"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#2d2a3e',
                border: '1px solid #3a3650',
                color: '#e0d8f0',
                fontSize: '14px',
                width: '160px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6c5ce7' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#3a3650' }}
            />
            <input
              type="text"
              placeholder="描述（可选）"
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#2d2a3e',
                border: '1px solid #3a3650',
                color: '#e0d8f0',
                fontSize: '14px',
                flex: 1,
                minWidth: '120px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6c5ce7' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#3a3650' }}
            />
            <button
              onClick={handleSave}
              disabled={!presetName.trim() || isSaving}
              style={{
                width: '100px',
                height: '40px',
                borderRadius: '8px',
                background: saveSuccess ? '#00d2a0' : '#00b894',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                opacity: !presetName.trim() || isSaving ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (presetName.trim() && !isSaving) e.currentTarget.style.background = '#00d2a0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = saveSuccess ? '#00d2a0' : '#00b894'
              }}
            >
              {saveSuccess ? '✓ 已保存' : isSaving ? '保存中...' : '💾 保存'}
            </button>
            <button
              onClick={() => {
                audioEngine.clearAllTracks()
                dispatch({ type: 'CLEAR_TRACKS' })
                setPresetName('')
                setPresetDescription('')
              }}
              style={{
                width: '80px',
                height: '40px',
                borderRadius: '8px',
                background: '#4a4660',
                color: '#e0d8f0',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#4a4660'; e.currentTarget.style.color = '#e0d8f0' }}
            >
              清空
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default MixerPage
