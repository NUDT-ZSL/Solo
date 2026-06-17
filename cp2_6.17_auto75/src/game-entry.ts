import './styles.css';
import { UIRenderer } from './ui-renderer';
import { ReplayController, PlaybackSpeed } from './replay-controller';
import { api, GameListItem } from './api-handler';
import {
  createGameSession,
  determinePlayType,
  checkWinner,
  getCardDisplay,
  getGameDuration,
  getHandCounts,
  calculateScore
} from './card-logic';
import type {
  GameSession,
  PlayRecord,
  Card,
  Player,
  GameType,
  GameConfig
} from './card-logic';
import { v4 as uuidv4 } from 'uuid';

type Page = 'home' | 'game' | 'replay';

class GameApp {
  private app: HTMLElement;
  private currentPage: Page = 'home';
  private gameSession: GameSession | null = null;
  private renderer: UIRenderer | null = null;
  private replayController: ReplayController | null = null;
  private historyList: GameListItem[] = [];
  private selectedGameId: string = '';
  private showResult: boolean = false;
  private showAnalysis: boolean = false;

  constructor() {
    this.app = document.getElementById('app')!;
    this.init();
  }

  private init(): void {
    this.renderHomePage();
  }

  private navigate(page: Page): void {
    this.currentPage = page;
    this.cleanup();
    
    switch (page) {
      case 'home':
        this.renderHomePage();
        break;
      case 'game':
        this.renderGamePage();
        break;
      case 'replay':
        this.renderReplayPage();
        break;
    }
  }

  private cleanup(): void {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    if (this.replayController) {
      this.replayController.destroy();
      this.replayController = null;
    }
    this.app.innerHTML = '';
  }

  private renderHomePage(): void {
    this.app.innerHTML = `
      <div class="page home-page">
        <h1 class="page-title">牌局记录与复盘分析</h1>
        <p class="page-subtitle">记录每一手牌，复盘精彩对局</p>
        
        <div class="nav-tabs">
          <button class="nav-tab active" data-tab="create">创建牌局</button>
          <button class="nav-tab" data-tab="history">历史记录</button>
        </div>
        
        <div class="home-card" id="createPanel">
          <div class="form-group">
            <label>游戏类型</label>
            <select id="gameType">
              <option value="landlord">斗地主</option>
              <option value="uno">UNO</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>玩家人数</label>
            <select id="playerCount">
              <option value="3">3人</option>
              <option value="4">4人</option>
              <option value="2">2人</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>玩家名称</label>
            <div class="player-inputs" id="playerInputs">
              <input type="text" placeholder="玩家1" value="玩家1">
              <input type="text" placeholder="玩家2" value="玩家2">
              <input type="text" placeholder="玩家3" value="玩家3">
            </div>
          </div>
          
          <button class="btn" id="startGameBtn" style="width: 100%; margin-top: 8px;">
            开始游戏
          </button>
        </div>
        
        <div class="home-card hidden" id="historyPanel">
          <div class="history-search">
            <input type="text" id="searchInput" placeholder="输入牌局ID查询...">
            <button class="btn" id="searchBtn">查询</button>
          </div>
          <div class="history-list" id="historyList">
            <div class="empty-state">暂无历史记录</div>
          </div>
        </div>
      </div>
    `;

    this.bindHomeEvents();
    this.loadHistory();
  }

