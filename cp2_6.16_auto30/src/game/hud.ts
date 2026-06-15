export interface IHUDController {
  setScore(score: number): void;
  setHealth(health: number, maxHealth: number): void;
  showDifficultyNotice(): void;
  showDamageFlash(): void;
  showGameOver(score: number): void;
  hideGameOver(): void;
  showMainMenu(onStart: () => void, onInstructions: () => void): void;
  hideMainMenu(): void;
  showInstructions(onClose: () => void): void;
  hideInstructions(): void;
  onRestart(callback: () => void): void;
  updateScale(): void;
}

export class HUDController implements IHUDController {
  private container: HTMLElement;
  private hudPanel: HTMLElement;
  private scoreElement: HTMLElement;
  private healthElement: HTMLElement;
  private healthHeart: HTMLElement;
  private healthText: HTMLElement;
  
  private damageFlash: HTMLElement;
  private difficultyNotice: HTMLElement;
  
  private mainMenu: HTMLElement;
  private gameOverScreen: HTMLElement;
  private instructionsModal: HTMLElement;
  
  private baseFontSize: number = 16;
  private baseWidth: number = 1920;
  
  private restartCallback: (() => void) | null = null;

  constructor() {
    this.container = document.getElementById('game-container') as HTMLElement;
    
    this.hudPanel = this.createHUDPanel();
    this.scoreElement = this.createScoreElement();
    this.healthElement = this.createHealthElement();
    this.healthHeart = this.createHeartIcon();
    this.healthText = document.createElement('span');
    
    this.damageFlash = this.createDamageFlash();
    this.difficultyNotice = this.createDifficultyNotice();
    
    this.mainMenu = this.createMainMenu();
    this.gameOverScreen = this.createGameOverScreen();
    this.instructionsModal = this.createInstructionsModal();
    
    this.buildHUD();
    window.addEventListener('resize', this.updateScale.bind(this));
    this.updateScale();
  }

