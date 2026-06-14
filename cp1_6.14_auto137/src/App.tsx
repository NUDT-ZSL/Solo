import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PdfViewer } from './PdfViewer';
import { Sidebar } from './Sidebar';
import { PdfParser } from './PdfParser';
import { AnnotationEngine } from './AnnotationEngine';
import type { Annotation, AnnotationType, AnnotationRect } from './types';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function App() {
  const [parser, setParser] = useState<PdfParser | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightAnnotationId, setHighlightAnnotationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const annotationEngineRef = useRef<AnnotationEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    annotationEngineRef.current = new AnnotationEngine();
  }, []);

  const updateAnnotations = useCallback(() => {
    if (annotationEngineRef.current) {
      setAnnotations(annotationEngineRef.current.getAllAnnotations());
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('请上传PDF文件');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('文件大小不能超过100MB');
      return;
    }

    setError(null);
    setIsLoading(true);
    setCurrentPage(1);

    try {
      const buffer = await file.arrayBuffer();

      if (annotationEngineRef.current) {
        annotationEngineRef.current.clearAll();
        annotationEngineRef.current.setFileName(file.name);
      }

      const newParser = new PdfParser();
      await newParser.parsePdf(buffer, file.name);

      setParser(newParser);

      if (annotationEngineRef.current) {
        annotationEngineRef.current.loadFromLocalStorage();
        updateAnnotations();
      }
    } catch (err) {
      console.error('PDF解析失败:', err);
      setError('PDF解析失败，请检查文件是否完整');
    } finally {
      setIsLoading(false);
    }
  }, [updateAnnotations]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAddAnnotation = useCallback(
    (pageNumber: number, type: AnnotationType, text: string, rect: AnnotationRect, noteContent?: string) => {
      if (!annotationEngineRef.current) return;
      annotationEngineRef.current.addAnnotation(pageNumber, type, text, rect, noteContent);
      updateAnnotations();
    },
    [updateAnnotations]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      if (!annotationEngineRef.current) return;
      annotationEngineRef.current.deleteAnnotation(id);
      updateAnnotations();
    },
    [updateAnnotations]
  );

  const handleJumpToAnnotation = useCallback(
    (annotation: Annotation) => {
      setCurrentPage(annotation.pageNumber);
      setHighlightAnnotationId(annotation.id);

      setTimeout(() => {
        setHighlightAnnotationId(null);
      }, 1200);
    },
    []
  );

  const handleExport = useCallback(() => {
    if (annotationEngineRef.current) {
      annotationEngineRef.current.downloadExport();
    }
  }, []);

  return (
    <div className="app-container">
      <div className="main-area">
        {!parser && !isLoading ? (
          <div
            className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <div className={`upload-box ${isDragging ? 'drag-over' : ''}`}>
              <div className="upload-icon">📖</div>
              <div className="upload-title">拖拽 PDF 文件到这里</div>
              <div className="upload-hint">或点击选择文件（最大 100MB）</div>
              {error && (
                <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>
                  {error}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
            </div>
          </div>
        ) : (
          <PdfViewer
            parser={parser}
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            highlightAnnotationId={highlightAnnotationId}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <div className="loading-text">正在解析PDF文档...</div>
          </div>
        )}
      </div>

      {parser && (
        <Sidebar
          annotations={annotations}
          onJumpToAnnotation={handleJumpToAnnotation}
          onExport={handleExport}
          onDeleteAnnotation={handleDeleteAnnotation}
        />
      )}
    </div>
  );
}
