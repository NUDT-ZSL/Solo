import { PoemEngine, type FragmentData, type Poem } from './poemEngine';
import { UIRenderer } from './uiRenderer';

interface Position {
  x: number;
  y: number;
}

interface Group {
  id: string;
  fragmentIds: string[];
  x: number;
  y: number;
  poemId: number;
}

class App {
  private engine: PoemEngine;
  private renderer: UIRenderer;
  private progressText: HTMLElement;
  private progressFill: HTMLElement;
  private titleBanner: HTMLElement;
  
  private currentFragments: FragmentData[] = [];
  private fragmentPositions: Map<string, Position> = new Map();
  private groups: Group[] = [];
  private groupIdCounter: number = 0;
  
  private draggingFragmentId: string | null = null;
  private draggingGroupId: string | null = null;
  private lastMoveTime: number = 0;

  constructor() {
    this.engine = new PoemEngine();
    
    const canvas = document.getElementById('bgCanvas') as HTMLCanvasElement;
    const fragmentsLayer = document.getElementById('fragmentsLayer') as HTMLElement;
    this.progressText = document.getElementById('progressText') as HTMLElement;
    this.progressFill = document.getElementById('progressFill') as HTMLElement;
    this.titleBanner = document.getElementById('titleBanner') as HTMLElement;
    
    if (!canvas || !fragmentsLayer || !this.progressText || !this.progressFill || !this.titleBanner) {
      throw new Error('Required DOM elements not found');
    }
    
    this.renderer = new UIRenderer(canvas, fragmentsLayer);
    
    this.init();
  }

  private init(): void {
    this.renderer.startRenderLoop();
    this.loadNextBatch();
    this.updateProgress();
  }

  private loadNextBatch(): void {
    if (this.engine.isAllCompleted()) {
      this.onAllPoemsCompleted();
      return;
    }
    
    this.currentFragments = this.engine.getFragmentsForNextBatch();
    this.fragmentPositions.clear();
    this.groups = [];
    
    const rect = this.renderer.getCanvasRect();
    const size = this.renderer.getFragmentSize();
    const padding = size * 2;
    const cols = Math.min(5, Math.floor((rect.width - padding * 2) / (size * 2.5)));
    const rows = Math.ceil(this.currentFragments.length / cols);
    const startX = (rect.width - cols * size * 2.5) / 2;
    const startY = (rect.height - rows * size * 2.5) / 2;
    
    const shuffled = [...this.currentFragments].sort(() => Math.random() - 0.5);
    shuffled.forEach((frag, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = (Math.random() - 0.5) * size;
      const jitterY = (Math.random() - 0.5) * size;
      this.fragmentPositions.set(frag.id, {
        x: startX + col * size * 2.5 + jitterX,
        y: startY + row * size * 2.5 + jitterY
      });
    });
    
    this.renderer.createFragments(
      this.currentFragments,
      this.fragmentPositions,
      this.handleDragStart.bind(this),
      this.handleDragMove.bind(this),
      this.handleDragEnd.bind(this)
    );
  }

  private handleDragStart(id: string, e: PointerEvent): void {
    const rect = this.renderer.getCanvasRect();
    
    const group = this.findGroupContainingFragment(id);
    if (group) {
      this.draggingGroupId = group.id;
      this.draggingFragmentId = null;
      const pos = this.renderer.getGroupPosition(group.id);
      if (pos) {
        this.renderer.setDragging(group.id, e.clientX - rect.left - pos.x, e.clientY - rect.top - pos.y, true);
      }
    } else {
      this.draggingFragmentId = id;
      this.draggingGroupId = null;
      const pos = this.renderer.getFragmentPosition(id);
      if (pos) {
        this.renderer.setDragging(id, e.clientX - rect.left - pos.x, e.clientY - rect.top - pos.y, false);
      }
    }
  }

  private handleDragMove(e: PointerEvent): void {
    const now = performance.now();
    if (now - this.lastMoveTime < 16) return;
    this.lastMoveTime = now;
    
    if (!this.renderer.isDragging()) return;
    
    const rect = this.renderer.getCanvasRect();
    const offset = this.renderer.getDragOffset();
    const newX = Math.max(0, Math.min(rect.width - 40, e.clientX - rect.left - offset.x));
    const newY = Math.max(0, Math.min(rect.height - 40, e.clientY - rect.top - offset.y));
    
    if (this.draggingGroupId) {
      const group = this.groups.find(g => g.id === this.draggingGroupId);
      if (group) {
        group.x = newX;
        group.y = newY;
        this.renderer.updateGroupPosition(group.id, newX, newY);
      }
    } else if (this.draggingFragmentId) {
      const pos = this.fragmentPositions.get(this.draggingFragmentId);
      if (pos) {
        pos.x = newX;
        pos.y = newY;
        this.renderer.updateFragmentPosition(this.draggingFragmentId, newX, newY);
      }
    }
  }

