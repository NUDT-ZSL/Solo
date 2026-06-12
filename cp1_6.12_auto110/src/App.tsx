import React, { memo, useMemo } from 'react';
import { AppProvider, useAppState, DataState } from './lib/stateManager';
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

const AppContent: React.FC = memo(() => {
  const { selectedComponentId, theme, dataState, toggleTheme, setDataState } = useAppState();

  const currentComponent = useMemo(() => {
    return getComponentById(selectedComponentId);
  }, [selectedComponentId]);

  const themeStyle = useMemo(() => {
    const vars = themeVariables[theme];
    const style: React.CSSProperties = {};
    Object.entries(vars).forEach(([key, value]) => {
      style[key as any] = value;
    });
    return style;
  }, [theme]);

  const activeTabIndex = useMemo(() => {
    return dataStates.findIndex((s) => s.key === dataState);
  }, [dataState]);

  return (
    <div className={`app ${theme}`} style={themeStyle}>
      <div className="sidebar">
        <ComponentGallery />
      </div>
      <div className="mainContent">
        <div className="topBar">
          <div className="componentInfo">
            {currentComponent && (
              <>
                <h1 className="currentComponentName">{currentComponent.name}</h1>
                <span className="currentComponentDesc">{currentComponent.description}</span>
              </>
            )}
          </div>
          <button className="themeToggle" onClick={toggleTheme} aria-label="Toggle theme">
            <span className="themeIcon">{theme === 'light' ? '🌙' : '☀️'}</span>
          </button>
        </div>
        <div className="tabsContainer">
          <div className="tabs">
            {dataStates.map((tab) => (
              <button
                key={tab.key}
                className={`tab ${dataState === tab.key ? 'active' : ''}`}
                onClick={() => setDataState(tab.key)}
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
      </div>
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
