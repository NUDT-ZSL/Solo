import { socketManager, RoomInfo, PlayerInfo, ChatMessage, GameStats } from '../network/socketManager.js';

export class RoomPanel {
  private nicknameInput: HTMLInputElement;
  private createRoomBtn: HTMLButtonElement;
  private refreshRoomsBtn: HTMLButtonElement;
  private roomListEl: HTMLDivElement;
  private playerListEl: HTMLDivElement;
  private roomActionsEl: HTMLDivElement;
  private startGameBtn: HTMLButtonElement;
  private leaveRoomBtn: HTMLButtonElement;
  private chatPanelEl: HTMLDivElement;
  private chatMessagesEl: HTMLDivElement;
  private chatInputEl: HTMLInputElement;
  private sendChatBtn: HTMLButtonElement;
  private gameStatusEl: HTMLDivElement;
  private statsOverlayEl: HTMLDivElement;
  private statsBodyEl: HTMLTableSectionElement;
  private playAgainBtn: HTMLButtonElement;
  private backLobbyBtn: HTMLButtonElement;

  private currentRooms: RoomInfo[] = [];
  private currentPlayers: PlayerInfo[] = [];
  private selectedRoomId: string | null = null;
  private inRoom: boolean = false;

  constructor() {
    this.nicknameInput = document.getElementById('nickname-input') as HTMLInputElement;
    this.createRoomBtn = document.getElementById('create-room-btn') as HTMLButtonElement;
    this.refreshRoomsBtn = document.getElementById('refresh-rooms-btn') as HTMLButtonElement;
    this.roomListEl = document.getElementById('room-list') as HTMLDivElement;
    this.playerListEl = document.getElementById('player-list') as HTMLDivElement;
    this.roomActionsEl = document.getElementById('room-actions') as HTMLDivElement;
    this.startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
    this.leaveRoomBtn = document.getElementById('leave-room-btn') as HTMLButtonElement;
    this.chatPanelEl = document.getElementById('chat-panel') as HTMLDivElement;
    this.chatMessagesEl = document.getElementById('chat-messages') as HTMLDivElement;
    this.chatInputEl = document.getElementById('chat-input') as HTMLInputElement;
    this.sendChatBtn = document.getElementById('send-chat-btn') as HTMLButtonElement;
    this.gameStatusEl = document.getElementById('game-status') as HTMLDivElement;
    this.statsOverlayEl = document.getElementById('stats-overlay') as HTMLDivElement;
    this.statsBodyEl = document.getElementById('stats-body') as HTMLTableSectionElement;
    this.playAgainBtn = document.getElementById('play-again-btn') as HTMLButtonElement;
    this.backLobbyBtn = document.getElementById('back-lobby-btn') as HTMLButtonElement;

    this.bindEvents();
    this.bindSocketEvents();
    this.setGameStatus('等待加入房间...');
  }

