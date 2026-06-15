export function takeScreenshot(filename: string = 'climate-visualization.png'): void {
  const canvas = document.querySelector('canvas');
  
  if (!canvas) {
    console.error('No canvas element found');
    return;
  }
  
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to take screenshot:', error);
  }
}

export function showToast(message: string, duration: number = 3000): void {
  const existingToast = document.querySelector('.climate-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = 'climate-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    left: 20px;
    bottom: 80px;
    background: rgba(0, 0, 0, 0.8);
    color: #e2e8f0;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 14px;
    z-index: 1000;
    backdrop-filter: blur(8px);
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}
