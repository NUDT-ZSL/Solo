import { eventBus } from './utils/EventBus';

const ROLL_DURATION = 500;

export class DiceEngine {
  private rolling = false;

  init(): () => void {
    const offRoll = eventBus.on('dice:roll', () => {
      this.roll();
    });
    return () => {
      offRoll();
    };
  }

  private roll(): void {
    if (this.rolling) return;
    this.rolling = true;
    eventBus.emit('dice:rolling', undefined);
    eventBus.emit('log:add', { message: '🎲 掷出骰子...', type: 'dice' });

    window.setTimeout(() => {
      const value = Math.floor(Math.random() * 6) + 1;
      this.rolling = false;
      eventBus.emit('dice:result', { value });
      eventBus.emit('log:add', { message: `🎲 骰子点数：${value}`, type: 'dice' });
      eventBus.emit('player:move-start', { steps: value });
    }, ROLL_DURATION);
  }
}

export const diceEngine = new DiceEngine();
