import React, { memo, useMemo } from 'react';
import type { DataState, ThemeMode } from '../lib/stateManager';
import { themeVariables } from '../lib/componentRegistry';
import styles from './TestHarness.module.css';

interface TestHarnessProps {
  component: React.ComponentType<any>;
  componentProps: Record<string, any>;
  dataState: DataState;
  theme: ThemeMode;
}

function arePropsEqual(prevProps: TestHarnessProps, nextProps: TestHarnessProps): boolean {
  if (prevProps.component !== nextProps.component) return false;
  if (prevProps.dataState !== nextProps.dataState) return false;
  if (prevProps.theme !== nextProps.theme) return false;
  const prevKeys = Object.keys(prevProps.componentProps);
  const nextKeys = Object.keys(nextProps.componentProps);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of prevKeys) {
    if (prevProps.componentProps[key] !== nextProps.componentProps[key]) return false;
  }
  return true;
}

const TestHarness: React.FC<TestHarnessProps> = memo(({ component: Component, componentProps, dataState, theme }) => {
  const themeStyle = useMemo(() => {
    const vars = themeVariables[theme];
    const style: React.CSSProperties = {};
    for (const [key, value] of Object.entries(vars)) {
      (style as any)[key] = value;
    }
    return style;
  }, [theme]);

  const mergedProps = useMemo(() => {
    return { ...componentProps, dataState };
  }, [componentProps, dataState]);

  const componentElement = useMemo(() => {
    return <Component {...mergedProps} />;
  }, [Component, mergedProps]);

  return (
    <div
      className={`${styles.testHarness} ${styles[theme]}`}
      style={themeStyle}
    >
      <div className={styles.previewArea}>
        {componentElement}
      </div>
    </div>
  );
}, arePropsEqual);

TestHarness.displayName = 'TestHarness';

export default TestHarness;
