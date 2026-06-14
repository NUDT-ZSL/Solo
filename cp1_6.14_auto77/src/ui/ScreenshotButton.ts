import { eventBus, Events } from './EventBus';

export class ScreenshotButton {
  private container: HTMLElement;
  private button: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.button = this.createButton();
    this.container.appendChild(this.button);
  }

  private createButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'ff-screenshot-btn';
    btn.type = 'button';
    btn.title = '截图 (1920×1080 PNG)';
    btn.setAttribute('aria-label', '截取当前画面');

    btn.innerHTML = `
      <svg
        class="ff-camera-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    `;

    btn.addEventListener('click', this.onClick);

    return btn;
  }

  private onClick = (): void => {
    this.button.classList.add('ff-screenshot-flash');
    eventBus.emit(Events.TAKE_SCREENSHOT);
    setTimeout(() => {
      this.button.classList.remove('ff-screenshot-flash');
    }, 300);
  };

  dispose(): void {
    this.button.removeEventListener('click', this.onClick);
    if (this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
  }
}
