import { Card } from './card';
import { Player } from './player';
import { Renderer } from './renderer';
import { InputHandler } from './input';

type GameState = 'playing' | 'animating' | 'gameOver';

class GameLoop {
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private players: Player[];
  private currentTurn: number;
  private turnNumber: number;
  private gameState: GameState;
  private selectedCard: Card | null;
  private lastFrameTime: number;
  private isGameOver: boolean;
  private attackAnimating: boolean;

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
    this.lastFrameTime = 0;
    this.isGameOver = false;
    this.attackAnimating = false;

    this.players.forEach((p) => p.initializeHand());
    this.players[0].startTurn();

    this.setupInputHandlers();
    this.start();
  }

  private setupInputHandlers(): void {
    this.inputHandler.onDragEnd = (pos, card) => {
      if (this.isGameOver || this.gameState !== 'playing') return;
      const player = this.players[this.currentTurn];
      if (this.inputHandler.isInBattlefield(pos)) {
        const slot = this.inputHandler.findBattlefieldSlot(pos, this.currentTurn);
        if (slot) {
          const oldPos = { ...card.position };
          const success = player.playCardToBattlefield(card, slot.row, slot.col);
          if (success) {
            if (card.data.attack >= 5) {
              this.renderer.startPulseAnimation(card);
            }
            this.renderer.markDirtyRect(oldPos.x, oldPos.y, oldPos.width, oldPos.height);
            this.renderer.markDirtyRect(card.position.x, card.position.y, card.position.width, card.position.height);
          }
        }
      }
    };

    this.inputHandler.onClickCard = (card, _pos) => {
      if (this.isGameOver || this.gameState !== 'playing') return;
      if (card.owner === this.currentTurn) {
        if (card.state === 'inBattle' && !card.hasAttacked && !this.attackAnimating) {
          this.selectedCard = this.selectedCard === card ? null : card;
        }
      } else {
        if (this.selectedCard && this.selectedCard.state === 'inBattle' && !this.selectedCard.hasAttacked && !this.attackAnimating) {
          this.executeAttack(this.selectedCard, card);
        }
      }
    };

    this.inputHandler.onClickEmpty = (pos) => {
      if (this.isGameOver || this.gameState !== 'playing') return;
      if (this.selectedCard && this.selectedCard.state === 'inBattle') {
        if (this.inputHandler.isOnHero(pos, 1 - this.currentTurn)) {
          this.executeHeroAttack(this.selectedCard);
          return;
        }
      }
      this.selectedCard = null;
    };

    this.inputHandler.onTurnButton = () => {
      if (!this.isGameOver && this.gameState === 'playing') {
        this.endTurn();
      }
    };

    this.inputHandler.onGameOverClick = () => {
      if (this.isGameOver) {
        this.restartGame();
      }
    };

    this.inputHandler.onKeyPress = (key) => {
      if (this.isGameOver) {
        this.restartGame();
        return;
      }
      if (this.gameState !== 'playing') return;
      if (key === ' ' || key === 'Enter') {
        this.endTurn();
      }
      if (key === 'Escape') {
        this.selectedCard = null;
      }
    };

    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.inputHandler.handleMouseDown(this.players, this.currentTurn, this.isGameOver);
    });
  }

  private executeAttack(attacker: Card, target: Card): void {
    if (this.attackAnimating) return;
    this.attackAnimating = true;
    this.gameState = 'animating';

    const attackerSlot = attacker.battlefieldSlot;
    const targetSlot = target.battlefieldSlot;
    if (!attackerSlot || !targetSlot) {
      this.attackAnimating = false;
      this.gameState = 'playing';
      return;
    }

    const layout = this.renderer.getLayout();
    const attackerCell = layout.battlefieldCells[attackerSlot.row][attackerSlot.col];
    const targetCell = layout.battlefieldCells[targetSlot.row][targetSlot.col];
    const cardWidth = attackerCell.width * 0.9;
    const cardHeight = attackerCell.height * 0.9;

    const attackerX = attackerCell.x + (attackerCell.width - cardWidth) / 2;
    const attackerY = attackerCell.y + (attackerCell.height - cardHeight) / 2;
    const targetX = targetCell.x + (targetCell.width - cardWidth) / 2;
    const targetY = targetCell.y + (targetCell.height - cardHeight) / 2;

    attacker.state = 'attacking';
    attacker.hasAttacked = true;
    this.selectedCard = null;

    this.renderer.startAttackAnimation(
      attacker, target,
      attackerX, attackerY,
      targetX, targetY,
      () => {
        const attackerDamage = attacker.currentAttack;
        const targetDamage = target.currentAttack;

        target.takeDamage(attackerDamage);
        attacker.takeDamage(targetDamage);

        attacker.resetAttack();

        this.players[0].removeDeadCards();
        this.players[1].removeDeadCards();

        this.attackAnimating = false;
        this.gameState = 'playing';
        this.selectedCard = null;

        this.checkGameOver();
      }
    );
  }

  private executeHeroAttack(attacker: Card): void {
    if (this.attackAnimating) return;

    const otherPlayer = this.players[1 - this.currentTurn];
    const enemyCards = otherPlayer.getAllBattlefieldCards();
    const hasTaunt = enemyCards.some((c) => c.data.effect === 'taunt');
    if (hasTaunt) return;

    this.gameState = 'animating';
    this.attackAnimating = true;
    attacker.hasAttacked = true;
    this.selectedCard = null;

    otherPlayer.takeDamage(attacker.currentAttack);

    setTimeout(() => {
      this.attackAnimating = false;
      this.gameState = 'playing';
      this.checkGameOver();
    }, 300);
  }

  private checkGameOver(): void {
    for (let i = 0; i < 2; i++) {
      if (this.players[i].isDead()) {
        this.isGameOver = true;
        this.gameState = 'gameOver';
        this.renderer.setGameOver(1 - i);
        return;
      }
    }
  }

  private restartGame(): void {
    this.players = [new Player(0, '玩家 1'), new Player(1, '玩家 2')];
    this.currentTurn = 0;
    this.turnNumber = 1;
    this.gameState = 'playing';
    this.selectedCard = null;
    this.isGameOver = false;
    this.attackAnimating = false;
    this.inputHandler.dragState = null;

    this.players.forEach((p) => p.initializeHand());
    this.players[0].startTurn();
    this.renderer.resetGameOver();
  }

  private endTurn(): void {
    if (this.gameState !== 'playing') return;

    this.selectedCard = null;
    this.inputHandler.dragState = null;

    this.gameState = 'animating';
    const nextPlayer = 1 - this.currentTurn;
    this.renderer.startTurnTransition(nextPlayer);

    setTimeout(() => {
      this.players[this.currentTurn].endTurn();
      this.currentTurn = nextPlayer;
      this.turnNumber++;
      this.players[this.currentTurn].startTurn();
      if (this.gameState === 'animating') {
        this.gameState = 'playing';
      }
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
      this.inputHandler.dragState
    );
  }
}

