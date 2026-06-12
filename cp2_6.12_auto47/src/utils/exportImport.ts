import type { GeometryItem, PresetId } from '@/store/useSculptureStore';

interface ExportData {
  version: string;
  preset: PresetId;
  geometries: GeometryItem[];
}

export function exportConfig(geometries: GeometryItem[], preset: PresetId): string {
  const data: ExportData = {
    version: '1.0',
    preset,
    geometries,
  };
  return JSON.stringify(data, null, 2);
}

export function downloadJson(jsonString: string, filename: string): Promise<void> {
  return new Promise((resolve) => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    resolve();
  });
}

export function parseImportFile(file: File): Promise<{ geometries: GeometryItem[]; preset: PresetId }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.geometries || !Array.isArray(data.geometries)) {
          reject(new Error('无效的配置文件格式'));
          return;
        }
        resolve({
          geometries: data.geometries,
          preset: data.preset || null,
        });
      } catch {
        reject(new Error('JSON解析失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
