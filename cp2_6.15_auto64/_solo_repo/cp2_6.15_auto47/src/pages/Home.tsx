import { useState, useCallback } from 'react';
import Editor from '@/components/Editor';
import CommentPanel from '@/components/CommentPanel';

export default function Home() {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);

  const handleFrameSelect = useCallback((frameId: string | null, index: number | null) => {
    setSelectedFrameId(frameId);
    setSelectedFrameIndex(index);
  }, []);

  const frameName = selectedFrameIndex !== null
    ? `第 ${selectedFrameIndex + 1} 格`
    : '';

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Editor
          selectedFrameId={selectedFrameId}
          onFrameSelect={handleFrameSelect}
        />
      </div>
      <CommentPanel
        selectedFrameId={selectedFrameId}
        frameName={frameName}
      />
    </div>
  );
}
