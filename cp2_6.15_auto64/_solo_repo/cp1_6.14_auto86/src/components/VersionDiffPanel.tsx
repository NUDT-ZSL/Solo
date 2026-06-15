import { useState, useEffect } from 'react';
import { X, GitCompare, Clock } from 'lucide-react';
import http from '../http.js';

interface NoteVersion {
  id: string;
  noteId: string;
  content: string;
  createdAt: string;
  versionNumber: number;
}

interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

interface VersionDiffPanelProps {
  noteId: string;
  onClose: () => void;
}

const VersionDiffPanel = ({ noteId, onClose }: VersionDiffPanelProps) => {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [diffLeft, setDiffLeft] = useState<DiffSegment[]>([]);
  const [diffRight, setDiffRight] = useState<DiffSegment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [noteId]);

  const loadVersions = async () => {
    try {
      const data = await http.get(`/notes/${noteId}/versions`);
      setVersions(data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const computeDiff = (oldText: string, newText: string): [DiffSegment[], DiffSegment[]] => {
    const oldLines = oldText.split(/(<[^>]+>|\n)/).filter(Boolean);
    const newLines = newText.split(/(<[^>]+>|\n)/).filter(Boolean);
    
    const maxLen = Math.max(oldLines.length, newLines.length);
    const leftDiff: DiffSegment[] = [];
    const rightDiff: DiffSegment[] = [];

    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';

      if (oldLine === newLine) {
        leftDiff.push({ type: 'unchanged', value: oldLine });
        rightDiff.push({ type: 'unchanged', value: newLine });
      } else {
        if (oldLine) {
          leftDiff.push({ type: 'removed', value: oldLine });
        }
        if (newLine) {
          rightDiff.push({ type: 'added', value: newLine });
        }
        if (!oldLine && newLine) {
          leftDiff.push({ type: 'unchanged', value: '' });
        }
        if (oldLine && !newLine) {
          rightDiff.push({ type: 'unchanged', value: '' });
        }
      }
    }

    return [leftDiff, rightDiff];
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;
    setLoading(true);
    try {
      const [v1, v2] = await Promise.all([
        http.get(`/notes/versions/${selectedVersions[0]}`),
        http.get(`/notes/versions/${selectedVersions[1]}`),
      ]);
      const [left, right] = computeDiff(v1.content, v2.content);
      setDiffLeft(left);
      setDiffRight(right);
    } catch (error) {
      console.error('Failed to compare versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDiffContent = (segments: DiffSegment[]) => {
    return segments.map((seg, idx) => {
      const style: React.CSSProperties = {};
      if (seg.type === 'added') {
        style.backgroundColor = '#d4edda';
      } else if (seg.type === 'removed') {
        style.backgroundColor = '#f8d7da';
        style.textDecoration = 'line-through';
      }
      return (
        <span key={idx} style={style} dangerouslySetInnerHTML={{ __html: seg.value }} />
      );
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" style={{ color: '#3498db' }} />
            <h3 className="text-lg font-bold text-gray-800">版本对比</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r overflow-y-auto p-4">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">版本列表（选择2个）</h4>
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  onClick={() => handleVersionSelect(version.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                    selectedVersions.includes(version.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: selectedVersions.includes(version.id)
                          ? '#3498db'
                          : '#95a5a6',
                      }}
                    />
                    <span className="font-medium text-sm">版本 {version.versionNumber}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(version.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleCompare}
              disabled={selectedVersions.length !== 2 || loading}
              className="w-full mt-4 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#3498db' }}
            >
              {loading ? '对比中...' : '开始对比'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedVersions.length !== 2 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <GitCompare className="w-16 h-16 mb-4" />
                <p className="text-lg">请从左侧选择2个版本进行对比</p>
              </div>
            ) : loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : diffLeft.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-100 border-b font-medium text-sm">
                    旧版本
                  </div>
                  <div
                    className="p-4 overflow-y-auto prose prose-sm max-w-none"
                    style={{ height: 'calc(100% - 40px)' }}
                  >
                    {renderDiffContent(diffLeft)}
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-100 border-b font-medium text-sm">
                    新版本
                  </div>
                  <div
                    className="p-4 overflow-y-auto prose prose-sm max-w-none"
                    style={{ height: 'calc(100% - 40px)' }}
                  >
                    {renderDiffContent(diffRight)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                点击"开始对比"查看差异
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionDiffPanel;
