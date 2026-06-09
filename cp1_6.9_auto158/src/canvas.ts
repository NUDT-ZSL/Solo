import { MindNode, Connection, User, OpPacket, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './types';

export type ContextMenuType = 'none' | 'edit' | 'delete' | 'color' | 'child';

export interface CanvasHandlers {
  onOp: (op: OpPacket) => void;
  onCursorMove: (x: number, y: number) => void;
  onContextMenu: (nodeId: string | null, x: number, y: number, type: ContextMenuType) => void;
  onStartEdit: (nodeId: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onEditingDone: (nodeId: string, newText: string) => void;
}

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface AnimatingNode { nodeId: string; kind: 'add' | 'delete'; start: number; dur: number; }
interface AnimatingConn { connId: string; kind: 'add'; start: number; dur: number; }
interface FlashingNode { nodeId: string; count: number; nextFlash: number; }

export class MindCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: MindNode[] = [];
  private connections: Connection[] = [];
  private users: User[] = [];
  private handlers: CanvasHandlers;
  private dpr = 1;

  private camera = { x: 0, y: 0, zoom: 1 };
  private targetZoom = 1;
  private targetCenter = { x: 0, y: 0 };

  private dragging: { type: 'node' | 'pan' | 'connect' | 'multi'; nodeId?: string; fromX: number; fromY: number; origX?: number; origY?: number; startX: number; startY: number; selectionStart?: string[]; connectStartId?: string; connectToId?: string; } | null = null;
  private selection: string[] = [];
  private hoverNodeId: string | null = null;
  private editingNodeId: string | null = null;
  private editingInput: HTMLInputElement | null = null;

  private animNodes: AnimatingNode[] = [];
  private animConns: AnimatingConn[] = [];
  private flashingNodes: FlashingNode[] = [];

  private lastMoveTime = Date.now();
  private lastCursorSend = 0;

  private rafId = 0;

  constructor(canvas: HTMLCanvasElement, handlers: CanvasHandlers) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.handlers = handlers;
    this.bindEvents();
    this.resize();
    this.runRenderLoop();
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('dblclick', this.onDblClick);
    this.canvas.removeEventListener('wheel', this.onWheel as any, { passive: false });
    window.removeEventListener('resize', this.resize);
    if (this.editingInput) { this.editingInput.remove(); this.editingInput = null; }
  }

  setData(nodes: MindNode[], connections: Connection[], users: User[]) {
    this.nodes = nodes;
    this.connections = connections;
    this.users = users;
  }

  addNodeAnim(nodeId: string) { this.animNodes.push({ nodeId, kind: 'add', start: performance.now(), dur: 300 }); }
  deleteNodeAnim(nodeId: string) { this.animNodes.push({ nodeId, kind: 'delete', start: performance.now(), dur: 200 }); }
  addConnAnim(connId: string) { this.animConns.push({ connId, kind: 'add', start: performance.now(), dur: 400 }); }
  flashNode(nodeId: string) { this.flashingNodes.push({ nodeId, count: 0, nextFlash: performance.now() + 250 }); }

  setSelection(ids: string[]) { this.selection = ids; this.handlers.onSelectionChange(ids); }
  startEditing(nodeId: string) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;
    this.editingNodeId = nodeId;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = node.text;
    const rect = this.canvas.getBoundingClientRect();
    const { x, y } = this.worldToScreen(node.x, node.y);
    inp.style.position = 'fixed';
    inp.style.left = `${rect.left + x - node.width / 2 - 4}px`;
    inp.style.top = `${rect.top + y - 14}px`;
    inp.style.width = `${node.width + 8}px`;
    inp.style.height = `28px`;
    inp.style.padding = '4px 8px';
    inp.style.background = 'rgba(255,255,255,0.95)';
    inp.style.color = '#111';
    inp.style.border = '2px solid transparent';
    inp.style.borderImage = 'linear-gradient(90deg,#00DBDE,#FC00FF) 1';
    inp.style.borderRadius = '6px';
    inp.style.fontSize = '16px';
    inp.style.outline = 'none';
    inp.style.textAlign = 'center';
    inp.style.zIndex = '100';
    const done = () => {
      const text = inp.value;
      inp.remove();
      this.editingInput = null;
      this.editingNodeId = null;
      this.handlers.onEditingDone(nodeId, text);
    };
    inp.addEventListener('blur', done);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done();
      else if (e.key === 'Escape') { inp.value = node.text; done(); }
    });
    document.body.appendChild(inp);
    inp.focus();
    inp.select();
    this.editingInput = inp;
  }

  private resize = () => {
    this.dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private bindEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('dblclick', this.onDblClick);
    this.canvas.addEventListener('wheel', this.onWheel as any, { passive: false });
    window.addEventListener('resize', this.resize);
  }

  private screenToWorld(sx: number, sy: number) {
    const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
    return {
      x: (sx - cw / 2) / this.camera.zoom - this.camera.x,
      y: (sy - ch / 2) / this.camera.zoom - this.camera.y,
    };
  }
  private worldToScreen(wx: number, wy: number) {
    const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
    return {
      x: (wx + this.camera.x) * this.camera.zoom + cw / 2,
      y: (wy + this.camera.y) * this.camera.zoom + ch / 2,
    };
  }

  private hitTestNode(wx: number, wy: number): MindNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = (wx - n.x) / (n.width / 2);
      const dy = (wy - n.y) / (n.height / 2);
      if (dx * dx + dy * dy <= 1) return n;
    }
    return null;
  }
  private nodeEdgePoint(node: MindNode, tx: number, ty: number) {
    const ang = Math.atan2(ty - node.y, tx - node.x);
    const rx = node.width / 2, ry = node.height / 2;
    return {
      x: node.x + rx * Math.cos(ang),
      y: node.y + ry * Math.sin(ang),
    };
  }

  private onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);
    const hit = this.hitTestNode(world.x, world.y);
    if (e.button === 0) {
      if (e.shiftKey && hit) {
        if (this.selection.includes(hit.id)) this.setSelection(this.selection.filter(i => i !== hit.id));
        else this.setSelection([...this.selection, hit.id]);
        return;
      }
      if (hit) {
        if (this.selection.length > 1 && this.selection.includes(hit.id)) {
          this.dragging = { type: 'multi', fromX: world.x, fromY: world.y, selectionStart: this.selection.map(id => id + ':'), startX: sx, startY: sy };
        } else {
          this.setSelection([hit.id]);
          this.dragging = { type: 'node', nodeId: hit.id, fromX: world.x, fromY: world.y, origX: hit.x, origY: hit.y, startX: sx, startY: sy };
        }
      } else if (e.altKey || e.button === 1) {
        this.setSelection([]);
        this.dragging = { type: 'pan', fromX: sx, fromY: sy, origX: this.camera.x, origY: this.camera.y, startX: sx, startY: sy };
      } else {
        this.setSelection([]);
        this.dragging = { type: 'pan', fromX: sx, fromY: sy, origX: this.camera.x, origY: this.camera.y, startX: sx, startY: sy };
      }
      if (hit) {
        setTimeout(() => {
          if (this.dragging && (this.dragging.type === 'node')) {
            const threshold = 4;
            const dx = Math.abs(this.dragging.fromX - this.dragging.startX);
            const dy = Math.abs(this.dragging.fromY - this.dragging.startY);
            if (Math.hypot((e.clientX - rect.left) - this.dragging!.startX, (e.clientY - rect.top) - this.dragging!.startY) > threshold) {
              this.dragging = { type: 'connect', fromX: sx, fromY: sy, origX: hit.x, origY: hit.y, connectStartId: hit.id, startX: sx, startY: sy };
            }
          }
        }, 200);
      }
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);
    const hit = this.hitTestNode(world.x, world.y);
    this.hoverNodeId = hit ? hit.id : null;
    if (this.dragging) {
      if (this.dragging.type === 'pan') {
        const dx = (sx - this.dragging.fromX) / this.camera.zoom;
        const dy = (sy - this.dragging.fromY) / this.camera.zoom;
        this.camera.x = (this.dragging.origX as number) + dx;
        this.camera.y = (this.dragging.origY as number) + dy;
      } else if (this.dragging.type === 'node' && this.dragging.nodeId) {
        const node = this.nodes.find(n => n.id === this.dragging!.nodeId);
        if (node) {
          const dx = world.x - this.dragging.fromX;
          const dy = world.y - this.dragging.fromY;
          node.x = (this.dragging.origX as number) + dx;
          node.y = (this.dragging.origY as number) + dy;
        }
      } else if (this.dragging.type === 'multi' && this.selection.length > 0) {
        const dx = world.x - this.dragging.fromX;
        const dy = world.y - this.dragging.fromY;
        for (const id of this.selection) {
          const n = this.nodes.find(nn => nn.id === id);
          if (!n || !this.dragging?.selectionStart) continue;
          const found = this.dragging.selectionStart.find(s => s.startsWith(id + ':'));
          if (found) {
            const parts = found.split(':');
            const ox = Number(parts[1]); const oy = Number(parts[2]);
            n.x = ox + dx; n.y = oy + dy;
          }
        }
      } else if (this.dragging.type === 'connect') {
        this.dragging.connectToId = hit ? hit.id : undefined;
      }
    }
    const now = Date.now();
    if (now - this.lastCursorSend > 50) {
      this.lastCursorSend = now;
      this.handlers.onCursorMove(world.x, world.y);
    }
    this.lastMoveTime = now;
  };

  private onMouseUp = (_e: MouseEvent) => {
    if (!this.dragging) return;
    if (this.dragging.type === 'node' && this.dragging.nodeId) {
      const node = this.nodes.find(n => n.id === this.dragging!.nodeId);
      if (node && (node.x !== this.dragging.origX || node.y !== this.dragging.origY)) {
        const op: OpPacket = {
          opId: uuid(), userId: '', timestamp: Date.now(),
          type: 'node_move', targetId: node.id,
          oldValue: { x: this.dragging.origX, y: this.dragging.origY },
          newValue: { x: node.x, y: node.y, lastEditTime: Date.now() }
        };
        this.handlers.onOp(op);
      }
    } else if (this.dragging.type === 'multi' && this.selection.length > 0) {
      for (const id of this.selection) {
        const n = this.nodes.find(nn => nn.id === id);
        if (!n || !this.dragging.selectionStart) continue;
        const found = this.dragging.selectionStart.find(s => s.startsWith(id + ':'));
        if (found) {
          const parts = found.split(':');
          const ox = Number(parts[1]); const oy = Number(parts[2]);
          if (n.x !== ox || n.y !== oy) {
            this.handlers.onOp({
              opId: uuid(), userId: '', timestamp: Date.now(), type: 'node_move', targetId: n.id,
              oldValue: { x: ox, y: oy }, newValue: { x: n.x, y: n.y, lastEditTime: Date.now() }
            });
          }
        }
      }
    } else if (this.dragging.type === 'connect' && this.dragging.connectStartId && this.dragging.connectToId && this.dragging.connectStartId !== this.dragging.connectToId) {
      const exists = this.connections.some(c => c.fromId === this.dragging!.connectStartId && c.toId === this.dragging!.connectToId);
      if (!exists) {
        const conn: Connection = {
          id: uuid(), fromId: this.dragging.connectStartId, toId: this.dragging.connectToId,
          color: '#4D96FF', lineWidth: 2, createdAt: Date.now()
        };
        this.handlers.onOp({
          opId: uuid(), userId: '', timestamp: Date.now(), type: 'connection_add', targetId: conn.id,
          newValue: conn
        });
        this.addConnAnim(conn.id);
      }
    }
    this.dragging = null;
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);
    const hit = this.hitTestNode(world.x, world.y);
    if (hit) {
      if (!this.selection.includes(hit.id)) this.setSelection([hit.id]);
      this.handlers.onContextMenu(hit.id, e.clientX, e.clientY, 'none');
    } else {
      this.setSelection([]);
      this.handlers.onContextMenu(null, e.clientX, e.clientY, 'none');
    }
  };

  private onDblClick = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);
    const hit = this.hitTestNode(world.x, world.y);
    if (hit) { this.handlers.onStartEdit(hit.id); this.startEditing(hit.id); }
    else {
      const newId = uuid();
      const now = Date.now();
      const node: MindNode = {
        id: newId, text: '新节点', x: world.x, y: world.y,
        bgColor: '#A3E4D7', borderColor: '#76C7B0',
        width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT,
        lastEditorId: '', lastEditTime: now, createdAt: now,
      };
      this.handlers.onOp({ opId: uuid(), userId: '', timestamp: now, type: 'node_add', targetId: newId, newValue: node });
      this.addNodeAnim(newId);
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const before = this.screenToWorld(sx, sy);
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.camera.zoom = Math.max(0.3, Math.min(3, this.camera.zoom * factor));
    const after = this.screenToWorld(sx, sy);
    this.camera.x += after.x - before.x;
    this.camera.y += after.y - before.y;
  };

  zoomAt(sx: number, sy: number, zoom: number) {
    const before = this.screenToWorld(sx, sy);
    this.camera.zoom = zoom;
    const after = this.screenToWorld(sx, sy);
    this.camera.x += after.x - before.x;
    this.camera.y += after.y - before.y;
  }

  getCamera() { return { ...this.camera }; }
  setCamera(cam: { x: number; y: number; zoom: number }) { this.camera = cam; }

  private runRenderLoop = () => {
    this.render();
    this.rafId = requestAnimationFrame(this.runRenderLoop);
  };

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    ctx.fillStyle = '#16213E';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(this.camera.x, this.camera.y);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1 / this.camera.zoom;
    const gs = 60;
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(w, h);
    const x0 = Math.floor(tl.x / gs) * gs, x1 = Math.ceil(br.x / gs) * gs;
    const y0 = Math.floor(tl.y / gs) * gs, y1 = Math.ceil(br.y / gs) * gs;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += gs) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = y0; y <= y1; y += gs) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke();

    const now = performance.now();
    for (const c of this.connections) {
      const from = this.nodes.find(n => n.id === c.fromId);
      const to = this.nodes.find(n => n.id === c.toId);
      if (!from || !to) continue;
      const start = this.nodeEdgePoint(from, to.x, to.y);
      const end = this.nodeEdgePoint(to, from.x, from.y);
      const anim = this.animConns.find(a => a.connId === c.id);
      let progress = 1;
      if (anim) {
        progress = Math.min(1, (now - anim.start) / anim.dur);
        if (progress >= 1) this.animConns = this.animConns.filter(a => a.connId !== c.id);
      }
      this.drawBezierArrow(ctx, start.x, start.y, end.x, end.y, c.color, c.lineWidth, progress);
    }

    if (this.dragging && this.dragging.type === 'connect' && this.dragging.connectStartId) {
      const from = this.nodes.find(n => n.id === this.dragging!.connectStartId);
      if (from) {
        const endWorld = this.screenToWorld(this.dragging.startX + (this.dragging.fromX - this.dragging.startX), this.dragging.startY);
        const rect = this.canvas.getBoundingClientRect();
        const mx = (this.dragging.startX + ((this as any)._msx || 0) - this.dragging.startX);
        const screenX = (this.dragging as any)._lastScreenX || this.dragging.startX;
        const screenY = (this.dragging as any)._lastScreenY || this.dragging.startY;
        const ep = this.screenToWorld(screenX, screenY);
        const start = this.nodeEdgePoint(from, ep.x, ep.y);
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.7)';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo((start.x + ep.x) / 2, start.y, ep.x, ep.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    for (const n of this.nodes) {
      this.drawNode(ctx, n, now);
    }

    for (const u of this.users) {
      if (u.id === '' || !u.isOnline) continue;
      const since = Date.now() - u.lastActive;
      const alpha = since > 10000 ? Math.max(0.1, 0.8 - (since - 10000) / 10000 * 0.7) : 0.8;
      ctx.fillStyle = u.color + '80';
      ctx.beginPath();
      ctx.arc(u.cursorX, u.cursorY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = u.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = u.color;
      ctx.font = 'bold 12px sans-serif';
      const wText = ctx.measureText(u.name).width + 10;
      ctx.fillRect(u.cursorX + 12, u.cursorY - 18, wText, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(u.name, u.cursorX + 17, u.cursorY - 5);
    }

    ctx.restore();
  }

  private drawBezierArrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x3: number, y3: number, color: string, lw: number, progress: number) {
    const mx = (x0 + x3) / 2;
    const cp1x = mx, cp1y = y0;
    const cp2x = mx, cp2y = y3;
    const ex = progress;
    const x = (t: number) => (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * cp1x + 3 * (1 - t) * t ** 2 * cp2x + t ** 3 * x3;
    const y = (t: number) => (1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * cp1y + 3 * (1 - t) * t ** 2 * cp2y + t ** 3 * y3;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x(0), y(0));
    const steps = 30;
    for (let i = 1; i <= steps * ex; i++) { ctx.lineTo(x(i / steps), y(i / steps)); }
    ctx.stroke();
    if (progress >= 0.9) {
      const tEnd = ex;
      const ax = x(tEnd), ay = y(tEnd);
      const dx = x(Math.max(0, tEnd - 0.01)) - ax;
      const dy = y(Math.max(0, tEnd - 0.01)) - ay;
      const ang = Math.atan2(dy, dx);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + 10 * Math.cos(ang + 2.5), ay + 10 * Math.sin(ang + 2.5));
      ctx.lineTo(ax + 10 * Math.cos(ang - 2.5), ay + 10 * Math.sin(ang - 2.5));
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawNode(ctx: CanvasRenderingContext2D, n: MindNode, now: number) {
    let scale = 1;
    const anim = this.animNodes.find(a => a.nodeId === n.id);
    if (anim) {
      const t = Math.min(1, (now - anim.start) / anim.dur);
      if (anim.kind === 'add') scale = 1 - (1 - t) * (1 - t);
      else { scale = 1 - t * t; if (t >= 1) { this.animNodes = this.animNodes.filter(a => a.nodeId !== n.id); } }
    }
    const flashing = this.flashingNodes.find(f => f.nodeId === n.id);
    let flashingBorder = false;
    if (flashing) {
      if (now >= flashing.nextFlash) {
        flashing.count++;
        flashing.nextFlash = now + 250;
      }
      flashingBorder = flashing.count % 2 === 0;
      if (flashing.count >= 6) this.flashingNodes = this.flashingNodes.filter(f => f.nodeId !== n.id);
    }
    const w = n.width * scale, h = n.height * scale;
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.scale(scale, scale);

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, n.width / 2, n.height / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.hexWithAlpha(n.bgColor, 0.55);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    const selected = this.selection.includes(n.id);
    const hovered = this.hoverNodeId === n.id;
    const editing = this.editingNodeId === n.id;
    ctx.lineWidth = selected || hovered || editing ? 3 : 2;
    if (flashing && flashingBorder) ctx.strokeStyle = '#FF3B30';
    else if (editing) {
      const g = ctx.createLinearGradient(-n.width / 2, 0, n.width / 2, 0);
      g.addColorStop(0, '#00DBDE');
      g.addColorStop(1, '#FC00FF');
      ctx.strokeStyle = g;
    } else ctx.strokeStyle = selected ? '#00DBDE' : (hovered ? '#FC00FF' : n.borderColor);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `500 ${DEFAULT_NODE_HEIGHT / 3}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxW = n.width - 8;
    let txt = n.text;
    while (ctx.measureText(txt).width > maxW && txt.length > 1) txt = txt.slice(0, -1);
    if (txt !== n.text && txt.length > 2) txt = txt.slice(0, -1) + '…';
    ctx.fillText(txt, 0, 0);
    ctx.restore();

    if (n.lastEditorId) {
      const editor = this.users.find(u => u.id === n.lastEditorId);
      if (editor) {
        const bx = n.x + n.width / 2 - 4;
        const by = n.y - n.height / 2 - 4;
        ctx.fillStyle = editor.color;
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(editor.name.charAt(0), bx, by + 0.5);
      }
    }
  }

  private hexWithAlpha(hex: string, a: number): string {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  updateDraggingScreenPos(sx: number, sy: number) {
    if (this.dragging) {
      (this.dragging as any)._lastScreenX = sx;
      (this.dragging as any)._lastScreenY = sy;
    }
  }
}
