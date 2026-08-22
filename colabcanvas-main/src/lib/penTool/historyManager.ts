// Generic undo/redo stack with immutable snapshots

export class History<T> {
  private stack: T[] = [];
  private index = -1;
  private maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  push(state: T): void {
    // Truncate any redo states
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(structuredClone(state));
    this.index++;

    // Trim oldest if exceeding max
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
      this.index--;
    }
  }

  undo(): T | null {
    if (this.index <= 0) return null;
    this.index--;
    return structuredClone(this.stack[this.index]);
  }

  redo(): T | null {
    if (this.index >= this.stack.length - 1) return null;
    this.index++;
    return structuredClone(this.stack[this.index]);
  }

  current(): T | null {
    if (this.index < 0) return null;
    return structuredClone(this.stack[this.index]);
  }

  canUndo(): boolean {
    return this.index > 0;
  }

  canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  clear(): void {
    this.stack = [];
    this.index = -1;
  }
}
