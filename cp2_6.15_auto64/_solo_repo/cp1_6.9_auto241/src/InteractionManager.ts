import { v4 as uuidv4 } from 'uuid';
import { Card, CardData, getRandomWords, getRandomColor } from './Card';
import { Link, LinkData } from './Link';
import { Renderer, RendererState } from './Renderer';

export interface SaveData {
  cards: CardData[];
  links: LinkData[];
  timestamp: number;
  viewportWidth: number;
  viewportHeight: number;
}

const CARD_WIDTH_DESKTOP = 80;
const CARD_HEIGHT_DESKTOP = 60;
const CARD_WIDTH_MOBILE = 60;
const CARD_HEIGHT_MOBILE = 45;
const SNAP_THRESHOLD = 60;
const STORAGE_KEY = 'siliu-manyou-save';

export class InteractionManager {
  private cards: Map<string, Card>;
  private links: Map<string, Link>;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;

  private mouseX: number;
  private mouseY: number;
  private lastClickTime: number;
  private lastClickCardId: string | null;
  private hoveredCardId: string | null;
  private draggingCardId: string | null;
  private shiftPressed: boolean;
  private linkingFromCardId: string | null;

  private editInputEl: HTMLInputElement | null;
  private editingCardId: string | null;

  private pendingDeletion: Set<string>;

  constructor(canvas: HTMLCanvasElement, renderer: Renderer) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.cards = new Map();
    this.links = new Map();

    this.mouseX = 0;
    this.mouseY = 0;
    this.lastClickTime = 0;
    this.lastClickCardId = null;
    this.hoveredCardId = null;
    this.draggingCardId = null;
    this.shiftPressed = false;
    this.linkingFromCardId = null;

    this.editInputEl = null;
    this.editingCardId = null;

    this.pendingDeletion = new Set();

