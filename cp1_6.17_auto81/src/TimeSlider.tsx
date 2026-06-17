import { useCityStore } from './store'

export default function TimeSlider() {
  const { currentTime, setCurrentTime } = useCityStore()

  const formatTime = (hour: number): string => {
    const h = Math.floor(hour)
    return `${h.toString().padStart(2, '0')}:00`
  }

  return (
    <div style={{
      background: 'white',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      border: '1px solid #E0E0E0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>时间控制</span>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF6600' }}>{formatTime(currentTime)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="24"
        step="1"
        value={currentTime}
        onChange={(e) => setCurrentTime(Number(e.target.value))}
        style={{
          width: '100%',
          height: '8px',
          borderRadius: '4px',
          background: `linear-gradient(to right, #1a237e 0%, #FFA500 50%, #1a237e 100%)`,
          outline: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
          cursor: 'pointer'
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid #FF6600;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid #FF6600;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#888' }}>
        <span>00:00</span>
        <span>12:00</span>
        <span>24:00</span>
      </div>
    </div>
  )
}
