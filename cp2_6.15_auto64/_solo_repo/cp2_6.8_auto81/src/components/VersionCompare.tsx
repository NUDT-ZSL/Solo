import { useMemo, useRef } from 'react';
import { useAppStore } from '@/store';
import type { Annotation, Snapshot } from '@/types';
import { generateSamplePage, A4_ASPECT_RATIO } from '@/utils/samplePDF';
import { drawAnnotation } from '@/utils/canvasUtils';
import { X } from 'lucide-react';

const COMPARE_PAGE_WIDTH = 500;
const COMPARE_PAGE_HEIGHT = Math.floor(COMPARE_PAGE_WIDTH * A4_ASPECT_RATIO);

export function VersionCompare() {
  const compareMode = useAppStore((s) => s.compareMode);
  const setCompareMode = useAppStore((s) => s.setCompareMode);
  const snapshots = useAppStore((s) => s.snapshots);
  const compareSelection = useAppStore((s) => s.compareSelection);
  const setCompareSelection = useAppStore((s) => s.setCompareSelection);
  const currentPage = useAppStore((s) => s.currentPage);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const overlayARef = useRef<HTMLCanvasElement>(null);
  const overlayBRef = useRef<HTMLCanvasElement>(null);

  const versionA = snapshots.find((s) => s.id === compareSelection.versionA);
  const versionB = snapshots.find((s) => s.id === compareSelection.versionB);

  const { onlyInA, onlyInB } = useMemo(() => {
    if (!versionA || !versionB) return { onlyInA: [] as Annotation[], onlyInB: [] as Annotation[] };
    const idsA = new Set(versionA.annotations.map((a) => a.id));
    const idsB = new Set(versionB.annotations.map((a) => a.id));
    const onlyA = versionA.annotations.filter((a) => !idsB.has(a.id));
    const onlyB = versionB.annotations.filter((a) => !idsA.has(a.id));
    return { onlyInA: onlyA, onlyInB: onlyB };
  }, [versionA, versionB]);

  const drawComparePanel = (
    pageCanvas: HTMLCanvasElement | null,
    overlayCanvas: HTMLCanvasElement | null,
    snapshot: Snapshot | undefined,
    onlySet: Annotation[]
  ) => {
    if (!pageCanvas || !overlayCanvas) return;
    pageCanvas.width = COMPARE_PAGE_WIDTH;
    pageCanvas.height = COMPARE_PAGE_HEIGHT;
    generateSamplePage(pageCanvas, currentPage);

    overlayCanvas.width = COMPARE_PAGE_WIDTH;
    overlayCanvas.height = COMPARE_PAGE_HEIGHT;
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!snapshot) return;

    const onlyIds = new Set(onlySet.map((a) => a.id));
    const pageAnnotations = snapshot.annotations.filter((a) => a.pageNumber === currentPage);

    for (const ann of pageAnnotations) {
      const isDiff = onlyIds.has(ann.id);
      if (snapshot === versionA) {
        drawAnnotation(ctx, ann, COMPARE_PAGE_WIDTH, COMPARE_PAGE_HEIGHT, false, isDiff ? 'rgba(239, 68, 68, 0.55)' : null);
      } else {
        drawAnnotation(ctx, ann, COMPARE_PAGE_WIDTH, COMPARE_PAGE_HEIGHT, false, isDiff ? 'rgba(59, 130, 246, 0.55)' : null);
      }
    }
  };

  if (!compareMode) return null;

  return (
    <div className="compare-modal">
      <div className="compare-panel">
        <div className="compare-header">
          <h3>版本对比</h3>
          <button className="close-btn" onClick={() => setCompareMode(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="compare-selectors">
          <div className="selector-group">
            <label>版本 A（红色=仅A有）</label>
            <select
              value={compareSelection.versionA || ''}
              onChange={(e) => setCompareSelection({ ...compareSelection, versionA: e.target.value || null })}
            >
              <option value="">-- 选择版本 --</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="selector-group">
            <label>版本 B（蓝色=仅B有）</label>
            <select
              value={compareSelection.versionB || ''}
              onChange={(e) => setCompareSelection({ ...compareSelection, versionB: e.target.value || null })}
            >
              <option value="">-- 选择版本 --</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="compare-legend">
            <span className="legend-red">仅 A 有</span>
            <span className="legend-blue">仅 B 有</span>
            <span>差异: A独有 {onlyInA.length} / B独有 {onlyInB.length}</span>
          </div>
        </div>

        <div className="compare-content">
          <div className="compare-side">
            <div className="compare-title">
              {versionA ? versionA.name : '未选择版本 A'}
            </div>
            <div className="compare-canvas-wrap">
              <canvas ref={canvasARef} className="compare-canvas" style={{
                width: COMPARE_PAGE_WIDTH, height: COMPARE_PAGE_HEIGHT,
              }} />
              <canvas
                ref={overlayARef}
                className="compare-overlay"
                style={{ width: COMPARE_PAGE_WIDTH, height: COMPARE_PAGE_HEIGHT }}
              />
              {(() => {
                setTimeout(() => drawComparePanel(canvasARef.current, overlayARef.current, versionA, onlyInA), 0);
                return null;
              })()}
            </div>
          </div>

          <div className="compare-divider" />

          <div className="compare-side">
            <div className="compare-title">
              {versionB ? versionB.name : '未选择版本 B'}
            </div>
            <div className="compare-canvas-wrap">
              <canvas ref={canvasBRef} className="compare-canvas" style={{
                width: COMPARE_PAGE_WIDTH, height: COMPARE_PAGE_HEIGHT,
              }} />
              <canvas
                ref={overlayBRef}
                className="compare-overlay"
                style={{ width: COMPARE_PAGE_WIDTH, height: COMPARE_PAGE_HEIGHT }}
              />
              {(() => {
                setTimeout(() => drawComparePanel(canvasBRef.current, overlayBRef.current, versionB, onlyInB), 0);
                return null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
