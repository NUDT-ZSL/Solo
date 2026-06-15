import Toolbar from './components/Toolbar'
import Canvas from './components/Canvas'
import PropertiesPanel from './components/PropertiesPanel'

export default function App() {
  return (
    <div className="app-container">
      <Toolbar />
      <div className="main-content">
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  )
}