  private createHUDPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'hud-panel';
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: 240px;
      height: 60px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 12px;
      padding: 10px 15px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      z-index: 10;
      pointer-events: none;
      backdrop-filter: blur(4px);
    `;
    return panel;
  }

  private createScoreElement(): HTMLElement {
    const score = document.createElement('div');
    score.id = 'score-display';
    score.style.cssText = `
      font-family: monospace;
      font-size: 24px;
      color: #ffffff;
      text-shadow: 2px 2px 4px #000000;
      font-weight: bold;
    `;
    score.textContent = '得分: 0';
    return score;
  }

  private createHealthElement(): HTMLElement {
    const health = document.createElement('div');
    health.id = 'health-display';
    health.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    return health;
  }

  private createHeartIcon(): HTMLElement {
    const heart = document.createElement('div');
    heart.style.cssText = `
      width: 20px;
      height: 20px;
      position: relative;
      display: inline-block;
    `;
    heart.innerHTML = `
      <svg viewBox="0 0 24 24" fill="#ff1744" style="width:100%;height:100%;filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.8));">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    `;
    return heart;
  }

  private createDamageFlash(): HTMLElement {
    const flash = document.createElement('div');
    flash.id = 'damage-flash';
    flash.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #ff0000;
      opacity: 0;
      pointer-events: none;
      z-index: 5;
      transition: opacity 0.1s ease-out;
    `;
    return flash;
  }

  private createDifficultyNotice(): HTMLElement {
    const notice = document.createElement('div');
    notice.id = 'difficulty-notice';
    notice.style.cssText = `
      position: absolute;
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 32px;
      font-weight: bold;
      color: #ffab00;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.8);
      opacity: 0;
      pointer-events: none;
      z-index: 20;
      transition: opacity 0.5s ease;
    `;
    notice.textContent = '难度上升！';
    return notice;
  }

  private createMainMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.id = 'main-menu';
    menu.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 300px;
      background: rgba(13, 27, 42, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 30px;
      z-index: 100;
    `;
    
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 36px;
      font-weight: bold;
      color: #ff6f00;
      text-shadow: 0 0 20px #ff6f00, 0 0 40px #ffab00;
      letter-spacing: 4px;
    `;
    title.textContent = '龙焰飞行';
    
    const startBtn = document.createElement('button');
    startBtn.id = 'start-btn';
    startBtn.textContent = '开始游戏';
    startBtn.style.cssText = `
      width: 200px;
      height: 50px;
      border: none;
      border-radius: 8px;
      background: #00e5ff;
      color: #0d1b2a;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    startBtn.addEventListener('mouseenter', () => {
      startBtn.style.transform = 'scale(1.05)';
      startBtn.style.background = '#18ffff';
    });
    startBtn.addEventListener('mouseleave', () => {
      startBtn.style.transform = 'scale(1)';
      startBtn.style.background = '#00e5ff';
    });
    
    const instructionsBtn = document.createElement('button');
    instructionsBtn.id = 'instructions-btn';
    instructionsBtn.textContent = '操作说明';
    instructionsBtn.style.cssText = `
      width: 200px;
      height: 50px;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 8px;
      background: transparent;
      color: #ffffff;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    instructionsBtn.addEventListener('mouseenter', () => {
      instructionsBtn.style.background = 'rgba(255,255,255,0.1)';
      instructionsBtn.style.transform = 'scale(1.05)';
    });
    instructionsBtn.addEventListener('mouseleave', () => {
      instructionsBtn.style.background = 'transparent';
      instructionsBtn.style.transform = 'scale(1)';
    });
    
    menu.appendChild(title);
    menu.appendChild(startBtn);
    menu.appendChild(instructionsBtn);
    
    return menu;
  }

  private createGameOverScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'game-over';
    screen.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 30px;
      z-index: 100;
    `;
    
    const gameOverText = document.createElement('div');
    gameOverText.id = 'game-over-text';
    gameOverText.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: #ff1744;
      text-shadow: 0 0 20px #ff1744;
      letter-spacing: 4px;
    `;
    gameOverText.textContent = 'GAME OVER';
    
    const finalScore = document.createElement('div');
    finalScore.id = 'final-score';
    finalScore.style.cssText = `
      font-size: 28px;
      color: #ffffff;
      text-shadow: 2px 2px 4px #000000;
    `;
    finalScore.textContent = '最终得分: 0';
    
    const restartBtn = document.createElement('button');
    restartBtn.id = 'restart-btn';
    restartBtn.textContent = '点击重玩';
    restartBtn.style.cssText = `
      width: 200px;
      height: 50px;
      border: none;
      border-radius: 8px;
      background: #00e5ff;
      color: #0d1b2a;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    restartBtn.addEventListener('mouseenter', () => {
      restartBtn.style.transform = 'translateY(-2px)';
      restartBtn.style.background = '#18ffff';
    });
    restartBtn.addEventListener('mouseleave', () => {
      restartBtn.style.transform = 'translateY(0)';
      restartBtn.style.background = '#00e5ff';
    });
    restartBtn.addEventListener('click', () => {
      if (this.restartCallback) {
        this.restartCallback();
      }
    });
    
    screen.appendChild(gameOverText);
    screen.appendChild(finalScore);
    screen.appendChild(restartBtn);
    
    return screen;
  }

  private createInstructionsModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.id = 'instructions-modal';
    modal.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 200;
    `;
    
    const card = document.createElement('div');
    card.style.cssText = `
      width: 400px;
      padding: 40px;
      background: rgba(13, 27, 42, 0.9);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      color: #ffffff;
    `;
    
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: #ffab00;
      margin-bottom: 20px;
      text-align: center;
    `;
    title.textContent = '操作说明';
    
    const content = document.createElement('div');
    content.style.cssText = `
      font-size: 16px;
      line-height: 2;
      color: #cccccc;
    `;
    content.innerHTML = `
      <p>🖱️ <strong>鼠标/触屏拖拽</strong>：控制飞龙上下左右移动</p>
      <p>💎 <strong>收集水晶</strong>：恢复生命值并获得分数</p>
      <p>🔥 <strong>躲避火球</strong>：碰到火球会损失生命值</p>
      <p>⏱️ <strong>生存越久</strong>：难度会逐渐提升</p>
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '知道了';
    closeBtn.style.cssText = `
      width: 100%;
      margin-top: 25px;
      padding: 12px;
      border: none;
      border-radius: 8px;
      background: #00e5ff;
      color: #0d1b2a;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    closeBtn.addEventListener('click', () => {
      this.hideInstructions();
    });
    
    card.appendChild(title);
    card.appendChild(content);
    card.appendChild(closeBtn);
    modal.appendChild(card);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideInstructions();
      }
    });
    
    return modal;
  }

  private buildHUD(): void {
    this.healthElement.appendChild(this.healthHeart);
    this.healthText.style.cssText = `
      font-family: monospace;
      font-size: 20px;
      color: #ff1744;
      text-shadow: 2px 2px 4px #000000;
      font-weight: bold;
    `;
    this.healthText.textContent = '100';
    this.healthElement.appendChild(this.healthText);
    
    this.hudPanel.appendChild(this.scoreElement);
    this.hudPanel.appendChild(this.healthElement);
    
    this.container.appendChild(this.hudPanel);
    this.container.appendChild(this.damageFlash);
    this.container.appendChild(this.difficultyNotice);
    this.container.appendChild(this.mainMenu);
    this.container.appendChild(this.gameOverScreen);
    this.container.appendChild(this.instructionsModal);
    
    this.hudPanel.style.display = 'none';
  }

  public setScore(score: number): void {
    this.scoreElement.textContent = `得分: ${Math.floor(score)}`;
  }

  public setHealth(health: number, maxHealth: number): void {
    this.healthText.textContent = `${Math.floor(health)}`;
    const healthPercent = health / maxHealth;
    const scale = 0.8 + healthPercent * 0.2;
    this.healthHeart.style.transform = `scale(${scale})`;
    
    if (healthPercent < 0.3) {
      this.healthText.style.color = '#ff1744';
    } else if (healthPercent < 0.6) {
      this.healthText.style.color = '#ffab00';
    } else {
      this.healthText.style.color = '#ff1744';
    }
  }

  public showDifficultyNotice(): void {
    this.difficultyNotice.style.opacity = '1';
    setTimeout(() => {
      this.difficultyNotice.style.opacity = '0';
    }, 2000);
  }

  public showDamageFlash(): void {
    this.damageFlash.style.opacity = '0.3';
    setTimeout(() => {
      this.damageFlash.style.opacity = '0';
    }, 300);
  }

  public showGameOver(score: number): void {
    this.gameOverScreen.style.display = 'flex';
    
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) {
      finalScoreEl.textContent = `最终得分: ${Math.floor(score)}`;
    }
    
    const gameOverText = document.getElementById('game-over-text');
    if (gameOverText) {
      gameOverText.style.opacity = '0';
      gameOverText.style.transform = 'scale(0.5)';
      gameOverText.style.transition = 'all 0.3s ease';
      
      setTimeout(() => {
        gameOverText.style.opacity = '1';
        gameOverText.style.transform = 'scale(1)';
      }, 100);
    }
  }

  public hideGameOver(): void {
    this.gameOverScreen.style.display = 'none';
  }

  public showMainMenu(onStart: () => void, onInstructions: () => void): void {
    this.mainMenu.style.display = 'flex';
    
    const startBtn = document.getElementById('start-btn');
    const instructionsBtn = document.getElementById('instructions-btn');
    
    if (startBtn) {
      startBtn.onclick = onStart;
    }
    if (instructionsBtn) {
      instructionsBtn.onclick = onInstructions;
    }
  }

  public hideMainMenu(): void {
    this.mainMenu.style.display = 'none';
    this.hudPanel.style.display = 'flex';
  }

  public showInstructions(onClose: () => void): void {
    this.instructionsModal.style.display = 'flex';
  }

  public hideInstructions(): void {
    this.instructionsModal.style.display = 'none';
  }

  public onRestart(callback: () => void): void {
    this.restartCallback = callback;
  }

  public updateScale(): void {
    const scale = Math.min(window.innerWidth / this.baseWidth, 1.2);
    
    this.hudPanel.style.transform = `scale(${scale})`;
    this.hudPanel.style.transformOrigin = 'top left';
    
    this.mainMenu.style.transform = `translate(-50%, -50%) scale(${scale})`;
    this.gameOverScreen.style.transform = `translate(-50%, -50%) scale(${scale})`;
    this.difficultyNotice.style.transform = `translateX(-50%) scale(${scale})`;
  }
}
