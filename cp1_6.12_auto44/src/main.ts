import Phaser from 'phaser';
import { RuneBoard, RuneBoardEvents } from './game/RuneBoard';
import { RuneElement, WeaponRecipe, UpgradedRune, RUNE_DEFINITIONS } from './game/RuneData';
import { BattleManager, BattleEvents } from './battle/BattleManager';
import { UIPanel, UIPanelEvents } from './ui/UIPanel';

class GameScene extends Phaser.Scene {
  private runeBoard!: RuneBoard;
  private battleManager!: BattleManager;
  private uiPanel!: UIPanel;
  private backgroundGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(3, 3, 3);
    graphics.generateTexture('mergeParticle', 6, 6);
    graphics.destroy();
  }

  create() {
    this.createBackground();

    const boardEvents: RuneBoardEvents = {
      onRunePlaced: (row, col, element) => this.onRunePlaced(row, col, element),
      onRuneMerged: (row, col, upgraded) => this.onRuneMerged(row, col, upgraded),
      onWeaponForged: (recipe) => this.onWeaponForged(recipe),
      onManaInsufficient: () => this.onManaInsufficient(),
    };

    const battleEvents: BattleEvents = {
      onPlayerAttack: (damage, element) => this.onPlayerAttack(damage, element),
      onMonsterAttack: (damage) => this.onMonsterAttack(damage),
      onMonsterDeath: (monster) => this.onMonsterDeath(monster),
      onPlayerDeath: () => this.onPlayerDeath(),
      onNewWave: (wave, monster) => this.onNewWave(wave, monster),
      onTurnStart: (turn) => this.onTurnStart(turn),
      onHpChange: (hp, maxHp) => this.onHpChange(hp, maxHp),
      onMpChange: (mp, maxMp) => this.onMpChange(mp, maxMp),
    };

    const uiEvents: UIPanelEvents = {
      onForgeRequested: () => this.onForgeRequested(),
      onResetRequested: () => this.onResetRequested(),
    };

    this.runeBoard = new RuneBoard(this, boardEvents);
    this.battleManager = new BattleManager(this, battleEvents);
    this.uiPanel = new UIPanel(this, uiEvents);

    this.battleManager.startBattle();

    const playerState = this.battleManager.getPlayerState();
    this.uiPanel.updateHpBar(playerState.hp, playerState.maxHp);
    this.uiPanel.updateMpBar(playerState.mp, playerState.maxMp);
    this.uiPanel.updateWave(this.battleManager.getCurrentWave());
  }

  private createBackground() {
    this.backgroundGraphics = this.add.graphics();
    this.backgroundGraphics.fillStyle(0x0a0a14, 1);
    this.backgroundGraphics.fillRect(0, 0, this.scale.width, this.scale.height);

    const bg = this.add.graphics();
    bg.fillStyle(0x2D1B4E, 0.15);
    bg.fillRect(0, 0, this.scale.width, this.scale.height * 0.12);

    bg.fillStyle(0x2D1B4E, 0.08);
    bg.fillRect(0, this.scale.height * 0.65, this.scale.width, this.scale.height * 0.35);

    bg.lineStyle(1, 0xC9A96E, 0.2);
    bg.lineBetween(0, this.scale.height * 0.12, this.scale.width, this.scale.height * 0.12);
    bg.lineBetween(0, this.scale.height * 0.65, this.scale.width, this.scale.height * 0.65);

    this.createAmbientParticles();
  }

  private createAmbientParticles() {
    const g = this.add.graphics();
    g.fillStyle(0xC9A96E, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture('ambientParticle', 4, 4);
    g.destroy();

    const emitter = this.add.particles(this.scale.width / 2, this.scale.height + 10, 'ambientParticle', {
      speed: { min: 10, max: 40 },
      lifespan: { min: 4000, max: 8000 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.3, end: 0 },
      tint: [0xC9A96E, 0x2D1B4E, 0x8B0000],
      frequency: 300,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-this.scale.width / 2, 0, this.scale.width, 10),
      },
    });
  }

  private onRunePlaced(row: number, col: number, element: RuneElement) {
    const def = RUNE_DEFINITIONS[element];
    const manaCost = def.manaCost;
    if (!this.battleManager.consumeMana(manaCost)) {
      this.runeBoard.triggerManaInsufficientEffect();
      this.uiPanel.flashManaInsufficient();
    }
  }

  private onRuneMerged(row: number, col: number, upgraded: UpgradedRune) {
    this.uiPanel.showFloatingText(
      `${upgraded.name} 合成!`,
      this.scale.width / 2,
      this.scale.height * 0.45,
      `#${upgraded.glowColor.toString(16).padStart(6, '0')}`
    );
  }

  private onWeaponForged(recipe: WeaponRecipe) {
    this.battleManager.equipWeapon(recipe);
    this.uiPanel.updateWeapon(recipe);
    this.uiPanel.showFloatingText(
      `铸造: ${recipe.name}!`,
      this.scale.width / 2,
      this.scale.height * 0.55,
      '#ffd700'
    );
  }

  private onManaInsufficient() {
    this.uiPanel.flashManaInsufficient();
  }

  private onPlayerAttack(damage: number, element: RuneElement | null) {
    const monster = this.battleManager.getCurrentMonster();
    if (monster) {
      this.uiPanel.showDamageNumber(
        damage,
        this.scale.width / 2,
        this.scale.height * 0.15,
        element ? `#${RUNE_DEFINITIONS[element].glowColor.toString(16).padStart(6, '0')}` : '#ff4757'
      );
    }
  }

  private onMonsterAttack(damage: number) {
    this.uiPanel.showDamageNumber(damage, this.scale.width / 2, this.scale.height * 0.55, '#ff4757');
  }

  private onMonsterDeath(monster: any) {
    this.uiPanel.showFloatingText(
      `${monster.name} 被击败!`,
      this.scale.width / 2,
      this.scale.height * 0.3,
      '#00b894'
    );
  }

  private onPlayerDeath() {
    this.uiPanel.showGameOver();
  }

  private onNewWave(wave: number, monster: any) {
    this.uiPanel.updateWave(wave);
  }

  private onTurnStart(turn: number) {
    this.uiPanel.updateTurn(turn);
  }

  private onHpChange(hp: number, maxHp: number) {
    this.uiPanel.updateHpBar(hp, maxHp);
  }

  private onMpChange(mp: number, maxMp: number) {
    this.uiPanel.updateMpBar(mp, maxMp);
  }

  private onForgeRequested() {
    this.runeBoard.resetBoard();
    this.battleManager.healPlayer(20);
    const state = this.battleManager.getPlayerState();
    this.uiPanel.updateHpBar(state.hp, state.maxHp);
    this.uiPanel.showFloatingText('符文板已重置', this.scale.width / 2, this.scale.height * 0.5, '#C9A96E');
  }

  private onResetRequested() {
    this.runeBoard.resetBoard();
    this.battleManager.resetBattle();
    this.battleManager.startBattle();
    this.uiPanel.updateWeapon(null);
    const state = this.battleManager.getPlayerState();
    this.uiPanel.updateHpBar(state.hp, state.maxHp);
    this.uiPanel.updateMpBar(state.mp, state.maxMp);
    this.uiPanel.updateWave(1);
    this.uiPanel.updateTurn(0);
    this.uiPanel.showFloatingText('游戏已重置', this.scale.width / 2, this.scale.height * 0.5, '#C9A96E');
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a14',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: GameScene,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
};

const game = new Phaser.Game(config);
