import { useState, useEffect, useRef } from 'react';
import type { Document } from '../shared/types';

interface DocumentReaderProps {
  document: Document;
  currentParagraph: number;
  userId: string;
  onParagraphChange: (index: number) => void;
  onProgressUpdate: () => void;
}

function DocumentReader({
  document,
  currentParagraph,
  userId,
  onParagraphChange,
  onProgressUpdate,
}: DocumentReaderProps) {
  const [paragraphStartTime, setParagraphStartTime] = useState<number>(Date.now());
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalParagraphs = document.paragraphs.length;
  const progressPercent = ((currentParagraph + 1) / totalParagraphs) * 100;

  useEffect(() => {
    setParagraphStartTime(Date.now());
  }, [currentParagraph]);

  const uploadProgress = async (paragraphIndex: number, readingTime: number) => {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          documentId: document.id,
          paragraphIndex,
          readingTime,
        }),
      });
      onProgressUpdate();
    } catch (err) {
      console.error('Failed to upload progress:', err);
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const readingTime = Date.now() - paragraphStartTime;

    if (uploadTimerRef.current) {
      clearTimeout(uploadTimerRef.current);
    }

    uploadProgress(currentParagraph, readingTime);

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = Math.max(0, currentParagraph - 1);
    } else {
      newIndex = Math.min(totalParagraphs - 1, currentParagraph + 1);
    }

    onParagraphChange(newIndex);
  };

  useEffect(() => {
    return () => {
      if (uploadTimerRef.current) {
        clearTimeout(uploadTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="progress-bar-container">
        <div className="progress-bar-label">
          <span>阅读进度</span>
          <span>
            第 {currentParagraph + 1} 段 / 共 {totalParagraphs} 段
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="document-content">
        <h2 className="document-title">{document.title}</h2>
        <p className="paragraph-text">
          {document.paragraphs[currentParagraph]}
        </p>
      </div>

      <div className="navigation-buttons">
        <button
          className="nav-button"
          onClick={() => handleNavigate('prev')}
          disabled={currentParagraph === 0}
        >
          上一段
        </button>
        <button
          className="nav-button"
          onClick={() => handleNavigate('next')}
          disabled={currentParagraph === totalParagraphs - 1}
        >
          下一段
        </button>
      </div>
    </>
  );
}

export default DocumentReader;
