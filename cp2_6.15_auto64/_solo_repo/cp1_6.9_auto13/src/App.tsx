import React, { useCallback, useState } from 'react'
import ColorPanel, { type ColorScheme } from './ColorPanel'
import GeometricCanvas from './GeometricCanvas'

const DEFAULT_SCHEME: ColorScheme = {
  bgHue: 210,
  mainHue: 340,
  accentHue: 140,
}

const App: React.FC = () => {
  const [scheme, setScheme] = useState<ColorScheme>(DEFAULT_SCHEME)

  const handleSchemeChange = useCallback((next: ColorScheme) => {
    setScheme(next)
  }, [])

  return (
    <div className="app">
      <ColorPanel scheme={scheme} onChange={handleSchemeChange} />
      <GeometricCanvas scheme={scheme} />
    </div>
  )
}

export default App
