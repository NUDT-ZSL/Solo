import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import CardWall from './components/CardWall';
import { DesignSpec, generateSpec } from './utils/specGenerator';

function App() {
  const [specs, setSpecs] = useState<DesignSpec[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback((projectName: string, description: string, styles: string[]) => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateSpec(projectName, description, styles);
      setSpecs(generated);
      setIsGenerating(false);
    }, 50);
  }, []);

  const handleSpecChange = useCallback((updatedSpecs: DesignSpec[]) => {
    setSpecs(updatedSpecs);
  }, []);

  return (
    <div style={appStyle}>
      <Sidebar onGenerate={handleGenerate} />
      <main className="main-content" style={mainStyle}>
        {isGenerating ? (
          <div style={loadingStyle}>
            <div style={spinnerStyle}></div>
            <p style={loadingTextStyle}>正在生成设计规范...</p>
          </div>
        ) : (
          <CardWall specs={specs} onSpecChange={handleSpecChange} />
        )}
      </main>
    </div>
  );
}

const appStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#f1f3f5',
};

const mainStyle: React.CSSProperties = {
  minHeight: '100vh',
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '60vh',
  gap: '16px',
};

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '3px solid #dee2e6',
  borderTopColor: '#4361ee',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const loadingTextStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#6c757d',
  margin: 0,
};

export default App;
