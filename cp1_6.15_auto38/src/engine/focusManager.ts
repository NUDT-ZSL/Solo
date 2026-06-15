const MAX_HISTORY = 10;

class FocusManager {
  private historyStack: HTMLElement[] = [];

  pushFocus(element: HTMLElement | null): void {
    const startTime = performance.now();
    if (element) {
      this.historyStack.push(element);
      if (this.historyStack.length > MAX_HISTORY) {
        this.historyStack.shift();
      }
    }
    const elapsed = performance.now() - startTime;
    if (elapsed > 5) {
      console.warn(`FocusManager.pushFocus took ${elapsed.toFixed(2)}ms, expected < 5ms`);
    }
  }

  restoreFocus(): HTMLElement | null {
    const startTime = performance.now();
    const element = this.historyStack.pop() || null;
    if (element) {
      element.focus();
    }
    const elapsed = performance.now() - startTime;
    if (elapsed > 5) {
      console.warn(`FocusManager.restoreFocus took ${elapsed.toFixed(2)}ms, expected < 5ms`);
    }
    return element;
  }

  getCurrentFocus(): HTMLElement | null {
    return this.historyStack.length > 0
      ? this.historyStack[this.historyStack.length - 1]
      : null;
  }

  clearHistory(): void {
    this.historyStack = [];
  }

  getHistoryCount(): number {
    return this.historyStack.length;
  }
}

export const focusManager = new FocusManager();
