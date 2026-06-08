import html2canvas from 'html2canvas';
import { CardElement, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types';

export function checkElementsOverflow(elements: CardElement[]): boolean {
  return elements.some((el) => {
    const right = el.x + el.width;
    const bottom = el.y + el.height;
    return el.x < 0 || el.y < 0 || right > CANVAS_WIDTH || bottom > CANVAS_HEIGHT;
  });
}

export async function exportToPNG(
  canvasElement: HTMLElement,
  onProgress?: () => void,
): Promise<void> {
  try {
    if (onProgress) onProgress();

    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await html2canvas(canvasElement, {
      scale: 4,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    const link = document.createElement('a');
    link.download = 'my_card.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
}
