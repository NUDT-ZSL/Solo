import { FontProvider } from './context/FontContext';
import FontPanel from './components/FontPanel';
import PreviewPanel from './components/PreviewPanel';

export default function App() {
  return (
    <FontProvider>
      <div className="app-layout">
        <FontPanel />
        <PreviewPanel />
      </div>
    </FontProvider>
  );
}
