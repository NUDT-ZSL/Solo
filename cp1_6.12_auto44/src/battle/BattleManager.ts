import Phaser from 'phaser';
import { WeaponRecipe, RUNE_DEFINITIONS, RuneElement } from '../game/RuneData';
import { createRoundedRect, createRoundedRectWithStroke } from '../game/GraphicsUtil';

export const BATTLE_EVENTS = {
  PLAYER_HP_CHANGED: 'battle:playerHpChanged',
  PLAYER_MP_CHANGED: 'battle:playerMpChanged',
  WAVE_CHANGED: 'battle:waveChanged',
  MONSTER_HIT: 'battle:monsterHit',
  PLAYER_HIT: 'battle:playerHit',
  MONSTER_DEFEATED: 'battle:monsterDefeated',
  GAME_OVER: 'battle:gameOver',
  MANA_CONSUME_REQUEST: 'battle:manaConsumeRequest',
  BATTLE_TURN: 'battle:turn',
} as const;

interface Monster {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  color: number;
  glowColor: number;
  element: RuneElement;
  body?: Phaser.GameObjects.Container;
  hpBar?: Phaser.GameObjects.Graphics;
  debris?: Phaser.Physics.Arcade.Group;
}

interface MonsterType {
  name: string;
  emoji: string;
  baseHp: number;
  baseAttack: number;
  color: number;
  glowColor: number;
  element: RuneElement;
}

const MONSTER_TYPES: Record<string, MonsterType> = {
  slime: { name: '史莱姆', emoji: '🟢', baseHp: 30, baseAttack: 5, color: 0x00b894, glowColor: 0x55efc4, element: 'water' },
  skeleton: { name: '骷髅', emoji: '💀', baseHp: 60, baseAttack: 12, color: 0xdfe6e9, glowColor: 0xffffff, element: 'dark' },
  demon: { name: '恶魔', emoji: '👹', baseHp: 120, baseAttack: 25, color: 0xd63031, glowColor: 0xff7675, element: 'fire' },
};

