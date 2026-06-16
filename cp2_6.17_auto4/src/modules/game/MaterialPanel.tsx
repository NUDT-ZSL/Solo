import { MATERIALS, type Material } from './reactionEngine'

interface Props {
  onOpenBook: () => void
}

export default function MaterialPanel({ onOpenBook }: Props) {
  const handleDragStart = (e: React.DragEvent, material: Material) => {
    e.dataTransfer.setData('material-id', material.id)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      style={{
        width: 160,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        gap: 12,
        background: 'rgba(15, 23, 42, 0.6)',
        borderRight: '2px solid #b8860b',
      }}
    >
      <div
        style={{
          color: '#ffd700',
          fontSize: 18,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 4,
          textShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
        }}
      >
        材料库
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          flex: 1,
          alignContent: 'start',
        }}
      >
        {MATERIALS.map((mat) => (
          <div
            key={mat.id}
            draggable
            onDragStart={(e) => handleDragStart(e, mat)}
            title={mat.name}
            style={{
              width: 60,
              height: 80,
              borderRadius: 6,
              background: mat.color,
              border: '2px solid #b8860b',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: mat.id === 'salt' || mat.id === 'sulfur' || mat.id === 'silver' ? '#1e293b' : '#ffffff',
              fontSize: 12,
              fontWeight: 'bold',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 12px #ffd700'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)'
            }}
          >
            {mat.name}
          </div>
        ))}
      </div>

      <button
        onClick={onOpenBook}
        style={{
          width: '100%',
          height: 48,
          borderRadius: 8,
          background: '#1e293b',
          color: '#ffffff',
          border: '2px solid #b8860b',
          fontSize: 14,
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'background 0.25s ease, box-shadow 0.25s ease',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = '#334155'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = '#1e293b'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
        }}
      >
        📖 配方图鉴
      </button>
    </div>
  )
}
