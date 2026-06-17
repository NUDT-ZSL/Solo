import GradientEditor from './GradientEditor';
import PreviewBackground from './PreviewBackground';

export default function App() {
  return (
    <div className="app-layout">
      <aside className="editor-sidebar">
        <GradientEditor />
      </aside>
      <main className="preview-area">
        <PreviewBackground />
      </main>
    </div>
  );
}
