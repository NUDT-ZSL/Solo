import { useState, useEffect, useRef } from 'react';
import { getVersionById } from '../api';
import type { Version } from '../api';

interface VersionDiffProps {
  versionId1: string;
  versionId2: string;
  articleId: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

function computeDiff(text1: string, text2: string): DiffLine[] {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const result: DiffLine[] = [];

  const dp: number[][] = Array(lines1.length + 1)
    .fill(null)
    .map(() => Array(lines2.length + 1).fill(0));

  for (let i = lines1.length - 1; i >= 0; i--) {
    for (let j = lines2.length - 1; j >= 0; j--) {
      if (lines1[i] === lines2[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = 0;
  let j = 0;
  let lineNum = 1;

  while (i < lines1.length && j < lines2.length) {
    if (lines1[i] === lines2[j]) {
      result.push({ type: 'unchanged', content: lines1[i], lineNumber: lineNum });
      i++;
      j++;
      lineNum++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'removed', content: lines1[i] });
      i++;
    } else {
      result.push({ type: 'added', content: lines2[j], lineNumber: lineNum });
      j++;
      lineNum++;
    }
  }

  while (i < lines1.length) {
    result.push({ type: 'removed', content: lines1[i] });
    i++;
  }

  while (j < lines2.length) {
    result.push({ type: 'added', content: lines2[j], lineNumber: lineNum });
    j++;
    lineNum++;
  }

  return result;
}

export default function VersionDiff({ versionId1, versionId2, articleId }: VersionDiffProps) {
  const [v1, setV1] = useState<Version | null>(null);
  const [v2, setV2] = useState<Version | null>(null);
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const revealTimer = useRef<number | null>(null);

  useEffect(() => {
    loadVersions();
    return () => {
      if (revealTimer.current) {
        window.clearInterval(revealTimer.current);
      }
    };
  }, [versionId1, versionId2, articleId]);

  useEffect(() => {
    if (diff.length === 0) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    if (revealTimer.current) {
      window.clearInterval(revealTimer.current);
    }
    const batchSize = Math.max(1, Math.ceil(diff.length / 30));
    revealTimer.current = window.setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + batchSize;
        if (next >= diff.length) {
          if (revealTimer.current) {
            window.clearInterval(revealTimer.current);
            revealTimer.current = null;
          }
          return diff.length;
        }
        return next;
      });
    }, 25);
  }, [diff]);

  const loadVersions = async () => {
    setLoading(true);
    setError('');
    try {
      const [ver1, ver2] = await Promise.all([
        getVersionById(articleId, versionId1),
        getVersionById(articleId, versionId2)
      ]);
      setV1(ver1);
      setV2(ver2);

      const titleDiff = computeDiff(ver1.title, ver2.title);
      const contentDiff = computeDiff(ver1.content, ver2.content);
      const separator: DiffLine = {
        type: 'unchanged',
        content: '--- 正文内容 ---'
      };
      setDiff([...titleDiff, separator, ...contentDiff]);
    } catch (e) {
      setError('加载版本对比失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">加载对比中...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div>
      <div className="diff-container">
        <div className="diff-header">
          <span>版本1: v{v1?.version_number} - {v1?.editor_nickname}</span>
          <span>版本2: v{v2?.version_number} - {v2?.editor_nickname}</span>
        </div>
        {diff.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
            两个版本内容完全相同
          </div>
        ) : (
          diff.map((line, idx) => {
            const isVisible = idx < visibleCount;
            const isChanged = line.type === 'added' || line.type === 'removed';
            return (
              <div
                key={idx}
                ref={(el) => {
                  if (el) lineRefs.current.set(idx, el);
                }}
                className={`diff-line ${line.type} ${isVisible ? 'diff-visible' : ''}`}
              >
                <span className="line-number">
                  {isChanged ? '' : line.lineNumber || ''}
                </span>
                <span className="line-content">{line.content || ' '}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
