interface Instrument {
  id: string;
  name: string;
  icon: string;
  description: string;
  created_at: string;
}

interface Room {
  id: string;
  name: string;
  max_users: number;
  created_at: string;
}

interface RoomUser {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  instrument: string;
  joined_at: string;
}

let instruments: Instrument[] = [];
let rooms: Room[] = [];
let roomUsers: RoomUser[] = [];

let initialized = false;

const initDatabase = async (): Promise<void> => {
  if (initialized) return;

  instruments = [
    {
      id: 'piano',
      name: '钢琴',
      icon: '🎹',
      description: '88键钢琴，使用多个正弦波叠加模拟音色',
      created_at: new Date().toISOString(),
    },
    {
      id: 'drums',
      name: '架子鼓',
      icon: '🥁',
      description: '6个打击垫，包含底鼓、军鼓、踩镲等',
      created_at: new Date().toISOString(),
    },
    {
      id: 'guitar',
      name: '吉他',
      icon: '🎸',
      description: '6弦吉他，使用三角波模拟音色',
      created_at: new Date().toISOString(),
    },
  ];

  rooms = [
    {
      id: 'default-room',
      name: '默认合奏室',
      max_users: 10,
      created_at: new Date().toISOString(),
    },
  ];

  roomUsers = [];
  initialized = true;
};

const getInstruments = async (): Promise<Instrument[]> => {
  if (!initialized) await initDatabase();
  return [...instruments].sort((a, b) => a.id.localeCompare(b.id));
};

const getRooms = async (): Promise<Room[]> => {
  if (!initialized) await initDatabase();
  return [...rooms].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

const getRoomById = async (id: string): Promise<Room | undefined> => {
  if (!initialized) await initDatabase();
  return rooms.find((r) => r.id === id);
};

const createRoom = async (id: string, name: string, maxUsers: number = 10): Promise<Room> => {
  if (!initialized) await initDatabase();
  const room: Room = {
    id,
    name,
    max_users: maxUsers,
    created_at: new Date().toISOString(),
  };
  rooms.push(room);
  return room;
};

const addRoomUser = async (
  id: string,
  roomId: string,
  userId: string,
  userName: string,
  instrument: string
): Promise<void> => {
  if (!initialized) await initDatabase();
  const existingIndex = roomUsers.findIndex((u) => u.id === id);
  const roomUser: RoomUser = {
    id,
    room_id: roomId,
    user_id: userId,
    user_name: userName,
    instrument,
    joined_at: new Date().toISOString(),
  };
  if (existingIndex >= 0) {
    roomUser.joined_at = roomUsers[existingIndex].joined_at;
    roomUsers[existingIndex] = roomUser;
  } else {
    roomUsers.push(roomUser);
  }
};

const removeRoomUser = async (userId: string, roomId: string): Promise<void> => {
  if (!initialized) await initDatabase();
  roomUsers = roomUsers.filter(
    (u) => !(u.user_id === userId && u.room_id === roomId)
  );
};

const getRoomUsers = async (roomId: string): Promise<any[]> => {
  if (!initialized) await initDatabase();
  return roomUsers
    .filter((u) => u.room_id === roomId)
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
    .map((u) => ({
      id: u.user_id,
      name: u.user_name,
      instrument: u.instrument,
    }));
};

export {
  initDatabase,
  getInstruments,
  getRooms,
  getRoomById,
  createRoom,
  addRoomUser,
  removeRoomUser,
  getRoomUsers,
};