  private bindHomeEvents(): void {
    const tabs = this.app.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        target.classList.add('active');
        
        const createPanel = this.app.querySelector('#createPanel')!;
        const historyPanel = this.app.querySelector('#historyPanel')!;
        
        if (tabName === 'create') {
          createPanel.classList.remove('hidden');
          historyPanel.classList.add('hidden');
        } else {
          createPanel.classList.add('hidden');
          historyPanel.classList.remove('hidden');
        }
      });
    });

    const playerCountSelect = this.app.querySelector('#playerCount') as HTMLSelectElement;
    const playerInputs = this.app.querySelector('#playerInputs')!;
    
    playerCountSelect.addEventListener('change', () => {
      const count = parseInt(playerCountSelect.value);
      let inputs = '';
      for (let i = 0; i < count; i++) {
        inputs += `<input type="text" placeholder="玩家${i + 1}" value="玩家${i + 1}">`;
      }
      playerInputs.innerHTML = inputs;
    });

    const startBtn = this.app.querySelector('#startGameBtn')!;
    startBtn.addEventListener('click', () => this.createGame());

    const searchBtn = this.app.querySelector('#searchBtn')!;
    const searchInput = this.app.querySelector('#searchInput') as HTMLInputElement;
    
    searchBtn.addEventListener('click', () => {
      const id = searchInput.value.trim();
      if (id) {
        this.selectedGameId = id;
        this.navigate('replay');
      }
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        (searchBtn as HTMLElement).click();
      }
    });
  }

  private async createGame(): Promise<void> {
    const gameType = (this.app.querySelector('#gameType') as HTMLSelectElement).value as GameType;
    const playerCount = parseInt((this.app.querySelector('#playerCount') as HTMLSelectElement).value);
    const inputEls = this.app.querySelectorAll('#playerInputs input');
    const playerNames = Array.from(inputEls).map(el => (el as HTMLInputElement).value || `玩家${inputEls ? Array.from(inputEls).indexOf(el) + 1 : 1}`);

    const config: GameConfig = { playerCount, playerNames };
    
    try {
      const session = await api.createGame({ gameType, config });
      this.gameSession = session;
      this.navigate('game');
    } catch (error) {
      console.error('创建牌局失败:', error);
      this.gameSession = createGameSession(gameType, config);
      this.navigate('game');
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      this.historyList = await api.getGames();
      this.renderHistoryList();
    } catch (error) {
      console.error('加载历史记录失败:', error);
      this.historyList = [];
      this.renderHistoryList();
    }
  }

  private renderHistoryList(): void {
    const listEl = this.app.querySelector('#historyList');
    if (!listEl) return;

    if (this.historyList.length === 0) {
      listEl.innerHTML = '<div class="empty-state">暂无历史记录</div>';
      return;
    }

    listEl.innerHTML = this.historyList.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-info">
          <div class="history-item-title">
            ${item.gameType === 'landlord' ? '斗地主' : 'UNO'} · ${item.playerCount}人
          </div>
          <div class="history-item-time">
            ${new Date(item.startTime).toLocaleString()}
            ${item.winnerName ? ` · 胜者: ${item.winnerName}` : ''}
          </div>
        </div>
        <div class="history-item-type">${item.endTime ? '已结束' : '进行中'}</div>
      </div>
    `).join('');

    listEl.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        if (id) {
          this.selectedGameId = id;
          this.navigate('replay');
        }
      });
    });
  }

  private renderGamePage(): void {
    if (!this.gameSession) return;

    this.app.innerHTML = `
      <div class="page game-page">
        <div class="game-header">
          <div class="game-info">
            <button class="btn btn-secondary" id="backBtn" style="padding: 8px 16px; font-size: 13px;">
              ← 返回
            </button>
            <span class="game-id">牌局ID: ${this.gameSession.id.substring(0, 8)}...</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary" id="replayBtn" style="padding: 8px 16px; font-size: 13px;">
              查看复盘
            </button>
          </div>
        </div>
        
        <div class="game-container">
          <div class="canvas-wrapper">
            <canvas class="game-canvas" id="gameCanvas"></canvas>
          </div>
          
          <div class="sidebar">
            <div class="sidebar-section">
              <div class="sidebar-title">出牌记录</div>
              <div class="play-records" id="playRecords">
                <div class="empty-state">暂无出牌记录</div>
              </div>
            </div>
            
            <div class="sidebar-section">
              <div class="sidebar-title">操作</div>
              <div class="control-buttons">
                <button class="btn" id="playBtn">确认出牌</button>
                <button class="btn btn-secondary" id="passBtn">不出</button>
              </div>
              <div class="control-buttons" style="margin-top: 10px;">
                <button class="btn btn-secondary" id="clearBtn">取消选择</button>
                <button class="btn btn-secondary" id="endBtn">结束牌局</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.initGameRenderer();
    this.bindGameEvents();
  }

  private initGameRenderer(): void {
    if (!this.gameSession) return;

    const canvas = this.app.querySelector('#gameCanvas') as HTMLCanvasElement;
    this.renderer = new UIRenderer(canvas);
    this.renderer.setGameType(this.gameSession.gameType);
    this.renderer.updateState({ currentPlayerIndex: this.gameSession.currentPlayerIndex });
    this.renderer.setOnCardClick((card) => this.handleCardClick(card));
    
    this.renderer.startAnimationLoop(() => {
      if (this.renderer && this.gameSession) {
        this.renderer.render(this.gameSession.players, this.gameSession.records);
      }
    });
  }

  private bindGameEvents(): void {
    const backBtn = this.app.querySelector('#backBtn');
    backBtn?.addEventListener('click', () => this.navigate('home'));

    const replayBtn = this.app.querySelector('#replayBtn');
    replayBtn?.addEventListener('click', () => {
      if (this.gameSession) {
        this.selectedGameId = this.gameSession.id;
        this.navigate('replay');
      }
    });

    const playBtn = this.app.querySelector('#playBtn');
    playBtn?.addEventListener('click', () => this.handlePlay());

    const passBtn = this.app.querySelector('#passBtn');
    passBtn?.addEventListener('click', () => this.handlePass());

    const clearBtn = this.app.querySelector('#clearBtn');
    clearBtn?.addEventListener('click', () => this.clearSelection());

    const endBtn = this.app.querySelector('#endBtn');
    endBtn?.addEventListener('click', () => this.endGame());
  }

  private handleCardClick(card: Card): void {
    if (!this.renderer || !this.gameSession) return;
    if (this.gameSession.currentPlayerIndex !== 0) return;
    
    this.renderer.toggleCardSelection(card.id);
  }

  private clearSelection(): void {
    this.renderer?.clearSelection();
  }

  private async handlePlay(): Promise<void> {
    if (!this.renderer || !this.gameSession) return;

    const selectedCards = this.renderer.getSelectedCards();
    if (selectedCards.length === 0) {
      alert('请选择要出的牌');
      return;
    }

    const currentPlayer = this.gameSession.players[this.gameSession.currentPlayerIndex];
    const playType = determinePlayType(selectedCards, this.gameSession.gameType);

    const record: PlayRecord = {
      id: uuidv4(),
      playerId: currentPlayer.id,
      cards: selectedCards,
      playType,
      timestamp: Date.now(),
      handCounts: getHandCounts(this.gameSession.players)
    };

    try {
      await api.addRecord(this.gameSession.id, record);
    } catch (error) {
      console.error('记录出牌失败:', error);
    }

    this.gameSession.records.push(record);
    currentPlayer.hand = currentPlayer.hand.filter(
      c => !selectedCards.some(sc => sc.id === c.id)
    );
    currentPlayer.playCount++;

    this.renderer.clearSelection();
    this.updatePlayRecords();

    const winner = checkWinner(this.gameSession.players);
    if (winner) {
      this.gameSession.winnerId = winner.id;
      this.gameSession.endTime = Date.now();
      try {
        await api.finishGame(this.gameSession.id, winner.id);
      } catch (error) {
        console.error('结束牌局失败:', error);
      }
      this.showResultModal();
      return;
    }

    this.nextPlayer();
  }

  private async handlePass(): Promise<void> {
    if (!this.gameSession) return;

    const currentPlayer = this.gameSession.players[this.gameSession.currentPlayerIndex];

    const record: PlayRecord = {
      id: uuidv4(),
      playerId: currentPlayer.id,
      cards: [],
      playType: '不出',
      timestamp: Date.now(),
      handCounts: getHandCounts(this.gameSession.players)
    };

    try {
      await api.addRecord(this.gameSession.id, record);
    } catch (error) {
      console.error('记录出牌失败:', error);
    }

    this.gameSession.records.push(record);
    this.updatePlayRecords();
    this.nextPlayer();
  }

  private nextPlayer(): void {
    if (!this.gameSession) return;
    this.gameSession.currentPlayerIndex = 
      (this.gameSession.currentPlayerIndex + 1) % this.gameSession.players.length;
    
    this.renderer?.updateState({
      currentPlayerIndex: this.gameSession.currentPlayerIndex
    });
  }

  private updatePlayRecords(): void {
    const recordsEl = this.app.querySelector('#playRecords');
    if (!recordsEl || !this.gameSession) return;

    if (this.gameSession.records.length === 0) {
      recordsEl.innerHTML = '<div class="empty-state">暂无出牌记录</div>';
      return;
    }

    recordsEl.innerHTML = this.gameSession.records.map((record, index) => {
      const player = this.gameSession?.players.find(p => p.id === record.playerId);
      const cardsDisplay = record.cards.length > 0 
        ? record.cards.map(c => getCardDisplay(c)).join(' ')
        : '不出';
      
      return `
        <div class="record-item">
          <div class="player-dot" style="background: ${player?.color || '#999'}"></div>
          <span class="record-player">${player?.name || '未知'}</span>
          <span class="record-cards">${cardsDisplay}</span>
        </div>
      `;
    }).join('');

    recordsEl.scrollTop = recordsEl.scrollHeight;
  }

  private endGame(): void {
    if (!this.gameSession) return;
    
    const playersByHand = [...this.gameSession.players]
      .sort((a, b) => a.hand.length - b.hand.length);
    const winner = playersByHand[0];
    
    this.gameSession.winnerId = winner.id;
    this.gameSession.endTime = Date.now();
    
    api.finishGame(this.gameSession.id, winner.id).catch(console.error);
    this.showResultModal();
  }

  private showResultModal(): void {
    if (!this.gameSession) return;
    this.showResult = true;

    const sortedPlayers = [...this.gameSession.players]
      .map((player, index) => ({
        player,
        score: calculateScore(player, index, this.gameSession!.gameType)
      }))
      .sort((a, b) => b.score - a.score);

    const duration = getGameDuration(this.gameSession.startTime, this.gameSession.endTime);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-panel result-panel">
        <h2 class="result-title">🏆 牌局结算</h2>
        <div class="result-rows">
          ${sortedPlayers.map(({ player, score }, idx) => `
            <div class="result-row ${idx === 0 ? 'winner' : ''}">
              <div class="result-player">
                <span style="color: ${player.color};">●</span>
                ${player.name}
                ${idx === 0 ? '🥇' : ''}
              </div>
              <div class="result-stats">
                <span>${player.hand.length}张</span>
                <span>${score}分</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="text-align: center; font-size: 13px; color: #5c6bc0; margin-bottom: 12px;">
          时长: ${duration} · 牌局ID: ${this.gameSession.id.substring(0, 8)}
        </div>
        <div class="result-footer">
          <button class="btn btn-secondary" id="closeResultBtn">返回</button>
          <button class="btn" id="viewReplayBtn">查看复盘</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#closeResultBtn')?.addEventListener('click', () => {
      modal.remove();
      this.showResult = false;
      this.navigate('home');
    });

    modal.querySelector('#viewReplayBtn')?.addEventListener('click', () => {
      modal.remove();
      this.showResult = false;
      if (this.gameSession) {
        this.selectedGameId = this.gameSession.id;
        this.navigate('replay');
      }
    });
  }

  private renderReplayPage(): void {
    this.app.innerHTML = `
      <div class="page replay-page">
        <div class="game-header">
          <div class="game-info">
            <button class="btn btn-secondary" id="backBtn" style="padding: 8px 16px; font-size: 13px;">
              ← 返回
            </button>
            <h2 style="font-size: 18px; font-weight: 500;">牌局复盘</h2>
          </div>
        </div>
        
        <div class="replay-layout">
          <div class="history-panel">
            <div class="sidebar-section">
              <div class="sidebar-title">历史牌局</div>
              <div class="history-search">
                <input type="text" id="replaySearch" placeholder="输入ID查询...">
                <button class="btn" id="replaySearchBtn">加载</button>
              </div>
              <div class="history-list" id="replayHistoryList">
                <div class="empty-state">加载中...</div>
              </div>
            </div>
          </div>
          
          <div class="replay-main">
            <div class="canvas-wrapper">
              <canvas class="game-canvas" id="replayCanvas"></canvas>
            </div>
            
            <div class="replay-controls">
              <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
              </div>
              
              <div class="progress-info">
                <span id="stepInfo">第 0 / 0 步</span>
                <span id="currentOpInfo">--</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="playback-buttons">
                  <button class="btn btn-secondary" id="prevBtn">⏮ 上一步</button>
                  <button class="btn" id="playPauseBtn">▶ 播放</button>
                  <button class="btn btn-secondary" id="nextBtn">下一步 ⏭</button>
                </div>
                
                <div class="speed-controls">
                  <span style="font-size: 12px; color: rgba(255,255,255,0.6);">速度:</span>
                  <button class="speed-btn" data-speed="0.5">0.5x</button>
                  <button class="speed-btn active" data-speed="1">1x</button>
                  <button class="speed-btn" data-speed="2">2x</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.initReplay();
    this.bindReplayEvents();
    this.loadReplayHistory();
  }

  private initReplay(): void {
    const canvas = this.app.querySelector('#replayCanvas') as HTMLCanvasElement;
    this.renderer = new UIRenderer(canvas);
    this.replayController = new ReplayController(this.renderer);
    
    this.replayController.setOnStateChange((state) => {
      this.updateReplayUI(state);
    });

    this.replayController.setOnFinish(() => {
      this.showAnalysisCard();
    });

    if (this.selectedGameId) {
      this.loadReplayGame(this.selectedGameId);
    }
  }

  private bindReplayEvents(): void {
    const backBtn = this.app.querySelector('#backBtn');
    backBtn?.addEventListener('click', () => this.navigate('home'));

    const playPauseBtn = this.app.querySelector('#playPauseBtn');
    playPauseBtn?.addEventListener('click', () => {
      this.replayController?.togglePlay();
    });

    const prevBtn = this.app.querySelector('#prevBtn');
    prevBtn?.addEventListener('click', () => {
      this.replayController?.stepBackward();
    });

    const nextBtn = this.app.querySelector('#nextBtn');
    nextBtn?.addEventListener('click', () => {
      this.replayController?.stepForward();
    });

    const progressBar = this.app.querySelector('#progressBar');
    progressBar?.addEventListener('click', (e) => {
      const mouseEvent = e as MouseEvent;
      const rect = progressBar.getBoundingClientRect();
      const progress = (mouseEvent.clientX - rect.left) / rect.width;
      this.replayController?.seekToProgress(progress);
    });

    const speedBtns = this.app.querySelectorAll('.speed-btn');
    speedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const speed = parseFloat(target.dataset.speed || '1') as PlaybackSpeed;
        
        speedBtns.forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        
        this.replayController?.setSpeed(speed);
      });
    });

    const searchBtn = this.app.querySelector('#replaySearchBtn');
    const searchInput = this.app.querySelector('#replaySearch') as HTMLInputElement;
    
    searchBtn?.addEventListener('click', () => {
      const id = searchInput.value.trim();
      if (id) {
        this.selectedGameId = id;
        this.loadReplayGame(id);
      }
    });

    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        (searchBtn as HTMLElement)?.click();
      }
    });
  }

  private async loadReplayHistory(): Promise<void> {
    try {
      this.historyList = await api.getGames();
      this.renderReplayHistoryList();
    } catch (error) {
      console.error('加载历史记录失败:', error);
      const listEl = this.app.querySelector('#replayHistoryList');
      if (listEl) {
        listEl.innerHTML = '<div class="empty-state">暂无历史记录</div>';
      }
    }
  }

  private renderReplayHistoryList(): void {
    const listEl = this.app.querySelector('#replayHistoryList');
    if (!listEl) return;

    if (this.historyList.length === 0) {
      listEl.innerHTML = '<div class="empty-state">暂无历史记录</div>';
      return;
    }

    listEl.innerHTML = this.historyList.map(item => `
      <div class="history-item ${item.id === this.selectedGameId ? 'active' : ''}" data-id="${item.id}">
        <div class="history-item-info">
          <div class="history-item-title">
            ${item.gameType === 'landlord' ? '斗地主' : 'UNO'} · ${item.playerCount}人
          </div>
          <div class="history-item-time">
            ${new Date(item.startTime).toLocaleString()}
          </div>
        </div>
        <div class="history-item-type">${item.endTime ? '已结束' : '进行中'}</div>
      </div>
    `).join('');

    listEl.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        if (id) {
          this.selectedGameId = id;
          this.loadReplayGame(id);
          
          listEl.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
      });
    });
  }

  private async loadReplayGame(id: string): Promise<void> {
    try {
      const session = await api.getGame(id);
      this.gameSession = session;
      this.renderer?.setGameType(session.gameType);
      this.replayController?.loadGame(session);
      this.hideAnalysisCard();
    } catch (error) {
      console.error('加载牌局失败:', error);
      alert('加载牌局失败，请检查ID是否正确');
    }
  }

  private updateReplayUI(state: any): void {
    const progressFill = this.app.querySelector('#progressFill') as HTMLElement;
    const stepInfo = this.app.querySelector('#stepInfo');
    const currentOpInfo = this.app.querySelector('#currentOpInfo');
    const playPauseBtn = this.app.querySelector('#playPauseBtn');

    if (progressFill) {
      const progress = state.totalSteps > 0 ? (state.currentStep / state.totalSteps) * 100 : 0;
      progressFill.style.width = `${progress}%`;
    }

    if (stepInfo) {
      stepInfo.textContent = `第 ${state.currentStep} / ${state.totalSteps} 步`;
    }

    if (currentOpInfo && this.replayController) {
      if (state.currentStep > 0) {
        const playerName = this.replayController.getCurrentPlayerName();
        const playType = this.replayController.getCurrentPlayType();
        currentOpInfo.textContent = `${playerName} · ${playType}`;
      } else {
        currentOpInfo.textContent = '牌局开始';
      }
    }

    if (playPauseBtn) {
      playPauseBtn.textContent = state.isPlaying ? '⏸ 暂停' : '▶ 播放';
    }
  }

  private showAnalysisCard(): void {
    if (this.showAnalysis) return;
    this.showAnalysis = true;

    if (!this.gameSession || !this.replayController) return;

    const analysis = this.replayController.getWinRateAnalysis();
    const totalPlays = this.gameSession.records.filter(r => r.cards.length > 0).length;

    const card = document.createElement('div');
    card.className = 'analysis-card';
    card.id = 'analysisCard';
    card.innerHTML = `
      <h3 class="analysis-title">📊 本局胜率分析</h3>
      <div class="analysis-stats">
        <div class="analysis-stat">
          <div class="analysis-stat-value">${totalPlays}</div>
          <div class="analysis-stat-label">总出牌次数</div>
        </div>
        <div class="analysis-stat">
          <div class="analysis-stat-value">${this.gameSession.players.length}</div>
          <div class="analysis-stat-label">参与玩家</div>
        </div>
      </div>
      <div style="max-height: 80px; overflow-y: auto; margin-bottom: 12px;">
        ${analysis.map(a => `
          <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; color: #666;">
            <span>${a.playerName}</span>
            <span>出牌${a.playCount}次 · 占比${a.winRate}%</span>
          </div>
        `).join('')}
      </div>
      <button class="btn analysis-close" id="closeAnalysisBtn">知道了</button>
    `;

    document.body.appendChild(card);

    card.querySelector('#closeAnalysisBtn')?.addEventListener('click', () => {
      this.hideAnalysisCard();
    });
  }

  private hideAnalysisCard(): void {
    this.showAnalysis = false;
    const card = document.querySelector('#analysisCard');
    if (card) {
      card.remove();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
