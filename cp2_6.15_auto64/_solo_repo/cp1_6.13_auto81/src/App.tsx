import React, { useState, useCallback, useMemo } from 'react';
import { useColorContext } from './context/ColorContext';
import { PreviewPanel } from './preview/PreviewPanel';
import { ColorList } from './manage/ColorList';
import { ColorEditor } from './manage/ColorEditor';
import { ExportPanel } from './export/ExportPanel';
import { ImportPanel } from './export/ImportPanel';

const App: React.FC = () => {
  const { state, getCurrentScheme } = useColorContext();
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const currentScheme = getCurrentScheme();

  const primaryColor = useMemo(() => {
    const primaryToken = currentScheme?.tokens.find(t => t.name === '--primary');
    return primaryToken?.value || '#3b82f6';
  }, [currentScheme]);

  const handleOpenExport = useCallback(() => {
    setShowExport(true);
  }, []);

  const handleCloseExport = useCallback(() => {
    setShowExport(false);
  }, []);

  const handleOpenImport = useCallback(() => {
    setShowImport(true);
  }, []);

  const handleCloseImport = useCallback(() => {
    setShowImport(false);
  }, []);

  const handleToggleCompareMode = useCallback(() => {
    if (state.isCompareMode) {
      state.compareSchemeIds.forEach(id => {
        // Clear compare selections
      });
    }
  }, [state.isCompareMode, state.compareSchemeIds]);

  const compareCount = state.compareSchemeIds.length;
  const canCompare = compareCount >= 2 && compareCount <= 4;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      <header
        style={{
          height: '60px',
          backgroundColor: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: primaryColor,
              transition: 'background-color 0.3s ease',
            }}
          />
          <h1
            style={{
              fontFamily: "'Inter', sans