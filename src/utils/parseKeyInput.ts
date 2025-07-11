import { convertQwertyToHangul } from "es-hangul";
import { isHangul } from "./isHangul";

/**
 * 키 입력 이벤트를 해석해서 실제 삽입할 문자열을 반환함
 * - 한글 모드 토글 감지 (Windows만)
 * - 조합 여부 판단 (macOS는 키 값 기반)
 */
export function parseKeyInput(
	e: React.KeyboardEvent | KeyboardEvent,
	hangulMode: boolean,
): {
	handled: boolean;
	toggleHangulMode?: boolean;
	text?: string;
	composing?: boolean;
} {
	const isMac = navigator.userAgent.includes("Mac");

	// 윈도우: 한영 전환 키
	if (!isMac && e.key === "HangulMode") {
		return { handled: true, toggleHangulMode: true };
	}

	const ignoredKeys = new Set([
		"Shift",
		"Control",
		"Alt",
		"Meta",
		"CapsLock",
		"Enter",
		"Tab",
		"ArrowUp",
		"ArrowDown",
		"ArrowLeft",
		"ArrowRight",
		"Backspace",
		"Delete",
		"Unidentified",
	]);
	if (ignoredKeys.has(e.key)) {
		return { handled: false };
	}
	// --- macOS ---
	if (isMac) {
		if (isHangul(e.key)) {
			return {
				handled: true,
				text: e.key,
				composing: true,
			};
		} else {
			return {
				handled: true,
				text: e.key,
				composing: false,
			};
		}
	}

	// --- Windows ---
	if (hangulMode) {
		return {
			handled: true,
			text: isHangul(e.key) ? e.key : convertQwertyToHangul(e.key),
			composing: true,
		};
	}

	return {
		handled: true,
		text: e.key,
		composing: false,
	};
}
