import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import type {
  Player,
  Item,
  Clue,
  RoomState,
  ChatMessage,
  Recipe,
  AreaType
} from '../shared/types';
import { AREAS } from '../shared/types';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const INITIAL_ITEMS: Item[] = [
  { id: 'broken-tablet-1', name: '残缺石板(左)', icon: '📜', description: '刻有古老象形文字的石板左半部分' },
  { id: 'broken-tablet-2', name: '残缺石板(右)', icon: '📜', description: '刻有古老象形文字的石板右半部分' },
  { id: 'cinnabar', name: '朱砂颜料', icon: '🔴', description: '鲜艳的红色颜料，古人用来书写重要铭文' },
  { id: 'feather', name: '鹰羽笔', icon: '🪶', description: '用鹰的羽毛制成的神圣书写工具' },
  { id: 'golden-key', name: '金钥匙', icon: '🗝️', description: '闪闪发光的金色钥匙，似乎能打开某扇门' },
  { id: 'amulet', name: '护身符', icon: '🔱', description: '刻有荷鲁斯之眼的护身符，据说能驱邪避凶' },
  { id: 'torch', name: '火把', icon: '🔥', description: '燃烧着的古老火把，照亮黑暗的通道' },
  { id: 'scarab', name: '圣甲虫', icon: '🪲', description: '象征重生的黄金圣甲虫雕像' },
  { id: 'ankh', name: '生命之符', icon: '☥', description: '代表永恒生命的安卡十字架' },
  { id: 'scroll', name: '古老卷轴', icon: '📃', description: '记载着神秘咒语的羊皮卷轴' }
];

const RECIPES: Recipe[] = [
  {
    inputs: ['broken-tablet-1', 'broken-tablet-2'],
    output: { id: 'complete-tablet', name: '完整铭文石板', icon: '📜', description: '拼合后的完整石板，上面有可解读的铭文' },
    progressIncrement: 1
  },
  {
    inputs: ['complete-tablet', 'cinnabar'],
    output: { id: 'red-inscription', name: '朱砂铭文', icon: '📜', description: '用朱砂描红的铭文，文字开始发光' },
    progressIncrement: 1
  },
  {
    inputs: ['amulet', 'scarab'],
    output: { id: 'pharaoh-seal', name: '法老之印', icon: '💍', description: '结合护身符与圣甲虫力量的法老印章' },
    progressIncrement: 1
  },
  {
    inputs: ['red-inscription', 'feather'],
    output: { id: 'decoded-text', name: '解码铭文', icon: '✨', description: '借助鹰羽笔解读出的真正含义' },
    progressIncrement: 1
  },
  {
    inputs: ['golden-key', 'pharaoh-seal'],
    output: { id: 'master-key', name: '主宰之钥', icon: '🔑', description: '融合金钥匙与法老之印的终极钥匙' },
    progressIncrement: 1
  },
  {
    inputs: ['master-key', 'ankh'],
    output: { id: 'exit-key', name: '解脱之钥', icon: '🌟', description: '能打开最终出口的神圣钥匙' },
    progressIncrement: 1
  }
];

const TOTAL_PROGRESS = RECIPES.length;

