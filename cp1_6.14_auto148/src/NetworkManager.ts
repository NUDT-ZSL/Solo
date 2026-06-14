import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { PhysicsState } from './PhysicsEngine';

export interface OpponentState extends PhysicsState {
  id: string;
  name: string;
  color: string;
  lastUpdate: number;
  isLocal?: boolean;
}

const AI_COLORS = ['#FF6B35', '#9B59B6', '#2ECC71'];
const AI_NAMES = ['Orange', 'Purple', 'Green'];

export class NetworkManager extends EventEmitter {
  private opponents: Map<string, OpponentState> = new Map();
  private clientId: string;
  private ws: WebSocket | null = null;
  private sendInterval: ReturnType<typeof setInterval> | null = null;
  private lastSentState: PhysicsState | null = null;
  private isConnected: boolean = false;
  private aiEngines: Array<{
    id: string;
    name: string;
    color: string;
    x: number;
    y: number;
    angle: number;
    speed: number;
    lap: number;
    lapStartTime: number;
    checkpointPassed: boolean;
    bestLapTime: number | null;
    waypointIndex: number;
    offsetX: number;
    offsetY: number;
  }> = [];

  private readonly SEND_INTERVAL = 50;
  private readonly MAX_OPPONENTS = 3;

  constructor() {
    super();
    this.clientId = uuidv4();
  }

  getClientId(): string {
    return this.clientId;
  }

  connect(): void {
    if (this.isConnected) return;

    try {
      this.ws = new WebSocket('ws://localhost:3000');

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('Connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state' && data.clientId !== this.clientId) {
            this.handleOpponentState(data.state, data.clientId, data.name || 'Remote', data.color || '#00bfff');
          }
        } catch (e) {
          console.warn('Failed to parse network message:', e);
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.startLocalAIMode();
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.startLocalAIMode();
      };
    } catch (e) {
      this.startLocalAIMode();
    }

