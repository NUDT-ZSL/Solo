import { Card } from './card';
import { Player } from './player';
import { Renderer } from './renderer';
import { InputHandler, GameAction } from './input';

type GameState = 'waiting' | 'playing' | 'animating' | 'gameOver';

class GameLoop {
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private players: Player[];
  private currentTurn: number;
  private turnNumber: number;
  private gameState: GameState;
  private selectedCard: Card | null;
  private draggingCard: Card | null;
  private lastFrameTime: number;
  private isGameOver: boolean;
  private pendingAttack: { attacker: Card; target: Card } | null;
  private attackAnimationComplete: boolean;
  private pendingDragStart: { card: Card; pos: { x: number; y: number } } | null;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');

    this.renderer = new Renderer(canvas);
    this.inputHandler = new InputHandler(this.renderer);
    this.players = [new Player(0, '玩家 1'), new Player(1, '玩家 2')];
    this.currentTurn = 0;
    this.turnNumber = 1;
    this.gameState = 'playing';
    this.selectedCard = null;
    this.draggingCard = null;
    this.lastFrameTime = 0;
    this.isGameOver = false;
    this.pendingAttack = null;
    this.attackAnimationComplete = true;
    this.pendingDragStart = null;

    this.players.forEach((p) => p.initializeHand());
    this.players[0].startTurn();

