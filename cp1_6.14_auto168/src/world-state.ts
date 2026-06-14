import { eventBus } from './event-bus';
import demoMap from './demo-map.json';

export interface RoomExit {
  room: string;
  locked?: boolean;
  key?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  exits: Record<string, string | RoomExit>;
  items: string[];
}

export interface Item {
  id: string;
  name: string;
  description: string;
  takeable: boolean;
  usableWith?: Record<string, string>;
}

export interface GameMap {
  rooms: Room[];
  items: Item[];
  startRoom: string;
}

export interface GameState {
  currentRoom: string;
  inventory: string[];
  visitedRooms: string[];
  rooms: Room[];
  items: Item[];
}

const DIRECTIONS: Record<string, string> = {
  north: 'north',
  south: 'south',
  east: 'east',
  west: 'west',
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west'
};

class WorldState {
  private map!: GameMap;
  private currentRoomId!: string;
  private inventory: string[] = [];
  private visitedRooms: Set<string> = new Set();
  private roomItemStates: Map<string, string[]> = new Map();
  private exitStates: Map<string, Map<string, boolean>> = new Map();

  loadMap(mapData: GameMap): string {
    this.map = mapData;
    this.currentRoomId = mapData.startRoom;
    this.inventory = [];
    this.visitedRooms = new Set([mapData.startRoom]);

    this.roomItemStates = new Map();
    for (const room of mapData.rooms) {
      this.roomItemStates.set(room.id, [...room.items]);
    }

    this.exitStates = new Map();
    for (const room of mapData.rooms) {
      const exitLockStates = new Map<string, boolean>();
      for (const [direction, exit] of Object.entries(room.exits)) {
        const locked = typeof exit === 'object' && exit.locked === true;
        exitLockStates.set(direction, locked);
      }
      this.exitStates.set(room.id, exitLockStates);
    }

    const room = this.getCurrentRoom();
    return `You awaken in ${room.name}.\n\n${room.description}`;
  }

  getState(): GameState {
    return {
      currentRoom: this.currentRoomId,
      inventory: [...this.inventory],
      visitedRooms: [...this.visitedRooms],
      rooms: this.map.rooms,
      items: this.map.items
    };
  }

  getCurrentRoom(): Room {
    return this.map.rooms.find(r => r.id === this.currentRoomId)!;
  }

  getRoomItems(roomId: string): string[] {
    return this.roomItemStates.get(roomId) || [];
  }

  getItem(itemId: string): Item | undefined {
    return this.map.items.find(i => i.id === itemId);
  }

  movePlayer(direction: string): string {
    const normalizedDir = DIRECTIONS[direction] || direction;
    const room = this.getCurrentRoom();
    const exit = room.exits[normalizedDir];

    if (!exit) {
      return `You can't go ${normalizedDir} from here.`;
    }

    const exitObj = typeof exit === 'string' ? { room: exit, locked: false } : exit;
    const lockStates = this.exitStates.get(this.currentRoomId);
    const isLocked = lockStates?.has(normalizedDir) ? lockStates.get(normalizedDir)! : (exitObj.locked || false);

    if (isLocked) {
      return `The way to the ${normalizedDir} is locked.`;
    }

    this.currentRoomId = exitObj.room;
    this.visitedRooms.add(exitObj.room);

    const newRoom = this.getCurrentRoom();
    const itemsHere = this.getRoomItems(exitObj.room);

    let result = `You move ${normalizedDir}.\n\n`;
    result += `--- ${newRoom.name} ---\n\n`;
    result += newRoom.description;

    if (itemsHere.length > 0) {
      const itemNames = itemsHere.map(id => this.getItem(id)?.name || id).join(', ');
      result += `\n\nYou see: ${itemNames}`;
    }

    eventBus.emit('state:change', this.getState());

    return result;
  }

  lookAround(): string {
    const room = this.getCurrentRoom();
    const itemsHere = this.getRoomItems(this.currentRoomId);

    let result = `--- ${room.name} ---\n\n`;
    result += room.description;

    if (itemsHere.length > 0) {
      const itemNames = itemsHere.map(id => this.getItem(id)?.name || id).join(', ');
      result += `\n\nYou see: ${itemNames}`;
    }

    const exits = Object.keys(room.exits);
    if (exits.length > 0) {
      result += `\n\nExits: ${exits.join(', ')}`;
    }

    return result;
  }

