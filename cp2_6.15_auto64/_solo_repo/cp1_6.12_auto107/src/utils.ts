import { NoteCard, BoundingBox, CARD_WIDTH, CARD_MIN_HEIGHT, SNAP_THRESHOLD } from './types';

export function getGroupMembers(cardId: string, cards: NoteCard[]): NoteCard[] {
  const visited = new Set<string>();
  const result: NoteCard[] = [];
  const queue = [cardId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const card = cards.find(c => c.id === currentId);
    if (card) {
      result.push(card);
      for (const linkedId of card.linkedIds) {
        if (!visited.has(linkedId)) {
          queue.push(linkedId);
        }
      }
    }
  }

  return result;
}

export function getBoundingBox(cards: NoteCard[]): BoundingBox {
  if (cards.length === 0) {
    return { left: 0, right: 0, top: 0, bottom: 0 };
  }

  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const card of cards) {
    left = Math.min(left, card.x);
    right = Math.max(right, card.x + CARD_WIDTH);
    top = Math.min(top, card.y);
    bottom = Math.max(bottom, card.y + CARD_MIN_HEIGHT);
  }

  return { left, right, top, bottom };
}

export function getGroupBoundingBox(cardId: string, allCards: NoteCard[]): BoundingBox {
  const groupMembers = getGroupMembers(cardId, allCards);
  return getBoundingBox(groupMembers);
}

export function detectSnap(
  sourceBox: BoundingBox,
  targetCards: NoteCard[],
  allCards: NoteCard[],
  sourceId: string
): { dx: number; dy: number; targetId: string; edge: string } | null {
  let bestSnap: { dx: number; dy: number; targetId: string; edge: string } | null = null;
  let minDistance = SNAP_THRESHOLD;

  for (const target of targetCards) {
    if (target.id === sourceId) continue;

    const sourceMembers = getGroupMembers(sourceId, allCards);
    if (sourceMembers.some(m => m.id === target.id)) continue;

    const targetBox = getGroupBoundingBox(target.id, allCards);

    const rightToLeft = Math.abs(sourceBox.right - targetBox.left);
    if (rightToLeft < minDistance) {
      minDistance = rightToLeft;
      bestSnap = {
        dx: targetBox.left - sourceBox.right,
        dy: 0,
        targetId: target.id,
        edge: 'right'
      };
    }

    const leftToRight = Math.abs(sourceBox.left - targetBox.right);
    if (leftToRight < minDistance) {
      minDistance = leftToRight;
      bestSnap = {
        dx: targetBox.right - sourceBox.left,
        dy: 0,
        targetId: target.id,
        edge: 'left'
      };
    }

    const bottomToTop = Math.abs(sourceBox.bottom - targetBox.top);
    if (bottomToTop < minDistance) {
      minDistance = bottomToTop;
      bestSnap = {
        dx: 0,
        dy: targetBox.top - sourceBox.bottom,
        targetId: target.id,
        edge: 'bottom'
      };
    }

    const topToBottom = Math.abs(sourceBox.top - targetBox.bottom);
    if (topToBottom < minDistance) {
      minDistance = topToBottom;
      bestSnap = {
        dx: 0,
        dy: targetBox.bottom - sourceBox.top,
        targetId: target.id,
        edge: 'top'
      };
    }
  }

  return bestSnap;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function highlightText(text: string, keyword: string): string {
  if (!keyword.trim()) return escapeHtml(text);
  
  const escapedText = escapeHtml(text);
  const escapedKeyword = escapeHtml(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  
  return escapedText.replace(regex, '<span class="highlight">$1</span>');
}
