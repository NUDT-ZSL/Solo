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

function createEntryElement(entry: TimelineEntry, isFirst: boolean): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 750px;
    padding: 0 40px 24px 40px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-sizing: border-box;
  `;

  const { day, month } = formatDate(entry.date);

  const headerSpacing = isFirst ? 'padding-top: 8px;' : 'padding-top: 24px; border-top: 1px solid #e5e7eb;';

  container.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:24px;margin-bottom:12px;${headerSpacing}">
      <div style="width:70px;height:70px;background:#3b82f6;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);">
        <div style="color:white;font-size:22px;font-weight:700;line-height:1;">${day}</div>
        <div style="color:white;font-size:12px;font-weight:500;margin-top:4px;opacity:0.9;">${month}</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:22px;font-weight:700;color:#111827;line-height:1.4;margin-top:10px;">${escapeHtml(entry.title)}</div>
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

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  container.innerHTML = `
    <div style="font-size:28px;color:rgba(255,255,255,0.85);letter-spacing:4px;font-weight:300;margin-bottom:24px;">TIMELINE WEAVER</div>
    <div style="width:60px;height:2px;background:rgba(255,255,255,0.5);margin-bottom:40px;"></div>
    <div style="font-size:56px;color:#ffffff;font-weight:800;line-height:1.2;margin-bottom:16px;">时光档案</div>
    <div style="font-size:20px;color:rgba(255,255,255,0.9);margin-bottom:8px;">年度记忆汇编</div>
    <div style="font-size:36px;color:#ffffff;font-weight:600;margin:24px 0;">${startYear} — ${endYear}</div>
    <div style="font-size:16px;color:rgba(255,255,255,0.75);margin-top:48px;">共收录 ${count} 条珍贵回忆</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:80px;">生成于 ${new Date().toLocaleDateString('zh-CN')}</div>
  `;

  return container;
}

async function renderToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    z-index: -1;
    background: #ffffff;
  `;
  wrapper.appendChild(element);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });
    return canvas;
  } finally {
    document.body.removeChild(wrapper);
  }
}

function sliceCanvas(sourceCanvas: HTMLCanvasElement, yOffset: number, sliceHeight: number): HTMLCanvasElement {
  const slice = document.createElement('canvas');
  slice.width = sourceCanvas.width;
  slice.height = Math.min(sliceHeight, sourceCanvas.height - yOffset);
  const ctx = slice.getContext('2d');
  if (!ctx) return slice;
  ctx.drawImage(
    sourceCanvas,
    0, yOffset, slice.width, slice.height,
    0, 0, slice.width, slice.height
  );
  return slice;
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
    onProgress?.({
      current: currentStep,
      total: totalSteps,
      percentage: Math.min(100, Math.round((currentStep / totalSteps) * 100))
    });
  };

  reportProgress();
  await new Promise(resolve => setTimeout(resolve, 100));

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const coverEl = createCoverElement(startYear, endYear, entries.length);
  const coverCanvas = await renderToCanvas(coverEl);

  const coverImgData = coverCanvas.toDataURL('image/png');
  const coverRatio = coverCanvas.width / coverCanvas.height;
  const coverTargetHeight = usableWidth / coverRatio;
  pdf.addImage(coverImgData, 'PNG', margin, margin + (usableHeight - coverTargetHeight) / 2, usableWidth, coverTargetHeight);

  pdf.addPage();

  let currentY = margin + ENTRY_TOP_PADDING_MM;
  let isFirstEntryOfPage = true;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const entryEl = createEntryElement(entry, isFirstEntryOfPage && i === 0);
    const entryCanvas = await renderToCanvas(entryEl);
    reportProgress();

    const pixelsPerMm = entryCanvas.width / usableWidth;
    const fullHeightMm = entryCanvas.height / pixelsPerMm;

    let sourceY = 0;
    let remainingHeightPx = entryCanvas.height;
    let isFirstSlice = true;

    while (remainingHeightPx > 0) {
      let availableHeightMm: number;

      if (isFirstSlice) {
        availableHeightMm = pageHeight - margin - currentY;
      } else {
        availableHeightMm = usableHeight;
      }

      const sliceHeightPx = Math.min(
        Math.round(availableHeightMm * pixelsPerMm),
        remainingHeightPx
      );

      if (sliceHeightPx <= 0) break;

      const sliceHeightMm = sliceHeightPx / pixelsPerMm;
      const resultCanvas = sliceCanvas(entryCanvas, sourceY, sliceHeightPx);
      const sliceImgData = resultCanvas.toDataURL('image/png');

      const drawY = isFirstSlice ? currentY : margin;
      pdf.addImage(sliceImgData, 'PNG', margin, drawY, usableWidth, sliceHeightMm);

      sourceY += sliceHeightPx;
      remainingHeightPx -= sliceHeightPx;
      isFirstSlice = false;

      if (remainingHeightPx > 0) {
        pdf.addPage();
        currentY = margin + ENTRY_TOP_PADDING_MM;
        isFirstEntryOfPage = false;
      } else {
        currentY = drawY + sliceHeightMm + ENTRY_GAP_MM;
        isFirstEntryOfPage = false;
      }
    }

    const spaceLeft = pageHeight - margin - currentY;
    if (spaceLeft < 40 && i < entries.length - 1) {
      pdf.addPage();
      currentY = margin + ENTRY_TOP_PADDING_MM;
      isFirstEntryOfPage = true;
    }
  }

  const fileName = `TimelineWeaver_年报_${startYear}-${endYear}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);

  onProgress?.({
    current: totalSteps,
    total: totalSteps,
    percentage: 100
  });
}
