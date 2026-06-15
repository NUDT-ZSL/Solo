import { CoreEngine } from './CoreEngine'
import { UILayer } from './UILayer'

const engine = new CoreEngine()

export default function App() {
  return <UILayer engine={engine} />
}
