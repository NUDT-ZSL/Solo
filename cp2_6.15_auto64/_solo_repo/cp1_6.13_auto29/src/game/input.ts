import { InputState } from './engine';

const PLAYER1_KEYS = {
  accelerate: ['KeyW', 'w', 'W'],
  brake: ['KeyS', 's', 'S'],
  left: ['KeyA', 'a', 'A'],
  right: ['KeyD', 'd', 'D']
};

const PLAYER2_KEYS = {
  accelerate: ['ArrowUp'],
  brake: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight']
};

export class InputManager {
  private player1State: InputState;
  private player2State: InputState;
  private pressedKeys: Set<string>;
  
  constructor() {
    this.player1State = {
      accelerate: false,
      brake: false,
      left: false,
      right: false
    };
    
    this.player2State = {
      accelerate: false,
      brake: false,
      left: false,
      right: false
    };
    
    this.pressedKeys = new Set();
  }
  
  getInput(playerIndex: number): InputState {
    return playerIndex === 0 ? { ...this.player1State } : { ...this.player2State };
  }
  
  handleKeyDown(code: string) {
    this.pressedKeys.add(code);
    this.updateStates();
  }
  
  handleKeyUp(code: string) {
    this.pressedKeys.delete(code);
    this.updateStates();
  }
  
  private updateStates() {
    this.player1State.accelerate = this.isAnyPressed(PLAYER1_KEYS.accelerate);
    this.player1State.brake = this.isAnyPressed(PLAYER1_KEYS.brake);
    this.player1State.left = this.isAnyPressed(PLAYER1_KEYS.left);
    this.player1State.right = this.isAnyPressed(PLAYER1_KEYS.right);
    
    this.player2State.accelerate = this.isAnyPressed(PLAYER2_KEYS.accelerate);
    this.player2State.brake = this.isAnyPressed(PLAYER2_KEYS.brake);
    this.player2State.left = this.isAnyPressed(PLAYER2_KEYS.left);
    this.player2State.right = this.isAnyPressed(PLAYER2_KEYS.right);
  }
  
  private isAnyPressed(keys: string[]): boolean {
    for (const key of keys) {
      if (this.pressedKeys.has(key)) {
        return true;
      }
    }
    return false;
  }
  
  isPlayer2Active(): boolean {
    return this.player2State.accelerate || this.player2State.brake || 
           this.player2State.left || this.player2State.right;
  }
  
  reset() {
    this.pressedKeys.clear();
    this.updateStates();
  }
}
