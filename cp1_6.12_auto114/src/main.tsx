import React from 'react'
import ReactDOM from 'react-dom/client'
import { VoxelScene } from './VoxelScene'
import { VoxelControls } from './VoxelControls'

const App: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <VoxelScene />
      <VoxelControls />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
