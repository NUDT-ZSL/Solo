import { useState, useEffect, useCallback } from 'react';
import DocumentReader from './DocumentReader';
import ProgressTracker from './ProgressTracker';
import type { Document, UserProgress } from '../shared/types';

const USERS = [
  { id: 'user-001', name: '学生 A' },
  { id: 'user-002', name: '学生 B' },
  { id: 'user-003', name: '学生 C' },
];

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>(USERS[0].id);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [currentParagraph, setCurrentParagraph] = useState<number>(0);
  const [fadeKey, setFadeKey] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/documents')
      .then((res) => res.json())
      .then((data: Document[]) => {
        setDocuments(data);
        if (data.length > 0) {
          setCurrentDocument(data[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch documents:', err);
        setLoading(false);
      });
  }, []);

  const fetchUserProgress = useCallback((userId: string) => {
    if (!currentDocument) return;
    fetch(`/api/progress/${userId}`)
      .then((res) => res.json())
      .then((data: UserProgress[]) => {
        const docProgress = data.find((p) => p.documentId === currentDocument.id);
        if (docProgress) {
          setUserProgress(docProgress);
          setCurrentParagraph(docProgress.currentParagraph);
        } else {
          setUserProgress(null);
          setCurrentParagraph(0);
        }
      })
      .catch((err) => console.error('Failed to fetch progress:', err));
  }, [currentDocument]);

  useEffect(() => {
    if (selectedUserId && currentDocument) {
      fetchUserProgress(selectedUserId);
      setFadeKey((prev) => prev + 1);
    }
  }, [selectedUserId, currentDocument, fetchUserProgress]);

  const handleProgressUpdate = useCallback(() => {
    fetchUserProgress(selectedUserId);
  }, [selectedUserId, fetchUserProgress]);

  const handleParagraphChange = useCallback((index: number) => {
    setCurrentParagraph(index);
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>;
  }

  if (!currentDocument) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>暂无文档</div>;
  }

  return (
    <div className="app-container">
      <div className="reader-section">
        <DocumentReader
          document={currentDocument}
          currentParagraph={currentParagraph}
          userId={selectedUserId}
          onParagraphChange={handleParagraphChange}
          onProgressUpdate={handleProgressUpdate}
        />
      </div>
      <div className="tracker-section fade-in" key={fadeKey}>
        <ProgressTracker
          users={USERS}
          selectedUserId={selectedUserId}
          onUserChange={setSelectedUserId}
          userProgress={userProgress}
          totalParagraphs={currentDocument.paragraphs.length}
          currentParagraph={currentParagraph}
        />
      </div>
    </div>
  );
}

export default App;
