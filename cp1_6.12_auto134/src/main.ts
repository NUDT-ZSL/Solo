import { PointCloudRenderer } from './pointCloudRenderer';
import { Controls } from './controls';
import { parseDepthImage, loadImage, getImageData, validateFile } from './depthParser';
import { exportToPLY } from './exporter';

class App {
  private renderer: PointCloudRenderer;
  private controls: Controls;
  private container: HTMLElement;
  private loader: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.loader = document.getElementById('loader')!;

    this.renderer = new PointCloudRenderer(this.container);
    this.controls = new Controls(
      document.getElementById('app')!,
      this.renderer,
      this.handleFileUpload.bind(this)
    );

    this.controls.onExportClick = () => {
      exportToPLY(this.renderer);
    };

    this.hideLoader();
    this.setupErrorHandling();
  }

  private hideLoader(): void {
    setTimeout(() => {
      this.loader.classList.add('hidden');
      setTimeout(() => {
        this.loader.style.display = 'none';
      }, 500);
    }, 300);
  }

  private setupErrorHandling(): void {
    window.addEventListener('error', (e) => {
      console.error('全局错误:', e.error);
      this.showErrorMessage('发生了一个错误，请刷新页面重试');
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('未处理的Promise拒绝:', e.reason);
      if (e.reason instanceof Error) {
        this.showErrorMessage(e.reason.message);
      } else {
        this.showErrorMessage('操作失败，请重试');
      }
    });
  }

  private async handleFileUpload(file: File): Promise<void> {
    const validationError = validateFile(file);
    if (validationError) {
      this.showErrorMessage(validationError.message);
      return;
    }

    try {
      this.showLoadingState();
      
      const img = await loadImage(file);
      const imageData = getImageData(img);
      
      const pointCloudData = parseDepthImage(imageData, {
        maxPoints: 20000,
        depthScale: 1.0,
      });
      
      if (pointCloudData.pointCount === 0) {
        this.showErrorMessage('未检测到有效的深度数据，请检查图像编码格式（R=深度高位, G=深度低位, B=前景掩码）');
        return;
      }
      
      this.renderer.updatePointCloud(pointCloudData);
      
      URL.revokeObjectURL(img.src);
      
    } catch (e) {
      console.error('文件处理失败:', e);
      if (e instanceof Error) {
        this.showErrorMessage(e.message);
      } else {
        this.showErrorMessage('文件处理失败，请检查文件是否有效');
      }
    } finally {
      this.hideLoadingState();
    }
  }

  private showLoadingState(): void {
    const uploadTitle = this.container.querySelector('.upload-title') as HTMLElement;
    if (uploadTitle) {
      uploadTitle.textContent = '正在解析...';
    }
  }

  private hideLoadingState(): void {
    const uploadTitle = document.querySelector('.upload-title') as HTMLElement;
    if (uploadTitle) {
      uploadTitle.textContent = '拖拽深度图到此处';
    }
  }

  private showErrorMessage(message: string): void {
    const existingError = document.querySelector('.error-toast');
    if (existingError) {
      existingError.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
      <span style="margin-right: 8px;">⚠️</span>
      <span>${message}</span>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      padding: 14px 28px;
      background: linear-gradient(135deg, #f85149 0%, #da3633 100%);
      color: white;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1001;
      box-shadow: 0 4px 24px rgba(248, 81, 73, 0.4);
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      align-items: center;
      max-width: 90vw;
      text-align: center;
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(-100px)';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
