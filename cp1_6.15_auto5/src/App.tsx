import React, { useState, useCallback, useRef, useEffect } from 'react';
import AnnotationPanel from './AnnotationPanel';
import MarksList from './MarksList';
import { sampleDocs } from './sampleTexts';
import './style.css';

export interface Annotation {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  comment: string;
}

let nextId = 1;

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [annotationsMap, setAnnotationsMap] = useState<Record<number, Annotation[]>>({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const annotationPanelRef = useRef<{ scrollToAnnotation: (id: string) => void }>(null);
  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAnnotations = annotationsMap[activeTab] || [];

  const handleAddAnnotation = useCallback(
    (annotation: Omit<Annotation, 'id'>) => {
      const newAnnotation: Annotation = { ...annotation, id: String(nextId++) };
      setAnnotationsMap((prev) => ({
        ...prev,
        [activeTab]: [...(prev[activeTab] || []), newAnnotation],
      }));
    },
    [activeTab]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      setAnnotationsMap((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).filter((a) => a.id !== id),
      }));
    },
    [activeTab]
  );

  const handleTabSwitch = useCallback((tabId: number) => {
    setActiveTab((prev) => {
      if (prev === tabId) return prev;
      setFlashId(null);
      if (showExportModal) {
        setModalClosing(true);
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
        }
        modalTimerRef.current = setTimeout(() => {
          setShowExportModal(false);
          setModalClosing(false);
          modalTimerRef.current = null;
        }, 200);
      }
      return tabId;
    });
  }, [showExportModal]);

  const handleMarkClick = useCallback((id: string) => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    setFlashId(id);
    if (annotationPanelRef.current) {
      annotationPanelRef.current.scrollToAnnotation(id);
    }
    flashTimerRef.current = setTimeout(() => {
      setFlashId(null);
      flashTimerRef.current = null;
    }, 500);
  }, []);

  const handleExport = useCallback(() => {
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current);
      modalTimerRef.current = null;
    }
    setModalClosing(false);
    setShowExportModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (modalTimerRef.current) return;
    setModalClosing(true);
    modalTimerRef.current = setTimeout(() => {
      setShowExportModal(false);
      setModalClosing(false);
      modalTimerRef.current = null;
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      setMounted(false);
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (showExportModal && modalClosing) {
      return;
    }
  }, [showExportModal, modalClosing]);

  const exportData = currentAnnotations.map((a) => ({
    selectedText: a.selectedText,
    comment: a.comment,
    startOffset: a.startOffset,
    endOffset: a.endOffset,
  }));

  return (
    <div className="app-container">
      <div className="top-bar">
        <h1>作业批改标注系统</h1>
        <div className="tab-bar">
          {sampleDocs.map((doc) => (
            <button
              key={doc.id}
              className={`tab-btn${activeTab === doc.id ? ' active' : ''}`}
              onClick={() => handleTabSwitch(doc.id)}
            >
              {doc.label}
            </button>
          ))}
        </div>
        <div className="top-bar-actions">
          <button className="btn-export" onClick={handleExport}>
            导出批注报告
          </button>
        </div>
      </div>

      <div className="main-content">
        <AnnotationPanel
          ref={annotationPanelRef}
          text={sampleDocs[activeTab].text}
          annotations={currentAnnotations}
          onAddAnnotation={handleAddAnnotation}
          flashId={flashId}
        />
        <MarksList
          annotations={currentAnnotations}
          onDelete={handleDeleteAnnotation}
          onMarkClick={handleMarkClick}
        />
      </div>

      {showExportModal && (
        <div
          className={`modal-overlay${modalClosing ? ' closing' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="modal-content">
            <h2>批注报告</h2>
            <pre>{JSON.stringify(exportData, null, 2)}</pre>
            <button className="modal-close" onClick={handleCloseModal}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