export class BattleManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private playerMaxHp: number = 100;
  private playerHp: number = 100;
  private playerMaxMp: number = 50;
  private playerMp: number = 50;
  private baseAttack: number = 10;
  private baseDefense: number = 5;
  private wave: number = 1;
  private turn: number = 0;
  private equippedWeapon: WeaponRecipe | null = null;

  private currentMonster!: Monster;
  private monsterContainer!: Phaser.GameObjects.Container;

  private battleTimerEvent: Phaser.Time.TimerEvent | null = null;
  private mpRegenTimer: Phaser.Time.TimerEvent | null = null;
  private manaRegenRate: number = 1;
  private manaRegenInterval: number = 3000;
  private battleInterval: number = 1500;

  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private monsterShake: boolean = false;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
    this.createMonsterDisplay();
  }

  private createMonsterDisplay() {
    const centerX = this.scene.scale.width / 2;
    const y = 170;

    this.monsterContainer = this.scene.add.container(centerX, y);

    const bg = createRoundedRectWithStroke(
      this.scene, 0, 0, 150, 110, 12,
      0x12121e, 0.9,
      0x8B0000, 1, 2
    );
    this.monsterContainer.add(bg);

    const monsterSprite = this.scene.add.text(0, -10, '', {
      fontSize: '48px',
      align: 'center',
    }).setOrigin(0.5);
    this.monsterContainer.add(monsterSprite);

    const monsterName = this.scene.add.text(0, 30, '', {
      fontSize: '14px',
      color: '#C9A96E',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.monsterContainer.add(monsterName);

    const hpBarBg = this.scene.add.graphics();
    hpBarBg.fillStyle(0x1a1a2e, 1);
    hpBarBg.fillRoundedRect(-55, 45, 110, 10, 4);
    this.monsterContainer.add(hpBarBg);

    const hpBar = this.scene.add.graphics();
    this.monsterContainer.add(hpBar);

    this.monsterContainer.setVisible(false);
  }

  public startBattle() {
    this.isGameOver = false;
    this.isPaused = false;
    this.wave = 1;
    this.turn = 0;
    this.playerHp = this.playerMaxHp;
    this.playerMp = this.playerMaxMp;

    this.emit(BATTLE_EVENTS.PLAYER_HP_CHANGED, this.playerHp, this.playerMaxHp);
    this.emit(BATTLE_EVENTS.PLAYER_MP_CHANGED, this.playerMp, this.playerMaxMp);
    this.emit(BATTLE_EVENTS.WAVE_CHANGED, this.wave);

    this.spawnMonster();
    this.startBattleLoop();
    this.startManaRegen();
  }

  private spawnMonster() {
    let typeKey: string;
    if (this.wave <= 3) {
      typeKey = 'slime';
    } else if (this.wave <= 6) {
      typeKey = 'skeleton';
    } else {
      typeKey = 'demon';
    }

    const type = MONSTER_TYPES[typeKey];
    const waveMultiplier = 1 + (this.wave - 1) * 0.2;
    const atkMultiplier = 1 + (this.wave - 1) * 0.15;

    this.currentMonster = {
      name: type.name,
      emoji: type.emoji,
      hp: Math.floor(type.baseHp * waveMultiplier),
      maxHp: Math.floor(type.baseHp * waveMultiplier),
      attack: Math.floor(type.baseAttack * atkMultiplier),
      color: type.color,
      glowColor: type.glowColor,
      element: type.element,
    };

    this.monsterContainer.setVisible(true);

    const monsterSprite = this.monsterContainer.getAt(1) as Phaser.GameObjects.Text;
    monsterSprite.setText(this.currentMonster.emoji);

    const monsterName = this.monsterContainer.getAt(2) as Phaser.GameObjects.Text;
    monsterName.setText(this.currentMonster.name);

    this.updateMonsterHpBar();

    this.scene.tweens.add({
      targets: this.monsterContainer,
      scaleX: { from: 0, to: 1 },
      scaleY: { from: 0, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: Phaser.Math.Easing.Back.Out,
    });
  }

  private updateMonsterHpBar() {
    const hpBar = this.monsterContainer.getAt(4) as Phaser.GameObjects.Graphics;
    if (!hpBar) return;

    hpBar.clear();
    const ratio = this.currentMonster.hp / this.currentMonster.maxHp;
    const width = Math.max(0, 110 * ratio);

    let color = 0x00b894;
    if (ratio < 0.3) color = 0xd63031;
    else if (ratio < 0.6) color = 0xfdcb6e;

    hpBar.fillStyle(color, 1);
    hpBar.fillRoundedRect(-55, 45, width, 10, 4);
  }

  private startBattleLoop() {
    if (this.battleTimerEvent) {
      this.battleTimerEvent.destroy();
    }

    this.battleTimerEvent = this.scene.time.addEvent({
      delay: this.battleInterval,
      loop: true,
      callback: this.executeBattleTurn,
      callbackScope: this,
    });
  }

  private startManaRegen() {
    if (this.mpRegenTimer) {
      this.mpRegenTimer.destroy();
    }

    this.mpRegenTimer = this.scene.time.addEvent({
      delay: this.manaRegenInterval,
      loop: true,
      callback: this.regenerateMana,
      callbackScope: this,
    });
  }

  private executeBattleTurn() {
    if (this.isPaused || this.isGameOver || !this.currentMonster) return;

    this.turn++;
    this.emit(BATTLE_EVENTS.BATTLE_TURN, this.turn);

    const playerDmg = this.calculatePlayerDamage();
    this.dealDamageToMonster(playerDmg);

    if (this.currentMonster.hp <= 0) {
      this.onMonsterDefeated();
      return;
    }

    this.scene.time.delayedCall(600, () => {
      if (this.isPaused || this.isGameOver) return;
      const monsterDmg = this.calculateMonsterDamage();
      this.dealDamageToPlayer(monsterDmg);
    }, [], this);
  }

  private calculatePlayerDamage(): number {
    let dmg = this.baseAttack;
    if (this.equippedWeapon) {
      dmg += this.equippedWeapon.attackPower;
    }

    if (this.equippedWeapon) {
      const def = RUNE_DEFINITIONS[this.equippedWeapon.elementType];
      const monsterDef = RUNE_DEFINITIONS[this.currentMonster.element];
      if (this.isStrongAgainst(this.equippedWeapon.elementType, this.currentMonster.element)) {
        dmg = Math.floor(dmg * 1.3);
      }
    }

    return Math.max(1, dmg + Phaser.Math.Between(-2, 3));
  }

  private calculateMonsterDamage(): number {
    let dmg = this.currentMonster.attack;
    let playerDef = this.baseDefense;

    if (this.equippedWeapon) {
      playerDef += this.equippedWeapon.defensePower;
    }

    const finalDmg = Math.max(1, dmg - playerDef + Phaser.Math.Between(-1, 2));
    return finalDmg;
  }

  private isStrongAgainst(attacker: RuneElement, defender: RuneElement): boolean {
    const adv: Record<RuneElement, RuneElement> = {
      fire: 'earth',
      water: 'fire',
      earth: 'wind',
      wind: 'water',
      light: 'dark',
      dark: 'light',
    };
    return adv[attacker] === defender;
  }

  private dealDamageToMonster(damage: number) {
    this.currentMonster.hp = Math.max(0, this.currentMonster.hp - damage);
    this.updateMonsterHpBar();
    this.emit(BATTLE_EVENTS.MONSTER_HIT, damage, this.currentMonster.hp, this.currentMonster.maxHp);

    this.shakeMonster();
  }

  private dealDamageToPlayer(damage: number) {
    this.playerHp = Math.max(0, this.playerHp - damage);
    this.emit(BATTLE_EVENTS.PLAYER_HP_CHANGED, this.playerHp, this.playerMaxHp);
    this.emit(BATTLE_EVENTS.PLAYER_HIT, damage, this.playerHp, this.playerMaxHp);

    if (this.playerHp <= 0) {
      this.onGameOver();
    }
  }

  private shakeMonster() {
    const originalX = this.monsterContainer.x;
    const shakeAmount = 8;

    this.scene.tweens.add({
      targets: this.monsterContainer,
      x: originalX + shakeAmount,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: Phaser.Math.Easing.Sine.InOut,
      onComplete: () => {
        this.monsterContainer.setPosition(originalX, this.monsterContainer.y);
      },
    });
  }

  private onMonsterDefeated() {
    this.emit(BATTLE_EVENTS.MONSTER_DEFEATED, this.currentMonster, this.wave);

    this.spawnMonsterDebris();

    this.scene.time.delayedCall(500, () => {
      this.wave++;
      this.emit(BATTLE_EVENTS.WAVE_CHANGED, this.wave);
      this.spawnMonster();
    }, [], this);
  }

  private spawnMonsterDebris() {
    if (!this.scene.physics || !this.scene.physics.arcade) {
      this.monsterContainer.setVisible(false);
      return;
    }

    const centerX = this.monsterContainer.x;
    const centerY = this.monsterContainer.y;

    this.monsterContainer.setVisible(false);

    const debrisGroup = this.scene.physics.add.group();

    const debrisCount = 12;
    for (let i = 0; i < debrisCount; i++) {
      const size = Phaser.Math.Between(8, 20);
      const debris = this.scene.add.rectangle(centerX, centerY, size, size, this.currentMonster.color);
      this.scene.physics.add.existing(debris);
      debrisGroup.add(debris);

      const angle = (i / debrisCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      const speed = Phaser.Math.FloatBetween(80, 200);
      const body = debris.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );
      body.setBounce(Phaser.Math.FloatBetween(0.3, 0.7));
      body.setGravityY(300);
      body.setCollideWorldBounds(false);

      this.scene.tweens.add({
        targets: debris,
        alpha: 0,
        delay: 400,
        duration: 600,
        ease: Phaser.Math.Easing.Power1.Out,
      });

      this.scene.tweens.add({
        targets: debris,
        angle: Phaser.Math.Between(-360, 360),
        duration: 1000,
        ease: Phaser.Math.Easing.Linear,
      });
    }

    this.scene.time.delayedCall(1200, () => {
      debrisGroup.clear(true, true);
    }, [], this);
  }

  private regenerateMana() {
    if (this.isPaused || this.isGameOver) return;

    const regen = this.manaRegenRate;
    this.playerMp = Math.min(this.playerMaxMp, this.playerMp + regen);
    this.emit(BATTLE_EVENTS.PLAYER_MP_CHANGED, this.playerMp, this.playerMaxMp);
  }

  public consumeMana(amount: number): boolean {
    if (this.playerMp >= amount) {
      this.playerMp -= amount;
      this.emit(BATTLE_EVENTS.PLAYER_MP_CHANGED, this.playerMp, this.playerMaxMp);
      return true;
    }
    return false;
  }

  public checkMana(amount: number): boolean {
    return this.playerMp >= amount;
  }

  public equipWeapon(recipe: WeaponRecipe): boolean {
    this.equippedWeapon = recipe;
    return true;
  }

  public getEquippedWeapon(): WeaponRecipe | null {
    return this.equippedWeapon;
  }

  public getPlayerHp(): number { return this.playerHp; }
  public getPlayerMaxHp(): number { return this.playerMaxHp; }
  public getPlayerMp(): number { return this.playerMp; }
  public getPlayerMaxMp(): number { return this.playerMaxMp; }
  public getWave(): number { return this.wave; }
  public getTurn(): number { return this.turn; }

  private onGameOver() {
    this.isGameOver = true;
    this.isPaused = true;

    if (this.battleTimerEvent) {
      this.battleTimerEvent.paused = true;
    }
    if (this.mpRegenTimer) {
      this.mpRegenTimer.paused = true;
    }

    this.emit(BATTLE_EVENTS.GAME_OVER);
  }

  public pause() {
    if (this.isGameOver) return;
    this.isPaused = true;
    if (this.battleTimerEvent) this.battleTimerEvent.paused = true;
    if (this.mpRegenTimer) this.mpRegenTimer.paused = true;
  }

  public resume() {
    if (this.isGameOver) return;
    this.isPaused = false;
    if (this.battleTimerEvent) this.battleTimerEvent.paused = false;
    if (this.mpRegenTimer) this.mpRegenTimer.paused = false;
  }

  public reset() {
    if (this.battleTimerEvent) {
      this.battleTimerEvent.destroy();
      this.battleTimerEvent = null;
    }
    if (this.mpRegenTimer) {
      this.mpRegenTimer.destroy();
      this.mpRegenTimer = null;
    }

    this.isGameOver = false;
    this.isPaused = false;
    this.equippedWeapon = null;
    this.turn = 0;
  }

  public getMonsterPosition(): { x: number; y: number } {
    return { x: this.monsterContainer.x, y: this.monsterContainer.y };
  }

  public getMonsterHpBarPosition(): { x: number; y: number } {
    return {
      x: this.monsterContainer.x,
      y: this.monsterContainer.y - 10,
    };
  }

  public destroy() {
    this.reset();
    this.removeAllListeners();
  }
}