    this.startSendLoop();
  }

  disconnect(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.opponents.clear();
    this.aiEngines = [];
  }

  private startSendLoop(): void {
    if (this.sendInterval) clearInterval(this.sendInterval);

    this.sendInterval = setInterval(() => {
      if (this.lastSentState) {
        this.sendState(this.lastSentState);
      }
    }, this.SEND_INTERVAL);
  }

  private startLocalAIMode(): void {
    if (this.aiEngines.length > 0) return;

    for (let i = 0; i < this.MAX_OPPONENTS; i++) {
      this.aiEngines.push({
        id: `ai-${i}`,
        name: AI_NAMES[i],
        color: AI_COLORS[i],
        x: 400 + (i - 1) * 30,
        y: 130 + i * 8,
        angle: 0,
        speed: 0,
        lap: 1,
        lapStartTime: performance.now(),
        checkpointPassed: false,
        bestLapTime: null,
        waypointIndex: 0,
        offsetX: (Math.random() - 0.5) * 40,
        offsetY: (Math.random() - 0.5) * 20,
      });
    }
  }

  sendState(state: PhysicsState): void {
    this.lastSentState = state;

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'state',
        clientId: this.clientId,
        name: 'Player',
        color: '#FF4444',
        state: {
          x: state.x,
          y: state.y,
          angle: state.angle,
          speed: state.speed,
          speedX: state.speedX,
          speedY: state.speedY,
          driftAngle: state.driftAngle,
          lateralSpeed: state.lateralSpeed,
          isDrifting: state.isDrifting,
          lap: state.lap,
          totalLaps: state.totalLaps,
        },
        timestamp: Date.now(),
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleOpponentState(state: PhysicsState, id: string, name: string, color: string): void {
    const existing = this.opponents.get(id);
    const opponent: OpponentState = {
      ...(existing || ({} as OpponentState)),
      ...state,
      id,
      name,
      color,
      lastUpdate: Date.now(),
    };

    this.opponents.set(id, opponent);
    this.emit('OpponentUpdate', this.getOpponents());
  }

  getOpponents(): OpponentState[] {
    return Array.from(this.opponents.values()).filter(
      (o) => Date.now() - o.lastUpdate < 5000
    );
  }

  updateAI(deltaTime: number, playerState: PhysicsState): void {
    if (this.aiEngines.length === 0) return;

    const dt = deltaTime / 1000;

    for (let i = 0; i < this.aiEngines.length; i++) {
      const ai = this.aiEngines[i];

      const targetAngle = ai.waypointIndex * 0.2;
      const targetX = 400 + Math.cos(targetAngle) * (250 + ai.offsetX);
      const targetY = 300 + Math.sin(targetAngle) * (170 + ai.offsetY);

      const dx = targetX - ai.x;
      const dy = targetY - ai.y;
      const distToTarget = Math.sqrt(dx * dx + dy * dy);

      if (distToTarget < 30) {
        ai.waypointIndex = (ai.waypointIndex + 1) % 32;
      }

      const desiredAngle = Math.atan2(dy, dx);
      let angleDiff = desiredAngle - ai.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const steerAmount = Math.max(-0.1, Math.min(0.1, angleDiff * 0.5));
      ai.angle += steerAmount * Math.min(ai.speed / 15 + 0.3, 1);

      const baseSpeed = 35 + Math.random() * 10;
      const targetSpeed = Math.abs(angleDiff) < 0.3 ? baseSpeed : baseSpeed * 0.6;
      const accel = (targetSpeed - ai.speed) * 0.05;
      ai.speed += accel;
      ai.speed = Math.max(0, Math.min(55, ai.speed));

      ai.x += Math.cos(ai.angle) * ai.speed * dt * 10;
      ai.y += Math.sin(ai.angle) * ai.speed * dt * 10;

      const cx = ai.x - 400;
      const cy = ai.y - 300;
      const curAngle = Math.atan2(cy, cx);
      const normalizedR = Math.sqrt(
        (cx * cx) / (300 * 300) + (cy * cy) / (220 * 220)
      );
      const innerR = Math.sqrt(
        (cx * cx) / (200 * 200) + (cy * cy) / (120 * 120)
      );

      if (normalizedR > 1.0) {
        ai.x = 400 + 300 * Math.cos(curAngle) * 0.97;
        ai.y = 300 + 220 * Math.sin(curAngle) * 0.97;
        ai.speed *= 0.85;
      } else if (innerR < 1.0) {
        ai.x = 400 + 200 * Math.cos(curAngle) * 1.03;
        ai.y = 300 + 120 * Math.sin(curAngle) * 1.03;
        ai.speed *= 0.85;
      }

      const trackDy = ai.y - 300;
      const trackDx = ai.x - 400;
      const isAtStart = Math.abs(trackDx) < 40 && trackDy < 0;

      if (trackDy > -50 && trackDy < 0 && Math.abs(trackDx) < 50) {
        ai.checkpointPassed = true;
      }

      if (isAtStart && ai.checkpointPassed && ai.speed > 0) {
        const now = performance.now();
        const lapTime = now - ai.lapStartTime;
        if (ai.lap > 1 || lapTime > 3000) {
          if (ai.bestLapTime === null || lapTime < ai.bestLapTime) {
            ai.bestLapTime = lapTime;
          }
          ai.lap++;
          ai.lapStartTime = now;
          ai.checkpointPassed = false;
        }
      }

      const state: OpponentState = {
        x: ai.x,
        y: ai.y,
        angle: ai.angle,
        speed: ai.speed,
        speedX: Math.cos(ai.angle) * ai.speed,
        speedY: Math.sin(ai.angle) * ai.speed,
        driftAngle: 0,
        lateralSpeed: 0,
        isDrifting: false,
        lap: ai.lap,
        totalLaps: playerState.totalLaps,
        lapStartTime: ai.lapStartTime,
        bestLapTime: ai.bestLapTime,
        lastLapTime: null,
        totalTime: 0,
        checkpointPassed: ai.checkpointPassed,
        id: ai.id,
        name: ai.name,
        color: ai.color,
        lastUpdate: Date.now(),
        isLocal: true,
      };

      this.opponents.set(ai.id, state);
    }

    this.emit('OpponentUpdate', this.getOpponents());
  }
}
