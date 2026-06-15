import { Download } from 'lucide-react'

interface TicketSVGProps {
  nickname: string
  stageName: string
  date: string
  seatNumber: string
  hash: string
  onDownload: () => void
}

const TicketSVG = ({ nickname, stageName, date, seatNumber, hash, onDownload }: TicketSVGProps) => {
  const generatePattern = () => {
    const patterns = []
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 500
      const y = Math.random() * 280
      const r = 2 + Math.random() * 6
      const opacity = 0.1 + Math.random() * 0.3
      patterns.push(
        `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#grad1)" opacity="${opacity}" />`
      )
    }
    return patterns.join('')
  }

  const generateHashStripes = () => {
    const stripes = []
    for (let i = 0; i < hash.length; i++) {
      const charCode = hash.charCodeAt(i)
      const height = (charCode % 40) + 10
      const x = 380 + (i * 2.5)
      stripes.push(
        `<rect x="${x}" y="${260 - height}" width="1.5" height="${height}" fill="rgba(255,255,255,0.6)" rx="0.75" />`
      )
    }
    return stripes.join('')
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        id="ticket-svg"
        width="500"
        height="280"
        viewBox="0 0 500 280"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e040fb" />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a0033" />
            <stop offset="100%" stopColor="#0d0221" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <rect width="500" height="280" rx="16" fill="url(#bgGrad)" />
        
        <g dangerouslySetInnerHTML={{ __html: generatePattern() }} />
        
        <circle cx="40" cy="0" r="20" fill="#0d0221" />
        <circle cx="40" cy="280" r="20" fill="#0d0221" />
        <circle cx="460" cy="0" r="20" fill="#0d0221" />
        <circle cx="460" cy="280" r="20" fill="#0d0221" />
        
        <line x1="440" y1="20" x2="440" y2="260" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="8 4" />
        
        <g filter="url(#glow)">
          <text x="30" y="60" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">
            {nickname}
          </text>
          <text x="30" y="90" fill="rgba(255,255,255,0.6)" fontSize="14" fontFamily="sans-serif">
            {stageName}
          </text>
        </g>
        
        <g>
          <text x="30" y="220" fill="rgba(255,255,255,0.8)" fontSize="12" fontFamily="sans-serif">
            {date}
          </text>
          <text x="30" y="245" fill="white" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
            座位号: {seatNumber}
          </text>
        </g>
        
        <g transform="translate(60, 110)">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={i}
              x={i * 35}
              y="0"
              width="30"
              height="70"
              rx="4"
              fill="url(#grad1)"
              opacity={0.3 + (i % 3) * 0.2}
            />
          ))}
        </g>
        
        <g transform="translate(455, 140)" textAnchor="middle">
          <text x="0" y="0" fill="white" fontSize="10" fontFamily="sans-serif" transform="rotate(90)">
            VIRTUAL FESTIVAL
          </text>
        </g>
        
        <g dangerouslySetInnerHTML={{ __html: generateHashStripes() }} />
        
        <text x="380" y="25" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">
          {hash.slice(0, 16)}
        </text>
      </svg>
      
      <button
        onClick={onDownload}
        className="btn-gradient px-6 py-3 flex items-center gap-2"
      >
        <Download className="w-5 h-5" />
        下载门票 PNG
      </button>
    </div>
  )
}

export default TicketSVG
