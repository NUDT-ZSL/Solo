import { GameState, GameConfig, GameType, Card } from './types';
import { createGame, playCards, calculateScores, formatDuration, getPlayCountByPlayer, getHandSizeHistory } from './card-logic';
import { UIRenderer } from './ui-renderer';
import { ReplayController } from './replay-controller';
import { apiHandler, GameListItem } from './api-handler';

type ViewMode = 'menu' | 'game' | 'replay';

export class GameEntry {
  private gameCanvas: HTMLCanvasElement;
  private replayCanvas: HTMLCanvasElement;
  private gameRenderer: UIRenderer;
  private replayRenderer: UIRenderer;
  private replayController: ReplayController;
  private gameState: GameState | null = null;
  private selectedCards: string[] = [];
  private currentView: ViewMode = 'menu';
  private gameHistory: GameListItem[] = [];

  private menuContainer: HTMLElement;
  private gameContainer: HTMLElement;
  private replayContainer: HTMLElement;

  constructor() {
    this.gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.replayCanvas = document.getElementById('replayCanvas') as HTMLCanvasElement;

    if (!this.gameCanvas || !this.replayCanvas) {
      throw new Error('找不到Canvas元素');
    }

    this.gameRenderer = new UIRenderer(this.gameCanvas);
    this.replayRenderer = new UIRenderer(this.replayCanvas);
    this.replayController = new ReplayController(this.replayRenderer);

    this.menuContainer = document.getElementById('menuContainer') as HTMLElement;
    this.gameContainer = document.getElementById('gameContainer') as HTMLElement;
    this.replayContainer = document.getElementById('replayContainer') as HTMLElement;

    this.init();
  }

  private init(): void {
    this.gameRenderer.resize();
    this.replayRenderer.resize();
    this.setupEventListeners();
    this.showMenu();
    this.loadGameHistory();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());

    this.gameCanvas.addEventListener('click', (e) => this.handleGameCanvasClick(e));

    const createGameBtn = document.getElementById('createGameBtn');
    if (createGameBtn) {
      createGameBtn.addEventListener('click', () => this.handleCreateGame());
    }

    const playCardsBtn = document.getElementById('playCardsBtn');
    if (playCardsBtn) {
      playCardsBtn.addEventListener('click', () => this.handlePlayCards());
    }

    const replayBtn = document.getElementById('replayBtn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => this.showReplayView());
    }

    const backToMenuBtn = document.getElementById('backToMenuBtn');
    if (backToMenuBtn) {
      backToMenuBtn.addEventListener('click', () => this.showMenu());
    }

    const replayBackBtn = document.getElementById('replayBackBtn');
    if (replayBackBtn) {
      replayBackBtn.addEventListener('click', () => this.showMenu());
    }