  private handleDragEnd(_e: PointerEvent): void {
    if (this.draggingGroupId) {
      this.checkGroupSnap(this.draggingGroupId);
    } else if (this.draggingFragmentId) {
      this.checkFragmentSnap(this.draggingFragmentId);
    }
    
    this.renderer.clearDragging();
    this.draggingFragmentId = null;
    this.draggingGroupId = null;
  }

  private findGroupContainingFragment(fragmentId: string): Group | null {
    return this.groups.find(g => g.fragmentIds.includes(fragmentId)) || null;
  }

  private getFragmentOrGroupCenter(id: string, isGroup: boolean): Position {
    const size = this.renderer.getFragmentSize();
    if (isGroup) {
      const group = this.groups.find(g => g.id === id);
      if (group) {
        return { x: group.x + (group.fragmentIds.length * size) / 2, y: group.y + size / 2 };
      }
    }
    const pos = this.fragmentPositions.get(id);
    if (pos) return { x: pos.x + size / 2, y: pos.y + size / 2 };
    return { x: 0, y: 0 };
  }

  private getFragmentActualPosition(fragId: string): Position {
    const group = this.findGroupContainingFragment(fragId);
    if (group) {
      const idx = group.fragmentIds.indexOf(fragId);
      const size = this.renderer.getFragmentSize();
      return { x: group.x + idx * size, y: group.y };
    }
    const pos = this.fragmentPositions.get(fragId);
    return pos || { x: 0, y: 0 };
  }

  private checkFragmentSnap(fragmentId: string): void {
    const size = this.renderer.getFragmentSize();
    const threshold = 10;
    const frag = this.engine.getFragmentById(fragmentId);
    if (!frag) return;
    
    const myPos = this.getFragmentActualPosition(fragmentId);
    const myCenter = { x: myPos.x + size / 2, y: myPos.y + size / 2 };
    
    for (const otherFrag of this.currentFragments) {
      if (otherFrag.id === fragmentId) continue;
      if (this.engine.getCompletedCount() > 0 && this.isFragmentInCompletedPoem(otherFrag.id)) continue;
      
      const otherPos = this.getFragmentActualPosition(otherFrag.id);
      const otherCenter = { x: otherPos.x + size / 2, y: otherPos.y + size / 2 };
      
      const dist = Math.abs(myCenter.y - otherCenter.y);
      const xDist = Math.abs(myCenter.x - otherCenter.x);
      
      if (dist < size * 0.6 && xDist < size * 1.5 && xDist > size * 0.3) {
        if (this.engine.areFragmentsAdjacentInPoem(fragmentId, otherFrag.id)) {
          this.mergeIntoGroup(fragmentId, otherFrag.id, myPos, otherPos);
          return;
        }
      }
    }
    
    for (const group of this.groups) {
      if (group.fragmentIds.includes(fragmentId)) continue;
      
      const firstPos = { x: group.x, y: group.y };
      const lastPos = { x: group.x + (group.fragmentIds.length - 1) * size, y: group.y };
      
      const firstDist = Math.abs(myCenter.y - (firstPos.y + size / 2));
      const firstXDist = Math.abs(myPos.x - (firstPos.x - size));
      
      if (firstDist < size * 0.6 && firstXDist < threshold) {
        const firstFragInGroup = this.engine.getFragmentById(group.fragmentIds[0]);
        if (firstFragInGroup && this.engine.areFragmentsAdjacentInPoem(fragmentId, group.fragmentIds[0])) {
          if (frag.positionInPoem < firstFragInGroup.positionInPoem) {
            this.addFragmentToGroupStart(group, fragmentId);
            return;
          }
        }
      }
      
      const lastDist = Math.abs(myCenter.y - (lastPos.y + size / 2));
      const lastXDist = Math.abs(myPos.x - (lastPos.x + size));
      
      if (lastDist < size * 0.6 && lastXDist < threshold) {
        const lastFragInGroup = this.engine.getFragmentById(group.fragmentIds[group.fragmentIds.length - 1]);
        if (lastFragInGroup && this.engine.areFragmentsAdjacentInPoem(fragmentId, group.fragmentIds[group.fragmentIds.length - 1])) {
          if (frag.positionInPoem > lastFragInGroup.positionInPoem) {
            this.addFragmentToGroupEnd(group, fragmentId);
            return;
          }
        }
      }
    }
  }

