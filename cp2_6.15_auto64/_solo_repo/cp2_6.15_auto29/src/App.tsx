import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SculptureMesh from './SculptureMesh'
import { audioAnalyzer } from './AudioAnalyzer'
import { useAudioStore } from './store'

function StarField() {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 300

  const [positions, baseSizes, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const sz = new Float32Array(count)
    const ph = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const r = 15 + Math.random() * 25
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)

      sz[i] = 1 + Math.random() * 2
      ph[i] = Math.random() * Math.PI * 2
    }

    return [pos, sz, ph]
  }, [])

  const starUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: window.devicePixelRatio || 1 },
  }), [])

  useFrame((state) => {
    starUniforms.uTime.value = state.clock.elapsedTime
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aBaseSize', new THREE.BufferAttribute(baseSizes, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    return geo
  }, [positions, baseSizes, phases])

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        uniforms={starUniforms}
        vertexShader={`
          attribute float aBaseSize;
          attribute float aPhase;
          uniform float uTime;
          uniform float uPixelRatio;
          varying float vTwinkle;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

            float period = 2.0 + (aPhase / 6.28318) * 2.0;
            float t = (uTime + aPhase) / period;
            float twinkle = clamp(0.5 + sin(t * 6.28318) * 0.5, 0.0, 1.0);
            vTwinkle = twinkle;

            float pixelSize = clamp(1.0 + twinkle * 2.0, 1.0, 3.0);
            float size = aBaseSize * pixelSize;

            gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying float vTwinkle;

          void main() {
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);
            if (dist > 0.5) discard;

            float alpha = smoothstep(0.5, 0.2, dist);
            alpha *= 0.7 + vTwinkle * 0.5;

            vec3 color = vec3(1.0);
            gl_FragColor = vec4(color, alpha);
          }
        `}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function Scene() {
  const lowFreq = useAudioStore((s) => s.lowFreqEnergy)
  const midFreq = useAudioStore((s) => s.midFreqEnergy)
  const highFreq = useAudioStore((s) => s.highFreqEnergy)
  const volume = useAudioStore((s) => s.volume)

  const lightRef = useRef<THREE.PointLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)

  useFrame(({ clock }) => {
    void clock
    if (lightRef.current) {
      const intensity = 1.5 + volume * 2 + lowFreq * 1.5
      lightRef.current.intensity = intensity
      lightRef.current.color.setHSL(
        0.55 + midFreq * 0.2,
        0.6 + highFreq * 0.3,
        0.5 + volume * 0.2
      )
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.15 + midFreq * 0.1
    }
  })

  return (
    <>
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={2.5}
        maxDistance={25}
        rotateSpeed={0.8}
        zoomSpeed={0.6}
      />
      <ambientLight ref={ambientRef} intensity={0.15} color="#aabbff" />
      <pointLight ref={lightRef} position={[5, 5, 5]} intensity={1.5} distance={30} decay={2} />
      <pointLight position={[-5, -3, -5]} intensity={0.8} color="#ff6699" distance={20} decay={2} />
      <pointLight position={[0, -5, 3]} intensity={0.6} color="#6699ff" distance={15} decay={2} />
      <SculptureMesh />
      <StarField />
    </>
  )
}

function BackgroundGradient() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, #1a1a3a 0%, #0a0a1a 70%, #050510 100%)',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}