  private bindEvents(): void {
    this.nicknameInput.addEventListener('input', () => {
      socketManager.setNickname(this.nicknameInput.value);
    });

    this.createRoomBtn.addEventListener('click', () => {
      const roomName = prompt('请输入房间名称：', `${this.nicknameInput.value || '玩家'}的房间`);
      if (roomName) {
        const maxPlayersStr = prompt('请输入最大玩家数 (2-4)：', '2');
        const maxPlayers = Math.max(2, Math.min(4, parseInt(maxPlayersStr || '2', 10)));
        socketManager.setNickname(this.nicknameInput.value || '');
        socketManager.createRoom(roomName, maxPlayers);
      }
    });

    this.refreshRoomsBtn.addEventListener('click', () => {
      socketManager.getRooms();
    });

    this.startGameBtn.addEventListener('click', () => {
      socketManager.startGame();
    });

    this.leaveRoomBtn.addEventListener('click', () => {
      socketManager.leaveRoom();
    });

    this.sendChatBtn.addEventListener('click', () => {
      this.sendChat();
    });

    this.chatInputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendChat();
      }
    });

    this.playAgainBtn.addEventListener('click', () => {
      socketManager.playAgain();
      this.hideStatsOverlay();
    });

    this.backLobbyBtn.addEventListener('click', () => {
      socketManager.backToLobby();
      this.hideStatsOverlay();
    });
  }

  private bindSocketEvents(): void {
    socketManager.on('room_list', (data: { rooms: RoomInfo[] }) => {
      this.currentRooms = data.rooms;
      this.renderRoomList();
    });

    socketManager.on('room_created', () => {
      this.onJoinedRoom();
    });

    socketManager.on('room_joined', (data: { roomId: string; players: PlayerInfo[] }) => {
      this.currentPlayers = data.players;
      this.onJoinedRoom();
    });

    socketManager.on('room_left', () => {
      this.onLeftRoom();
    });

    socketManager.on('player_joined', (data: { player: PlayerInfo }) => {
      this.currentPlayers.push(data.player);
      this.renderPlayerList();
    });

    socketManager.on('player_left', (data: { playerId: string }) => {
      this.currentPlayers = this.currentPlayers.filter(p => p.id !== data.playerId);
      this.renderPlayerList();
    });

    socketManager.on('chat_message', (data: { message: ChatMessage }) => {
      this.addChatMessage(data.message);
    });

    socketManager.on('game_start', () => {
      this.setGameStatus('游戏进行中...');
      this.startGameBtn.style.display = 'none';
    });

    socketManager.on('game_over', (data: { stats: GameStats[] }) => {
      this.showStatsOverlay(data.stats);
      this.setGameStatus('游戏结束');
      this.startGameBtn.style.display = 'block';
    });

    socketManager.on('lobby_returned', () => {
      this.setGameStatus('等待开始...');
      this.startGameBtn.style.display = 'block';
    });

    socketManager.on('error', (data: { message: string }) => {
      alert(data.message);
    });
  }

  private onJoinedRoom(): void {
    this.inRoom = true;
    this.roomListEl.style.display = 'none';
    this.createRoomBtn.style.display = 'none';
    this.nicknameInput.disabled = true;
    this.playerListEl.style.display = 'flex';
    this.roomActionsEl.style.display = 'flex';
    this.chatPanelEl.style.display = 'block';
    this.setGameStatus('等待开始...');
    this.renderPlayerList();
    socketManager.getRooms();
  }

  private onLeftRoom(): void {
    this.inRoom = false;
    this.selectedRoomId = null;
    this.currentPlayers = [];
    this.roomListEl.style.display = 'flex';
    this.createRoomBtn.style.display = 'block';
    this.nicknameInput.disabled = false;
    this.playerListEl.style.display = 'none';
    this.roomActionsEl.style.display = 'none';
    this.chatPanelEl.style.display = 'none';
    this.setGameStatus('等待加入房间...');
    this.chatMessagesEl.innerHTML = '';
    socketManager.getRooms();
  }

  private renderRoomList(): void {
    this.roomListEl.innerHTML = '';

    if (this.currentRooms.length === 0) {
      this.roomListEl.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">暂无房间</div>';
      return;
    }

    for (const room of this.currentRooms) {
      if (room.status === 'playing') continue;

      const roomEl = document.createElement('div');
      roomEl.className = `room-item ${this.selectedRoomId === room.id ? 'selected' : ''}`;
      roomEl.innerHTML = `
        <div>
          <div class="room-name">${this.escapeHtml(room.name)}</div>
          <div class="room-info">${room.players.length}/${room.maxPlayers} 玩家</div>
        </div>
        <div class="room-info">${room.status === 'waiting' ? '等待中' : '游戏中'}</div>
      `;

      roomEl.addEventListener('click', () => {
        if (!this.inRoom) {
          this.selectedRoomId = room.id;
          socketManager.setNickname(this.nicknameInput.value || '');
          socketManager.joinRoom(room.id);
        }
      });

      this.roomListEl.appendChild(roomEl);
    }
  }

  private renderPlayerList(): void {
    this.playerListEl.innerHTML = '';

    const colors = ['#a855f7', '#06b6d4', '#f43f5e', '#84cc16'];

    this.currentPlayers.forEach((player, index) => {
      const playerEl = document.createElement('div');
      playerEl.className = 'player-item';
      playerEl.innerHTML = `
        <div class="player-name">
          <span class="player-dot" style="background: ${colors[index % colors.length]}"></span>
          <span>${this.escapeHtml(player.nickname)}</span>
          ${index === 0 ? '<span style="color: #ffd700; font-size: 11px;">👑</span>' : ''}
        </div>
        <span class="player-status">${player.isReady ? '准备就绪' : '准备中'}</span>
      `;
      this.playerListEl.appendChild(playerEl);
    });

    const isCreator = this.currentPlayers[0]?.id === socketManager.getPlayerId();
    this.startGameBtn.style.display = isCreator ? 'block' : 'none';
  }

  private sendChat(): void {
    const content = this.chatInputEl.value.trim();
    if (content) {
      socketManager.sendChat(content);
      this.chatInputEl.value = '';
    }
  }

  private addChatMessage(message: ChatMessage): void {
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `
      <span class="chat-sender">${this.escapeHtml(message.nickname)}:</span>
      <span class="chat-content">${this.escapeHtml(message.content)}</span>
    `;
    this.chatMessagesEl.appendChild(messageEl);
    this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
  }

  private setGameStatus(status: string): void {
    this.gameStatusEl.textContent = status;
  }

  private showStatsOverlay(stats: GameStats[]): void {
    this.statsBodyEl.innerHTML = '';

    stats.forEach((stat) => {
      const row = document.createElement('tr');
      row.className = `stats-row ${stat.rank === 1 ? 'winner' : ''}`;
      
      let timeStr = '0s';
      if (stat.survivalTime >= 60) {
        const mins = Math.floor(stat.survivalTime / 60);
        const secs = stat.survivalTime % 60;
        timeStr = `${mins}m ${secs}s`;
      } else {
        timeStr = `${stat.survivalTime}s`;
      }

      row.innerHTML = `
        <td class="rank-${stat.rank}">#${stat.rank}</td>
        <td>${this.escapeHtml(stat.nickname)}</td>
        <td>${stat.score}</td>
        <td>${timeStr}</td>
        <td>${stat.killCount}</td>
      `;
      this.statsBodyEl.appendChild(row);
    });

    this.statsOverlayEl.classList.add('active');

    const isCreator = this.currentPlayers[0]?.id === socketManager.getPlayerId();
    this.playAgainBtn.style.display = isCreator ? 'block' : 'none';
  }

  private hideStatsOverlay(): void {
    this.statsOverlayEl.classList.remove('active');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  initialize(): void {
    setTimeout(() => {
      socketManager.getRooms();
    }, 500);
  }
}