  private checkGroupSnap(groupId: string): void {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const size = this.renderer.getFragmentSize();
    const threshold = 10;
    const groupY = group.y;
    const groupStartX = group.x;
    const groupEndX = group.x + (group.fragmentIds.length - 1) * size;
    
    for (const otherGroup of this.groups) {
      if (otherGroup.id === groupId) continue;
      if (otherGroup.poemId !== group.poemId) continue;
      
      const otherY = otherGroup.y;
      const otherStartX = otherGroup.x;
      const otherEndX = otherGroup.x + (otherGroup.fragmentIds.length - 1) * size;
      
      if (Math.abs(groupY - otherY) < size * 0.6) {
        const gap1 = Math.abs(groupEndX + size - otherStartX);
        if (gap1 < threshold + size) {
          const groupLast = this.engine.getFragmentById(group.fragmentIds[group.fragmentIds.length - 1]);
          const otherFirst = this.engine.getFragmentById(otherGroup.fragmentIds[0]);
          if (groupLast && otherFirst && this.engine.areFragmentsAdjacentInPoem(groupLast.id, otherFirst.id)) {
            this.mergeGroups(group, otherGroup);
            return;
          }
        }
        
        const gap2 = Math.abs(otherEndX + size - groupStartX);
        if (gap2 < threshold + size) {
          const otherLast = this.engine.getFragmentById(otherGroup.fragmentIds[otherGroup.fragmentIds.length - 1]);
          const groupFirst = this.engine.getFragmentById(group.fragmentIds[0]);
          if (otherLast && groupFirst && this.engine.areFragmentsAdjacentInPoem(otherLast.id, groupFirst.id)) {
            this.mergeGroups(otherGroup, group);
            return;
          }
        }
      }
    }
    
    for (const frag of this.currentFragments) {
      if (group.fragmentIds.includes(frag.id)) continue;
      
      const fragPos = this.getFragmentActualPosition(frag.id);
      const fragCenterY = fragPos.y + size / 2;
      const groupCenterY = group.y + size / 2;
      
      if (Math.abs(fragCenterY - groupCenterY) < size * 0.6) {
        const startGap = Math.abs(fragPos.x + size - groupStartX);
        if (startGap < threshold + size) {
          const groupFirst = this.engine.getFragmentById(group.fragmentIds[0]);
          if (groupFirst && this.engine.areFragmentsAdjacentInPoem(frag.id, groupFirst.id)) {
            const fragData = this.engine.getFragmentById(frag.id);
            if (fragData && groupFirst && fragData.positionInPoem < groupFirst.positionInPoem) {
              this.addFragmentToGroupStart(group, frag.id);
              return;
            }
          }
        }
        
        const endGap = Math.abs(groupEndX + size - fragPos.x);
        if (endGap < threshold + size) {
          const groupLast = this.engine.getFragmentById(group.fragmentIds[group.fragmentIds.length - 1]);
          if (groupLast && this.engine.areFragmentsAdjacentInPoem(groupLast.id, frag.id)) {
            const fragData = this.engine.getFragmentById(frag.id);
            if (fragData && groupLast && fragData.positionInPoem > groupLast.positionInPoem) {
              this.addFragmentToGroupEnd(group, frag.id);
              return;
            }
          }
        }
      }
    }
  }

  private mergeIntoGroup(frag1Id: string, frag2Id: string, pos1: Position, pos2: Position): void {
    const f1 = this.engine.getFragmentById(frag1Id);
    const f2 = this.engine.getFragmentById(frag2Id);
    if (!f1 || !f2) return;
    
    const size = this.renderer.getFragmentSize();
    let ids: string[];
    let groupX: number;
    let groupY: number;
    
    if (f1.positionInPoem < f2.positionInPoem) {
      ids = [frag1Id, frag2Id];
      groupX = Math.min(pos1.x, pos2.x);
    } else {
      ids = [frag2Id, frag1Id];
      groupX = Math.min(pos1.x, pos2.x);
    }
    groupY = (pos1.y + pos2.y) / 2;
    
    this.renderer.removeFragments(ids);
    
    const groupId = `group-${++this.groupIdCounter}`;
    this.groups.push({
      id: groupId,
      fragmentIds: ids,
      x: groupX,
      y: groupY,
      poemId: f1.poemId
    });
    
    const fragsData = ids.map(id => this.engine.getFragmentById(id)!).filter(Boolean);
    this.renderer.createGroup(groupId, fragsData, groupX, groupY);
    this.checkGroupCompletion(groupId);
  }

  private addFragmentToGroupStart(group: Group, fragId: string): void {
    const frag = this.engine.getFragmentById(fragId);
    if (!frag) return;
    
    const size = this.renderer.getFragmentSize();
    
    const sourceGroup = this.findGroupContainingFragment(fragId);
    if (sourceGroup) {
      sourceGroup.fragmentIds = sourceGroup.fragmentIds.filter(id => id !== fragId);
      if (sourceGroup.fragmentIds.length === 0) {
        this.groups = this.groups.filter(g => g.id !== sourceGroup.id);
        this.renderer.removeGroup(sourceGroup.id);
      }
    } else {
      this.renderer.removeFragments([fragId]);
    }
    
    group.fragmentIds.unshift(fragId);
    group.x -= size;
    
    this.renderer.removeGroup(group.id);
    const fragsData = group.fragmentIds.map(id => this.engine.getFragmentById(id)!).filter(Boolean);
    this.renderer.createGroup(group.id, fragsData, group.x, group.y);
    
    this.checkGroupCompletion(group.id);
  }

