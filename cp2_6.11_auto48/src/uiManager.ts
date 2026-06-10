import type { ClusterData, HoverInfo } from './types';
import { getEmotionLabel } from './emotionAnalyzer';

export class UIManager {
  private detailCard: HTMLElement;
  private cardTitle: HTMLElement;
  private cardEmotion: HTMLElement;
  private cardText: HTMLElement;
  private cardTime: HTMLElement;
  private closeButton: HTMLElement;
  
  private hoverLabel: HTMLElement;
  private helpPanel: HTMLElement;
  private helpToggle: HTMLElement;
  private toast: HTMLElement;
  
  private currentCluster: ClusterData | null = null;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private cardStartX = 0;
  private cardStartY = 0;

  constructor() {
    this.detailCard = document.getElementById('detail-card')!;
    this.cardTitle = document.getElementById('card-title')!;
    this.cardEmotion = document.getElementById('card-emotion')!;
    this.cardText = document.getElementById('card-text')!;
    this.cardTime = document.getElementById('card-time')!;
    this.closeButton = document.getElementById('close-card')!;
    this.hoverLabel = document.getElementById('hover-label')!;
    this.helpPanel = document.getElementById('help-panel')!;
    this.helpToggle = document.getElementById('help-toggle')!;
    this.toast = document.getElementById('toast')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideDetailCard();
    });

    this.detailCard.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.close-btn')) return;
      
      this.isDragging = true;
      this.dragOffsetX = e.clientX;
      this.dragOffsetY = e.clientY;
      this.cardStartX = this.detailCard.offsetLeft;
      this.cardStartY = this.detailCard.offsetTop;
      
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragOffsetX;
        const dy = e.clientY - this.dragOffsetY;
        
        this.detailCard.style.left = `${this.cardStartX + dx}px`;
        this.detailCard.style.top = `${this.cardStartY + dy}px`;
        this.detailCard.style.transform = 'none';
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    document.addEventListener('click', (e) => {
      if (
        this.detailCard.classList.contains('visible') &&
        !this.detailCard.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('#canvas-container') &&
        !(e.target as HTMLElement).closest('.toolbar-btn') &&
        !(e.target as HTMLElement).closest('.generate-btn') &&
        !(e.target as HTMLElement).closest('.nebula-input')
      ) {
        this.hideDetailCard();
      }
    });

    this.helpToggle.addEventListener('click', () => {
      this.helpPanel.classList.toggle('mobile-expanded');
    });
  }

  public showDetailCard(cluster: ClusterData, screenX: number, screenY: number): void {
    this.currentCluster = cluster;
    
    this.cardTitle.textContent = cluster.word;
    this.cardText.textContent = `这是一个关于「${cluster.word}」的记忆星团，由 ${cluster.particleIds.length} 颗星尘凝聚而成。`;
    
    this.cardEmotion.textContent = getEmotionLabel(cluster.emotion);
    this.cardEmotion.className = `emotion-tag ${cluster.emotion}`;
    
    const date = new Date(cluster.createdAt);
    this.cardTime.textContent = `创建于 ${date.toLocaleString('zh-CN')}`;

    this.detailCard.style.left = `${screenX}px`;
    this.detailCard.style.top = `${screenY - 20}px`;
    this.detailCard.style.transform = 'translate(-50%, -50%)';
    this.detailCard.classList.add('visible');
  }

  public hideDetailCard(): void {
    this.detailCard.classList.remove('visible');
    this.currentCluster = null;
  }

  public isDetailCardVisible(): boolean {
    return this.detailCard.classList.contains('visible');
  }

  public updateHoverLabel(hoverInfo: HoverInfo): void {
    if (hoverInfo.type === 'particle' && hoverInfo.word) {
      this.hoverLabel.textContent = hoverInfo.word;
      this.hoverLabel.style.left = `${hoverInfo.screenX}px`;
      this.hoverLabel.style.top = `${hoverInfo.screenY}px`;
      this.hoverLabel.classList.add('visible');
    } else {
      this.hoverLabel.classList.remove('visible');
    }
  }

  public showToast(message: string, duration: number = 2000): void {
    this.toast.textContent = message;
    this.toast.classList.add('visible');
    
    setTimeout(() => {
      this.toast.classList.remove('visible');
    }, duration);
  }

  public getInputElement(): HTMLInputElement {
    return document.getElementById('nebula-input') as HTMLInputElement;
  }

  public getGenerateButton(): HTMLElement {
    return document.getElementById('generate-btn')!;
  }

  public getSaveButton(): HTMLElement {
    return document.getElementById('save-btn')!;
  }

  public getShareButton(): HTMLElement {
    return document.getElementById('share-btn')!;
  }

  public getResetButton(): HTMLElement {
    return document.getElementById('reset-btn')!;
  }

  public getCurrentCluster(): ClusterData | null {
    return this.currentCluster;
  }
}