function VolumeMeter({ volume }: { volume: number }) {
  const clampedVolume = Math.max(0, Math.min(1, volume))
  const safeVolume = isNaN(clampedVolume) ? 0 : clampedVolume
  const maskWidth = (1 - safeVolume) * 100
  const safeMaskWidth = Math.max(0, Math.min(100, maskWidth))

  return (
    <div
      style={{
        width: 200,
        height: 20,
        background: 'linear-gradient(90deg, #00cc66 0%, #00cc66 45%, #ffcc00 65%, #ffcc00 80%, #ff3333 95%, #ff3333 100%)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: `${safeMaskWidth}%`,
          background: '#2a2a2a',
          transition: 'width 0.05s ease-out',
          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  )
}

function ControlPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const volume = useAudioStore((s) => s.volume)
  const sourceType = useAudioStore((s) => s.sourceType)
  const uploadProgress = useAudioStore((s) => s.uploadProgress)
  const setSourceType = useAudioStore((s) => s.setSourceType)
  const setUploadProgress = useAudioStore((s) => s.setUploadProgress)
  const [isLoading, setIsLoading] = useState(false)
  const [activeButton, setActiveButton] = useState<string | null>(null)

  useEffect(() => {
    audioAnalyzer.setProgressCallback((p) => {
      setUploadProgress(p)
    })
  }, [setUploadProgress])

  const sourceLabel = useMemo(() => {
    switch (sourceType) {
      case 'microphone': return '🎤 麦克风'
      case 'file': return '🎵 音频文件'
      default: return '⭕ 无输入源'
    }
  }, [sourceType])

  const handleMicrophone = useCallback(async () => {
    setActiveButton('mic')
    setIsLoading(true)
    const success = await audioAnalyzer.connectMicrophone()
    if (success) {
      setSourceType('microphone')
    }
    setIsLoading(false)
    setTimeout(() => setActiveButton(null), 200)
  }, [setSourceType])

  const handleFileUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setActiveButton('file')
    setIsLoading(true)
    setUploadProgress(0)
    const success = await audioAnalyzer.loadAudioFile(file)
    if (success) {
      setSourceType('file')
    }
    setIsLoading(false)
    setTimeout(() => setActiveButton(null), 200)
    e.target.value = ''
  }, [setSourceType, setUploadProgress])

  const handleStop = useCallback(() => {
    setActiveButton('stop')
    audioAnalyzer.stop()
    setSourceType('none')
    setTimeout(() => setActiveButton(null), 200)
  }, [setSourceType])

  const buttonStyle = (buttonKey: string): React.CSSProperties => ({
    width: '100%',
    padding: '14px 20px',
    borderRadius: 8,
    border: 'none',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    background: activeButton === buttonKey
      ? 'linear-gradient(180deg, #3a3a7a 0%, #5a5a9a 100%)'
      : 'linear-gradient(180deg, #2a2a5a 0%, #4a4a8a 100%)',
    transform: activeButton === buttonKey ? 'translateY(2px) scale(0.98)' : 'translateY(0)',
    transition: 'all 0.15s ease',
    boxShadow: activeButton === buttonKey
      ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
    opacity: isLoading ? 0.7 : 1,
    letterSpacing: '0.5px',
  })

  const buttonHover: React.CSSProperties = {
    background: 'linear-gradient(180deg, #4a4a8a 0%, #6a6aaa 100%)',
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 280,
        height: '100%',
        background: 'rgba(20, 20, 40, 0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: '0 16px 16px 0',
        color: '#ffffff',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
        borderRight: '1px solid rgba(100,100,200,0.15)',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            color: '#aaa',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginBottom: 8,
          }}
        >
          音频雕塑可视化
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          Audio Sculpture
        </div>
        <div style={{ height: 1, background: 'linear-gradient(90deg, #333, transparent)', marginTop: 16 }} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12,
            color: '#888',
            marginBottom: 6,
            fontWeight: 500,
            letterSpacing: 1,
          }}
        >
          当前输入源
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: sourceType === 'none' ? '#888' : '#aaa',
            marginBottom: 12,
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
            border: '1px solid rgba(100,100,200,0.1)',
          }}
        >
          {sourceLabel}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#888',
            marginBottom: 6,
            fontWeight: 500,
            letterSpacing: 1,
          }}
        >
          音量电平
        </div>
        <VolumeMeter volume={volume} />
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#666',
          }}
        >
          <span>低</span>
          <span>中</span>
          <span>高</span>
        </div>
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              color: '#888',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            加载中... {uploadProgress}%
          </div>
          <div
            style={{
              width: '60%',
              height: 6,
              background: '#333',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${uploadProgress}%`,
                background: 'linear-gradient(90deg, #88ccff, #aaddff)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={buttonStyle('mic')}
          onMouseEnter={(e) => { if (!isLoading && activeButton !== 'mic') Object.assign(e.currentTarget.style, buttonHover) }}
          onMouseLeave={(e) => { if (activeButton !== 'mic') Object.assign(e.currentTarget.style, buttonStyle('mic')) }}
          onClick={handleMicrophone}
        >
          🎤 使用麦克风
        </div>

        <div
          style={buttonStyle('file')}
          onMouseEnter={(e) => { if (!isLoading && activeButton !== 'file') Object.assign(e.currentTarget.style, buttonHover) }}
          onMouseLeave={(e) => { if (activeButton !== 'file') Object.assign(e.currentTarget.style, buttonStyle('file')) }}
          onClick={handleFileUploadClick}
        >
          📁 上传音频文件
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,audio/wav,audio/mp3,audio/mpeg"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div
          style={{ ...buttonStyle('stop'), marginTop: 12 }}
          onMouseEnter={(e) => { if (activeButton !== 'stop') Object.assign(e.currentTarget.style, { background: 'linear-gradient(180deg, #6a3a3a 0%, #8a4a4a 100%)' }) }}
          onMouseLeave={(e) => { if (activeButton !== 'stop') Object.assign(e.currentTarget.style, buttonStyle('stop')) }}
          onClick={handleStop}
        >
          ⏹ 停止播放
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg, #333, transparent)', marginBottom: 16 }} />
        <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
          💡 提示：鼠标拖拽旋转视图，滚轮缩放场景。
          选择输入源后，雕塑将随音频节奏动态变化。
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const setAudioData = useAudioStore((s) => s.setAudioData)

  useEffect(() => {
    const unsubscribe = audioAnalyzer.subscribe((data) => {
      setAudioData(data)
    })
    return () => {
      unsubscribe()
      audioAnalyzer.destroy()
    }
  }, [setAudioData])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <BackgroundGradient />
      <Canvas
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        camera={{ position: [0, 2, 8], fov: 55, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        dpr={[1, 2]}
        frameloop="always"
      >
        <Scene />
      </Canvas>
      <ControlPanel />
    </div>
  )
}
