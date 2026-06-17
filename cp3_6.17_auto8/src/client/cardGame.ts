import { Card, GameState, GameStateUpdate, ServerAck, StatsUpdate } from '../shared/types';
import { NetworkManager } from './network';
import { AIPlayer } from './aiPlayer';

interface AnimatingCard {
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  phase: 'play' | 'rollback' | 'ai-play' | 'flash';
  originalIndex?: number;
  isRollingBack?: boolean;
}

interface CardElement {
  card: Card;
  el: HTMLDivElement;
  index: number;
}

export class CardGame {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private network: NetworkManager;
  private aiPlayer: AIPlayer;

  private gameState: GameState | null = null;
  private localPlayerId = 'player_local';
  private aiPlayerId = 'player_ai';

  private handContainer!: HTMLDivElement;
  private playZone!: HTMLDivElement;
  private statusPanel!: HTMLDivElement;
  private aiStatus!: HTMLDivElement;
  private turnIndicator!: HTMLDivElement;
  private latencyPanel!: HTMLDivElement;
  private statsPanel!: HTMLDivElement;
  private flashOverlay!: HTMLDivElement;
  private gameResult!: HTMLDivElement;
  private playZoneCards!: HTMLDivElement;

  private cardElements: CardElement[] = [];
  private aiCardElements: CardElement[] = [];
  private animatingCards: AnimatingCard[] = [];
  private draggingCard: { el: HTMLDivElement; card: Card; index: number; offsetX: number; offsetY: number } | null = null;

  private cardWidth = 60;
  private cardHeight = 90;
  private cardGap = 10;

