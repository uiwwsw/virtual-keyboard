import type { KeypadLayout } from "../hooks/useKeypadLayout";

export const selectionModeLayout: KeypadLayout = [
  [
    { label: "←", value: "ArrowLeft", type: "action" },
    { label: "→", value: "ArrowRight", type: "action" },
    { label: "⇤", value: "SelectionStart", type: "action" },
    { label: "⇥", value: "SelectionEnd", type: "action" }
  ],
  [
    { label: "Copy", value: "Copy", width: 1.4, type: "action" },
    { label: "Paste", value: "Paste", width: 1.4, type: "action" },
    { label: "Cut", value: "Cut", width: 1.2, type: "action" },
    { label: "⌫", value: "Backspace", type: "action" }
  ],
  [
    { label: "ABC", value: "ExitSelectionMode", width: 1.4, type: "action" },
    { label: "␣", value: " ", width: 2.2, type: "action" },
    { label: "🌐", value: "HangulMode", type: "action" },
    { label: "⏎", value: "\n", type: "action" }
  ]
];
