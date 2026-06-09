import { Paper } from './paper';
import { TEMPLATES, OrigamiTemplate } from './templates';

export class UI {
  private paper: Paper;
  private templateThumbs: HTMLElement;
  private achievement: HTMLElement;
  private stepsIndicator: HTMLElement;
  private previewContainer: HTMLElement;
  private canvasContainer: HTMLElement;
  private togglePreviewBtn: HTMLElement;
  private showingPreview: boolean = false;

  private currentTemplateIndex: number = 0;

  constructor(paper: Paper) {
    this.paper = paper;

    const templateThumbs = document.getElementById('templateThumbs');
    const achievement = document.getElementById('achievement');
    const stepsIndicator = document.getElementById('stepsIndicator');
    const previewContainer = document.getElementById('previewContainer');
    const canvasContainer = document.getElementById('canvasContainer');
    const togglePreviewBtn = document.getElementById('togglePreviewBtn');

    if (!templateThumbs || !achievement || !stepsIndicator || !previewContainer || !canvasContainer || !togglePreviewBtn) {
      throw new Error('必要的DOM元素未找到');
    }

    this.templateThumbs = templateThumbs;
    this.achievement = achievement;
    this.stepsIndicator = stepsIndicator;
    this.previewContainer = previewContainer;
    this.canvasContainer = canvasContainer;
    this.togglePreviewBtn = togglePreviewBtn;

    this.renderTemplateThumbs();
    this.renderStepsIndicator();
    this.bindEvents();
  }

  private renderTemplateThumbs(): void {
    this.templateThumbs.innerHTML = '';
    TEMPLATES.forEach((template, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'template-thumb';
      thumb.innerHTML = template.icon;

      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.textContent = template.name;
      thumb.appendChild(tooltip);

      if (index === this.currentTemplateIndex) {
        thumb.classList.add('active');
      }

      thumb.addEventListener('click', () => {
        this.selectTemplate(index);
      });

      this.templateThumbs.appendChild(thumb);
    });
  }

  private renderStepsIndicator(): void {
    const state = this.paper.getState();
    this.stepsIndicator.innerHTML = '';
    state.completedSteps.forEach((completed, index) => {
      const dot = document.createElement('div');
      dot.className = 'step-dot';
      if (completed) {
        dot.classList.add('completed');
      } else if (index === state.currentStep) {
        dot.classList.add('current');
      }
      this.stepsIndicator.appendChild(dot);
    });
  }

  private selectTemplate(index: number): void {
    this.currentTemplateIndex = index;
    this.paper.setTemplate(index);

    const thumbs = this.templateThumbs.querySelectorAll('.template-thumb');
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  }

  public showAchievement(text: string): void {
    this.achievement.textContent = text;
    this.achievement.classList.add('show');
    setTimeout(() => {
      this.achievement.classList.remove('show');
    }, 3000);
  }

  public updateSteps(): void {
    this.renderStepsIndicator();
  }

  private bindEvents(): void {
    this.togglePreviewBtn.addEventListener('click', () => {
      this.togglePreview();
    });

    window.addEventListener('resize', () => {
      this.handleResponsive();
    });
    this.handleResponsive();
  }

  private togglePreview(): void {
    this.showingPreview = !this.showingPreview;
    if (this.showingPreview) {
      this.previewContainer.classList.add('show');
      this.canvasContainer.classList.add('hide');
      this.togglePreviewBtn.textContent = '2D';
    } else {
      this.previewContainer.classList.remove('show');
      this.canvasContainer.classList.remove('hide');
      this.togglePreviewBtn.textContent = '3D';
    }
  }

  private handleResponsive(): void {
    const isNarrow = window.innerWidth <= 700;
    if (!isNarrow) {
      this.previewContainer.classList.remove('show');
      this.canvasContainer.classList.remove('hide');
      this.showingPreview = false;
      this.togglePreviewBtn.textContent = '3D';
    }
  }
}
