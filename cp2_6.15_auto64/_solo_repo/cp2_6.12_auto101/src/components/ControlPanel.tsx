import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAppContext } from '../App'

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  width: '280px',
  background: 'rgba(10, 10, 30, 0.7)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(100, 150, 255, 0.3)',
  borderRadius: '8px',
  padding: '20px',
  zIndex: 50,
  color: '#ccccdd',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
}

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  marginBottom: '16px',
  color: '#ccccdd',
  textShadow: '0 0 8px rgba(100, 150, 255, 0.5)',
  letterSpacing: '1px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  marginBottom: '6px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const sliderTrackStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  borderRadius: '2px',
  background: 'rgba(255, 255, 255, 0.1)',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
}

const buttonBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  border: '1px solid rgba(100, 150, 255, 0.3)',
  borderRadius: '6px',
  background: 'rgba(68, 102, 255, 0.15)',
  color: '#ccccdd',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textShadow: '0 0 6px rgba(100, 150, 255, 0.3)',
  letterSpacing: '1px',
}

const sectionGap: React.CSSProperties = {
  marginBottom: '16px',
}

export default function ControlPanel() {
  const { galaxyParams, setGalaxyParams, triggerSupernova } = useAppContext()

  const handleArmCount = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGalaxyParams({ armCount: parseInt(e.target.value, 10) })
    },
    [setGalaxyParams]
  )

  const handleRotationSpeed = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGalaxyParams({ rotationSpeed: parseFloat(e.target.value) })
    },
    [setGalaxyParams]
  )

  const handleParticleScale = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGalaxyParams({ particleScale: parseFloat(e.target.value) })
    },
    [setGalaxyParams]
  )

  return (
    <motion.div
      style={panelStyle}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div style={titleStyle}>星系控制台</div>

      <div style={sectionGap}>
        <div style={labelStyle}>
          <span>旋臂数量</span>
          <span style={{ color: '#6688ff', fontWeight: 600 }}>{galaxyParams.armCount}</span>
        </div>
        <input
          type="range"
          min={2}
          max={5}
          step={1}
          value={galaxyParams.armCount}
          onChange={handleArmCount}
          style={sliderTrackStyle}
        />
      </div>

      <div style={sectionGap}>
        <div style={labelStyle}>
          <span>旋转速度</span>
          <span style={{ color: '#6688ff', fontWeight: 600 }}>{galaxyParams.rotationSpeed.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={2.0}
          step={0.1}
          value={galaxyParams.rotationSpeed}
          onChange={handleRotationSpeed}
          style={sliderTrackStyle}
        />
      </div>

      <div style={sectionGap}>
        <div style={labelStyle}>
          <span>粒子大小</span>
          <span style={{ color: '#6688ff', fontWeight: 600 }}>{galaxyParams.particleScale.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.1}
          value={galaxyParams.particleScale}
          onChange={handleParticleScale}
          style={sliderTrackStyle}
        />
      </div>

      <motion.button
        style={buttonBaseStyle}
        whileHover={{
          backgroundColor: 'rgba(102, 136, 255, 0.25)',
          borderColor: 'rgba(102, 136, 255, 0.6)',
          boxShadow: '0 0 15px rgba(68, 102, 255, 0.4)',
        }}
        whileTap={{ scale: 0.95 }}
        onClick={triggerSupernova}
      >
        ✦ 触发超新星
      </motion.button>

      <div style={{ marginTop: '14px', fontSize: '11px', color: 'rgba(204,204,221,0.4)', lineHeight: 1.6 }}>
        WASD 移动 · 鼠标拖拽旋转<br />
        Space 上升 · Shift 下降
      </div>
    </motion.div>
  )
}