  takeItem(itemName: string): string {
    if (!itemName) {
      return 'Take what?';
    }

    const roomItems = this.getRoomItems(this.currentRoomId);
    const foundItemId = roomItems.find(id => {
      const item = this.getItem(id);
      return item && (item.name.toLowerCase() === itemName.toLowerCase() ||
        item.id.toLowerCase() === itemName.toLowerCase() ||
        item.name.toLowerCase().includes(itemName.toLowerCase()));
    });

    if (!foundItemId) {
      return `There is no "${itemName}" here.`;
    }

    const item = this.getItem(foundItemId)!;

    if (!item.takeable) {
      return `You can't take the ${item.name}.`;
    }

    const items = this.roomItemStates.get(this.currentRoomId)!;
    const idx = items.indexOf(foundItemId);
    if (idx > -1) {
      items.splice(idx, 1);
    }
    this.inventory.push(foundItemId);

    eventBus.emit('state:change', this.getState());

    return `You take the ${item.name}.`;
  }

  dropItem(itemName: string): string {
    if (!itemName) {
      return 'Drop what?';
    }

    const foundItemId = this.inventory.find(id => {
      const item = this.getItem(id);
      return item && (item.name.toLowerCase() === itemName.toLowerCase() ||
        item.id.toLowerCase() === itemName.toLowerCase());
    });

    if (!foundItemId) {
      return `You don't have a "${itemName}".`;
    }

    const item = this.getItem(foundItemId)!;
    const idx = this.inventory.indexOf(foundItemId);
    if (idx > -1) {
      this.inventory.splice(idx, 1);
    }

    const items = this.roomItemStates.get(this.currentRoomId)!;
    items.push(foundItemId);

    eventBus.emit('state:change', this.getState());

    return `You drop the ${item.name}.`;
  }

  useItem(itemName: string, targetName: string): string {
    if (!itemName) {
      return 'Use what?';
    }

    const foundItemId = this.inventory.find(id => {
      const item = this.getItem(id);
      return item && (item.name.toLowerCase() === itemName.toLowerCase() ||
        item.id.toLowerCase() === itemName.toLowerCase() ||
        item.name.toLowerCase().includes(itemName.toLowerCase()));
    });

    if (!foundItemId) {
      return `You don't have a "${itemName}".`;
    }

    const item = this.getItem(foundItemId)!;

    if (targetName) {
      const room = this.getCurrentRoom();
      const exits = Object.entries(room.exits);

      for (const [direction, exit] of exits) {
        const exitObj = typeof exit === 'string' ? { room: exit, key: undefined } : exit;
        if (exitObj.key && exitObj.key === foundItemId) {
          const lockStates = this.exitStates.get(this.currentRoomId)!;
          if (lockStates.get(direction)) {
            lockStates.set(direction, false);
            eventBus.emit('state:change', this.getState());
            return `You use the ${item.name} on the ${direction} door. It unlocks with a satisfying click.`;
          } else {
            return `The ${direction} door is already unlocked.`;
          }
        }
      }

      if (item.usableWith && item.usableWith[targetName]) {
        return item.usableWith[targetName];
      }

      return `You can't use the ${item.name} on that.`;
    }

    if (item.usableWith && Object.keys(item.usableWith).length > 0) {
      return `What do you want to use the ${item.name} on?`;
    }

    return `You examine the ${item.name}. ${item.description}`;
  }

  examineItem(itemName: string): string {
    if (!itemName) {
      return 'Examine what?';
    }

    const roomItems = this.getRoomItems(this.currentRoomId);
    const allItems = [...roomItems, ...this.inventory];

    const foundItemId = allItems.find(id => {
      const item = this.getItem(id);
      return item && (item.name.toLowerCase() === itemName.toLowerCase() ||
        item.id.toLowerCase() === itemName.toLowerCase() ||
        item.name.toLowerCase().includes(itemName.toLowerCase()));
    });

    if (!foundItemId) {
      return `There is no "${itemName}" here.`;
    }

    const item = this.getItem(foundItemId)!;
    return `--- ${item.name} ---\n\n${item.description}`;
  }

  showInventory(): string {
    if (this.inventory.length === 0) {
      return 'You are carrying nothing.';
    }

    const itemNames = this.inventory.map(id => {
      const item = this.getItem(id);
      return `- ${item?.name || id}`;
    }).join('\n');

    return `You are carrying:\n${itemNames}`;
  }

  showHelp(): string {
    return `=== Available Commands ===

Movement:
  north (n), south (s), east (e), west (w)
  go [direction]

Actions:
  look (l) - Look around the room
  take [item] - Pick up an item
  drop [item] - Drop an item
  use [item] on [target] - Use an item
  examine [item] - Look at an item closely
  inventory (i) - Check your inventory
  help (h) - Show this help

Example: use key on door`;
  }

  hasVisitedRoom(roomId: string): boolean {
    return this.visitedRooms.has(roomId);
  }
}

export const worldState = new WorldState();

export const initializeGame = (): string => {
  const message = worldState.loadMap(demoMap as GameMap);
  eventBus.emit('state:change', worldState.getState());
  return message;
};
