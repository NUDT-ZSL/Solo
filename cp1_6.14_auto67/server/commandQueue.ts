export type GameAction =
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'MOVE_FORWARD'
  | 'MOVE_BACKWARD'
  | 'SKILL_FIREBALL'
  | 'SKILL_ICE'
  | 'SKILL_SHIELD'
  | 'STORY_A'
  | 'STORY_B'
  | 'STORY_C';

export interface DanmakuCommand {
  id: string;
  text: string;
  action: GameAction | null;
  timestamp: number;
  viewerId: string;
}

export interface VoteResult {
  move: Record<string, number>;
  skill: Record<string, number>;
  story: Record<string, number>;
  totalCommands: number;
}

const BUFFER_SIZE = 50;

export class CommandQueue {
  private buffer: DanmakuCommand[] = [];
  private head = 0;
  private tail = 0;
  private count = 0;
  private allCommands: DanmakuCommand[] = [];

  pushCommand(command: Omit<DanmakuCommand, 'id'>): DanmakuCommand {
    const fullCommand: DanmakuCommand = {
      ...command,
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    if (this.count < BUFFER_SIZE) {
      this.buffer[this.tail] = fullCommand;
      this.tail = (this.tail + 1) % BUFFER_SIZE;
      this.count++;
    } else {
      this.buffer[this.tail] = fullCommand;
      this.tail = (this.tail + 1) % BUFFER_SIZE;
      this.head = (this.head + 1) % BUFFER_SIZE;
    }

    this.allCommands.push(fullCommand);
    return fullCommand;
  }

  getRecentCommands(limit: number = 10): DanmakuCommand[] {
    const result: DanmakuCommand[] = [];
    const len = Math.min(limit, this.count);
    for (let i = 0; i < len; i++) {
      const idx = ((this.tail - 1 - i) % BUFFER_SIZE + BUFFER_SIZE) % BUFFER_SIZE;
      result.push(this.buffer[idx]);
    }
    return result;
  }

  getAggregatedVote(): VoteResult {
    const move: Record<string, number> = { left: 0, right: 0, forward: 0, backward: 0 };
    const skill: Record<string, number> = { fireball: 0, ice: 0, shield: 0 };
    const story: Record<string, number> = { A: 0, B: 0, C: 0 };

    for (let i = 0; i < this.count; i++) {
      const idx = (this.head + i) % BUFFER_SIZE;
      const cmd = this.buffer[idx];
      if (!cmd || !cmd.action) continue;

      switch (cmd.action) {
        case 'MOVE_LEFT': move.left++; break;
        case 'MOVE_RIGHT': move.right++; break;
        case 'MOVE_FORWARD': move.forward++; break;
        case 'MOVE_BACKWARD': move.backward++; break;
        case 'SKILL_FIREBALL': skill.fireball++; break;
        case 'SKILL_ICE': skill.ice++; break;
        case 'SKILL_SHIELD': skill.shield++; break;
        case 'STORY_A': story.A++; break;
        case 'STORY_B': story.B++; break;
        case 'STORY_C': story.C++; break;
      }
    }

    return { move, skill, story, totalCommands: this.allCommands.length };
  }

  getTotalCount(): number {
    return this.allCommands.length;
  }

  clear(): void {
    this.buffer = [];
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    this.allCommands = [];
  }
}