const gameLoop = new GameLoop();

(window as any).testAPI = {
  getGameLoop: () => gameLoop,
  getPlayers: () => (gameLoop as any).players,
  getRenderer: () => (gameLoop as any).renderer,
  
  testHealthAnimation: (playerId: number, damage: number = 20) => {
    const players = (gameLoop as any).players;
    players[playerId].takeDamage(damage);
    console.log('玩家' + (playerId + 1) + '受到' + damage + '点伤害，测试血条动画');
  },
  
  testTurnTransition: () => {
    const renderer = (gameLoop as any).renderer;
    renderer.startTurnTransition(1);
    console.log('测试回合切换翻牌动画');
  },
  
  testPulseAnimation: () => {
    const players = (gameLoop as any).players;
    const card = players[0].hand[0];
    if (card) {
      const renderer = (gameLoop as any).renderer;
      renderer.startPulseAnimation(card);
      console.log('测试卡牌入场脉冲动画');
    }
  },
  
  testShakeAnimation: () => {
    const players = (gameLoop as any).players;
    const card = players[0].hand[0];
    if (card) {
      const renderer = (gameLoop as any).renderer;
      renderer.startShakeAnimation(card);
      renderer.startFlashAnimation(card);
      console.log('测试卡牌抖动和闪烁动画');
    }
  },
  
  getFPS: () => {
    const loop = gameLoop as any;
    return { lastDelta: loop.lastFrameTime, gameState: loop.gameState };
  }
};
