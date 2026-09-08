/** Read only selections owned by this input; never adopt a selection elsewhere. */
export function readDOMSelection(text: HTMLElement) {
  const selection = text.ownerDocument.getSelection();
  if (
    !selection?.anchorNode ||
    !selection.focusNode ||
    !text.contains(selection.anchorNode) ||
    !text.contains(selection.focusNode)
  )
    return null;
  // WebKit can briefly retain a pre-edit offset after a text node shrinks.
  // Ignore that snapshot until the engine writes the new, valid selection.
  const valid = (node: Node, offset: number) =>
    offset >= 0 &&
    offset <=
      (node.nodeType === Node.TEXT_NODE
        ? (node.textContent?.length ?? 0)
        : node.childNodes.length);
  if (
    !valid(selection.anchorNode, selection.anchorOffset) ||
    !valid(selection.focusNode, selection.focusOffset)
  )
    return null;
  const offset = (node: Node, position: number) => {
    const range = text.ownerDocument.createRange();
    range.selectNodeContents(text);
    range.setEnd(node, position);
    return range.toString().length;
  };
  return {
    anchor: offset(selection.anchorNode, selection.anchorOffset),
    caret: offset(selection.focusNode, selection.focusOffset),
  };
}

export function writeDOMSelection(
  text: HTMLElement,
  anchor: number,
  caret: number,
) {
  const selection = text.ownerDocument.getSelection();
  if (!selection) return;
  const previous = readDOMSelection(text);
  if (previous?.anchor === anchor && previous.caret === caret) return;
  const point = (position: number): [Node, number] => {
    const walker = text.ownerDocument.createTreeWalker(
      text,
      NodeFilter.SHOW_TEXT,
    );
    let node = walker.nextNode();
    let remaining = position;
    while (node) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) return [node, remaining];
      remaining -= length;
      node = walker.nextNode();
    }
    return [text, text.childNodes.length];
  };
  const [anchorNode, anchorOffset] = point(anchor);
  const [caretNode, caretOffset] = point(caret);
  selection.setBaseAndExtent(anchorNode, anchorOffset, caretNode, caretOffset);
}
