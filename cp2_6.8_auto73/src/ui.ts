import type { UserData, ChatMessage, FrameData } from './gallery';

export type ViewMode = 'firstPerson' | 'overhead';

export interface UICallbacks {
  onJoinRoom: (roomCode: string, nickname: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSendMessage: (content: string) => void;
  onFrameWidthChange: (id: string, width: number) => void;
  onFrameRotationChange: (id: string, rotation: number) => void;
  onFrameHeightChange: (id: string, positionY: number) => void;
  onFrameImageChange: (id: string, imageData: string) => void;
  onFrameDelete: (id: string) => void;
  onCloseEditPanel: () => void;
  onPlaceFrame: (wallId: 'north' | 'south' | 'east' | 'west', imageData: string) => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: Partial<UICallbacks> = {};
  private currentViewMode: ViewMode = 'firstPerson';
  private editingFrameId: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setCallbacks(callbacks: Partial<UICallbacks>) {
    this.callbacks = callbacks;
  }

  showJoinDialog() {
    this.container.innerHTML = '';
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(30, 30, 46, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: #2A2A3C;
      border-radius: 16px;
      padding: 40px;
      width: 420px;
      max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;

    card.innerHTML = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 28px; font-weight: 700; color: #A78BFA; margin-bottom: 8px; letter-spacing: 1px;">虚拟画廊</div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.5);">多人协作策展工具</div>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">房间码 (1001-1004)</label>
        <input id="room-input" type="text" maxlength="4" placeholder="输入4位房间码"
          style="width: 100%; padding: 12px 16px; background: #1E1E2E; border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 8px; color: #fff; font-size: 15px; outline: none; box-sizing: border-box; transition: border-color 0.2s;"
          onfocus="this.style.borderColor='#A78BFA'"
          onblur="this.style.borderColor='rgba(167, 139, 250, 0.3)'" />
      </div>
      <div style="margin-bottom: 28px;">
        <label style="display: block; font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">昵称</label>
        <input id="nickname-input" type="text" maxlength="12" placeholder="输入您的昵称"
          style="width: 100%; padding: 12px 16px; background: #1E1E2E; border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 8px; color: #fff; font-size: 15px; outline: none; box-sizing: border-box; transition: border-color 0.2s;"
          onfocus="this.style.borderColor='#A78BFA'"
          onblur="this.style.borderColor='rgba(167, 139, 250, 0.3)'" />
      </div>
      <div id="join-error" style="color: #F97316; font-size: 13px; margin-bottom: 16px; display: none; min-height: 18px;"></div>
      <button id="join-btn"
        style="width: 100%; padding: 14px; background: linear-gradient(135deg, #A78BFA, #8B5CF6); border: none; border-radius: 10px; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);">
        进入画廊
      </button>
    `;

    overlay.appendChild(card);
    this.container.appendChild(overlay);

    const joinBtn = card.querySelector('#join-btn') as HTMLButtonElement;
    const roomInput = card.querySelector('#room-input') as HTMLInputElement;
    const nicknameInput = card.querySelector('#nickname-input') as HTMLInputElement;
    const errorEl = card.querySelector('#join-error') as HTMLElement;

    const clickAnim = (e: Event) => {
      const btn = e.currentTarget as HTMLElement;
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => { btn.style.transform = 'scale(1)'; }, 150);
    };
    joinBtn.addEventListener('click', clickAnim);

    const handleJoin = () => {
      const roomCode = roomInput.value.trim();
      const nickname = nicknameInput.value.trim();
      if (!/^\d{4}$/.test(roomCode)) {
        errorEl.textContent = '请输入4位数字房间码';
        errorEl.style.display = 'block';
        return;
      }
      if (!nickname) {
        errorEl.textContent = '请输入昵称';
        errorEl.style.display = 'block';
        return;
      }
      errorEl.style.display = 'none';
      this.callbacks.onJoinRoom?.(roomCode, nickname);
    };

    joinBtn.addEventListener('click', handleJoin);
    roomInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleJoin(); });
    nicknameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleJoin(); });

    setTimeout(() => roomInput.focus(), 100);
  }

  showJoinError(message: string) {
    const errorEl = document.getElementById('join-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  buildMainUI(roomCode: string, currentNickname: string) {
    this.container.innerHTML = '';

    const userPanel = document.createElement('div');
    userPanel.id = 'user-panel';
    userPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(42, 42, 60, 0.9);
      backdrop-filter: blur(12px);
      border-radius: 12px;
      padding: 14px 18px;
      min-width: 200px;
      border: 1px solid rgba(167, 139, 250, 0.15);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    userPanel.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="font-size: 13px; color: rgba(255,255,255,0.6);">房间 <span style="color: #A78BFA; font-weight: 600;">#${roomCode}</span></div>
        <div id="user-count" style="font-size: 12px; color: rgba(255,255,255,0.5);">0/6 人</div>
      </div>
      <div id="user-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
    `;
    this.container.appendChild(userPanel);

    const viewToggle = document.createElement('div');
    viewToggle.id = 'view-toggle';
    viewToggle.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(42, 42, 60, 0.9);
      backdrop-filter: blur(12px);
      border-radius: 10px;
      padding: 4px;
      display: flex;
      gap: 2px;
      border: 1px solid rgba(167, 139, 250, 0.15);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    viewToggle.innerHTML = `
      <button id="btn-fp" style="padding: 8px 16px; border: none; border-radius: 7px; font-size: 13px; cursor: pointer; transition: all 0.15s; background: #A78BFA; color: #fff; font-weight: 500;">第一人称</button>
      <button id="btn-ov" style="padding: 8px 16px; border: none; border-radius: 7px; font-size: 13px; cursor: pointer; transition: all 0.15s; background: transparent; color: rgba(255,255,255,0.6); font-weight: 500;">俯瞰模式</button>
    `;
    this.container.appendChild(viewToggle);

    const btnFp = viewToggle.querySelector('#btn-fp') as HTMLButtonElement;
    const btnOv = viewToggle.querySelector('#btn-ov') as HTMLButtonElement;
    const setActiveBtn = (mode: ViewMode) => {
      this.currentViewMode = mode;
      if (mode === 'firstPerson') {
        btnFp.style.background = '#A78BFA';
        btnFp.style.color = '#fff';
        btnOv.style.background = 'transparent';
        btnOv.style.color = 'rgba(255,255,255,0.6)';
      } else {
        btnOv.style.background = '#A78BFA';
        btnOv.style.color = '#fff';
        btnFp.style.background = 'transparent';
        btnFp.style.color = 'rgba(255,255,255,0.6)';
      }
    };
    const btnClickAnim = (btn: HTMLButtonElement) => {
      btn.style.transform = 'scale(0.94)';
      setTimeout(() => { btn.style.transform = 'scale(1)'; }, 150);
    };
    btnFp.addEventListener('click', () => {
      btnClickAnim(btnFp);
      setActiveBtn('firstPerson');
      this.callbacks.onViewModeChange?.('firstPerson');
    });
    btnOv.addEventListener('click', () => {
      btnClickAnim(btnOv);
      setActiveBtn('overhead');
      this.callbacks.onViewModeChange?.('overhead');
    });

    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-container';
    chatContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 520px;
      max-width: calc(100vw - 40px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;
    chatContainer.innerHTML = `
      <div id="chat-messages" style="width: 100%; max-height: 180px; overflow-y: auto; padding: 8px 4px; display: flex; flex-direction: column; gap: 8px;"></div>
      <div style="width: 100%; display: flex; gap: 10px; background: rgba(42, 42, 60, 0.9); backdrop-filter: blur(12px); padding: 10px; border-radius: 14px; border: 1px solid rgba(167, 139, 250, 0.15); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
        <input id="chat-input" type="text" maxlength="200" placeholder="发送消息..."
          style="flex: 1; padding: 10px 14px; background: #1E1E2E; border: 1px solid rgba(167, 139, 250, 0.2); border-radius: 9px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s;"
          onfocus="this.style.borderColor='#A78BFA'"
          onblur="this.style.borderColor='rgba(167, 139, 250, 0.2)'" />
        <button id="chat-send" style="padding: 10px 22px; background: linear-gradient(135deg, #A78BFA, #8B5CF6); border: none; border-radius: 9px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.15s;">发送</button>
      </div>
    `;
    this.container.appendChild(chatContainer);

    const chatInput = chatContainer.querySelector('#chat-input') as HTMLInputElement;
    const chatSend = chatContainer.querySelector('#chat-send') as HTMLButtonElement;
    chatSend.addEventListener('click', () => btnClickAnim(chatSend));
    const sendMsg = () => {
      const content = chatInput.value.trim();
      if (content) {
        this.callbacks.onSendMessage?.(content);
        chatInput.value = '';
      }
    };
    chatSend.addEventListener('click', sendMsg);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });

    const hint = document.createElement('div');
    hint.id = 'hint-panel';
    hint.style.cssText = `
      position: absolute;
      bottom: 100px;
      left: 20px;
      background: rgba(42, 42, 60, 0.85);
      backdrop-filter: blur(10px);
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      border: 1px solid rgba(167, 139, 250, 0.1);
      line-height: 1.7;
    `;
    hint.innerHTML = `
      <div style="font-weight: 600; color: #A78BFA; margin-bottom: 6px;">操作提示</div>
      <div id="fp-hints">
        <div>鼠标拖拽: 旋转视角</div>
        <div>WASD: 移动</div>
        <div>点击墙面: 放置画框</div>
        <div>点击画框: 编辑</div>
      </div>
      <div id="ov-hints" style="display: none;">
        <div>鼠标滚轮: 缩放</div>
        <div>右键拖拽: 平移</div>
        <div>左键拖拽: 旋转</div>
        <div>点击墙面: 放置画框</div>
      </div>
    `;
    this.container.appendChild(hint);
  }

  updateHintsForView(mode: ViewMode) {
    const fp = document.getElementById('fp-hints');
    const ov = document.getElementById('ov-hints');
    if (fp && ov) {
      fp.style.display = mode === 'firstPerson' ? 'block' : 'none';
      ov.style.display = mode === 'overhead' ? 'block' : 'none';
    }
  }

  updateUsers(users: UserData[], currentUserId: string) {
    const list = document.getElementById('user-list');
    const count = document.getElementById('user-count');
    if (count) {
      const online = users.filter(u => u.online).length;
      count.textContent = `${online}/6 人`;
    }
    if (list) {
      list.innerHTML = '';
      users.forEach(user => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; gap: 10px;';
        const isSelf = user.id === currentUserId;
        item.innerHTML = `
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${user.online ? '#22C55E' : '#6B7280'}; box-shadow: ${user.online ? '0 0 6px rgba(34, 197, 94, 0.5)' : 'none'};"></div>
          <div style="font-size: 13px; color: ${isSelf ? '#A78BFA' : 'rgba(255,255,255,0.85)'};">${this.escapeHtml(user.nickname)}${isSelf ? ' (我)' : ''}</div>
        `;
        list.appendChild(item);
      });
    }
  }

