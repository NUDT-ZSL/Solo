import { useState, useCallback, useMemo } from 'react';
import ChartPanel from './ChartPanel';
import ControlPanel from './ControlPanel';
import TimeSlider from './TimeSlider';
import { presetDatasets } from './data/presets';
import type { Dataset, DataPoint } from './types';

function App() {
  const [dataset, setDataset] = useState<Dataset>(presetDatasets[0]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const currentDataPoint = useMemo<DataPoint | null>(() => {
    if (dataset.data.length === 0) return null;
    const idx = Math.max(0, Math.min(currentIndex, dataset.data.length - 1));
    return dataset.data[idx];
  }, [dataset, currentIndex]);

  const handlePresetChange = useCallback((id: string) => {
    const found = presetDatasets.find((d) => d.id === id);
    if (found) {
      setDataset(found);
      setCurrentIndex(0);
    }
  }, []);

  const handleTimeChange = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) return;

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const timeIdx = headers.findIndex((h) => h.includes('time') || h.includes('date') || h === 'x');
        const valueIdx = headers.findIndex((h) => h.includes('value') || h.includes('price') || h.includes('temp') || h === 'y');

        if (timeIdx === -1 || valueIdx === -1) {
          alert('CSV 文件需要包含 time/date 和 value/price 列');
          return;
        }

        const data: DataPoint[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          const time = new Date(cols[timeIdx]);
          const value = parseFloat(cols[valueIdx]);
          if (!isNaN(time.getTime()) && !isNaN(value)) {
            data.push({ time, value });
          }
        }

        if (data.length > 0) {
          data.sort((a, b) => a.time.getTime() - b.time.getTime());
          setDataset({
            id: 'uploaded',
            name: file.name.replace(/\.[^/.]+$/, ''),
            shortName: '自定义',
            unit: '',
            data,
          });
          setCurrentIndex(0);
        }
      } catch (err) {
        alert('文件解析失败，请检查格式');
      }
    };
    reader.readAsText(file);
  }, []);

  const maxIndex = dataset.data.length - 1;

  return (
    <div className="app">
      <div className="main-content">
        <div className="chart-section">
          <h1 className="app-title">Timetwist</h1>
          <p className="app-subtitle">{dataset.name} · 趋势分析</p>
          <ChartPanel
            dataset={dataset}
            currentIndex={currentIndex}
            currentDataPoint={currentDataPoint}
          />
          <TimeSlider
            min={0}
            max={maxIndex}
            value={currentIndex}
            onChange={handleTimeChange}
            dataset={dataset}
          />
        </div>

        <ControlPanel
          datasetId={dataset.id}
          onPresetChange={handlePresetChange}
          onFileUpload={handleFileUpload}
        />
      </div>
    </div>
  );
}

export default App;
