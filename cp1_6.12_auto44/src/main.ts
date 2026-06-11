import Phaser from 'phaser';
import { RuneBoard, RUNE_BOARD_EVENTS, RunePlacedEvent, RuneMergedEvent, WeaponForgedEvent } from './game/RuneBoard';
import { UIPanel, UI_EVENTS } from './ui/UIPanel';
import { BattleManager, BATTLE_EVENTS } from './battle/BattleManager';
import { WEAPON_RECIPES, WeaponRecipe, RUNE_DEFINITIONS, BASE_MANA_COST, UPGRADED_MANA_COST, WEAPON_FORGE_MANA_COST } from './game/RuneData';

class GameScene extends Phaser.Scene {
  private runeBoard!: RuneBoard;
  private uiPanel!: UIPanel;
  private battleManager!: BattleManager;

  constructor() {
    super('GameScene');
  }

  preload() {
    const runeKeys = Object.keys(RUNE_DEFINITIONS);
    runeKeys.forEach((key) => {
      const def = RUNE_DEFINITIONS[key as keyof typeof RUNE_DEFINITIONS];
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(def.color, 1);
      gfx.fillCircle(8, 8, 8);
      gfx.generateTexture(`rune_${key}`, 16, 16);
    });

    const mergeGfx = this.make.graphics({ x: 0, y: 0, add: false });
    mergeGfx.fillStyle(0xffffff, 1);
    mergeGfx.fillCircle(4, 4, 4);
    mergeGfx.generateTexture('mergeParticle', 8, 8);

    const sparkleGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sparkleGfx.fillStyle(0xC9A96E, 1);
    sparkleGfx.fillCircle(3, 3, 3);
    sparkleGfx.generateTexture('sparkle', 6, 6);
  }

  create() {
    this.cameras.main.setBackgroundColor('#2D1B4E');

    this.battleManager = new BattleManager(this);
    this.runeBoard = new RuneBoard(this);
    this.uiPanel = new UIPanel(this);

    this.setupEventBindings();

    this.battleManager.startBattle();

    this.scale.on('resize', this.handleResize, this);
  }

  private setupEventBindings() {
    this.battleManager.on(BATTLE_EVENTS.PLAYER_HP_CHANGED, (hp: number, maxHp: number) => {
      this.uiPanel.updateHpBar(hp, maxHp);
    });

    this.battleManager.on(BATTLE_EVENTS.PLAYER_MP_CHANGED, (mp: number, maxMp: number) => {
      this.uiPanel.updateMpBar(mp, maxMp);
    });

    this.battleManager.on(BATTLE_EVENTS.WAVE_CHANGED, (wave: number) => {
      this.uiPanel.updateWave(wave);
    });

    this.battleManager.on(BATTLE_EVENTS.BATTLE_TURN, (turn: number) => {
      this.uiPanel.updateTurn(turn);
    });

    this.battleManager.on(BATTLE_EVENTS.MONSTER_HIT, (damage: number) => {
      const pos = this.battleManager.getMonsterPosition();
      this.uiPanel.showDamageNumber(damage, pos.x + Phaser.Math.Between(-20, 20), pos.y - 20);
    });

    this.battleManager.on(BATTLE_EVENTS.PLAYER_HIT, (damage: number) => {
      this.cameras.main.shake(150, 0.008);
      const screenMidX = this.scale.width / 2;
      const screenBottom = this.scale.height - 120;
      this.uiPanel.showDamageNumber(damage, screenMidX + Phaser.Math.Between(-30, 30), screenBottom, '#ff7675');
    });

    this.battleManager.on(BATTLE_EVENTS.MONSTER_DEFEATED, () => {
      const pos = this.battleManager.getMonsterPosition();
      this.uiPanel.showFloatingText('击败!', pos.x, pos.y - 30, '#00b894');
    });

    this.battleManager.on(BATTLE_EVENTS.GAME_OVER, () => {
      this.uiPanel.showGameOver();
    });

    this.runeBoard.on('request:mana', (amount: number, callback: (ok: boolean) => void) => {
      const ok = this.battleManager.consumeMana(amount);
      if (!ok) {
        this.uiPanel.flashManaInsufficient();
      }
      callback(ok);
    });

    this.runeBoard.on(RUNE_BOARD_EVENTS.RUNE_MERGED, (data: RuneMergedEvent) => {
      this.uiPanel.showFloatingText('融合成功!', this.scale.width / 2, 250, '#00b894');
    });

    this.runeBoard.on(RUNE_BOARD_EVENTS.WEAPON_FORGED, (data: WeaponForgedEvent) => {
      this.battleManager.equipWeapon(data.recipe);
      this.uiPanel.updateWeapon(data.recipe);
    });

    this.runeBoard.on(RUNE_BOARD_EVENTS.MANA_INSUFFICIENT, () => {
      this.uiPanel.flashManaInsufficient();
    });

    this.uiPanel.on(UI_EVENTS.FORGE_REQUESTED, () => {
      this.tryForgeWeapon();
    });

    this.uiPanel.on(UI_EVENTS.RESET_REQUESTED, () => {
      this.resetGame();
    });
  }

