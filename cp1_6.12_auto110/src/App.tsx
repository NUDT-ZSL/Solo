import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  AppContext,
  initialAppState,
  useAppState,
  DataState,
  AppState,
} from './lib/stateManager';
import { getComponentById, themeVariables } from './lib/componentRegistry';
import ComponentGallery from './components/ComponentGallery';
import TestHarness from './components/TestHarness';
import './App.css';

const dataStates: { key: DataState; label: string }[] = [
  { key: 'loading', label: 'Loading' },
  { key: 'empty', label: 'Empty' },
  { key: 'error', label: 'Error' },
  { key: 'normal', label: 'Normal' },
];

interface AppProviderProps {
  children: React.ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialAppState);

  const setSelectedComponentId = useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedComponentId: id }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  }, []);

  const setDataState = useCallback((dataState: DataState) => {
    setState(prev => ({ ...prev, dataState }));
  }, []);

  const contextValue = useMemo(() => ({
    ...state,
    setSelectedComponentId,
    toggleTheme,
    setDataState,
  }), [state, setSelectedComponentId, toggleTheme, setDataState]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

const AppContent: React.FC = memo(() => {
  const { selectedComponentId, theme, dataState, toggleTheme, setDataState } = useAppState();

  const currentComponent = useMemo(() => {
    return getComponentById(selectedComponentId);
  }, [selectedComponentId]);

  const globalThemeStyle = useMemo(() => {
    const vars = themeVariables[theme];
    const style: React.CSSProperties = {};
    for (const [key, value] of Object.entries(vars)) {
      (style as any)[key] = value;
    }
    return style;
  }, [theme]);

  const activeTabIndex = useMemo(() => {
    return dataStates.findIndex((s) => s.key === dataState);
  }, [dataState]);

  const handleTabClick = useCallback((key: DataState) => {
    setDataState(key);
  }, [setDataState]);

  return (
    <div className={`app ${theme}`} style={globalThemeStyle}>
      <aside className="sidebar">
        <ComponentGallery />
      </aside>
      <main className="mainContent">
        <div className="topBar">
          <div className="componentInfo">
            {currentComponent && (
              <>
                <h1 className="currentComponentName">{currentComponent.name}</h1>
                <span className="currentComponentDesc">{currentComponent.description}</span>
              </>
            )}
          </div>
          <button
            className="themeToggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <span className="themeIcon">{theme === 'light' ? '🌙' : '☀️'}</span>
          </button>
        </div>
        <div className="tabsContainer">
          <div className="tabs" role="tablist">
            {dataStates.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={dataState === tab.key}
                className={`tab ${dataState === tab.key ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.key)}
              >
                {tab.label}
              </button>
            ))}
            <div
              className="tabIndicator"
              style={{ transform: `translateX(${activeTabIndex * 100}%)` }}
            ></div>
          </div>
        </div>
        <div className="previewSection">
          {currentComponent && (
            <TestHarness
              component={currentComponent.Component}
              componentProps={currentComponent.defaultProps}
              dataState={dataState}
              theme={theme}
            />
          )}
        </div>
      </main>
    </div>
  );
});

AppContent.displayName = 'AppContent';

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
