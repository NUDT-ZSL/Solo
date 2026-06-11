import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { RoomListItem, RoomState, ChatMessage } from '../../../shared/types.js';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { Users, Plus, LogOut, Send, Wifi, WifiOff, Crown, Play } from 'lucide-react';

interface LobbyProps {
  socket: Socket | null;
  rooms: RoomListItem[];
  nickname: string;
  roomState: RoomState | null;
  chatMessages: ChatMessage[];
  isConnected: boolean;
}

export default function Lobby({ socket, rooms, nickname, roomState, chatMessages, isConnected }: LobbyProps) {
  const setNickname = useGameStore((s) => s.setNickname);
  const navigate = useNavigate();

  const [nicknameInput, setNicknameInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isInWaitingRoom = roomState?.room.status === 'waiting';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (roomState?.room.status === 'playing') {
      navigate(`/game/${roomState.room.id}`);
    }
  }, [roomState?.room.status, roomState?.room.id, navigate]);

  const handleSetNickname = useCallback(() => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    setNickname(trimmed);
  }, [nicknameInput, setNickname]);

  const handleNicknameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSetNickname();
  }, [handleSetNickname]);

  const handleCreateRoom = useCallback(() => {
    const name = newRoomName.trim();
    if (!name || !socket) return;
    socket.emit('CREATE_ROOM', { nickname, roomName: name });
    setNewRoomName('');
    setShowCreateForm(false);
  }, [newRoomName, socket, nickname]);

  const handleCreateRoomKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateRoom();
  }, [handleCreateRoom]);

  const handleJoinRoom = useCallback((roomId: string) => {
    if (!socket) return;
    socket.emit('JOIN_ROOM', { roomId, nickname });
  }, [socket, nickname]);

  const handleStartGame = useCallback(() => {
    if (!socket) return;
    socket.emit('START_GAME');
  }, [socket]);

  const handleSendChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg || !socket) return;
    socket.emit('CHAT_MESSAGE', { message: msg });
    setChatInput('');
  }, [chatInput, socket]);

  const handleChatKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendChat();
  }, [handleSendChat]);

  if (!nickname) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-2">
              QuizArena
            </h1>
            <p className="text-gray-500 text-sm">实时多人知识问答对战</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={handleNicknameKeyDown}
              placeholder="输入你的昵称"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 ease-out text-center text-lg"
              maxLength={16}
            />

            <button
              onClick={handleSetNickname}
              disabled={!nicknameInput.trim()}
              className="w-full py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              进入大厅
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-400">
            {isConnected ? (
              <>
                <Wifi size={14} className="text-green-500" />
                <span className="text-green-500">已连接</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-red-400" />
                <span className="text-red-400">未连接</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2]">
      <header className="bg-gradient-to-r from-[#667eea] to-[#764ba2] px-4 sm:px-6 py-4 flex items-center justify-between shadow-lg">
        <h1 className="text-white text-xl font-bold">QuizArena 大厅</h1>
        <div className="flex items-center gap-3">
          <span className="text-white/80 text-sm hidden sm:inline">{nickname}</span>
          <div className="flex items-center gap-1">
            {isConnected ? (
              <Wifi size={16} className="text-green-400" />
            ) : (
              <WifiOff size={16} className="text-red-300" />
            )}
            <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-300'}`}>
              {isConnected ? '在线' : '离线'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Users size={20} className="text-indigo-500" />
                房间列表
              </h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg"
              >
                <Plus size={16} />
                创建房间
              </button>
            </div>

            {showCreateForm && (
              <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={handleCreateRoomKeyDown}
                  placeholder="房间名称"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 ease-out text-sm"
                  maxLength={20}
                />
                <button
                  onClick={handleCreateRoom}
                  disabled={!newRoomName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                >
                  创建
                </button>
              </div>
            )}

            {rooms.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无房间，快来创建一个吧！</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl transition-all duration-300 ease-out hover:shadow-md"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="font-semibold text-gray-800 truncate">{room.name}</div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {room.players}/{room.maxPlayers}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          room.status === 'waiting'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {room.status === 'waiting' ? '等待中' : '游戏中'}
                        </span>
                      </div>
                    </div>
                    {room.status === 'waiting' && (
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg whitespace-nowrap"
                      >
                        加入
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {isInWaitingRoom && roomState && (
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">{roomState.room.name}</h2>
                <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                  等待中
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">玩家列表</p>
                <div className="space-y-2">
                  {roomState.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                      {player.id === roomState.room.hostId && (
                        <Crown size={16} className="text-yellow-500 flex-shrink-0" />
                      )}
                      <span className="font-medium text-gray-800 text-sm">{player.nickname}</span>
                      {player.id === roomState.room.hostId && (
                        <span className="text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">房主</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {roomState.room.hostId === socket?.id ? (
                <button
                  onClick={handleStartGame}
                  disabled={roomState.players.length < 2}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Play size={18} />
                  开始游戏
                </button>
              ) : (
                <p className="text-center text-gray-500 text-sm py-3">
                  等待其他玩家加入...
                </p>
              )}

              {roomState.players.length < 2 && roomState.room.hostId === socket?.id && (
                <p className="text-center text-gray-400 text-xs mt-2">至少需要2名玩家才能开始</p>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 flex flex-col flex-1 min-h-[300px]">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Send size={18} className="text-indigo-500" />
              聊天
            </h2>

            <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1">
              {chatMessages.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">暂无消息</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-bold text-indigo-600">{msg.nickname}</span>
                    <span className="text-gray-400 text-xs ml-2">
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-gray-700 ml-2">{msg.message}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="输入消息..."
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 ease-out text-sm"
                maxLength={200}
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim()}
                className="p-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