  private addFragmentToGroupEnd(group: Group, fragId: string): void {
    const frag = this.engine.getFragmentById(fragId);
    if (!frag) return;
    
    const sourceGroup = this.findGroupContainingFragment(fragId);
    if (sourceGroup) {
      sourceGroup.fragmentIds = sourceGroup.fragmentIds.filter(id => id !== fragId);
      if (sourceGroup.fragmentIds.length === 0) {
        this.groups = this.groups.filter(g => g.id !== sourceGroup.id);
        this.renderer.removeGroup(sourceGroup.id);
      }
    } else {
      this.renderer.removeFragments([fragId]);
    }
    
    group.fragmentIds.push(fragId);
    
    this.renderer.removeGroup(group.id);
    const fragsData = group.fragmentIds.map(id => this.engine.getFragmentById(id)!).filter(Boolean);
    this.renderer.createGroup(group.id, fragsData, group.x, group.y);
    
    this.checkGroupCompletion(group.id);
  }

  private mergeGroups(groupA: Group, groupB: Group): void {
    groupA.fragmentIds.push(...groupB.fragmentIds);
    this.groups = this.groups.filter(g => g.id !== groupB.id);
    this.renderer.removeGroup(groupB.id);
    
    this.renderer.removeGroup(groupA.id);
    const fragsData = groupA.fragmentIds.map(id => this.engine.getFragmentById(id)!).filter(Boolean);
    this.renderer.createGroup(groupA.id, fragsData, groupA.x, groupA.y);
    
    this.checkGroupCompletion(groupA.id);
  }

  private checkGroupCompletion(groupId: string): void {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const poem = this.engine.getPoemById(group.poemId);
    if (!poem) return;
    
    if (group.fragmentIds.length === poem.text.length) {
      const sorted = [...group.fragmentIds].sort((a, b) => {
        const fa = this.engine.getFragmentById(a);
        const fb = this.engine.getFragmentById(b);
        return (fa?.positionInPoem || 0) - (fb?.positionInPoem || 0);
      });
      
      const chars = sorted.map(id => this.engine.getFragmentById(id)?.char || '');
      const completedPoem = this.engine.checkGroupFormsPoem(chars);
      
      if (completedPoem) {
        this.onPoemCompleted(completedPoem, group);
      }
    }
  }

  private onPoemCompleted(poem: Poem, group: Group): void {
    this.engine.markPoemCompleted(poem.id);
    this.groups = this.groups.filter(g => g.id !== group.id);
    this.renderer.removeGroup(group.id);
    
    const remainingFragIds: string[] = [];
    for (const frag of this.currentFragments) {
      if (frag.poemId !== poem.id) {
        const inGroup = this.groups.some(g => g.fragmentIds.includes(frag.id));
        if (!inGroup) remainingFragIds.push(frag.id);
      }
    }
    
    this.currentFragments = this.currentFragments.filter(f => f.poemId !== poem.id);
    
    const rect = this.renderer.getCanvasRect();
    this.renderer.createPoemCard(
      poem,
      rect.width / 2 - 100,
      rect.height / 2 - 25,
      this.engine.getCompletedPoems()
    );
    
    this.renderer.startPoemAnimation(poem);
    this.updateProgress();
    
    if (this.engine.isAllCompleted()) {
      setTimeout(() => {
        this.onAllPoemsCompleted();
      }, 6000);
    } else if (this.currentFragments.length === 0) {
      setTimeout(() => {
        this.loadNextBatch();
      }, 6000);
    }
  }

  private isFragmentInCompletedPoem(fragId: string): boolean {
    const frag = this.engine.getFragmentById(fragId);
    if (!frag) return true;
    return this.engine.getCompletedPoems().some(p => p.id === frag.poemId);
  }

  private onAllPoemsCompleted(): void {
    this.renderer.clearFragments();
    this.renderer.hideAllPoemCards();
    this.titleBanner.classList.add('visible');
    this.renderer.startScrollAnimation();
  }

  private updateProgress(): void {
    const total = this.engine.getTotalPoems();
    const completed = this.engine.getCompletedCount();
    this.progressText.textContent = `${completed}/${total}`;
    const percent = total > 0 ? (completed / total) * 100 : 0;
    this.progressFill.style.width = percent + '%';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
