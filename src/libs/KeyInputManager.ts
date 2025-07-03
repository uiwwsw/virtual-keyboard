// /lib/KeyInputManager.ts
import { assemble, convertQwertyToHangul } from "es-hangul";
import { isHangul } from "../utils/isHangul";
import type { KeyboardEvent } from "react";

export interface KeyInputManagerOptions {
	letters: string;
	caretIndex: number;
	hangulMode: boolean;
	isAllSelected: boolean;
	onUpdate: (next: {
		letters: string;
		caretIndex: number;
		isAllSelected?: boolean;
	}) => void;
}

export class KeyInputManager {
	private letters: string;
	private caretIndex: number;
	private hangulMode: boolean;
	private isAllSelected: boolean;
	private onUpdate: KeyInputManagerOptions["onUpdate"];

	constructor(options: KeyInputManagerOptions) {
		this.letters = options.letters;
		this.caretIndex = options.caretIndex;
		this.hangulMode = options.hangulMode;
		this.isAllSelected = options.isAllSelected;
		this.onUpdate = options.onUpdate;
	}

	public handleKeyDown(e: KeyboardEvent) {
		if (e.key === "HangulMode") {
			this.hangulMode = !this.hangulMode;
			return this.emit();
		}

		if ((e.ctrlKey || e.metaKey) && e.key === "a") {
			e.preventDefault();
			this.isAllSelected = true;
			return this.emit();
		}

		if ((e.ctrlKey || e.metaKey) && e.key === "c") {
			if (this.isAllSelected) {
				e.preventDefault();
				navigator.clipboard.writeText(this.letters);
			}
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.key === "v") {
			// 붙여넣기는 React에서 직접 처리 (ClipboardEvent)
			return;
		}

		if (this.isAllSelected) {
			return this.handleReplaceAll(e);
		}

		this.handleDefaultInput(e);
		this.emit();
	}

	private handleReplaceAll(e: KeyboardEvent) {
		if (this.isControlKey(e.key)) return;

		switch (e.key) {
			case "Backspace":
			case "Delete":
				this.letters = "";
				this.caretIndex = 0;
				this.isAllSelected = false;
				break;
			default:
				this.letters = e.key;
				this.caretIndex = 1;
				this.isAllSelected = false;
		}

		this.emit();
	}

	private handleDefaultInput(e: KeyboardEvent) {
		if (this.isControlKey(e.key)) return;

		switch (e.key) {
			case "Backspace":
				if (this.caretIndex > 0) {
					this.letters =
						this.letters.slice(0, this.caretIndex - 1) +
						this.letters.slice(this.caretIndex);
					this.caretIndex -= 1;
				}
				break;

			case "Delete":
				this.letters =
					this.letters.slice(0, this.caretIndex) +
					this.letters.slice(this.caretIndex + 1);
				break;

			case "ArrowLeft":
				this.caretIndex = Math.max(0, this.caretIndex - 1);
				this.isAllSelected = false;
				break;

			case "ArrowRight":
				this.caretIndex = Math.min(this.letters.length, this.caretIndex + 1);
				this.isAllSelected = false;
				break;

			default:
				this.insertKey(e.key);
		}
	}

	private insertKey(key: string) {
		const prev = this.letters[this.caretIndex - 1];

		if (this.hangulMode) {
			const hangulKey = convertQwertyToHangul(key);
			if (isHangul(prev)) {
				const combined = assemble([prev, hangulKey]).split("");
				this.letters =
					this.letters.slice(0, this.caretIndex - 1) +
					combined.join("") +
					this.letters.slice(this.caretIndex);
				this.caretIndex = this.caretIndex - 1 + combined.length;
			} else {
				this.letters =
					this.letters.slice(0, this.caretIndex) +
					hangulKey +
					this.letters.slice(this.caretIndex);
				this.caretIndex += 1;
			}
		} else if (isHangul(prev) && isHangul(key)) {
			const combined = assemble([prev, key]).split("");
			this.letters =
				this.letters.slice(0, this.caretIndex - 1) +
				combined.join("") +
				this.letters.slice(this.caretIndex);
			this.caretIndex = this.caretIndex - 1 + combined.length;
		} else {
			this.letters =
				this.letters.slice(0, this.caretIndex) +
				key +
				this.letters.slice(this.caretIndex);
			this.caretIndex += 1;
		}
	}

	private isControlKey(key: string) {
		return [
			"Shift",
			"CapsLock",
			"Control",
			"Alt",
			"Meta",
			"Enter",
			"Tab",
			"Unidentified",
			"ArrowUp",
			"ArrowDown",
		].includes(key);
	}

	private emit() {
		this.onUpdate({
			letters: this.letters,
			caretIndex: this.caretIndex,
			isAllSelected: this.isAllSelected,
		});
	}
}
