import React, { memo, useMemo } from 'react';
import { DataState, ThemeMode } from '../lib/stateManager';
import { themeVariables } from '../lib/componentRegistry';
import styles from './TestHarness.module.css';

interface TestHarnessProps {
  component: React.ComponentType<any>;
  componentProps: Record<string, any>;
  dataState: DataState;
  theme: ThemeMode;
}

const TestHarness: React.FC<TestHarnessProps> = memo(({ component: Component, componentProps, dataState, theme }) => {
  const themeStyle = useMemo(() => {
    const vars = themeVariables[theme];
    const style: React.CSSProperties = {};
    Object.entries(vars).forEach(([key, value]) => {
      style[key as any] = value;
    });
    return style;
  }, [theme]);

  const mergedProps = useMemo(() => ({
    ...componentProps,
    dataState,
  }), [componentProps, dataState]);

  return (
    <div
      className={`${styles.testHarness} ${styles[theme]}`}
      style={themeStyle}
    >
      <div className={styles.previewArea}>
        <Component {...mergedProps} />
      </div>
    </div>
  );
});

TestHarness.displayName = 'TestHarness';

export default TestHarness;
