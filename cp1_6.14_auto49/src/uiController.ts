import type { MoleculeData } from './moleculeData';

export interface UIControllerCallbacks {
  onPlayPause: () => void;
  onVolatilityChange: (value: number) => void;
  onMoleculeClick: (index: number) => void;
  onBackgroundClick: () => void;
}

export class UIController {
  private playPauseBtn: HTMLButtonElement;
  private volatilitySlider: HTMLInputElement;
  private volatilityValue: HTMLElement;
  private detailContent: HTMLElement;
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private isPlaying: boolean = true;
  private callbacks: UIControllerCallbacks;

  constructor(callbacks: UIControllerCallbacks) {
    this.callbacks = callbacks;

    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.volatilitySlider = document.getElementById('volatility-slider') as HTMLInputElement;
    this.volatilityValue = document.getElementById('volatility-value') as HTMLElement;
    this.detailContent = document.getElementById('detail-content') as HTMLElement;
    this.leftPanel = document.getElementById('left-panel') as HTMLElement;
    this.rightPanel = document.getElementById('right-panel') as HTMLElement;

    this.playPauseBtn.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.playPauseBtn.textContent = this.isPlaying ? '⏸ 暂停旋转' : '▶ 播放旋转';
      this.callbacks.onPlayPause();
    });

    this.volatilitySlider.addEventListener('input', () => {
      const val = parseFloat(this.volatilitySlider.value);
      this.volatilityValue.textContent = val.toFixed(2);
      this.callbacks.onVolatilityChange(val);
    });

    this.setupResponsive();
  }

  private setupResponsive(): void {
    const mq = window.matchMedia('(max-width: 768px)');

    const handleMobile = (isMobile: boolean) => {
      if (isMobile) {
        this.leftPanel.addEventListener('click', this.toggleLeftPanel);
        this.rightPanel.addEventListener('click', this.toggleRightPanel);
      } else {
        this.leftPanel.removeEventListener('click', this.toggleLeftPanel);
        this.rightPanel.removeEventListener('click', this.toggleRightPanel);
        this.leftPanel.classList.remove('expanded');
        this.rightPanel.classList.remove('expanded');
      }
    };

    handleMobile(mq.matches);
    mq.addEventListener('change', (e) => handleMobile(e.matches));
  }

  private toggleLeftPanel = (): void => {
    this.leftPanel.classList.toggle('expanded');
  };

  private toggleRightPanel = (): void => {
    this.rightPanel.classList.toggle('expanded');
  };

  showMoleculeDetail(mol: MoleculeData): void {
    const atomRows = mol.atoms.map(a =>
      `<div class="atom-list-row">
        <span style="color:${a.color};font-weight:bold;width:20px;">${a.symbol}</span>
        <span>(${a.position.x.toFixed(1)}, ${a.position.y.toFixed(1)}, ${a.position.z.toFixed(1)})</span>
        <span>r=${a.radius.toFixed(2)}</span>
      </div>`
    ).join('');

    const bondRows = mol.bonds.map(b =>
      `<div class="bond-list-row">
        <span>${b.atomIndex1}-${b.atomIndex2}</span>
        <span>${b.type === 'double' ? '═' : '─'}</span>
      </div>`
    ).join('');

    this.detailContent.innerHTML = `
      <div class="detail-row"><span class="detail-label">名称</span><span class="detail-value">${mol.name}</span></div>
      <div class="detail-row"><span class="detail-label">香调</span><span class="detail-value">${mol.noteTag}</span></div>
      <div class="detail-row"><span class="detail-label">原子数</span><span class="detail-value">${mol.atoms.length}</span></div>
      <div class="detail-row"><span class="detail-label">键数</span><span class="detail-value">${mol.bonds.length}</span></div>
      <div class="detail-row"><span class="detail-label">分子量</span><span class="detail-value">${mol.molecularWeight.toFixed(2)}</span></div>
      <div class="detail-row"><span class="detail-label">挥发性</span><span class="detail-value">${mol.volatility.toFixed(2)}</span></div>
      <div class="section-label">原子列表</div>
      ${atomRows}
      <div class="section-label">键列表</div>
      ${bondRows}
    `;
  }

  clearDetail(): void {
    this.detailContent.innerHTML = '<div class="detail-placeholder">点击分子查看详情</div>';
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