    const loadReplayBtn = document.getElementById('loadReplayBtn');
    if (loadReplayBtn) {
      loadReplayBtn.addEventListener('click', () => this.handleLoadReplayById());
    }

    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => this.toggleReplayPlay());
    }

    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      progressBar.addEventListener('input', (e) => this.handleProgressChange(e));
    }

    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleSpeedChange(e));
    });
  }

  private handleResize(): void {
    if (this.currentView === 'game') {
      this.gameRenderer.resize();
      if (this.gameState) {
        this.gameRenderer.render(this.gameState);
      }
    } else if (this.currentView === 'replay') {
      this.replayRenderer.resize();
    }
  }

  private handleGameCanvasClick(e: MouseEvent): void {
    if (this.currentView !== 'game' || !this.gameState) return;

    const rect = this.gameCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const result = this.gameRenderer.getCardAtPosition(x, y, this.gameState.players);
    if (result) {
      this.toggleCardSelection(result.card.id);
    }
  }

  private toggleCardSelection(cardId: string): void {
    const index = this.selectedCards.indexOf(cardId);
    if (index === -1) {
      this.selectedCards.push(cardId);
    } else {
      this.selectedCards.splice(index, 1);
    }

    this.gameRenderer.setSelectedCards(this.selectedCards);
    if (this.gameState) {
      this.gameRenderer.render(this.gameState);
    }
  }

  private showMenu(): void {
    this.currentView = 'menu';
    this.menuContainer.style.display = 'flex';
    this.gameContainer.style.display = 'none';
    this.replayContainer.style.display = 'none';
    this.gameRenderer.stopAnimationLoop();
    this.replayController.pause();
  }

  private async loadGameHistory(): Promise<void> {
    try {
      this.gameHistory = await apiHandler.listGames();
      this.updateGameHistoryList();
    } catch (error) {
      console.error('加载游戏历史失败:', error);
      this.gameHistory = [];
    }
  }

  private updateGameHistoryList(): void {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    historyList.innerHTML = '';

    if (this.gameHistory.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.color = '#90a4ae';
      emptyMsg.style.fontSize = '13px';
      emptyMsg.style.padding = '20px';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.textContent = '暂无历史记录';
      historyList.appendChild(emptyMsg);
      return;
    }

    this.gameHistory.forEach(game => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.dataset.gameId = game.id;

      const date = new Date(game.startTime);
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

      item.innerHTML = `
        <span class="history-game-type">${game.gameType === 'dou dizhu' ? '斗地主' : 'UNO'}</span>
        <span class="history-date">${formattedDate}</span>
        <span class="history-players">${game.playerNames.length}人</span>
      `;

      item.addEventListener('click', () => this.loadReplayGame(game.id));
      historyList.appendChild(item);
    });
  }

  private showGameView(): void {
    this.currentView = 'game';
    this.menuContainer.style.display = 'none';
    this.gameContainer.style.display = 'flex';
    this.replayContainer.style.display = 'none';
  }

  private showReplayView(): void {
    this.currentView = 'replay';
    this.menuContainer.style.display = 'none';
    this.gameContainer.style.display = 'none';
    this.replayContainer.style.display = 'flex';
    this.loadGameHistory();
  }

  private handleCreateGame(): void {
    const gameTypeSelect = document.getElementById('gameTypeSelect') as HTMLSelectElement;
    const playerNamesInput = document.getElementById('playerNamesInput') as HTMLInputElement;

    const gameType = gameTypeSelect.value as GameType;
    const playerNamesStr = playerNamesInput.value.trim();
    const playerNames = playerNamesStr ? playerNamesStr.split(',').map(n => n.trim()).filter(n => n) : ['玩家1', '玩家2', '玩家3'];

    if (playerNames.length < 2 || playerNames.length > 4) {
      alert('玩家数量必须在2-4人之间');
      return;
    }

    const config: GameConfig = {
      gameType,
      playerNames
    };

    this.startNewGame(config);
  }

  private async startNewGame(config: GameConfig): Promise<void> {
    this.gameState = createGame(config);
    this.selectedCards = [];
    this.gameRenderer.setSelectedCards([]);

    this.showGameView();
    this.updatePlayRecordList();
    this.updateCurrentPlayerDisplay();

    this.gameRenderer.startAnimationLoop(this.gameState);

    try {
      await apiHandler.saveGame(this.gameState);
    } catch (error) {
      console.error('保存游戏失败:', error);
    }
  }

  private handlePlayCards(): void {
    if (!this.gameState || this.selectedCards.length === 0) {
      alert('请先选择要出的牌');
      return;
    }

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.position !== 'bottom') {
      alert('还没轮到你出牌');
      return;
    }

    const cardsToPlay = currentPlayer.hand.filter(c => this.selectedCards.includes(c.id));
    if (cardsToPlay.length === 0) {
      alert('请选择要出的牌');
      return;
    }

    const newState = playCards(this.gameState, currentPlayer.id, cardsToPlay);

    if (newState === this.gameState) {
      alert('出牌无效');
      return;
    }

    this.gameState = newState;
    this.selectedCards = [];
    this.gameRenderer.setSelectedCards([]);

    this.updatePlayRecordList();
    this.updateCurrentPlayerDisplay();

    if (newState.isGameOver) {
      this.handleGameOver();
    }

    this.saveGameState();
  }

  private updatePlayRecordList(): void {
    const playRecordList = document.getElementById('playRecordList');
    if (!playRecordList || !this.gameState) return;

    playRecordList.innerHTML = '';

    const recentRecords = [...this.gameState.playHistory].reverse();

    for (const record of recentRecords) {
      const player = this.gameState.players.find(p => p.id === record.playerId);
      const item = document.createElement('div');
      item.className = 'play-record-item';

      const dot = document.createElement('span');
      dot.className = 'player-dot';
      dot.style.backgroundColor = player?.color || '#999';

      const text = document.createElement('span');
      const cardType = record.cardType || `${record.cards.length}张牌`;
      text.textContent = `${player?.name || '未知'} - ${cardType}`;

      item.appendChild(dot);
      item.appendChild(text);
      playRecordList.appendChild(item);
    }
  }

  private updateCurrentPlayerDisplay(): void {
    const currentPlayerEl = document.getElementById('currentPlayer');
    if (!currentPlayerEl || !this.gameState) return;

    const player = this.gameState.players[this.gameState.currentPlayerIndex];
    currentPlayerEl.textContent = player?.name || '未知';
    currentPlayerEl.style.color = player?.color || '#fff';
  }

  private handleGameOver(): void {
    if (!this.gameState) return;

    this.gameRenderer.stopAnimationLoop();
    this.saveGameState();
    this.showGameResultPanel();
  }

  private showGameResultPanel(): void {
    if (!this.gameState) return;

    const panel = document.getElementById('gameResultPanel');
    if (!panel) return;

    const scores = calculateScores(this.gameState);
    const duration = this.gameState.endTime ? formatDuration(this.gameState.endTime - this.gameState.startTime) : '0分0秒';

    const resultContent = document.getElementById('resultContent');
    if (!resultContent) return;

    resultContent.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = '🎉 本局结算';
    resultContent.appendChild(title);

    const gameIdEl = document.createElement('p');
    gameIdEl.className = 'result-game-id';
    gameIdEl.textContent = `牌局ID: ${this.gameState.id}`;
    resultContent.appendChild(gameIdEl);

    const durationEl = document.createElement('p');
    durationEl.style.marginBottom = '12px';
    durationEl.textContent = `对局时长: ${duration}`;
    resultContent.appendChild(durationEl);

    const sortedPlayers = [...this.gameState.players].sort((a, b) => a.hand.length - b.hand.length);

    for (const player of sortedPlayers) {
      const playerRow = document.createElement('div');
      playerRow.className = 'result-player-row';

      const dot = document.createElement('span');
      dot.className = 'player-dot';
      dot.style.backgroundColor = player.color;

      const name = document.createElement('span');
      name.style.flex = '1';
      name.textContent = player.name;

      const handCount = document.createElement('span');
      handCount.textContent = `手牌: ${player.hand.length}张`;

      const score = document.createElement('span');
      score.style.marginLeft = '10px';
      score.textContent = `得分: ${scores[player.id]}`;

      if (this.gameState.winnerId === player.id) {
        playerRow.classList.add('winner');
        const winnerBadge = document.createElement('span');
        winnerBadge.textContent = '👑';
        playerRow.appendChild(winnerBadge);
      }

      playerRow.appendChild(dot);
      playerRow.appendChild(name);
      playerRow.appendChild(handCount);
      playerRow.appendChild(score);
      resultContent.appendChild(playerRow);
    }

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';
    btnContainer.style.marginTop = '16px';
    btnContainer.style.width = '100%';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '返回菜单';
    closeBtn.className = 'btn-primary';
    closeBtn.style.flex = '1';
    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      this.showMenu();
    });

    const replayBtn = document.createElement('button');
    replayBtn.textContent = '查看回放';
    replayBtn.className = 'btn-secondary';
    replayBtn.style.flex = '1';
    replayBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      this.showReplayView();
      if (this.gameState) {
        this.loadReplayGame(this.gameState.id);
      }
    });

    btnContainer.appendChild(replayBtn);
    btnContainer.appendChild(closeBtn);
    resultContent.appendChild(btnContainer);

    panel.style.display = 'flex';
    requestAnimationFrame(() => {
      panel.classList.add('panel-enter');
    });
  }

  private async saveGameState(): Promise<void> {
    if (!this.gameState) return;

    try {
      await apiHandler.saveGame(this.gameState);
    } catch (error) {
      console.error('保存游戏失败:', error);
    }
  }

  private handleLoadReplayById(): void {
    const gameIdInput = document.getElementById('gameIdInput') as HTMLInputElement;
    const gameId = gameIdInput.value.trim();

    if (gameId) {
      this.loadReplayGame(gameId);
    } else {
      alert('请输入牌局ID');
    }
  }

  private async loadReplayGame(gameId: string): Promise<void> {
    try {
      const gameState = await apiHandler.getGame(gameId);

      this.replayController = new ReplayController(this.replayRenderer);
      this.replayController.loadGame(gameState);
      this.replayController.setOnStepChange((step) => this.updateProgressDisplay(step));
      this.replayController.setOnStateChange(() => {});

      this.updateReplayInfo(gameState);
      this.updateProgressDisplay(0);

      const speedBtns = document.querySelectorAll('.speed-btn');
      speedBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-speed') === '1') {
          btn.classList.add('active');
        }
      });

      const playPauseBtn = document.getElementById('playPauseBtn');
      if (playPauseBtn) playPauseBtn.textContent = '播放';
    } catch (error) {
      alert('加载回放失败: ' + (error as Error).message);
    }
  }

  private updateReplayInfo(gameState: GameState): void {
    const replayInfo = document.getElementById('replayInfo');
    if (!replayInfo) return;

    const gameTypeStr = gameState.gameType === 'dou dizhu' ? '斗地主' : 'UNO';
    const playCounts = getPlayCountByPlayer(gameState);

    let playersHtml = '';
    for (const player of gameState.players) {
      playersHtml += `<p style="margin-top: 4px;"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${player.color}; margin-right: 6px;"></span>${player.name} - 出牌${playCounts[player.id] || 0}次</p>`;
    }

    replayInfo.innerHTML = `
      <p><strong>游戏类型:</strong> ${gameTypeStr}</p>
      <p><strong>牌局ID:</strong> ${gameState.id}</p>
      <p><strong>总操作数:</strong> ${gameState.playHistory.length}</p>
      <p style="margin-top: 8px;"><strong>玩家统计:</strong></p>
      ${playersHtml}
    `;
  }

  private updateProgressDisplay(step: number): void {
    const progressBar = document.getElementById('progressBar') as HTMLInputElement;
    const stepInfo = document.getElementById('stepInfo');

    const totalSteps = this.replayController.getTotalSteps();

    if (progressBar) {
      progressBar.max = String(totalSteps);
      progressBar.value = String(step);
    }

    if (stepInfo) {
      const playRecord = this.replayController.getCurrentPlayRecord();
      if (playRecord) {
        const player = this.getPlayerFromReplay(playRecord.playerId);
        stepInfo.textContent = `第 ${step}/${totalSteps} 步: ${player?.name || '未知'} - ${playRecord.cardType || '出牌'}`;
      } else {
        stepInfo.textContent = `第 ${step}/${totalSteps} 步: 游戏开始`;
      }

      if (step >= totalSteps && totalSteps > 0) {
        this.showWinrateAnalysis();
      }
    }
  }

  private getPlayerFromReplay(playerId: string): any {
    const gameState = this.replayController['gameState'];
    if (!gameState) return null;
    return gameState.players.find((p: any) => p.id === playerId);
  }

  private showWinrateAnalysis(): void {
    const panel = document.getElementById('winratePanel');
    const content = document.getElementById('winrateContent');
    if (!panel || !content) return;

    const gameState = this.replayController['gameState'];
    if (!gameState) return;

    const playCounts = getPlayCountByPlayer(gameState);
    const handSizeHistory = getHandSizeHistory(gameState);
    const scores = calculateScores(gameState);

    let html = '';
    for (const player of gameState.players) {
      const isWinner = gameState.winnerId === player.id;
      const winRate = isWinner ? '100%' : '0%';
      html += `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 6px; background: ${isWinner ? '#f3e5f5' : '#f5f5f5'}; border-radius: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: ${player.color};"></span>
          <span style="flex: 1; font-size: 14px;">${player.name}</span>
          <span style="font-size: 12px; color: #666;">出牌${playCounts[player.id] || 0}次</span>
          <span style="font-size: 12px; color: #666;">得分${scores[player.id]}</span>
          <span style="font-weight: bold; color: ${isWinner ? '#7c4dff' : '#999'};">${isWinner ? '胜利' : '失败'}</span>
        </div>
      `;
    }

    html += `<p style="font-size: 12px; color: #999; margin-top: 10px; text-align: center;">基于本局数据分析</p>`;

    content.innerHTML = html;
    panel.style.display = 'flex';

    setTimeout(() => {
      panel.style.display = 'none';
    }, 5000);
  }

  private toggleReplayPlay(): void {
    const isPlaying = this.replayController.getIsPlaying();
    const playPauseBtn = document.getElementById('playPauseBtn');

    if (isPlaying) {
      this.replayController.pause();
      if (playPauseBtn) playPauseBtn.textContent = '播放';
    } else {
      const currentStep = this.replayController.getCurrentStep();
      const totalSteps = this.replayController.getTotalSteps();
      if (currentStep >= totalSteps) {
        this.replayController.seekTo(0);
      }
      this.replayController.play();
      if (playPauseBtn) playPauseBtn.textContent = '暂停';
    }
  }

  private handleProgressChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const step = parseInt(target.value);
    this.replayController.seekTo(step);
  }

  private handleSpeedChange(e: Event): void {
    const target = e.target as HTMLElement;
    const speed = parseFloat(target.getAttribute('data-speed') || '1');

    this.replayController.setSpeed(speed);

    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    target.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameEntry();
});