function createInitialClues(): Clue[] {
  return [
    {
      id: 'clue-foyer-1',
      area: 'foyer',
      title: '石碑铭文',
      content: '"欲入圣境，先寻二石。合二为一，朱砂显灵。" —— 墙上的古老铭文似乎暗示着什么。',
      mediaType: 'text',
      position: { x: 20, y: 30 },
      discovered: false,
      linkedItemId: 'broken-tablet-1'
    },
    {
      id: 'clue-foyer-2',
      area: 'foyer',
      title: '破损祭坛',
      content: '祭坛上散落着石板碎片，似乎可以拼凑起来。旁边有一小罐红色颜料。',
      mediaType: 'text',
      position: { x: 60, y: 50 },
      discovered: false,
      linkedItemId: 'broken-tablet-2'
    },
    {
      id: 'clue-foyer-3',
      area: 'foyer',
      title: '壁画角落',
      content: '壁画的角落画着一只展开翅膀的鹰，鹰爪中握着什么东西...',
      mediaType: 'image',
      mediaData: '鹰羽笔的画像',
      position: { x: 80, y: 25 },
      discovered: false,
      linkedItemId: 'feather'
    },
    {
      id: 'clue-foyer-4',
      area: 'foyer',
      title: '朱砂罐',
      content: '一个古老的陶罐，里面装着鲜艳的朱砂颜料，这是古代书写神圣文字的材料。',
      mediaType: 'text',
      position: { x: 40, y: 70 },
      discovered: false,
      linkedItemId: 'cinnabar'
    },
    {
      id: 'clue-tomb-1',
      area: 'tomb',
      title: '石棺浮雕',
      content: '石棺上雕刻着圣甲虫的图案，传说圣甲虫象征着重生与永恒。旁边有一个护身符形状的凹槽。',
      mediaType: 'text',
      position: { x: 50, y: 40 },
      discovered: false,
      linkedItemId: 'scarab'
    },
    {
      id: 'clue-tomb-2',
      area: 'tomb',
      title: '守卫雕像',
      content: '两尊阿努比斯雕像守护着通道，其中一尊的手中握着一把金光闪闪的钥匙。',
      mediaType: 'text',
      position: { x: 15, y: 45 },
      discovered: false,
      linkedItemId: 'golden-key'
    },
    {
      id: 'clue-tomb-3',
      area: 'tomb',
      title: '荷鲁斯之眼',
      content: '墙壁上镶嵌着一枚荷鲁斯之眼护身符，据说佩戴它的人将受到神明的庇佑。',
      mediaType: 'image',
      mediaData: '荷鲁斯之眼护身符图像',
      position: { x: 75, y: 60 },
      discovered: false,
      linkedItemId: 'amulet'
    },
    {
      id: 'clue-tomb-4',
      area: 'tomb',
      title: '火把架',
      content: '墙壁上的火把还在燃烧，散发着温暖的光芒。可以拿下来照亮黑暗的地方。',
      mediaType: 'text',
      position: { x: 30, y: 25 },
      discovered: false,
      linkedItemId: 'torch'
    },
    {
      id: 'clue-tomb-5',
      area: 'tomb',
      title: '壁画密语',
      content: '墓室壁画上用象形文字写着："生命与印章结合，方可开启永恒之门。"',
      mediaType: 'text',
      position: { x: 85, y: 30 },
      discovered: false
    },
    {
      id: 'clue-treasure-1',
      area: 'treasure',
      title: '生命之符',
      content: '宝藏中央悬浮着一枚安卡十字架，这是代表永恒生命的神圣符号。',
      mediaType: 'image',
      mediaData: '安卡十字架发光图像',
      position: { x: 50, y: 50 },
      discovered: false,
      linkedItemId: 'ankh'
    },
    {
      id: 'clue-treasure-2',
      area: 'treasure',
      title: '古老卷轴',
      content: '一卷保存完好的羊皮卷轴，上面用神秘的文字记载着最终解脱的方法。',
      mediaType: 'text',
      position: { x: 25, y: 35 },
      discovered: false,
      linkedItemId: 'scroll'
    },
    {
      id: 'clue-treasure-3',
      area: 'treasure',
      title: '最终石门',
      content: '通往外界的石门就在眼前！门上有一个精致的钥匙孔，似乎需要特殊的钥匙才能打开。',
      mediaType: 'text',
      position: { x: 80, y: 50 },
      discovered: false
    }
  ];
}

const rooms = new Map<string, RoomState>();
const playerToRoom = new Map<string, string>();
const GAME_DURATION = 60 * 60;

function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createRoom(roomId: string): RoomState {
  return {
    roomId,
    players: [],
    status: 'waiting',
    items: [],
    clues: createInitialClues(),
    progress: 0,
    totalProgress: TOTAL_PROGRESS,
    currentArea: 'foyer',
    timeLeft: GAME_DURATION,
    startedAt: null,
    messages: [],
    unlockedAreas: ['foyer']
  };
}

function getPublicRooms() {
  return Array.from(rooms.values()).map((r) => ({
    roomId: r.roomId,
    playerCount: r.players.length,
    maxPlayers: 4,
    status: r.status
  }));
}

function broadcastRoomUpdate(roomId: string) {
  const room = rooms.get(roomId);
  if (room) {
    io.to(roomId).emit('room-state', room);
  }
}

function broadcastRoomsList() {
  io.emit('rooms-list', getPublicRooms());
}

function findRecipe(itemIds: string[]): Recipe | null {
  const sorted = [...itemIds].sort();
  for (const recipe of RECIPES) {
    const recipeSorted = [...recipe.inputs].sort();
    if (sorted.length === recipeSorted.length && sorted.every((id, i) => id === recipeSorted[i])) {
      return recipe;
    }
  }
  return null;
}

const timers = new Map<string, NodeJS.Timeout>();

function startGameTimer(roomId: string) {
  if (timers.has(roomId)) return;
  const timer = setInterval(() => {
    const room = rooms.get(roomId);
    if (!room) {
      clearInterval(timer);
      timers.delete(roomId);
      return;
    }
    if (room.status !== 'playing') {
      clearInterval(timer);
      timers.delete(roomId);
      return;
    }
    room.timeLeft -= 1;
    if (room.timeLeft <= 0) {
      room.status = 'lost';
      room.timeLeft = 0;
      clearInterval(timer);
      timers.delete(roomId);
    }
    broadcastRoomUpdate(roomId);
  }, 1000);
  timers.set(roomId, timer);
}