    this.setupInputHandlers();
    this.start();
  }

  private setupInputHandlers(): void {
    this.inputHandler.addListener((action: GameAction) => {
      if (this.isGameOver) {
        if (action.type === 'dragEnd' || action.type === 'keyPress' || action.type === 'clickTurnButton') {
          this.restartGame();
        }
        return;
      }

      if (this.gameState !== 'playing') {
        return;
      }

      switch (action.type) {
        case 'dragMove':
          break;

        case 'dragEnd':
          this.handleDragEnd(action.position);
          break;

        case 'keyPress':
          if (action.key === ' ' || action.key === 'Enter') {
            this.endTurn();
          }
          if (action.key === 'Escape') {
            this.selectedCard = null;
          }
          break;
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;

      const mousePos = this.inputHandler.getMousePos();

      if (this.isGameOver) {
        this.restartGame();
        return;
      }

      if (this.gameState !== 'playing') return;

      if (this.inputHandler.isOnTurnButton(mousePos)) {
        this.endTurn();
        return;
      }

      if (this.draggingCard && this.draggingCard.isDragging) {
        return;
      }

      const card = this.inputHandler.findCardAtPosition(
        mousePos,
        this.players,
        this.currentTurn
      );

      if (card && card.owner === this.currentTurn && card.state === 'inHand') {
        this.pendingDragStart = { card, pos: { ...mousePos } };
        return;
      }

      if (card) {
        this.handleCardClick(card, mousePos);
      } else {
        if (this.selectedCard && this.selectedCard.state === 'inBattle') {
          if (this.inputHandler.isOnHero(mousePos, 1 - this.currentTurn)) {
            this.attackHero(this.selectedCard);
            return;
          }
        }
        this.selectedCard = null;
      }
    });

    window.addEventListener('mousemove', () => {
      if (this.pendingDragStart) {
        const currentPos = this.inputHandler.getMousePos();
        const dx = currentPos.x - this.pendingDragStart.pos.x;
        const dy = currentPos.y - this.pendingDragStart.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          this.startDrag(this.pendingDragStart.card, this.pendingDragStart.pos);
          this.pendingDragStart = null;
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.pendingDragStart) {
        this.pendingDragStart = null;
      }
    });

    window.addEventListener('click', (_e) => {
      if (this.isGameOver) {
        this.restartGame();
        return;
      }

      const mousePos = this.inputHandler.getMousePos();
      const rect = this.renderer.getCanvasRect();
      if (
        mousePos.x < 0 ||
        mousePos.x > rect.width ||
        mousePos.y < 0 ||
        mousePos.y > rect.height
      ) {
        return;
      }
    });
  }

  private startDrag(card: Card, mousePos: { x: number; y: number }): void {
    card.isDragging = true;
    this.draggingCard = card;
    card.dragOffset = {
      x: card.position.x + card.position.width / 2 - mousePos.x,
      y: card.position.y + card.position.height / 2 - mousePos.y,
    };
  }

  private handleDragEnd(position: { x: number; y: number }): void {
    if (!this.draggingCard) return;

    const card = this.draggingCard;
    card.isDragging = false;

    const player = this.players[this.currentTurn];

    if (this.inputHandler.isInBattlefield(position)) {
      const slot = this.inputHandler.findBattlefieldSlot(position, this.currentTurn);
      if (slot) {
        player.playCardToBattlefield(card, slot.row, slot.col);
      }
    }

    this.draggingCard = null;
  }

  private handleCardClick(
    card: Card,
    _mousePos: { x: number; y: number }
  ): void {
    if (card.owner === this.currentTurn) {
      if (card.state === 'inBattle') {
        if (!card.hasAttacked && card.attackStartTime === 0) {
          if (this.selectedCard === card) {
            this.selectedCard = null;
          } else {
            this.selectedCard = card;
          }
        }
      } else if (card.state === 'inHand') {
        this.selectedCard = null;
      }
    } else {
      if (this.selectedCard && this.selectedCard.state === 'inBattle') {
        if (!this.selectedCard.hasAttacked && this.selectedCard.attackStartTime === 0) {
          this.attackCard(this.selectedCard, card);
        }
      }
    }
  }

  private attackCard(attacker: Card, target: Card): void {
    if (!this.attackAnimationComplete) return;

    this.gameState = 'animating';
    this.attackAnimationComplete = false;
    this.pendingAttack = { attacker, target };

    attacker.startAttack(target);

    setTimeout(() => {
      const attackerDamage = attacker.currentAttack;
      const targetDamage = target.currentAttack;

      target.takeDamage(attackerDamage);
      attacker.takeDamage(targetDamage);

      setTimeout(() => {
        this.completeAttack();
      }, 150);
    }, 200);
  }

  private attackHero(attacker: Card): void {
    if (!this.attackAnimationComplete) return;

    const otherPlayer = this.players[1 - this.currentTurn];
    const enemyCards = otherPlayer.getAllBattlefieldCards();
    const hasTaunt = enemyCards.some((c) => c.data.effect === 'taunt');

    if (hasTaunt) {
      return;
    }

    this.gameState = 'animating';
    this.attackAnimationComplete = false;

    attacker.hasAttacked = true;

    otherPlayer.takeDamage(attacker.currentAttack);

    setTimeout(() => {
      this.attackAnimationComplete = true;
      this.gameState = 'playing';
      this.checkGameOver();
    }, 300);
  }

  private completeAttack(): void {
    if (this.pendingAttack) {
      const { attacker } = this.pendingAttack;
      attacker.resetAttack();

      this.players[0].removeDeadCards();
      this.players[1].removeDeadCards();

      this.pendingAttack = null;
    }

    this.attackAnimationComplete = true;
    this.gameState = 'playing';
    this.selectedCard = null;

    this.checkGameOver();
  }

  private checkGameOver(): void {
    for (let i = 0; i < 2; i++) {
      if (this.players[i].isDead()) {
        this.gameOver(1 - i);
        return;
      }
    }
  }

  private gameOver(winnerIndex: number): void {
    this.isGameOver = true;
    this.winner = winnerIndex;
    this.gameState = 'gameOver';
    this.renderer.setGameOver(winnerIndex);
  }

  private restartGame(): void {
    this.players = [new Player(0, '玩家 1'), new Player(1, '玩家 2')];
    this.currentTurn = 0;
    this.turnNumber = 1;
    this.gameState = 'playing';
    this.selectedCard = null;
    this.draggingCard = null;
    this.isGameOver = false;
    this.pendingAttack = null;
    this.attackAnimationComplete = true;
    this.pendingDragStart = null;

    this.players.forEach((p) => p.initializeHand());
    this.players[0].startTurn();

    this.renderer.resetGameOver();
  }

  private endTurn(): void {
    if (this.gameState !== 'playing') return;

    this.selectedCard = null;
    this.pendingDragStart = null;

    this.gameState = 'animating';
    this.renderer.startTurnTransition(this.currentTurn === 0 ? 1 : -1);

    setTimeout(() => {
      this.players[this.currentTurn].endTurn();
      this.currentTurn = 1 - this.currentTurn;
      this.turnNumber++;
      this.players[this.currentTurn].startTurn();
      this.gameState = 'playing';
    }, 500);
  }

  private start(): void {
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    this.renderer.update(deltaTime);

    this.players.forEach((player) => {
      player.updateHealthAnimation(deltaTime);
      if (this.gameState === 'playing') {
        player.updateTurnTimer(deltaTime);
      }
      player.getAllBattlefieldCards().forEach((card) => {
        card.update(deltaTime);
      });
    });

    if (
      this.gameState === 'playing' &&
      this.players[this.currentTurn].isTurnTimeOut()
    ) {
      this.endTurn();
    }
  }

  private render(): void {
    this.renderer.render(
      this.players,
      this.currentTurn,
      this.turnNumber,
      this.selectedCard,
      this.draggingCard,
      this.inputHandler.getMousePos()
    );
  }
}

new GameLoop();
