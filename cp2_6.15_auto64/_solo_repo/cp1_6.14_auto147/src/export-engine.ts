import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { TimelineEntry } from './data-service';

export interface ExportProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface ExportOptions {
  entries: TimelineEntry[];
  startYear: number;
  endYear: number;
  onProgress?: (progress: ExportProgress) => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ENTRY_GAP_MM = 8;
const ENTRY_TOP_PADDING_MM = 4;

function formatDate(dateStr: string): { day: string; month: string } {
  const date = new Date(dateStr);
  return {
    day: date.getDate().toString().padStart(2, '0'),
    month: MONTH_NAMES[date.getMonth()]
  };
}

function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createEntryElement(entry: TimelineEntry, isFirst: boolean): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 750px;
    padding: 0 40px 24px 40px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    box-sizing: border-box;
  `;

  const { day, month } = formatDate(entry.date);
  const headerSpacing = isFirst
    ? 'padding-top: 8px;'
    : 'padding-top: 24px; border-top: 1px solid #e5e7eb;';

  container.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:24px;margin-bottom:12px;${headerSpacing}">
      <div style="width:70px;height:70px;background:#3b82f6;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);">
        <div style="color:white;font-size:22px;font-weight:bold;line-height:1;">${day}</div>
        <div style="color:white;font-size:12px;font-weight:500;margin-top:4px;opacity:0.9;">${month}</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:24px;font-weight:bold;color:#111827;line-height:1.4;margin-top:10px;margin-bottom:8px;">${escapeHtml(entry.title)}</div>
      </div>
    </div>
    <div style="margin:0 0 12px 94px;font-size:13px;line-height:1.9;color:#374151;white-space:pre-wrap;word-break:break-word;">${escapeHtml(entry.content)}</div>
    ${entry.tags.length > 0 ? `
      <div style="margin-left:94px;display:flex;flex-wrap:wrap;gap:6px;">
        ${entry.tags.map(tag => `
          <span style="background:#eff6ff;color:#1e40af;font-size:11px;padding:4px 12px;border-radius:20px;font-weight:500;">${escapeHtml(tag)}</span>
        `).join('')}
      </div>
    ` : ''}
  `;

  return container;
}

function createCoverElement(startYear: number, endYear: number, count: number): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 750px;
    height: 1000px;
    padding: 80px 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  `;

  container.innerHTML = `
    <div style="font-size:28px;color:rgba(255,255,255,0.85);letter-spacing:4px;font-weight:300;margin-bottom:24px;">TIMELINE WEAVER</div>
    <div style="width:60px;height:2px;background:rgba(255,255,255,0.5);margin-bottom:40px;"></div>
    <div style="font-size:56px;color:#ffffff;font-weight:800;line-height:1.2;margin-bottom:16px;">时光档案</div>
    <div style="font-size:20px;color:rgba(255,255,255,0.9);margin-bottom:8px;">年度记忆汇编</div>
    <div style="font-size:36px;color:#ffffff;font-weight:bold;margin:24px 0;">${startYear} — ${endYear}</div>
    <div style="font-size:16px;color:rgba(255,255,255,0.75);margin-top:48px;">共收录 ${count} 条珍贵回忆</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:80px;">生成于 ${new Date().toLocaleDateString('zh-CN')}</div>
  `;

  return container;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string = 'image/jpeg', quality: number = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('canvas.toBlob returned null'));
          }
        },
        type,
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function renderToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  if (typeof document === 'undefined') {
    throw new Error('renderToCanvas must be called in browser environment');
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute;
    left: 0;
    top: -10000px;
    width: auto;
    height: auto;
    z-index: -1;
    background: #ffffff;
    overflow: visible;
    pointer-events: none;
  `;
  wrapper.appendChild(element);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: Math.max(element.scrollWidth, element.offsetWidth, 750),
      windowHeight: Math.max(element.scrollHeight, element.offsetHeight),
      scrollX: 0,
      scrollY: 0,
      allowTaint: true
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('html2canvas produced empty canvas');
    }

    return canvas;
  } finally {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}

function sliceCanvasSafe(
  sourceCanvas: HTMLCanvasElement,
  yOffset: number,
  sliceHeight: number
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!sourceCanvas || sourceCanvas.width === 0) return null;

  const actualHeight = Math.min(sliceHeight, sourceCanvas.height - yOffset);
  if (actualHeight <= 0) return null;

  let slice: HTMLCanvasElement | null = null;
  try {
    slice = document.createElement('canvas');
    slice.width = sourceCanvas.width;
    slice.height = actualHeight;
  } catch (err) {
    console.error('Failed to create canvas element:', err);
    return null;
  }

  const ctx = slice.getContext('2d');
  if (!ctx) {
    console.error('Canvas 2D context is not available');
    return null;
  }

  try {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      sourceCanvas,
      0, yOffset,
      sourceCanvas.width, actualHeight,
      0, 0,
      slice.width, slice.height
    );
    return slice;
  } catch (err) {
    console.error('drawImage failed during canvas slicing:', err);
    return null;
  }
}