  addChatMessage(msg: ChatMessage, isSelf: boolean) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const bubble = document.createElement('div');
    bubble.style.cssText = `
      align-self: ${isSelf ? 'flex-end' : 'flex-start'};
      max-width: 75%;
      background: ${isSelf ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255,255,255,0.08)'};
      border: 1px solid ${isSelf ? 'rgba(167, 139, 250, 0.3)' : 'rgba(255,255,255,0.08)'};
      border-radius: ${isSelf ? '12px 12px 4px 12px' : '12px 12px 12px 4px'};
      padding: 8px 12px;
      animation: fadeInUp 0.3s ease;
    `;
    const time = new Date(msg.timestamp);
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    bubble.innerHTML = `
      <div style="font-size: 11px; color: ${isSelf ? '#A78BFA' : 'rgba(255,255,255,0.5)'}; margin-bottom: 4px;">${this.escapeHtml(msg.nickname)} · ${timeStr}</div>
      <div style="font-size: 13px; color: #fff; word-break: break-word; line-height: 1.5;">${this.escapeHtml(msg.content)}</div>
    `;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  showEditPanel(frame: FrameData) {
    this.editingFrameId = frame.id;
    this.removeEditPanel();

    const overlay = document.createElement('div');
    overlay.id = 'edit-panel-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    `;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.callbacks.onCloseEditPanel?.();
      }
    });

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #2A2A3C;
      border-radius: 16px;
      padding: 28px;
      width: 440px;
      max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(167, 139, 250, 0.15);
    `;
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div style="font-size: 18px; font-weight: 600; color: #fff;">编辑画框</div>
        <button id="edit-close" style="background: none; border: none; color: rgba(255,255,255,0.5); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.15s;">✕</button>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">宽度: <span id="width-val" style="color: #A78BFA;">${frame.width.toFixed(1)}</span> 单位</label>
        <input id="edit-width" type="range" min="1" max="4" step="0.1" value="${frame.width}"
          style="width: 100%; accent-color: #A78BFA;" />
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">旋转角度: <span id="rot-val" style="color: #A78BFA;">${frame.rotation.toFixed(0)}</span>°</label>
        <input id="edit-rotation" type="range" min="-30" max="30" step="1" value="${frame.rotation}"
          style="width: 100%; accent-color: #A78BFA;" />
      </div>
      
      <div style="margin-bottom: 24px;">
        <label style="display: block; font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">垂直高度: <span id="height-val" style="color: #A78BFA;">${frame.positionY.toFixed(1)}</span> 单位</label>
        <input id="edit-height" type="range" min="0.5" max="3" step="0.1" value="${frame.positionY}"
          style="width: 100%; accent-color: #A78BFA;" />
      </div>
      
      <div style="margin-bottom: 24px;">
        <label style="display: block; font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px;">更换图片</label>
        <input id="edit-image" type="file" accept="image/*"
          style="width: 100%; padding: 10px; background: #1E1E2E; border: 1px solid rgba(167, 139, 250, 0.2); border-radius: 8px; color: rgba(255,255,255,0.7); font-size: 13px; cursor: pointer; box-sizing: border-box;" />
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button id="edit-delete" style="flex: 1; padding: 12px; background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.4); border-radius: 10px; color: #F97316; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s;">删除画框</button>
        <button id="edit-done" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #A78BFA, #8B5CF6); border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.15s;">完成</button>
      </div>
    `;

    overlay.appendChild(panel);
    this.container.appendChild(overlay);

    const widthSlider = panel.querySelector('#edit-width') as HTMLInputElement;
    const rotSlider = panel.querySelector('#edit-rotation') as HTMLInputElement;
    const heightSlider = panel.querySelector('#edit-height') as HTMLInputElement;
    const widthVal = panel.querySelector('#width-val') as HTMLElement;
    const rotVal = panel.querySelector('#rot-val') as HTMLElement;
    const heightVal = panel.querySelector('#height-val') as HTMLElement;
    const imageInput = panel.querySelector('#edit-image') as HTMLInputElement;
    const deleteBtn = panel.querySelector('#edit-delete') as HTMLButtonElement;
    const doneBtn = panel.querySelector('#edit-done') as HTMLButtonElement;
    const closeBtn = panel.querySelector('#edit-close') as HTMLButtonElement;

    widthSlider.addEventListener('input', () => {
      const v = parseFloat(widthSlider.value);
      widthVal.textContent = v.toFixed(1);
      this.callbacks.onFrameWidthChange?.(frame.id, v);
    });
    rotSlider.addEventListener('input', () => {
      const v = parseFloat(rotSlider.value);
      rotVal.textContent = v.toFixed(0);
      this.callbacks.onFrameRotationChange?.(frame.id, v);
    });
    heightSlider.addEventListener('input', () => {
      const v = parseFloat(heightSlider.value);
      heightVal.textContent = v.toFixed(1);
      this.callbacks.onFrameHeightChange?.(frame.id, v);
    });
    imageInput.addEventListener('change', () => {
      const file = imageInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.callbacks.onFrameImageChange?.(frame.id, reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    });
    const animBtn = (btn: HTMLButtonElement) => {
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => { btn.style.transform = 'scale(1)'; }, 150);
    };
    deleteBtn.addEventListener('click', () => { animBtn(deleteBtn); this.callbacks.onFrameDelete?.(frame.id); });
    doneBtn.addEventListener('click', () => { animBtn(doneBtn); this.callbacks.onCloseEditPanel?.(); });
    closeBtn.addEventListener('click', () => this.callbacks.onCloseEditPanel?.());
  }

  removeEditPanel() {
    const overlay = document.getElementById('edit-panel-overlay');
    if (overlay) overlay.remove();
    this.editingFrameId = null;
  }

  showImagePicker(wallId: 'north' | 'south' | 'east' | 'west') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.callbacks.onPlaceFrame?.(wallId, reader.result as string);
          document.body.removeChild(input);
        };
        reader.readAsDataURL(file);
      } else {
        document.body.removeChild(input);
      }
    });
    input.click();
  }

  showToast(message: string, type: 'info' | 'error' = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? 'rgba(249, 115, 22, 0.95)' : 'rgba(42, 42, 60, 0.95)'};
      color: #fff;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      z-index: 200;
      animation: fadeInDown 0.3s ease;
      border: 1px solid ${type === 'error' ? 'rgba(249, 115, 22, 0.5)' : 'rgba(167, 139, 250, 0.3)'};
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    `;
    toast.textContent = message;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  hideLoading() {
    const loading = document.getElementById('loading-screen');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => loading.remove(), 600);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeInDown {
    from { opacity: 0; transform: translate(-50%, -10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  #chat-messages::-webkit-scrollbar {
    width: 6px;
  }
  #chat-messages::-webkit-scrollbar-track {
    background: transparent;
  }
  #chat-messages::-webkit-scrollbar-thumb {
    background: rgba(167, 139, 250, 0.3);
    border-radius: 3px;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: #1E1E2E;
    border-radius: 3px;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #A78BFA;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(167, 139, 250, 0.4);
    transition: transform 0.15s;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }
  input[type="file"]::file-selector-button {
    background: rgba(167, 139, 250, 0.2);
    color: #A78BFA;
    border: none;
    padding: 6px 14px;
    border-radius: 6px;
    margin-right: 12px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.15s;
  }
  input[type="file"]::file-selector-button:hover {
    background: rgba(167, 139, 250, 0.35);
  }
`;
document.head.appendChild(style);
