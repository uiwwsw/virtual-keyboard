import { describe, expect, it } from "vitest";
import { EditHistory } from "./history.js";
import { insertText, type EditingState } from "./editing.js";
const initial: EditingState = {
  value: "",
  caret: 0,
  anchor: 0,
  composing: false,
};
describe("edit history", () => {
  it("undoes and redoes a Korean composition as a single edit", () => {
    const history = new EditHistory();
    let state = initial;
    for (const text of ["ㅎ", "ㅏ", "ㄴ"]) {
      const next = insertText(state, text, true);
      history.record(state, next);
      state = next;
    }
    expect(state.value).toBe("한");
    const undone = history.undo(state);
    expect(undone.value).toBe("");
    expect(history.redo(undone).value).toBe("한");
  });
  it("discards redo after a new edit and supports external resets", () => {
    const history = new EditHistory();
    const a = insertText(initial, "a");
    history.record(initial, a);
    const empty = history.undo(a);
    const b = insertText(empty, "b");
    history.record(empty, b);
    expect(history.redo(b).value).toBe("b");
    history.clear();
    expect(history.undo(b).value).toBe("b");
  });
});
