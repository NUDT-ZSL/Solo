import { useState } from 'react';
import ProjectCreate from './components/ProjectCreate';
import PixelEditor from './PixelEditor';

export default function App() {
  const [projectSize, setProjectSize] = useState<{ w: number; h: number } | null>(null);

  if (!projectSize) {
    return <ProjectCreate onConfirm={(w, h) => setProjectSize({ w, h })} />;
  }

  return <PixelEditor width={projectSize.w} height={projectSize.h} />;
}
