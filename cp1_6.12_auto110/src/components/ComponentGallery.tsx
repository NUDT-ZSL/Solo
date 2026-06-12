import React, { memo } from 'react';
import { componentRegistry } from '../lib/componentRegistry';
import { useAppState } from '../lib/useAppState';
import styles from './ComponentGallery.module.css';

const ComponentGallery: React.FC = memo(() => {
  const { selectedComponentId, setSelectedComponentId } = useAppState();

  return (
    <div className={styles.gallery}>
      <div className={styles.header}>
        <h2 className={styles.title}>MockMingle</h2>
        <p className={styles.subtitle}>UI Component Testing Tool</p>
      </div>
      <div className={styles.componentList}>
        {componentRegistry.map((component) => (
          <div
            key={component.id}
            className={`${styles.componentCard} ${selectedComponentId === component.id ? styles.selected : ''}`}
            onClick={() => setSelectedComponentId(component.id)}
          >
            <div className={styles.cardPreview}>
              <span className={styles.componentIcon}>
                {getComponentIcon(component.id)}
              </span>
            </div>
            <div className={styles.cardInfo}>
              <span className={styles.componentName}>{component.name}</span>
              <span className={styles.componentCategory}>{component.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

function getComponentIcon(id: string): string {
  const icons: Record<string, string> = {
    button: '🔘',
    card: '🃏',
    input: '📝',
    badge: '🏷️',
    modal: '🪟',
    skeleton: '💀',
  };
  return icons[id] || '📦';
}

ComponentGallery.displayName = 'ComponentGallery';

export default ComponentGallery;