    this.setupEditInput();
    this.syncState();
  }

  private setupEditInput(): void {
    this.editInputEl = document.createElement('input');
    this.editInputEl.type = 'text';
    this.editInputEl.maxLength = 20;
    this.editInputEl.style.cssText = `
      position: fixed;
      z-index: 100;
      background: rgba(15, 20, 40, 0.92);
      border: 1px solid rgba(180, 200, 255, 0.35);
      border-radius: 8px;
      color: #fff;
      font-family: 'Noto Sans SC', sans-serif;
      font-size: 13px;
      padding: 4px 8px;
      outline: none;
      box-shadow: 0 0 20px rgba(120, 150, 255, 0.3);
      backdrop-filter: blur(8px);
      display: none;
    `;
    this.editInputEl.addEventListener('blur', () => this.finishEdit());
    this.editInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.finishEdit();
      } else if (e.key === 'Escape') {
        this.cancelEdit();
      }
    });
    document.body.appendChild(this.editInputEl);
  }

  public getCards(): Map<string, Card> {
    return this.cards;
  }

  public getLinks(): Map<string, Link> {
    return this.links;
  }

  private syncState(): void {
    this.renderer.setState({
      cards: this.cards,
      links: this.links
    });
  }

  public resize(prevWidth: number, prevHeight: number, newWidth: number, newHeight: number): void {
    if (prevWidth === 0 || prevHeight === 0) return;
    const scaleX = newWidth / prevWidth;
    const scaleY = newHeight / prevHeight;
    for (const card of this.cards.values()) {
      card.x *= scaleX;
      card.y *= scaleY;
    }
  }

  public handleMouseMove(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = clientX - rect.left;
    this.mouseY = clientY - rect.top;

    if (this.draggingCardId) {
      const card = this.cards.get(this.draggingCardId);
      if (card) {
        card.moveTo(this.mouseX, this.mouseY);
      }
    }

    if (this.linkingFromCardId) {
      this.renderer.setState({
        tempLink: {
          fromCardId: this.linkingFromCardId,
          toX: this.mouseX,
          toY: this.mouseY
        }
      });
    }

    this.updateHover();
    this.updateContextMenuHover();
  }

  public handleMouseDown(clientX: number, clientY: number, button: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (this.editingCardId) {
      this.finishEdit();
    }

    if (this.renderer.state.contextMenu) {
      if (this.renderer.isPointInContextMenu(x, y)) {
        const menu = this.renderer.state.contextMenu!;
        this.deleteCard(menu.cardId);
      }
      this.renderer.setState({ contextMenu: null });
      return;
    }

    if (button === 2) {
      const cardId = this.findCardAt(x, y);
      if (cardId) {
        const card = this.cards.get(cardId)!;
        this.renderer.setState({
          contextMenu: {
            x: Math.min(x, this.canvas.clientWidth - 120),
            y: Math.min(y, this.canvas.clientHeight - 50),
            cardId,
            hovered: false
          }
        });
      }
      return;
    }

    if (button !== 0) return;

    const now = performance.now();
    const cardId = this.findCardAt(x, y);

    if (cardId) {
      const card = this.cards.get(cardId)!;

      if (now - this.lastClickTime < 350 && this.lastClickCardId === cardId) {
        this.startEdit(cardId);
        this.lastClickTime = 0;
        this.lastClickCardId = null;
        return;
      }

      if (this.shiftPressed) {
        this.linkingFromCardId = cardId;
      } else {
        this.draggingCardId = cardId;
        card.startDrag(x, y);
      }

      this.lastClickTime = now;
      this.lastClickCardId = cardId;
    }
  }

  public handleMouseUp(clientX: number, clientY: number, button: number): void {
    if (button !== 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (this.linkingFromCardId) {
      const targetCardId = this.findCardAt(x, y);
      if (targetCardId && targetCardId !== this.linkingFromCardId) {
        this.createLink(this.linkingFromCardId, targetCardId);
      }
      this.linkingFromCardId = null;
      this.renderer.setState({ tempLink: null });
      return;
    }

    if (this.draggingCardId) {
      const card = this.cards.get(this.draggingCardId);
      if (card) {
        card.isDragging = false;
        const snapTarget = this.findSnapTarget(card);
        if (snapTarget) {
          card.startSnap(snapTarget.x, snapTarget.y);
        } else {
          card.state = 'idle';
        }
      }
      this.draggingCardId = null;
      return;
    }

    if (!this.findCardAt(x, y)) {
      this.createCard(x, y);
    }
  }

  public handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.shiftPressed = true;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.hoveredCardId && !this.editingCardId) {
        this.deleteCard(this.hoveredCardId);
        e.preventDefault();
      }
    }
    if (e.key === 'Escape') {
      this.renderer.setState({ contextMenu: null });
      this.linkingFromCardId = null;
      this.renderer.setState({ tempLink: null });
      this.cancelEdit();
    }
  }

  public handleKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.shiftPressed = false;
    }
  }

  private updateHover(): void {
    let newHovered: string | null = null;
    const sortedCards = Array.from(this.cards.values()).sort((a, b) => {
      if (a.isDragging && !b.isDragging) return 1;
      if (!a.isDragging && b.isDragging) return -1;
      return 0;
    });
    for (let i = sortedCards.length - 1; i >= 0; i--) {
      const card = sortedCards[i];
      if (card.state !== 'disappearing' && card.containsPoint(this.mouseX, this.mouseY)) {
        newHovered = card.id;
        break;
      }
    }

    if (this.hoveredCardId !== newHovered) {
      if (this.hoveredCardId) {
        const prev = this.cards.get(this.hoveredCardId);
        if (prev) prev.isHovered = false;
      }
      if (newHovered) {
        const next = this.cards.get(newHovered);
        if (next) next.isHovered = true;
      }
      this.hoveredCardId = newHovered;
    }
  }

  private updateContextMenuHover(): void {
    const menu = this.renderer.state.contextMenu;
    if (menu) {
      menu.hovered = this.renderer.isPointInContextMenu(this.mouseX, this.mouseY);
    }
  }

  private findCardAt(x: number, y: number): string | null {
    const sortedCards = Array.from(this.cards.values()).sort((a, b) => {
      if (a.isDragging && !b.isDragging) return 1;
      if (!a.isDragging && b.isDragging) return -1;
      return 0;
    });
    for (let i = sortedCards.length - 1; i >= 0; i--) {
      const card = sortedCards[i];
      if (card.state !== 'disappearing' && card.containsPoint(x, y)) {
        return card.id;
      }
    }
    return null;
  }

  private findSnapTarget(card: Card): { x: number; y: number } | null {
    let nearestDist = Infinity;
    let nearestCard: Card | null = null;

    for (const other of this.cards.values()) {
      if (other.id === card.id) continue;
      if (other.state === 'disappearing') continue;

      const dx = other.centerX - card.centerX;
      const dy = other.centerY - card.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < SNAP_THRESHOLD + (card.width + other.width) / 2 && dist < nearestDist) {
        nearestDist = dist;
        nearestCard = other;
      }
    }

    if (!nearestCard) return null;

    const dx = card.centerX - nearestCard.centerX;
    const dy = card.centerY - nearestCard.centerY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let targetX: number, targetY: number;
    const gap = 12;

    if (absDx > absDy) {
      targetX = dx > 0
        ? nearestCard.right + gap
        : nearestCard.left - card.width - gap;
      targetY = nearestCard.centerY - card.height / 2;
    } else {
      targetX = nearestCard.centerX - card.width / 2;
      targetY = dy > 0
        ? nearestCard.bottom + gap
        : nearestCard.top - card.height - gap;
    }

    return { x: targetX, y: targetY };
  }

  private createCard(x: number, y: number): Card {
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? CARD_WIDTH_MOBILE : CARD_WIDTH_DESKTOP;
    const height = isMobile ? CARD_HEIGHT_MOBILE : CARD_HEIGHT_DESKTOP;

    const card = new Card(
      uuidv4(),
      x - width / 2,
      y - height / 2,
      width,
      height,
      getRandomColor(),
      getRandomWords(2 + Math.floor(Math.random() * 2))
    );

    this.cards.set(card.id, card);
    return card;
  }

  private createLink(fromId: string, toId: string): Link | null {
    for (const link of this.links.values()) {
      if (
        (link.fromCardId === fromId && link.toCardId === toId) ||
        (link.fromCardId === toId && link.toCardId === fromId)
      ) {
        return null;
      }
    }

    const link = new Link(uuidv4(), fromId, toId);
    this.links.set(link.id, link);

    const fromCard = this.cards.get(fromId);
    const toCard = this.cards.get(toId);
    if (fromCard) fromCard.addLink(link.id);
    if (toCard) toCard.addLink(link.id);

    return link;
  }

  private deleteCard(cardId: string): void {
    const card = this.cards.get(cardId);
    if (!card) return;

    card.triggerDisappear();

    for (const linkId of [...card.links]) {
      const link = this.links.get(linkId);
      if (link) {
        link.triggerDisappear();
        this.pendingDeletion.add(linkId);
      }
    }

    this.pendingDeletion.add(cardId);

    setTimeout(() => {
      for (const id of this.pendingDeletion) {
        if (this.cards.has(id)) {
          const c = this.cards.get(id)!;
          for (const lid of c.links) {
            const other = this.links.get(lid);
            if (other) {
              const otherCard = this.cards.get(
                other.fromCardId === id ? other.toCardId : other.fromCardId
              );
              if (otherCard) otherCard.removeLink(lid);
            }
            this.links.delete(lid);
          }
          this.cards.delete(id);
        } else if (this.links.has(id)) {
          this.links.delete(id);
        }
      }
      this.pendingDeletion.clear();
    }, 320);
  }

  private startEdit(cardId: string): void {
    const card = this.cards.get(cardId);
    if (!card || !this.editInputEl) return;

    this.editingCardId = cardId;
    this.editInputEl.value = card.text;

    const rect = this.canvas.getBoundingClientRect();
    const inputWidth = Math.max(card.width + 16, 120);
    this.editInputEl.style.left = `${rect.left + card.x - (inputWidth - card.width) / 2}px`;
    this.editInputEl.style.top = `${rect.top + card.y - 2}px`;
    this.editInputEl.style.width = `${inputWidth}px`;
    this.editInputEl.style.height = `${card.height + 4}px`;
    this.editInputEl.style.display = 'block';
    this.editInputEl.focus();
    this.editInputEl.select();
  }

  private finishEdit(): void {
    if (!this.editingCardId || !this.editInputEl) return;
    const card = this.cards.get(this.editingCardId);
    if (card) {
      const text = this.editInputEl.value.trim();
      if (text.length > 0) {
        card.text = text;
      }
    }
    this.cancelEdit();
  }

  private cancelEdit(): void {
    if (this.editInputEl) {
      this.editInputEl.style.display = 'none';
    }
    this.editingCardId = null;
  }

  public save(): SaveData {
    const data: SaveData = {
      cards: Array.from(this.cards.values())
        .filter(c => c.state !== 'disappearing')
        .map(c => c.toJSON()),
      links: Array.from(this.links.values())
        .filter(l => l.state !== 'disappearing')
        .map(l => l.toJSON()),
      timestamp: Date.now(),
      viewportWidth: this.canvas.clientWidth,
      viewportHeight: this.canvas.clientHeight
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('保存失败:', e);
    }
    return data;
  }

  public load(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as SaveData;
      this.restoreData(data);
      return true;
    } catch (e) {
      console.warn('加载失败:', e);
      return false;
    }
  }

  private restoreData(data: SaveData): void {
    this.cards.clear();
    this.links.clear();

    const viewportScale = Math.min(
      this.canvas.clientWidth / (data.viewportWidth || this.canvas.clientWidth),
      this.canvas.clientHeight / (data.viewportHeight || this.canvas.clientHeight),
      1.2
    );

    for (const cardData of data.cards) {
      const card = Card.fromJSON(cardData as any);
      card.x *= viewportScale;
      card.y *= viewportScale;
      this.cards.set(card.id, card);
    }

    for (const linkData of data.links) {
      if (this.cards.has(linkData.fromCardId) && this.cards.has(linkData.toCardId)) {
        const link = Link.fromJSON(linkData);
        this.links.set(link.id, link);
        this.cards.get(linkData.fromCardId)!.addLink(link.id);
        this.cards.get(linkData.toCardId)!.addLink(link.id);
      }
    }

    this.syncState();
  }
}
