import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import NetworkScene from './NetworkScene'
import {
  NodeData,
  LinkData,
  ParticleData,
  TrafficStats,
  generateInitialData,
  updateNodeTraffic,
  updateLinkTraffic,
  generateTrafficStats,
  generateParticle
} from './dataGenerator'

interface HoverInfo {
  node: NodeData
  x: number
  y: number
}

export default function App() {
  const [nodes, setNodes] = useState<NodeData[]>([])
  const [links, setLinks] = useState<LinkData[]>([])
  const [particles, setParticles] = useState<ParticleData[]>([])
  const [stats, setStats] = useState<TrafficStats>({
    activeConnections: 0,
    totalTraffic: 0,
    topPairs: []
  })
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [fps, setFps] = useState(60)
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(performance.now())
  const particleSpawnRef = useRef(0)

  useEffect(() => {
    const initial = generateInitialData()
    setNodes(initial.nodes)
    setLinks(initial.links)
    setStats(generateTrafficStats(initial.nodes, initial.links))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prev) => {
        const updated = updateNodeTraffic(prev)
        return updated
      })
      setLinks((prev) => {
        const updated = updateLinkTraffic(prev)
        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (nodes.length > 0 && links.length > 0) {
      setStats(generateTrafficStats(nodes, links))
    }
  }, [nodes, links])

  const updateParticles = useCallback(
    (delta: number) => {
      setParticles((prev) => {
        particleSpawnRef.current += delta
        const spawnRate = 1 / 17

        let newParticles = prev
          .map((p) => ({ ...p, progress: p.progress + p.speed * delta }))
          .filter((p) => p.progress < 1)

        while (particleSpawnRef.current > spawnRate && newParticles.length < 100) {
          particleSpawnRef.current -= spawnRate
          const p = generateParticle(links)
          if (p) newParticles = [...newParticles, p]
        }

        return newParticles.slice(0, 100)
      })
    },
    [links]
  )

  useEffect(() => {
    let animationId: number
    let lastTime = performance.now()

    const animate = () => {
      const now = performance.now()
      const delta = (now - lastTime) / 1000
      lastTime = now

      frameCountRef.current++
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current)
        frameCountRef.current = 0
        lastFpsTimeRef.current = now
      }

      updateParticles(delta)
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [updateParticles])

  const handleNodeHover = useCallback((node: NodeData | null, event?: React.MouseEvent) => {
    if (node && event) {
      setHoverInfo({ node, x: event.clientX, y: event.clientY })
    } else {
      setHoverInfo(null)
    }
  }, [])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (hoverInfo) {
      setHoverInfo((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : null))
    }
  }, [hoverInfo])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: '1024px',
        background: 'linear-gradient(180deg, #05051a 0%, #0f0f2e 100%)',
        overflow: 'hidden'
      }}
      onMouseMove={handleMouseMove}
    >
      <Canvas
        camera={{ position: [0, 0, 22], fov: 60 }}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5} />
        <NetworkScene
          nodes={nodes}
          links={links}
          particles={particles}
          onNodeHover={handleNodeHover}
        />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          rotateSpeed={0.5}
          panSpeed={1}
          zoomSpeed={1}
          minDistance={11}
          maxDistance={66}
          mouseButtons={{
            LEFT: 0,
            MIDDLE: 1,
            RIGHT: 2
          }}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#e2e8f0',
          textShadow: '0 0 8px rgba(56,189,248,0.5)',
          letterSpacing: '2px',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 10
        }}
      >
        DataFlow
      </div>

      <div
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          width: '280px',
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
          color: '#e2e8f0',
          zIndex: 10,
          pointerEvents: 'none'
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#f1f5f9' }}>
          实时流量监控
        </div>

        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>活跃连接数</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px' }}>{stats.activeConnections}</span>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>总流量/秒</span>
          <span style={{ color: '#22d3ee', fontWeight: 600, fontSize: '14px' }}>
            {stats.totalTraffic.toFixed(1)} MB/s
          </span>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#f1f5f9' }}>
            流量 TOP 3
          </div>
          {stats.topPairs.map((pair, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                fontSize: '12px'
              }}
            >
              <span style={{ color: '#cbd5e1' }}>
                {pair.source} <span style={{ color: '#64748b' }}>→</span> {pair.target}
              </span>
              <span style={{ color: '#a78bfa', fontWeight: 500 }}>{pair.traffic.toFixed(1)} MB/s</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '20px',
          fontSize: '12px',
          color: '#94a3b8',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 10
        }}
      >
        FPS: {fps}
      </div>

      {hoverInfo && (
        <div
          style={{
            position: 'fixed',
            left: hoverInfo.x + 16,
            top: hoverInfo.y + 16,
            width: '220px',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            color: '#1e293b',
            zIndex: 100,
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', color: '#0f172a' }}>
            {hoverInfo.node.name}
          </div>
          <div style={{ fontSize: '12px', marginBottom: '6px', color: '#475569' }}>
            IP: <span style={{ color: '#1e293b', fontFamily: 'monospace' }}>{hoverInfo.node.ip}</span>
          </div>
          <div style={{ fontSize: '12px', marginBottom: '6px', color: '#475569' }}>
            上行: <span style={{ color: '#22c55e' }}>{hoverInfo.node.upload.toFixed(1)} KB/s</span>
          </div>
          <div style={{ fontSize: '12px', marginBottom: '6px', color: '#475569' }}>
            下行: <span style={{ color: '#3b82f6' }}>{hoverInfo.node.download.toFixed(1)} KB/s</span>
          </div>
          <div style={{ fontSize: '12px', color: '#475569' }}>
            连接数: <span style={{ color: '#a78bfa', fontWeight: 500 }}>{hoverInfo.node.connectionCount}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
