import Canvas from '@/components/Canvas'
import Controls from '@/components/Controls'

export default function App() {
  return (
    <div className="app-root">
      <Canvas />
      <div className="controls-container">
        <Controls />
      </div>
    </div>
  )
}