export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { entries, startYear, endYear, onProgress } = options;

  if (entries.length === 0) {
    throw new Error('没有可导出的条目');
  }

  const totalSteps = entries.length + 1;
  let currentStep = 0;

  const reportProgress = () => {
    currentStep++;
    const pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));
    onProgress?.({
      current: currentStep,
      total: totalSteps,
      percentage: pct
    });
  };

  reportProgress();
  await new Promise(resolve => setTimeout(resolve, 50));

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  // ----- Render and add cover page -----
  const coverEl = createCoverElement(startYear, endYear, entries.length);
  const coverCanvas = await renderToCanvas(coverEl);

  try {
    const coverBlob = await canvasToBlob(coverCanvas, 'image/jpeg', 0.88);
    const coverDataUrl = await blobToDataURL(coverBlob);
    const coverRatio = coverCanvas.width / coverCanvas.height;
    const coverTargetHeight = usableWidth / coverRatio;
    const coverY = margin + Math.max(0, (usableHeight - coverTargetHeight) / 2);
    pdf.addImage(coverDataUrl, 'JPEG', margin, coverY, usableWidth, coverTargetHeight);
  } catch (err) {
    console.warn('Cover rendering had issues, falling back to fallback', err);
    pdf.setTextColor(59, 130, 246);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TIMELINE WEAVER', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(20);
    pdf.text(`${startYear} - ${endYear} Annual Report`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
    pdf.setFontSize(12);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`${entries.length} entries`, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
  }

  pdf.addPage();

  let currentY = margin + ENTRY_TOP_PADDING_MM;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isFirstOverall = i === 0;
    const entryEl = createEntryElement(entry, isFirstOverall);
    let entryCanvas: HTMLCanvasElement;
    try {
      entryCanvas = await renderToCanvas(entryEl);
    } catch (err) {
      console.error(`Failed to render entry ${i}:`, err);
      continue;
    }
    reportProgress();

    const pixelsPerMm = entryCanvas.width / usableWidth;
    let sourceY = 0;
    let remainingHeightPx = entryCanvas.height;
    let isFirstSliceOfEntry = true;

    while (remainingHeightPx > 0) {
      const availableHeightMm = isFirstSliceOfEntry
        ? pageHeight - margin - currentY
        : usableHeight;

      const sliceHeightPx = Math.min(
        Math.round(Math.max(availableHeightMm, 10) * pixelsPerMm),
        remainingHeightPx
      );

      if (sliceHeightPx <= 0) break;

      const resultCanvas = sliceCanvasSafe(entryCanvas, sourceY, sliceHeightPx);

      if (!resultCanvas) {
        console.warn('Slicing failed, skipping rest of entry');
        break;
      }

      let imageFormat: 'JPEG' | 'PNG' = 'JPEG';
      let imgData: string;

      try {
        const blob = await canvasToBlob(resultCanvas, 'image/jpeg', 0.9);
        imgData = await blobToDataURL(blob);
      } catch (err) {
        console.warn('JPEG blob conversion failed, falling back to PNG toDataURL');
        try {
          imgData = resultCanvas.toDataURL('image/png');
          imageFormat = 'PNG';
        } catch (err2) {
          console.error('toDataURL also failed:', err2);
          break;
        }
      }

      const sliceHeightMm = sliceHeightPx / pixelsPerMm;
      const drawY = isFirstSliceOfEntry ? currentY : margin;

      try {
        pdf.addImage(
          imgData,
          imageFormat,
          margin,
          drawY,
          usableWidth,
          sliceHeightMm
        );
      } catch (addImgErr) {
        console.error('addImage failed:', addImgErr);
        break;
      }

      sourceY += sliceHeightPx;
      remainingHeightPx -= sliceHeightPx;
      isFirstSliceOfEntry = false;

      if (remainingHeightPx > 0) {
        pdf.addPage();
        currentY = margin + ENTRY_TOP_PADDING_MM;
      } else {
        currentY = drawY + sliceHeightMm + ENTRY_GAP_MM;
      }
    }

    // Page break prevention heuristic
    const spaceLeft = pageHeight - margin - currentY;
    if (spaceLeft < 40 && i < entries.length - 1) {
      pdf.addPage();
      currentY = margin + ENTRY_TOP_PADDING_MM;
    }
  }

  const fileName = `TimelineWeaver_年报_${startYear}-${endYear}_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    pdf.save(fileName);
  } catch (saveErr) {
    console.error('PDF save failed:', saveErr);
    throw new Error(`PDF导出失败: ${saveErr instanceof Error ? saveErr.message : '未知错误'}`);
  }

  onProgress?.({
    current: totalSteps,
    total: totalSteps,
    percentage: 100
  });
}
