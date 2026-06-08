export default function WaveBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-ocean-400/20 via-ocean-600/30 to-ocean-900/60" />

      <svg
        className="absolute bottom-0 left-0 w-[200%] h-32 animate-wave-slow opacity-30"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C240,20 480,100 720,60 C960,20 1200,100 1440,60 L1440,120 L0,120 Z"
          fill="rgba(125,211,252,0.3)"
        />
      </svg>

      <svg
        className="absolute bottom-0 left-0 w-[200%] h-28 animate-wave-medium opacity-20"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0,50 C200,80 400,20 600,50 C800,80 1000,20 1200,50 C1400,80 1440,50 1440,50 L1440,120 L0,120 Z"
          fill="rgba(56,189,248,0.4)"
        />
      </svg>

      <svg
        className="absolute bottom-0 left-0 w-[200%] h-24 animate-wave-fast opacity-15"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
      >
        <path
          d="M0,40 C180,10 360,70 540,40 C720,10 900,70 1080,40 C1260,10 1440,40 1440,40 L1440,120 L0,120 Z"
          fill="rgba(167,243,208,0.3)"
        />
      </svg>

      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-ocean-300/5 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-seafoam-500/5 blur-3xl" />
      <div className="absolute bottom-1/3 left-1/3 w-56 h-56 rounded-full bg-ocean-400/5 blur-3xl" />
    </div>
  )
}
