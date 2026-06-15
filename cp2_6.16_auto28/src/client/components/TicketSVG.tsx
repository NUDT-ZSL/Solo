import { useRef } from 'react'
import { Download } from 'lucide-react'

interface TicketSVGProps {
  nickname: string
  stageName: string
  date: string
  seatNumber: string
  hash: string
}

const TicketSVG = ({ nickname, stageName, date, seatNumber, hash }: TicketSVGProps) => {
  const svgRef = useRef<SVGSVGElement>(null)

  const patternElements = (() => {
    const elements: JSX.Element[] = []
    const seed = hash.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    
    for (let i = 0; i < 40; i++) {
      const pseudoRand = (Math.sin(seed + i * 123.456) + 1) / 2
      const x = pseudoRand * 500
      const y = ((Math.cos(seed + i * 78.9) + 1) / 2) * 280
      const r = 2 + pseudoRand * 6
      const opacity = 0.1 + pseudoRand * 0.3
      
      elements.push(
        <circle
          key={`circle-${i}`}
          cx={x}
          cy={y}
          r={r}
          fill="url(#grad1)"
          opacity={opacity}
        />
      )
    }

    for (let i = 0; i < 15; i++) {
      const pseudoRand1 = (Math.sin(seed * 2 + i * 45.6) + 1) / 2
      const pseudoRand2 = (Math.cos(seed * 3 + i * 32.1) + 1) / 2
      const x1 = pseudoRand1 * 500
      const y1 = pseudoRand2 * 280
      const x2 = x1 + (pseudoRand1 - 0.5) * 80
      const y2 = y1 + (pseudoRand2 - 0.5) * 60
      const opacity = 0.05 + pseudoRand1 * 0.15
      
      elements.push(
        <line
          key={`line-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="url(#grad1)"
          strokeWidth={1 + pseudoRand2 * 2}
          opacity={opacity}
          strokeLinecap="round"
        />
      )
    }

    for (let i = 0; i < 12; i++) {
      const pseudoRand1 = (Math.sin(seed * 4 + i * 67.8) + 1) / 2
      const pseudoRand2 = (Math.cos(seed * 5 + i * 54.3) + 1) / 2
      const pseudoRand3 = (Math.sin(seed * 6 + i * 89.0) + 1) / 2
      const cx = pseudoRand1 * 500
      const cy = pseudoRand2 * 280
      const rx = 8 + pseudoRand3 * 20
      const ry = 5 + pseudoRand1 * 15
      const rotation = pseudoRand2 * 360
      const opacity = 0.05 + pseudoRand3 * 0.1
      
      elements.push(
        <ellipse
          key={`ellipse-${i}`}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="url(#grad1)"
          strokeWidth={1}
          opacity={opacity}
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      )
    }

    return elements
  })()

  const generateHashStripes = () => {
    const stripes: JSX.Element[] = []
    for (let i = 0; i < hash.length; i++) {
      const charCode = hash.charCodeAt(i)
      const height = (charCode % 40) + 10
      const x = 380 + (i * 2.5)
      stripes.push(
        <rect
          key={`stripe-${i}`}
          x={x}
          y={260 - height}
          width={1.5}
          height={height}
          fill="rgba(255,255,255,0.6)"
          rx={0.75}
        />
      )
    }
    return stripes
  }

  const handleDownload = async () => {
    if (!svgRef.current) return

    try {
      const svgData = new XMLSerializer().serializeToString(svgRef.current)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = url
      })
      
      const canvas = document.createElement('canvas')
      const scale = 2
      canvas.width = 500 * scale
      canvas.height = 280 * scale
      
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')
      
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0, 500, 280)
      
      URL.revokeObjectURL(url)
      
      canvas.toBlob((blob) => {
        if (!blob) return
        
        const downloadUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `ticket-${hash.slice(0, 8)}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(downloadUrl)
      }, 'image/png', 0.95)
    } catch (error) {
      console.error('Failed to download ticket:', error)
      alert('门票下载失败，请重试')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        id="ticket-svg"
        ref={svgRef}
        width="500px"
        height="280px"
        viewBox="0 0 500 280"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.5))' }}
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
          <linearGradient id="ticketAccent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e040fb" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#00e5ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e040fb" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <pattern id="hashPattern" patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" fill="transparent"/>
            <circle cx="4" cy="4" r="0.8" fill="rgba(224, 64, 251, 0.15)"/>
          </pattern>
        </defs>

        <rect width="500" height="280" rx="16" fill="url(#bgGrad)" />
        <rect width="500" height="280" rx="16" fill="url(#hashPattern)" />
        
        {patternElements}
        
        <rect x="2" y="40" width="36" height="200" rx="6" fill="url(#ticketAccent)" />
        <rect x="462" y="40" width="36" height="200" rx="6" fill="url(#ticketAccent)" />
        
        <circle cx="40" cy="0" r="20" fill="#0d0221" />
        <circle cx="40" cy="280" r="20" fill="#0d0221" />
        <circle cx="460" cy="0" r="20" fill="#0d0221" />
        <circle cx="460" cy="280" r="20" fill="#0d0221" />
        
        <line x1="440" y1="20" x2="440" y2="260" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="8 4" />
        
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
              key={`bar-${i}`}
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
        
        {generateHashStripes()}
        
        <text x="380" y="25" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">
          {hash.slice(0, 16)}
        </text>
        
        <text x="380" y="265" fill="rgba(255,255,255,0.25)" fontSize="6" fontFamily="monospace" textAnchor="end">
          {hash.slice(16, 32)}
        </text>
      </svg>
      
      <button
        onClick={handleDownload}
        className="btn-gradient px-6 py-3 flex items-center gap-2"
      >
        <Download className="w-5 h-5" />
        下载门票 PNG
      </button>
    </div>
  )
}

export default TicketSVG
