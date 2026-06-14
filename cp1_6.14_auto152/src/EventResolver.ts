import type { CellType, Monster, Weapon, ChestData, ShopData, Player, GameOverData } from './types';
import { eventBus } from './utils/EventBus';
import { GRID_SIZE } from './GridMap';

const WEAPON_POOL: Omit<Weapon, 'id'>[] = [
  { name: '木剑', icon: '🗡️', damage: 2, rarity: 'common' },
  { name: '铁剑', icon: '⚔️', damage: 3, rarity: 'common' },
  { name: '战斧', icon: '🪓', damage: 4, rarity: 'rare' },
  { name: '长弓', icon: '🏹', damage: 5, rarity: 'rare' },
  { name: '魔法杖', icon: '🔮', damage: 6, rarity: 'epic' },
  { name: '圣光之剑', icon: '✨', damage: 8, rarity: 'epic' },
  { name: '匕首', icon: '🔪', damage: 2, rarity: 'common' },
];

const MONSTER_POOL: Omit<Monster, 'id'>[] = [
  { name: '史莱姆', icon: '🟢', hp: 3, maxHp: 3, attack: 1, gold: 8 },
  { name: '蝙蝠', icon: '🦇', hp: 2, maxHp: 2, attack: 1, gold: 5 },
  { name: '骷髅兵', icon: '💀', hp: 5, maxHp: 5, attack: 2, gold: 15 },
  { name: '哥布林', icon: '👺', hp: 4, maxHp: 4, attack: 2, gold: 12 },
  { name: '巨型蜘蛛', icon: '🕷️', hp: 6, maxHp: 6, attack: 2, gold: 18 },
  { name: '暗影幽灵', icon: '👻', hp: 7, maxHp: 7, attack: 3, gold: 25 },
  { name: '恶龙', icon: '🐉', hp: 12, maxHp: 12, attack: 4, gold: 50 },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class EventResolver {
  private player: Player = {
    x: 0, y: 0, hp: 5, maxHp: 5,
    gold: 0, weapons: [{ id: uid(), name: '拳头', icon: '👊', damage: 1, rarity: 'common' }],
    currentWeaponId: undefined,
  };
  private killCount = 0;
  private inBattle = false;
  private currentMonster: Monster | null = null;
  private gameOver = false;

  reset(): void {
    this.player = {
      x: 0, y: 0, hp: 5, maxHp: 5,
      gold: 0, weapons: [{ id: uid(), name: '拳头', icon: '👊', damage: 1, rarity: 'common' }],
      currentWeaponId: undefined,
    };
    this.killCount = 0;
    this.inBattle = false;
    this.currentMonster = null;
    this.gameOver = false;
  }

  getPlayer(): Player {
    return { ...this.player, weapons: [...this.player.weapons] };
  }

  getKillCount(): number {
    return this.killCount;
  }

  getInBattle(): boolean {
    return this.inBattle;
  }

  getCurrentMonster(): Monster | null {
    return this.currentMonster ? { ...this.currentMonster } : null;
  }

  private addLog(message: string, type: import('./types').LogType = 'info'): void {
    eventBus.emit('log:add', { message, type });
  }

  private changeHp(delta: number): void {
    const newHp = Math.max(0, Math.min(this.player.maxHp, this.player.hp + delta));
    this.player.hp = newHp;
    eventBus.emit('player:hp-change', { hp: newHp, delta });
  }

  private changeGold(delta: number): void {
    const newGold = Math.max(0, this.player.gold + delta);
    this.player.gold = newGold;
    eventBus.emit('player:gold-change', { gold: newGold, delta });
  }

  private triggerChest(x: number, y: number): void {
    const gold = randInt(10, 50);
    const weapon = Math.random() < 0.5 ? { ...pickRandom(WEAPON_POOL), id: uid() } : undefined;
    this.changeGold(gold);
    if (weapon) {
      this.player.weapons.push(weapon);
      eventBus.emit('player:weapon-add', { weapon });
    }
    this.addLog(`💎 宝箱！获得 ${gold} 金币${weapon ? ` 和 ${weapon.icon}${weapon.name}` : ''}`, 'success');
    const data: ChestData = { gold, weapon };
    eventBus.emit('modal:open', { id: 'chest', data });
    const cell = (eventBus as any)._gridMap?.cells?.[y]?.[x];
    if (cell) cell.resolved = true;
  }

  private triggerTrap(x: number, y: number): void {
    eventBus.emit('trap:flash', { x, y });
    this.changeHp(-1);
    this.addLog('⚠️ 踩到陷阱！损失 1 点生命值', 'danger');
    if (this.player.hp <= 0) this.endGame(false);
  }

  private triggerMonster(_x: number, _y: number): void {
    const base = pickRandom(MONSTER_POOL);
    const monster: Monster = { ...base, id: uid() };
    this.currentMonster = monster;
    this.inBattle = true;
    this.addLog(`⚔️ 遭遇 ${monster.icon}${monster.name}！战斗开始！`, 'warn');
    eventBus.emit('battle:start', { monster });
  }

  private triggerShop(_x: number, _y: number): void {
    const items: ShopData['items'] = [];
    for (let i = 0; i < 3; i++) {
      if (Math.random() < 0.6) {
        const w = { ...pickRandom(WEAPON_POOL), id: uid() };
        const basePrice = w.rarity === 'epic' ? 40 : w.rarity === 'rare' ? 25 : 12;
        items.push({
          type: 'weapon',
          price: basePrice + randInt(-5, 10),
          payload: w,
          label: `${w.icon} ${w.name} (伤害${w.damage})`,
          icon: w.icon,
        });
      } else {
        const heal = randInt(1, 3);
        items.push({
          type: 'heal',
          price: heal * 8,
          payload: heal,
          label: `❤️ 恢复药水 (+${heal}HP)`,
          icon: '❤️',
        });
      }
    }
    this.addLog('🛒 欢迎光临冒险商店！', 'info');
    eventBus.emit('modal:open', { id: 'shop', data: { items } });
  }

  private triggerEmpty(): void {
    this.addLog('一片宁静的空地，什么都没有。', 'info');
  }

  private triggerEnd(): void {
    this.addLog('🏆 你到达了终点！胜利！', 'success');
    this.endGame(true);
  }

  private endGame(victory: boolean): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.inBattle = false;
    const floors = this.player.y + 1;
    const stats = { gold: this.player.gold, kills: this.killCount, floors };
    eventBus.emit('game:over', { victory, stats });
    const data: GameOverData = {
      victory,
      totalGold: this.player.gold,
      killCount: this.killCount,
      reachedFloor: floors,
    };
    eventBus.emit('modal:open', { id: 'gameover', data });
  }

  private handlePlayerAttack(weaponId: string): void {
    if (!this.inBattle || !this.currentMonster) return;
    const weapon = this.player.weapons.find((w) => w.id === weaponId) || this.player.weapons[0];
    const multiplier = randInt(1, 2);
    const damage = weapon.damage * multiplier + randInt(0, 2);
    eventBus.emit('battle:player-attack', { damage, anim: 'slash' });
    this.addLog(`你使用 ${weapon.icon}${weapon.name} 造成 ${damage} 点伤害！`, 'success');
    this.currentMonster.hp -= damage;
    if (this.currentMonster.hp <= 0) {
      const gold = this.currentMonster.gold;
      this.changeGold(gold);
      this.killCount++;
      this.addLog(`🎉 击败 ${this.currentMonster.icon}${this.currentMonster.name}！获得 ${gold} 金币`, 'success');
      const monster = this.currentMonster;
      this.currentMonster = null;
      this.inBattle = false;
      window.setTimeout(() => {
        eventBus.emit('battle:end', { victory: true });
      }, 600);
      return;
    }
    window.setTimeout(() => {
      if (!this.currentMonster) return;
      const mdmg = this.currentMonster.attack + randInt(0, 1);
      eventBus.emit('battle:monster-attack', { damage: mdmg });
      this.addLog(`${this.currentMonster!.icon}${this.currentMonster!.name} 反击造成 ${mdmg} 点伤害！`, 'danger');
      this.changeHp(-mdmg);
      if (this.player.hp <= 0) {
        this.currentMonster = null;
        this.inBattle = false;
        window.setTimeout(() => {
          eventBus.emit('battle:end', { victory: false });
          this.endGame(false);
        }, 400);
      }
    }, 700);
  }

  private handleBuy(index: number): void {
    eventBus.emit('modal:open', { id: 'shop', data: { items: [] } });
  }

  init(gridMapRef: { cells: any[][] }): () => void {
    (eventBus as any)._gridMap = gridMapRef;

    const offTrigger = eventBus.on('event:trigger', ({ type, x, y }) => {
      if (this.gameOver || this.inBattle) return;
      switch (type) {
        case 'chest': return this.triggerChest(x, y);
        case 'trap': return this.triggerTrap(x, y);
        case 'monster': return this.triggerMonster(x, y);
        case 'shop': return this.triggerShop(x, y);
        case 'empty': return this.triggerEmpty();
        case 'end': return this.triggerEnd();
        case 'start':
        default: return;
      }
    });

    const offAttack = eventBus.on('player:attack', ({ weaponId }) => {
      this.handlePlayerAttack(weaponId);
    });

    const offFlee = eventBus.on('battle:flee', () => {
      if (!this.inBattle) return;
      if (Math.random() < 0.5) {
        this.addLog('你成功逃跑了！', 'warn');
        this.currentMonster = null;
        this.inBattle = false;
        eventBus.emit('battle:end', { victory: false });
      } else {
        this.addLog('逃跑失败！', 'danger');
        if (this.currentMonster) {
          const mdmg = this.currentMonster.attack;
          eventBus.emit('battle:monster-attack', { damage: mdmg });
          this.changeHp(-mdmg);
          if (this.player.hp <= 0) {
            this.currentMonster = null;
            this.inBattle = false;
            this.endGame(false);
          }
        }
      }
    });

    const offPosition = eventBus.on('player:position', ({ x, y }) => {
      this.player.x = x;
      this.player.y = y;
    });

    const offRestart = eventBus.on('game:restart', () => {
      this.reset();
    });

    return () => {
      offTrigger();
      offAttack();
      offFlee();
      offPosition();
      offRestart();
    };
  }
}

export const eventResolver = new EventResolver();
