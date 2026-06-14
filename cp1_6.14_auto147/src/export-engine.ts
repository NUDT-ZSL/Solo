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

function formatDate(dateStr: string): { day: string; month: string } {
  const date = new Date(dateStr);
  return {
    day: date.getDate().toString().padStart(2, '0'),
    month: MONTH_NAMES[date.getMonth()]
  };
}

function createEntryElement(entry: TimelineEntry, index: number): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 750px;
    padding: 30px 40px;
    background: #ffffff;
    margin-bottom: 0;
    page-break-inside: avoid;
    break-inside: avoid;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-sizing: border-box;
  `;

  const { day, month } = formatDate(entry.date);

  container.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:24px;margin-bottom:16px;">
      <div style="width:70px;height:70px;background:#3b82f6;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
        <div style="color:white;font-size:22px;font-weight:700;line-height:1;">${day}</div>
        <div style="color:white;font-size:12px;font-weight:500;margin-top:4px;opacity:0.9;">${month}</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:22px;font-weight:700;color:#111827;line-height:1.4;margin-top:6px;">${entry.title}</div>
      </div>
    </div>
    <div style="margin:12px 0 16px 94px;font-size:13px;line-height:1.9;color:#374151;white-space:pre-wrap;">${entry.content}</div>
    ${entry.tags.length > 0 ? `
      <div style="margin-left:94px;display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
        ${entry.tags.map(tag => `
          <span style="background:#eff6ff;color:#1e40af;font-size:11px;padding:4px 12px;border-radius:20px;font-weight:500;">${tag}</span>
        `).join('')}
      </div>
    ` : ''}
    ${index > 0 ? `
      <div style="height:1px;background:#e5e7eb;margin:24px -40px 0 -40px;"></div>
    ` : ''}
  `;

  return container;
}

function createCoverElement(startYear: number, endYear: number, count: number): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 750px;
    height: 900px;
    padding: 80px 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    page-break-after: always;
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
      percentage: Math.round((currentStep / totalSteps) * 100)
    });
  };

  reportProgress();
  await new Promise(resolve => setTimeout(resolve, 100));

  const coverEl = createCoverElement(startYear, endYear, entries.length);
  const coverCanvas = await renderToCanvas(coverEl);

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

  const coverImgData = coverCanvas.toDataURL('image/png');
  const coverRatio = coverCanvas.width / coverCanvas.height;
  const coverTargetHeight = usableWidth / coverRatio;
  pdf.addImage(coverImgData, 'PNG', margin, margin + (usableHeight - coverTargetHeight) / 2, usableWidth, coverTargetHeight);

  const itemsPerPage = 2;
  let itemOnPageCount = 0;
  let yPosition = margin;
  let firstContentPage = true;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const entryEl = createEntryElement(entry, i);
    const entryCanvas = await renderToCanvas(entryEl);
    reportProgress();

    const imgData = entryCanvas.toDataURL('image/png');
    const imgRatio = entryCanvas.width / entryCanvas.height;
    const targetWidth = usableWidth;
    const targetHeight = targetWidth / imgRatio;

    if (!firstContentPage || itemOnPageCount >= itemsPerPage || (yPosition + targetHeight > pageHeight - margin)) {
      pdf.addPage();
      yPosition = margin;
      itemOnPageCount = 0;
      firstContentPage = false;
    }

    pdf.addImage(imgData, 'PNG', margin, yPosition, targetWidth, targetHeight);
    yPosition += targetHeight;
    itemOnPageCount++;
  }

  const fileName = `TimelineWeaver_年报_${startYear}-${endYear}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);

  if (onProgress) {
    onProgress({
      current: totalSteps,
      total: totalSteps,
      percentage: 100
    });
  }
}
