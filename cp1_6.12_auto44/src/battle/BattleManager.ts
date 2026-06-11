import Phaser from 'phaser';
import { RuneElement, RUNE_DEFINITIONS, WeaponRecipe } from '../game/RuneData';
import { createRoundedRect } from '../game/GraphicsUtil';

export interface MonsterDef {
  name: string;
  baseHp: number;
  baseAttack: number;
  symbol: string;
  color: number;
}

export interface Monster {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  symbol: string;
  color: number;
  wave: number;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  baseAttack: number;
  equippedWeapon: WeaponRecipe | null;
}

export interface BattleEvents {
  onPlayerAttack: (damage: number, element: RuneElement | null) => void;
  onMonsterAttack: (damage: number) => void;
  onMonsterDeath: (monster: Monster) => void;
  onPlayerDeath: () => void;
  onNewWave: (wave: number, monster: Monster) => void;
  onTurnStart: (turn: number) => void;
  onHpChange: (hp: number, maxHp: number) => void;
  onMpChange: (mp: number, maxMp: number) => void;
}

const MONSTER_TYPES: Record<string, MonsterDef> = {
  slime: { name: '史莱姆', baseHp: 30, baseAttack: 5, symbol: '🟢', color: 0x00b894 },
  skeleton: { name: '骷髅', baseHp: 50, baseAttack: 10, symbol: '💀', color: 0xdfe6e9 },
  demon: { name: '恶魔', baseHp: 80, baseAttack: 15, symbol: '😈', color: 0xe84118 },
};

const TURN_INTERVAL = 1500;
const MP_REGEN_PER_TURN = 5;

