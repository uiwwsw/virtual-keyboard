import type { EditingState } from "./editing.js";

/** Per-input, bounded snapshots. A Hangul composition is one undo step. */
export class EditHistory {
  private past: EditingState[] = [];
  private future: EditingState[] = [];

  record(previous: EditingState, next: EditingState) {
    if (previous.value === next.value) return;
    if (!(previous.composing && next.composing && this.past.length)) {
      this.past.push({ ...previous, composing: false });
      if (this.past.length > 100) this.past.shift();
    }
    this.future = [];
  }
  undo(current: EditingState) {
    const previous = this.past.pop();
    if (!previous) return current;
    this.future.push({ ...current, composing: false });
    return previous;
  }
  redo(current: EditingState) {
    const next = this.future.pop();
    if (!next) return current;
    this.past.push({ ...current, composing: false });
    return next;
  }
  clear() {
    this.past = [];
    this.future = [];
  }
}