  private tryForgeWeapon() {
    const boardState = this.runeBoard.getBoardState();
    const allCells = [];

    for (let r = 0; r < 3; r++) {
      const rowRunes = [];
      for (let c = 0; c < 3; c++) {
        const cell = boardState[r][c];
        rowRunes.push(cell);
        if (cell.element) {
          allCells.push(cell);
        }
      }
      const recipe = this.matchRecipe(rowRunes.map(r => r.element!).filter(Boolean));
      if (recipe && this.battleManager.checkMana(WEAPON_FORGE_MANA_COST)) {
        this.runeBoard.clearRow(r);
        this.runeBoard.playForgeAnimation(r, 0, r, 2, recipe);
        this.battleManager.consumeMana(WEAPON_FORGE_MANA_COST);
        this.battleManager.equipWeapon(recipe);
        this.uiPanel.updateWeapon(recipe);
        this.uiPanel.showFloatingText(`铸造: ${recipe.name}!`, this.scale.width / 2, 240, '#C9A96E');
        return;
      }
    }

    for (let c = 0; c < 3; c++) {
      const colRunes = [];
      for (let r = 0; r < 3; r++) {
        colRunes.push(boardState[r][c]);
      }
      const recipe = this.matchRecipe(colRunes.map(r => r.element!).filter(Boolean));
      if (recipe && this.battleManager.checkMana(WEAPON_FORGE_MANA_COST)) {
        this.runeBoard.clearColumn(c);
        this.runeBoard.playForgeAnimation(0, c, 2, c, recipe);
        this.battleManager.consumeMana(WEAPON_FORGE_MANA_COST);
        this.battleManager.equipWeapon(recipe);
        this.uiPanel.updateWeapon(recipe);
        this.uiPanel.showFloatingText(`铸造: ${recipe.name}!`, this.scale.width / 2, 240, '#C9A96E');
        return;
      }
    }

    this.uiPanel.showFloatingText('无匹配配方', this.scale.width / 2, 250, '#ff7675');
  }

  private matchRecipe(elements: string[]): WeaponRecipe | null {
    if (elements.length < 3) return null;

    for (const recipe of WEAPON_RECIPES) {
      const recipeElems = [...recipe.elements].sort();
      const inputElems = [...elements].sort();
      if (JSON.stringify(recipeElems) === JSON.stringify(inputElems)) {
        return recipe;
      }
    }
    return null;
  }

  private resetGame() {
    this.battleManager.reset();
    this.runeBoard.reset();
    this.uiPanel.updateWeapon(null);
    this.battleManager.startBattle();
  }

  private handleResize = () => {
    this.cameras.main.setBackgroundColor('#2D1B4E');
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#2D1B4E',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [GameScene],
};

new Phaser.Game(config);
