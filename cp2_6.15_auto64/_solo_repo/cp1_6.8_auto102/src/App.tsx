import { AuroraScene } from './AuroraScene'
import { UIControls } from './UIControls'
import './index.css'

export default function App() {
  return (
    <div className="aurora-app">
      <AuroraScene />
      <div className="ui-overlay">
        <UIControls />
      </div>
    </div>
  )
}
