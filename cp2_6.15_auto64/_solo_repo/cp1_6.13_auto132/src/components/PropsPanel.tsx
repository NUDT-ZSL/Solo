import { useState, useCallback } from 'react';
import type { PropsPanelProps, PropSchema } from '../types';
import styles from './PropsPanel.module.css';

export default function PropsPanel({ schema, values, onChange }: PropsPanelProps) {
  const [activeSlider, setActiveSlider] = useState<string | null>(null);

  const handleTextChange = useCallback((name: string, value: string) => {
    onChange(name, value);
  }, [onChange]);

  const handleSliderChange = useCallback((name: string, value: number) => {
    onChange(name, value);
  }, [onChange]);

  const handleColorChange = useCallback((name: string, value: string) => {
    onChange(name, value);
  }, [onChange]);

  const handleBooleanChange = useCallback((name: string, value: boolean) => {
    onChange(name, value);
  }, [onChange]);

  const renderControl = (item: PropSchema) => {
    const value = values[item.name];

    switch (item.type) {
      case 'text':
        return (
          <div key={item.name} className={styles.controlItem}>
            <label className={styles.label}>{item.label}</label>
            <input
              type="text"
              value={String(value)}
              onChange={(e) => handleTextChange(item.name, e.target.value)}
              className={styles.textInput}
              placeholder={`输入${item.label}`}
            />
          </div>
        );

      case 'slider':
        const min = item.min ?? 0;
        const max = item.max ?? 100;
        const step = item.step ?? 1;
        const isActive = activeSlider === item.name;
        return (
          <div key={item.name} className={styles.controlItem}>
            <label className={styles.label}>
              {item.label}
              <span className={styles.sliderValue}>{Number(value)}</span>
            </label>
            <div className={styles.sliderContainer}>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={Number(value)}
                onChange={(e) => handleSliderChange(item.name, Number(e.target.value))}
                onMouseDown={() => setActiveSlider(item.name)}
                onMouseUp={() => setActiveSlider(null)}
                onTouchStart={() => setActiveSlider(item.name)}
                onTouchEnd={() => setActiveSlider(null)}
                className={`${styles.slider} ${isActive ? styles.sliderActive : ''}`}
                style={{
                  '--slider-value': `${((Number(value) - min) / (max - min)) * 100}%`,
                } as React.CSSProperties}
              />
            </div>
          </div>
        );

      case 'color':
        return (
          <div key={item.name} className={styles.controlItem}>
            <label className={styles.label}>{item.label}</label>
            <input
              type="color"
              value={String(value)}
              onChange={(e) => handleColorChange(item.name, e.target.value)}
              className={styles.colorPicker}
            />
          </div>
        );

      case 'boolean':
        const isOn = Boolean(value);
        return (
          <div key={item.name} className={styles.controlItem}>
            <label className={styles.label}>{item.label}</label>
            <button
              type="button"
              onClick={() => handleBooleanChange(item.name, !isOn)}
              className={`${styles.toggleSwitch} ${isOn ? styles.toggleOn : ''}`}
              role="switch"
              aria-checked={isOn}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.propsPanel}>
      <div className={styles.header}>
        <span className={styles.title}>Props 控制面板</span>
      </div>
      <div className={styles.controlsContainer}>
        {schema.map(renderControl)}
      </div>
    </div>
  );
}
