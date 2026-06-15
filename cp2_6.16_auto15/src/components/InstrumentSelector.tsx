import React, { useState } from 'react'
import { InstrumentType, INSTRUMENTS, InstrumentSelectorProps } from '@/types'

export default function InstrumentSelector({ onSelect }: InstrumentSelectorProps) {
  const [selected, setSelected] = useState<InstrumentType | null>(null)

  const handleClick = (type: InstrumentType) => {
    setSelected(type)
    setTimeout(() => onSelect(type), 300)
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>选择你的乐器</h1>
      <p style={styles.subtitle}>点击选择一种虚拟乐器开始排练</p>
      <div style={styles.cardGrid}>
        {INSTRUMENTS.map((inst) => {
          const isSelected = selected === inst.id
          return (
            <div
              key={inst.id}
              style={{
                ...styles.card,
                backgroundColor: inst.color,
                border: isSelected ? '3px solid #37474f' : '3px solid transparent',
                boxShadow: isSelected
                  ? `inset 0 0 12px rgba(255,255,255,0.6), 0 4px 20px rgba(0,0,0,0.3)`
                  : `0 4px 12px rgba(0,0,0,0.2)`,
                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
              }}
              onClick={() => handleClick(inst.id)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow =
                    'inset 0 0 12px rgba(255,255,255,0.6), 0 8px 24px rgba(0,0,0,0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow =
                    '0 4px 12px rgba(0,0,0,0.2)'
                }
              }}
            >
              <span style={styles.icon}>{inst.icon}</span>
              <span style={styles.cardName}>{inst.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '40px 20px',
    boxSizing: 'border-box',
  },
  title: {
    color: '#ffffff',
    fontSize: '42px',
    fontWeight: 'bold',
    fontFamily: "'Playfair Display', serif",
    marginBottom: '12px',
    letterSpacing: '2px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '16px',
    marginBottom: '48px',
  },
  cardGrid: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    width: '120px',
    height: '120px',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out, border 0.3s ease-out',
    userSelect: 'none',
  },
  icon: {
    fontSize: '36px',
    marginBottom: '8px',
  },
  cardName: {
    color: '#37474f',
    fontSize: '14px',
    fontWeight: '600',
  },
}