io.on('connection', (socket) => {
  socket.emit('rooms-list', getPublicRooms());

  socket.on('create-room', (nickname: string, callback) => {
    const roomId = generateRoomId();
    const room = createRoom(roomId);
    const player: Player = {
      id: socket.id,
      nickname,
      isAdmin: true
    };
    room.players.push(player);
    rooms.set(roomId, room);
    playerToRoom.set(socket.id, roomId);
    socket.join(roomId);
    callback({ success: true, roomId, player });
    broadcastRoomUpdate(roomId);
    broadcastRoomsList();
  });

  socket.on('join-room', (roomId: string, nickname: string, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback({ success: false, error: '房间不存在' });
      return;
    }
    if (room.players.length >= 4) {
      callback({ success: false, error: '房间已满' });
      return;
    }
    if (room.status === 'playing') {
      callback({ success: false, error: '游戏已开始，无法加入' });
      return;
    }
    const player: Player = {
      id: socket.id,
      nickname,
      isAdmin: false
    };
    room.players.push(player);
    playerToRoom.set(socket.id, roomId);
    socket.join(roomId);
    callback({ success: true, roomId, player });
    broadcastRoomUpdate(roomId);
    broadcastRoomsList();
  });

  socket.on('start-game', () => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player || !player.isAdmin) return;
    if (room.players.length < 2) return;
    room.status = 'playing';
    room.startedAt = Date.now();
    room.timeLeft = GAME_DURATION;
    broadcastRoomUpdate(roomId);
    broadcastRoomsList();
    startGameTimer(roomId);
  });

  socket.on('switch-area', (area: AreaType) => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;
    if (!room.unlockedAreas.includes(area)) return;
    room.currentArea = area;
    broadcastRoomUpdate(roomId);
  });

  socket.on('discover-clue', (clueId: string) => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;
    const clue = room.clues.find((c) => c.id === clueId);
    if (!clue || clue.discovered) return;
    clue.discovered = true;
    if (clue.linkedItemId) {
      const item = INITIAL_ITEMS.find((i) => i.id === clue.linkedItemId);
      if (item && !room.items.find((it) => it.id === item.id)) {
        if (room.items.length < 10) {
          room.items.push(item);
        }
      }
    }
    if (room.progress >= 2 && !room.unlockedAreas.includes('tomb')) {
      room.unlockedAreas.push('tomb');
    }
    if (room.progress >= 4 && !room.unlockedAreas.includes('treasure')) {
      room.unlockedAreas.push('treasure');
    }
    broadcastRoomUpdate(roomId);
  });

  socket.on('combine-items', (itemIds: string[]) => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;
    const recipe = findRecipe(itemIds);
    if (!recipe) {
      io.to(socket.id).emit('combine-failed', { items: itemIds });
      return;
    }
    room.items = room.items.filter((item) => !itemIds.includes(item.id));
    if (room.items.length < 10) {
      room.items.push(recipe.output);
    }
    room.progress = Math.min(room.progress + recipe.progressIncrement, TOTAL_PROGRESS);
    if (room.progress >= 2 && !room.unlockedAreas.includes('tomb')) {
      room.unlockedAreas.push('tomb');
    }
    if (room.progress >= 4 && !room.unlockedAreas.includes('treasure')) {
      room.unlockedAreas.push('treasure');
    }
    if (recipe.output.id === 'exit-key') {
      room.status = 'won';
      if (timers.has(roomId)) {
        clearInterval(timers.get(roomId)!);
        timers.delete(roomId);
      }
    }
    io.to(roomId).emit('combine-success', {
      inputs: recipe.inputs,
      output: recipe.output,
      progressIncrement: recipe.progressIncrement
    });
    broadcastRoomUpdate(roomId);
  });

  socket.on('send-message', (content: string) => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      playerId: socket.id,
      nickname: player.nickname,
      content,
      timestamp: Date.now()
    };
    room.messages.push(message);
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }
    broadcastRoomUpdate(roomId);
  });

  socket.on('disconnect', () => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== socket.id);
    playerToRoom.delete(socket.id);
    if (room.players.length === 0) {
      if (timers.has(roomId)) {
        clearInterval(timers.get(roomId)!);
        timers.delete(roomId);
      }
      rooms.delete(roomId);
    } else {
      if (!room.players.find((p) => p.isAdmin)) {
        room.players[0].isAdmin = true;
      }
      broadcastRoomUpdate(roomId);
    }
    broadcastRoomsList();
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`沙影谜城服务器运行在端口 ${PORT}`);
});