  private stats: StatsUpdate | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`容器 #${containerId} 未找到`);
    this.container = container;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 480;
    this.canvas.style.display = 'none';

    const hiddenCtx = this.canvas.getContext('2d');
    if (!hiddenCtx) throw new Error('无法获取Canvas上下文');
    this.ctx = hiddenCtx;

    this.network = new NetworkManager({
      onACK: this.handleACK.bind(this),
      onStateUpdate: this.handleStateUpdate.bind(this),
      onStatsUpdate: this.handleStatsUpdate.bind(this),
      onConnect: this.handleConnect.bind(this),
    });

    this.aiPlayer = new AIPlayer(this.handleAIPlayCard.bind(this));

    this.buildUI();
    this.bindEvents();
    this.animate();
  }

  private buildUI(): void {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px;
      box-sizing: border-box;
      font-family: 'Segoe UI', -apple-system, sans-serif;
      color: #e0e0e0;
      min-height: 720px;
    `;

    const gameLayout = document.createElement('div');
    gameLayout.style.cssText = `
      display: grid;
      grid-template-columns: 200px 1fr 200px;
      grid-template-rows: auto 1fr auto;
      gap: 16px;
      min-height: 680px;
    `;

    this.statusPanel = document.createElement('div');
    this.statusPanel.style.cssText = `
      grid-column: 1;
      grid-row: 1 / span 2;
      background: #161b22;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    const table = document.createElement('div');
    table.style.cssText = `
      grid-column: 2;
      grid-row: 1 / span 2;
      background: #1a1a2e;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    `;

    this.aiStatus = document.createElement('div');
    this.aiStatus.style.cssText = `
      grid-column: 3;
      grid-row: 1 / span 2;
      background: #161b22;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    `;

    this.latencyPanel = document.createElement('div');
    this.latencyPanel.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(0,0,0,0.6);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      z-index: 100;
      min-width: 140px;
    `;

    this.turnIndicator = document.createElement('div');
    this.turnIndicator.style.cssText = `
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.6);
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: bold;
      z-index: 100;
    `;

    const aiHandArea = document.createElement('div');
    aiHandArea.style.cssText = `
      display: flex;
      justify-content: center;
      gap: ${this.cardGap}px;
      margin-bottom: 24px;
      min-height: ${this.cardHeight}px;
    `;
    aiHandArea.id = 'ai-hand-area';

    const tableMiddle = document.createElement('div');
    tableMiddle.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
    `;

    this.playZone = document.createElement('div');
    this.playZone.style.cssText = `
      width: 240px;
      height: 120px;
      background: rgba(255,255,255,0.05);
      border: 2px dashed rgba(255,255,255,0.15);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;
    this.playZone.id = 'play-zone';

    this.playZoneCards = document.createElement('div');
    this.playZoneCards.style.cssText = `
      display: flex;
      gap: 8px;
      position: absolute;
      inset: 0;
      align-items: center;
      justify-content: center;
    `;
    this.playZone.appendChild(this.playZoneCards);

    const dropHint = document.createElement('div');
    dropHint.textContent = '出牌区';
    dropHint.style.cssText = `
      color: rgba(255,255,255,0.2);
      font-size: 14px;
      pointer-events: none;
    `;
    this.playZone.appendChild(dropHint);

    this.statsPanel = document.createElement('div');
    this.statsPanel.style.cssText = `
      font-size: 11px;
      color: rgba(255,255,255,0.5);
      text-align: center;
      padding: 8px;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin-top: 16px;
    `;

    this.handContainer = document.createElement('div');
    this.handContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: ${this.cardGap}px;
      min-height: ${this.cardHeight + 20}px;
      padding-top: 20px;
      flex-wrap: wrap;
    `;
    this.handContainer.id = 'hand-container';

    this.flashOverlay = document.createElement('div');
    this.flashOverlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 200;
      opacity: 0;
      transition: opacity 0.1s linear;
      border-radius: 16px;
    `;

    this.gameResult = document.createElement('div');
    this.gameResult.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.85);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 300;
      border-radius: 16px;
    `;

    tableMiddle.appendChild(this.playZone);
    table.appendChild(this.latencyPanel);
    table.appendChild(this.turnIndicator);
    table.appendChild(aiHandArea);
    table.appendChild(tableMiddle);
    table.appendChild(this.statsPanel);
    table.appendChild(this.handContainer);
    table.appendChild(this.flashOverlay);
    table.appendChild(this.gameResult);

    gameLayout.appendChild(this.statusPanel);
    gameLayout.appendChild(table);
    gameLayout.appendChild(this.aiStatus);

    this.container.appendChild(gameLayout);
    this.container.appendChild(this.canvas);

    this.renderStatusPanel();
    this.renderAIStatus();
  }

  private renderStatusPanel(): void {
    const hp = this.gameState?.players[0].hp ?? 30;
    const maxHp = this.gameState?.players[0].maxHp ?? 30;
    const hpRatio = hp / maxHp;
    const hpColor = hpRatio > 0.5 ? '#66bb6a' : hpRatio > 0.25 ? '#ffa726' : '#ef5350';
    const handCount = this.gameState?.players[0].hand.length ?? 7;

    this.statusPanel.innerHTML = `
      <div style="text-align:center;">
        <div style="width:48px;height:48px;border-radius:50%;background:#1a237e;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:20px;">🧙</div>
        <div style="font-weight:bold;font-size:14px;">本地玩家</div>
        <div style="font-size:11px;color:#888;margin-top:2px;">Player 1</div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
          <span>生命值</span>
          <span style="color:${hpColor};font-weight:bold;">${hp}/${maxHp}</span>
        </div>
        <div style="width:160px;height:16px;background:#333;border-radius:8px;overflow:hidden;">
          <div style="width:${hpRatio * 100}%;height:100%;background:${hpColor};border-radius:8px;transition:all 0.3s;"></div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;">
        <div style="font-size:11px;color:#888;">手牌数量</div>
        <div style="font-size:24px;font-weight:bold;color:#ffd700;">${handCount}</div>
      </div>
      <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;">
        <div style="font-size:11px;color:#888;">回合计数</div>
        <div style="font-size:24px;font-weight:bold;">${this.gameState?.turnCount ?? 1}</div>
      </div>
      <button id="reset-btn" style="margin-top:auto;padding:8px 12px;border:none;border-radius:8px;background:#ef5350;color:#fff;font-size:12px;cursor:pointer;">
        🔄 重新开始
      </button>
    `;

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.onclick = () => this.resetGame();
    }
  }

  private renderAIStatus(): void {
    const hp = this.gameState?.players[1].hp ?? 30;
    const maxHp = this.gameState?.players[1].maxHp ?? 30;
    const hpRatio = hp / maxHp;
    const hpColor = hpRatio > 0.5 ? '#66bb6a' : hpRatio > 0.25 ? '#ffa726' : '#ef5350';
    const handCount = this.gameState?.players[1].hand.length ?? 7;

    this.aiStatus.innerHTML = `
      <div style="text-align:center;">
        <div style="width:48px;height:48px;border-radius:50%;background:#555;display:flex;align-items:center;justify-content:center;font-size:20px;filter:grayscale(0.7);">🤖</div>
        <div style="font-weight:bold;font-size:14px;margin-top:8px;">AI对手</div>
        <div style="font-size:10px;color:#666;margin-top:2px;">等待中...</div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
          <span>生命值</span>
          <span style="color:${hpColor};font-weight:bold;">${hp}/${maxHp}</span>
        </div>
        <div style="width:160px;height:16px;background:#333;border-radius:8px;overflow:hidden;">
          <div style="width:${hpRatio * 100}%;height:100%;background:${hpColor};border-radius:8px;transition:all 0.3s;"></div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;">
        <div style="font-size:11px;color:#888;">手牌数量</div>
        <div style="font-size:24px;font-weight:bold;color:#ffd700;">${handCount}</div>
      </div>
      <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;">
        <div style="font-size:11px;color:#888;">弃牌堆</div>
        <div style="font-size:24px;font-weight:bold;">${this.gameState?.discardPile.length ?? 0}</div>
      </div>
    `;
  }

  private renderLatencyPanel(): void {
    if (!this.stats) return;
    const lat = this.stats.currentLatency;
    const color = lat < 100 ? '#66bb6a' : lat < 200 ? '#ffa726' : '#ef5350';

    this.latencyPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="color:#888;">延迟:</span>
        <span style="color:${color};font-weight:bold;">${lat}ms</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#888;">队列:</span>
        <span style="color:#fff;font-weight:bold;">${this.stats.queueSize}/10</span>
      </div>
    `;
  }

  private renderTurnIndicator(): void {
    if (!this.gameState) return;
    const isLocalTurn = this.gameState.currentTurnIndex === 0;
    const name = isLocalTurn ? '本地玩家' : 'AI对手';
    const color = isLocalTurn ? '#448aff' : '#ef5350';

    this.turnIndicator.innerHTML = `
      <span style="color:${color};">⏳</span> 第${this.gameState.turnCount}回合 · ${name}出牌
    `;

    this.turnIndicator.style.animation = 'none';
    requestAnimationFrame(() => {
      this.turnIndicator.style.animation = 'pulse 0.3s ease-in-out infinite alternate';
    });
  }

  private renderStatsPanel(): void {
    if (!this.stats) return;
    this.statsPanel.innerHTML = `
      <div style="display:flex;gap:24px;justify-content:center;">
        <span>平均延迟: <b style="color:#448aff;">${this.stats.avgLatency}ms</b></span>
        <span>回滚次数: <b style="color:#ef5350;">${this.stats.rollbackCount}</b></span>
        <span>有效出牌率: <b style="color:#66bb6a;">${this.stats.effectivePlayRate}%</b></span>
      </div>
    `;
  }

  private renderHand(): void {
    if (!this.gameState) return;
    const hand = this.gameState.players[0].hand;
    const isLocalTurn = this.gameState.currentTurnIndex === 0 && this.gameState.status === 'playing';

    this.cardElements.forEach((ce) => ce.el.remove());
    this.cardElements = [];

    hand.forEach((card, idx) => {
      const el = this.createCardElement(card, idx, false, isLocalTurn);
      this.handContainer.appendChild(el);
      this.cardElements.push({ card, el, index: idx });
    });
  }

  private renderAIHand(): void {
    if (!this.gameState) return;
    const hand = this.gameState.players[1].hand;
    const aiHandArea = document.getElementById('ai-hand-area') as HTMLDivElement;
    if (!aiHandArea) return;

    this.aiCardElements.forEach((ce) => ce.el.remove());
    this.aiCardElements = [];

    hand.forEach((card, idx) => {
      const el = this.createCardElement(card, idx, true, false);
      aiHandArea.appendChild(el);
      this.aiCardElements.push({ card, el, index: idx });
    });
  }

  private createCardElement(
    card: Card,
    index: number,
    isFaceDown: boolean,
    isDraggable: boolean
  ): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `
      width: ${this.cardWidth}px;
      height: ${this.cardHeight}px;
      background: ${isFaceDown ? '#0d1b3e' : '#1a237e'};
      border-radius: 8px;
      border: 2px solid #283593;
      box-sizing: border-box;
      padding: 4px;
      display: flex;
      flex-direction: column;
      color: white;
      font-size: 9px;
      cursor: ${isDraggable ? 'grab' : 'default'};
      user-select: none;
      transition: transform 0.15s ease-out, box-shadow 0.15s ease-out, border-color 0.15s;
      position: relative;
      z-index: 1;
    `;
    el.dataset.cardId = card.id;
    el.dataset.index = String(index);

    if (isFaceDown) {
      const pattern = document.createElement('div');
      pattern.style.cssText = `
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: #448aff;
        opacity: 0.5;
      `;
      pattern.textContent = '🎴';
      el.appendChild(pattern);
      return el;
    }

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      font-weight: bold;
    `;
    header.innerHTML = `
      <span style="color:#ffd700;">⚡${card.cost}</span>
      <span style="color:#ef5350;">⚔${card.attack}</span>
    `;

    const name = document.createElement('div');
    name.style.cssText = `
      font-size: 9px;
      font-weight: bold;
      margin: 2px 0;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    name.textContent = card.name;

    const art = document.createElement('div');
    art.style.cssText = `
      flex: 1;
      background: linear-gradient(135deg, #283593 0%, #1a237e 50%, #3949ab 100%);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      margin: 2px 0;
    `;
    const artIcons = ['🔥', '⚡', '💀', '❄️', '💫', '🌙', '✨', '💥', '🌿', '☀️'];
    art.textContent = artIcons[card.attack % artIcons.length];

    const desc = document.createElement('div');
    desc.style.cssText = `
      font-size: 7px;
      color: #bbdefb;
      text-align: center;
      line-height: 1.2;
    `;
    desc.textContent = card.description;

    el.appendChild(header);
    el.appendChild(name);
    el.appendChild(art);
    el.appendChild(desc);

    if (isDraggable) {
      el.addEventListener('mouseenter', () => {
        if (!this.draggingCard) {
          el.style.transform = 'scale(1.1) translateY(-8px)';
          el.style.zIndex = '50';
          el.style.borderColor = '#ffd700';
          el.style.boxShadow = '0 8px 24px rgba(255,215,0,0.3)';
        }
      });

      el.addEventListener('mouseleave', () => {
        if (!this.draggingCard || this.draggingCard.el !== el) {
          el.style.transform = '';
          el.style.zIndex = '1';
          el.style.borderColor = '#283593';
          el.style.boxShadow = '';
        }
      });

      el.addEventListener('mousedown', (e) => this.startDrag(e, card, index, el));
    }

    return el;
  }

  private bindEvents(): void {
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('mouseup', (e) => this.endDrag(e));

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        from { transform: translateX(-50%) scale(1); }
        to { transform: translateX(-50%) scale(1.05); }
      }
    `;
    document.head.appendChild(style);
  }

  private startDrag(e: MouseEvent, card: Card, index: number, el: HTMLDivElement): void {
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    this.draggingCard = {
      el,
      card,
      index,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    el.style.position = 'fixed';
    el.style.left = `${e.clientX - this.draggingCard.offsetX}px`;
    el.style.top = `${e.clientY - this.draggingCard.offsetY}px`;
    el.style.zIndex = '9999';
    el.style.transform = 'scale(1.1)';
    el.style.cursor = 'grabbing';
    el.style.borderColor = '#ffd700';
    el.style.boxShadow = '0 16px 40px rgba(255,215,0,0.4)';
  }

  private onDrag(e: MouseEvent): void {
    if (!this.draggingCard) return;
    this.draggingCard.el.style.left = `${e.clientX - this.draggingCard.offsetX}px`;
    this.draggingCard.el.style.top = `${e.clientY - this.draggingCard.offsetY}px`;
  }

  private endDrag(e: MouseEvent): void {
    if (!this.draggingCard) return;

    const playZoneRect = this.playZone.getBoundingClientRect();
    const isInZone =
      e.clientX >= playZoneRect.left &&
      e.clientX <= playZoneRect.right &&
      e.clientY >= playZoneRect.top &&
      e.clientY <= playZoneRect.bottom;

    const { card, index, el } = this.draggingCard;

    if (isInZone && this.gameState?.currentTurnIndex === 0) {
      this.playCard(card, index, el);
    } else {
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
      el.style.zIndex = '1';
      el.style.transform = '';
      el.style.cursor = 'grab';
      el.style.borderColor = '#283593';
      el.style.boxShadow = '';
    }

    this.draggingCard = null;
  }

  private playCard(card: Card, originalIndex: number, cardEl: HTMLDivElement): void {
    const startRect = cardEl.getBoundingClientRect();
    const zoneRect = this.playZone.getBoundingClientRect();

    cardEl.style.position = 'fixed';
    cardEl.style.left = `${startRect.left}px`;
    cardEl.style.top = `${startRect.top}px`;
    cardEl.style.zIndex = '1000';

    const now = performance.now();
    this.animatingCards.push({
      card,
      fromX: startRect.left,
      fromY: startRect.top,
      toX: zoneRect.left + zoneRect.width / 2 - this.cardWidth / 2,
      toY: zoneRect.top + zoneRect.height / 2 - this.cardHeight / 2,
      startTime: now,
      duration: 200,
      phase: 'play',
      originalIndex,
    });

    this.cardElements = this.cardElements.filter((ce) => ce.card.id !== card.id);

    this.flash('rgba(68,138,255,0.4)', 150);

    this.network.sendAction('play_card', this.localPlayerId, card, originalIndex);
  }

  private handleAIPlayCard(card: Card): void {
    if (!this.gameState) return;

    const aiHandArea = document.getElementById('ai-hand-area');
    if (!aiHandArea) return;

    const cardEl = this.aiCardElements.find((ce) => ce.card.id === card.id)?.el;
    if (!cardEl) return;

    const startRect = cardEl.getBoundingClientRect();
    const zoneRect = this.playZone.getBoundingClientRect();

    cardEl.style.position = 'fixed';
    cardEl.style.left = `${startRect.left}px`;
    cardEl.style.top = `${startRect.top}px`;
    cardEl.style.zIndex = '1000';

    const now = performance.now();
    this.animatingCards.push({
      card,
      fromX: startRect.left,
      fromY: startRect.top,
      toX: zoneRect.left + zoneRect.width / 2 - this.cardWidth / 2,
      toY: zoneRect.top + zoneRect.height / 2 - this.cardHeight / 2,
      startTime: now,
      duration: 200,
      phase: 'ai-play',
    });

    this.aiCardElements = this.aiCardElements.filter((ce) => ce.card.id !== card.id);

    this.flash('rgba(68,138,255,0.4)', 150);

    this.network.sendAction('ai_play_card', this.aiPlayerId, card, -1);
  }

  private flash(color: string, duration: number): void {
    this.flashOverlay.style.background = color;
    this.flashOverlay.style.opacity = '1';
    setTimeout(() => {
      this.flashOverlay.style.opacity = '0';
    }, duration);
  }

  private handleACK(ack: ServerAck, card: Card, originalIndex: number): void {
    if (ack.type === 'rollback') {
      this.rollbackCard(card, originalIndex);
    }
  }

  private rollbackCard(card: Card, originalIndex: number): void {
    if (!this.gameState) return;

    this.flash('rgba(255,82,82,0.5)', 300);

    if (!this.gameState.players[0].hand.find((c) => c.id === card.id)) {
      const insertIdx = Math.min(originalIndex, this.gameState.players[0].hand.length);
      this.gameState.players[0].hand.splice(insertIdx, 0, card);
    }

    const animating = this.animatingCards.find((a) => a.card.id === card.id && a.phase === 'play');
    if (animating) {
      const handAreaRect = this.handContainer.getBoundingClientRect();
      const cardsBefore = Math.min(originalIndex, this.gameState.players[0].hand.length - 1);
      const cardX =
        handAreaRect.left +
        handAreaRect.width / 2 -
        ((this.gameState.players[0].hand.length * (this.cardWidth + this.cardGap)) / 2) +
        cardsBefore * (this.cardWidth + this.cardGap);
      const cardY = handAreaRect.top + 10;

      animating.fromX = animating.toX;
      animating.fromY = animating.toY;
      animating.toX = cardX;
      animating.toY = cardY;
      animating.startTime = performance.now();
      animating.duration = 400;
      animating.phase = 'rollback';
      animating.isRollingBack = true;
      animating.originalIndex = originalIndex;
    }

    this.renderHand();
    this.renderStatusPanel();
  }

  private handleStateUpdate(update: GameStateUpdate): void {
    const prevState = this.gameState;
    this.gameState = update.state;

    if (update.lastPlayedCard) {
      this.showPlayedCardInZone(update.lastPlayedCard.card);
    }

    this.renderHand();
    this.renderAIHand();
    this.renderStatusPanel();
    this.renderAIStatus();
    this.renderTurnIndicator();

    this.aiPlayer.updateState(update.state);

    if (update.state.status === 'finished') {
      this.showGameResult();
    }
  }

  private showPlayedCardInZone(card: Card): void {
    this.playZoneCards.innerHTML = '';
    const el = this.createCardElement(card, 0, false, false);
    el.style.position = 'relative';
    el.style.animation = 'none';
    el.style.cursor = 'default';
    this.playZoneCards.appendChild(el);
  }

  private handleStatsUpdate(stats: StatsUpdate): void {
    this.stats = stats;
    this.renderLatencyPanel();
    this.renderStatsPanel();
  }

  private handleConnect(): void {
    console.log('已连接到服务器');
  }

  private showGameResult(): void {
    if (!this.gameState) return;
    const isLocalWin = this.gameState.winnerId === this.localPlayerId;
    this.gameResult.style.display = 'flex';
    this.gameResult.innerHTML = `
      <div style="font-size:64px;margin-bottom:16px;">${isLocalWin ? '🏆' : '💀'}</div>
      <div style="font-size:32px;font-weight:bold;color:${isLocalWin ? '#ffd700' : '#ef5350'};margin-bottom:16px;">
        ${isLocalWin ? '胜利！' : '失败...'}
      </div>
      <div style="font-size:14px;color:#aaa;margin-bottom:8px;">总回合数: ${this.gameState.turnCount}</div>
      ${
        this.stats
          ? `<div style="font-size:13px;color:#888;margin-bottom:24px;">
              平均延迟: ${this.stats.avgLatency}ms · 回滚: ${this.stats.rollbackCount}次 · 有效率: ${this.stats.effectivePlayRate}%
            </div>`
          : '<div style="margin-bottom:24px;"></div>'
      }
      <button onclick="document.getElementById('reset-btn')?.click()" style="padding:12px 32px;font-size:16px;border:none;border-radius:12px;background:#448aff;color:#fff;font-weight:bold;cursor:pointer;box-shadow:0 4px 16px rgba(68,138,255,0.4);">
        🔄 再来一局
      </button>
    `;
  }

  private resetGame(): void {
    this.aiPlayer.reset();
    this.animatingCards = [];
    this.playZoneCards.innerHTML = '';
    this.gameResult.style.display = 'none';
    fetch('/api/reset').catch(() => fetch('http://localhost:3001/api/reset'));
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private animate = (): void => {
    const now = performance.now();
    const toRemove: number[] = [];

    this.animatingCards.forEach((anim, idx) => {
      const elapsed = now - anim.startTime;
      const t = Math.min(1, elapsed / anim.duration);
      const eased = anim.phase === 'rollback' ? t : this.easeOut(t);

      const x = anim.fromX + (anim.toX - anim.fromX) * eased;
      const y = anim.fromY + (anim.toY - anim.fromY) * eased;

      const els = document.querySelectorAll<HTMLDivElement>(`[data-card-id="${anim.card.id}"]`);
      els.forEach((el) => {
        if (el.style.position === 'fixed') {
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          if (anim.phase === 'rollback') {
            el.style.opacity = String(t < 0.5 ? 1 - t * 0.5 : 0.5 + (t - 0.5));
          }
        }
      });

      if (t >= 1) {
        toRemove.push(idx);
        if (anim.phase === 'rollback' && anim.originalIndex !== undefined) {
          setTimeout(() => {
            els.forEach((el) => {
              el.style.position = '';
              el.style.left = '';
              el.style.top = '';
              el.style.zIndex = '1';
              el.style.transform = '';
              el.style.opacity = '1';
              el.style.borderColor = '#283593';
              el.style.boxShadow = '';
              el.style.cursor = 'grab';
            });
            this.renderHand();
          }, 50);
        } else if (anim.phase === 'play' || anim.phase === 'ai-play') {
          setTimeout(() => {
            els.forEach((el) => {
              if (this.playZoneCards.contains(el)) return;
              el.style.opacity = '0';
              setTimeout(() => el.remove(), 200);
            });
          }, 100);
        }
      }
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.animatingCards.splice(toRemove[i], 1);
    }

    requestAnimationFrame(this.animate);
  };

  public start(): void {
    this.network.connect();
  }
}