export class BattleManager {
  private scene: Phaser.Scene;
  private events: BattleEvents;
  private player: PlayerState;
  private currentMonster: Monster | null = null;
  private currentWave: number = 1;
  private currentTurn: number = 0;
  private battleTimer: Phaser.Time.TimerEvent | null = null;
  private isBattleActive: boolean = false;
  private monsterSprite: Phaser.GameObjects.Container | null = null;
  private monsterHpBar: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, events: BattleEvents) {
    this.scene = scene;
    this.events = events;
    this.player = {
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      baseAttack: 10,
      equippedWeapon: null,
    };
  }

  public startBattle() {
    this.isBattleActive = true;
    this.spawnMonster(this.currentWave);
    this.startTurnLoop();
  }

  public stopBattle() {
    this.isBattleActive = false;
    if (this.battleTimer) {
      this.battleTimer.destroy();
      this.battleTimer = null;
    }
  }

  private startTurnLoop() {
    this.battleTimer = this.scene.time.addEvent({
      delay: TURN_INTERVAL,
      callback: this.executeTurn,
      callbackScope: this,
      loop: true,
    });
  }

  private executeTurn() {
    if (!this.isBattleActive || !this.currentMonster) return;

    this.currentTurn++;
    this.events.onTurnStart(this.currentTurn);

    this.playerAttack();

    if (this.currentMonster.hp <= 0) {
      this.monsterDeath();
      return;
    }

    this.scene.time.delayedCall(600, () => {
      if (!this.isBattleActive || !this.currentMonster) return;
      this.monsterAttack();

      if (this.player.hp <= 0) {
        this.playerDeath();
        return;
      }

      this.regenMana();
    });
  }

  private playerAttack() {
    if (!this.currentMonster) return;

    let damage = this.player.baseAttack;
    let element: RuneElement | null = null;

    if (this.player.equippedWeapon) {
      damage += this.player.equippedWeapon.attackPower;
      element = this.player.equippedWeapon.elementType;
    }

    damage += Math.floor(Math.random() * 5);

    this.currentMonster.hp = Math.max(0, this.currentMonster.hp - damage);
    this.events.onPlayerAttack(damage, element);
    this.updateMonsterHpBar();

    this.playAttackAnimation('player');
  }

  private monsterAttack() {
    if (!this.currentMonster) return;

    const baseDmg = this.currentMonster.attack;
    const variance = Math.floor(Math.random() * Math.max(1, baseDmg * 0.3));
    const damage = baseDmg + variance - Math.floor(Math.random() * 3);

    const finalDamage = Math.max(1, damage);
    this.player.hp = Math.max(0, this.player.hp - finalDamage);
    this.events.onMonsterAttack(finalDamage);
    this.events.onHpChange(this.player.hp, this.player.maxHp);

    this.playAttackAnimation('monster');
  }

  private regenMana() {
    const oldMp = this.player.mp;
    this.player.mp = Math.min(this.player.maxMp, this.player.mp + MP_REGEN_PER_TURN);
    if (this.player.mp !== oldMp) {
      this.events.onMpChange(this.player.mp, this.player.maxMp);
    }
  }

  private monsterDeath() {
    if (!this.currentMonster) return;

    this.playMonsterDeathAnimation();

    const deadMonster = this.currentMonster;
    this.events.onMonsterDeath(deadMonster);

    this.scene.time.delayedCall(800, () => {
      this.currentWave++;
      if (this.currentMonster) {
        this.currentMonster = null;
      }
      this.spawnMonster(this.currentWave);
      this.events.onNewWave(this.currentWave, this.currentMonster!);
    });
  }

  private playerDeath() {
    this.isBattleActive = false;
    this.stopBattle();
    this.events.onPlayerDeath();
  }

  private spawnMonster(wave: number) {
    let typeKey: string;
    if (wave <= 3) typeKey = 'slime';
    else if (wave <= 6) typeKey = 'skeleton';
    else typeKey = 'demon';

    const def = MONSTER_TYPES[typeKey];
    const hpMultiplier = 1 + (wave - 1) * 0.2;
    const atkMultiplier = 1 + (wave - 1) * 0.15;

    this.currentMonster = {
      name: def.name,
      level: wave,
      hp: Math.floor(def.baseHp * hpMultiplier),
      maxHp: Math.floor(def.baseHp * hpMultiplier),
      attack: Math.floor(def.baseAttack * atkMultiplier),
      symbol: def.symbol,
      color: def.color,
      wave: wave,
    };

    this.createMonsterSprite(this.currentMonster);
    this.playMonsterEntrance();
    this.events.onNewWave(wave, this.currentMonster);
  }

  private createMonsterSprite(monster: Monster) {
    if (this.monsterSprite) {
      this.monsterSprite.destroy();
    }

    this.monsterSprite = this.scene.add.container(
      this.scene.scale.width / 2,
      this.scene.scale.height * 0.2
    );

    const body = createRoundedRect(this.scene, 0, 0, 100, 100, 12, monster.color, 0.9);
    this.monsterSprite.add(body);

    const icon = this.scene.add.text(0, -4, monster.symbol, {
      fontSize: '48px',
      align: 'center',
    }).setOrigin(0.5);
    this.monsterSprite.add(icon);

    const nameText = this.scene.add.text(0, -70, `${monster.name} Lv.${monster.level}`, {
      fontSize: '14px',
      color: '#C9A96E',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5);
    this.monsterSprite.add(nameText);

    this.monsterSprite.setAlpha(0);
    this.monsterSprite.setScale(0.3);

    this.monsterHpBar = this.scene.add.graphics();
    this.updateMonsterHpBar();
  }

  private playMonsterEntrance() {
    if (!this.monsterSprite) return;

    this.monsterSprite.setPosition(this.scene.scale.width / 2, -80);
    this.monsterSprite.setAlpha(0);

    this.scene.tweens.add({
      targets: this.monsterSprite,
      y: this.scene.scale.height * 0.2,
      alpha: { from: 0, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
    });

    const blink = this.scene.tweens.add({
      targets: this.monsterSprite,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 4,
    });

    this.scene.time.delayedCall(400, () => {
      blink.stop();
      this.monsterSprite!.setAlpha(1);
    });
  }

  private updateMonsterHpBar() {
    if (!this.monsterHpBar || !this.currentMonster) return;

    this.monsterHpBar.clear();

    const barWidth = 120;
    const barHeight = 8;
    const barX = this.scene.scale.width / 2 - barWidth / 2;
    const barY = this.scene.scale.height * 0.2 + 60;

    this.monsterHpBar.fillStyle(0x333333, 1);
    this.monsterHpBar.fillRoundedRect(barX, barY, barWidth, barHeight, 4);

    const ratio = Math.max(0, this.currentMonster.hp / this.currentMonster.maxHp);
    const hpWidth = barWidth * ratio;

    const hpColor = ratio > 0.5 ? 0x00b894 : ratio > 0.25 ? 0xfdcb6e : 0xe84118;
    this.monsterHpBar.fillStyle(hpColor, 1);
    this.monsterHpBar.fillRoundedRect(barX, barY, hpWidth, barHeight, 4);
  }

  private playMonsterDeathAnimation() {
    if (!this.monsterSprite) return;

    this.scene.tweens.add({
      targets: this.monsterSprite,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.monsterSprite?.destroy();
        this.monsterSprite = null;
        this.monsterHpBar?.clear();
      },
    });

    const deathParticles = this.scene.add.particles(
      this.scene.scale.width / 2,
      this.scene.scale.height * 0.2,
      'mergeParticle',
      {
        speed: { min: 60, max: 180 },
        scale: { start: 0.5, end: 0 },
        lifespan: 600,
        quantity: 16,
        tint: [0xffffff, this.currentMonster?.color || 0xff0000],
        blendMode: 'ADD',
        emitting: true,
      }
    );

    this.scene.time.delayedCall(600, () => {
      deathParticles.destroy();
    });
  }

  private playAttackAnimation(attacker: 'player' | 'monster') {
    if (attacker === 'player' && this.monsterSprite) {
      const origX = this.monsterSprite.x;
      this.scene.tweens.add({
        targets: this.monsterSprite,
        x: origX - 15,
        duration: 80,
        yoyo: true,
        repeat: 2,
        ease: 'Power1',
        onComplete: () => {
          this.monsterSprite?.setX(origX);
        },
      });

      this.scene.tweens.add({
        targets: this.monsterSprite,
        scaleX: 0.85,
        scaleY: 0.85,
        duration: 100,
        yoyo: true,
        ease: 'Power1',
      });
    } else if (attacker === 'monster' && this.monsterSprite) {
      const origY = this.monsterSprite.y;
      this.scene.tweens.add({
        targets: this.monsterSprite,
        y: origY + 30,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          this.monsterSprite?.setY(origY);
        },
      });
    }
  }

  public equipWeapon(recipe: WeaponRecipe) {
    this.player.equippedWeapon = recipe;
  }

  public consumeMana(amount: number): boolean {
    if (this.player.mp < amount) {
      this.events.onMpChange(this.player.mp, this.player.maxMp);
      return false;
    }
    this.player.mp -= amount;
    this.events.onMpChange(this.player.mp, this.player.maxMp);
    return true;
  }

  public getPlayerState(): PlayerState {
    return { ...this.player };
  }

  public getCurrentMonster(): Monster | null {
    return this.currentMonster;
  }

  public getCurrentWave(): number {
    return this.currentWave;
  }

  public healPlayer(amount: number) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    this.events.onHpChange(this.player.hp, this.player.maxHp);
  }

  public resetBattle() {
    this.stopBattle();
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    this.player.equippedWeapon = null;
    this.currentWave = 1;
    this.currentTurn = 0;
    this.currentMonster = null;
    if (this.monsterSprite) {
      this.monsterSprite.destroy();
      this.monsterSprite = null;
    }
    if (this.monsterHpBar) {
      this.monsterHpBar.clear();
    }
  }
}
