// 타입 정의
type Direction = "horizontal" | "vertical";

// 배치된 단어의 정보를 저장하는 인터페이스
interface PlacedWord {
	text: string;
	row: number;
	col: number;
	direction: Direction;
}

// 좌표를 키로 사용하는 그리드 맵
// 예: '3,5' -> '가'
type Grid = Map<string, string>;

/**
 * 단어 배열을 받아 크로스워드 맵을 생성합니다.
 * @param words 크로스워드를 만들 단어들의 배열
 * @returns 생성된 크로스워드 맵 (string[][])
 */
export function generateCrossword(words: string[]): string[][] {
	if (!words || words.length === 0) {
		return [[]];
	}

	// 1. 단어를 길이를 기준으로 내림차순 정렬
	const sortedWords = [...words].sort((a, b) => b.length - a.length);

	const placedWords: PlacedWord[] = [];
	const grid: Grid = new Map();
	const wordsToPlace = [...sortedWords];

	// 2. 가장 긴 단어를 (0, 0) 위치에 가로로 배치
	const firstWord = wordsToPlace.shift();
	if (!firstWord) return [[]];

	for (let i = 0; i < firstWord.length; i++) {
		grid.set(`0,${i}`, firstWord[i]);
	}
	placedWords.push({
		text: firstWord,
		row: 0,
		col: 0,
		direction: "horizontal",
	});

	// 3. 나머지 단어들을 배치
	let attempts = 0;
	while (wordsToPlace.length > 0 && attempts < wordsToPlace.length) {
		const wordToPlace = wordsToPlace.shift();
		if (!wordToPlace) throw new Error("wordsToPlace에 값이 없습니다.");
		const bestFit = findBestFit(wordToPlace, placedWords, grid);

		if (bestFit) {
			// 단어를 그리드에 배치
			placeWordOnGrid(wordToPlace, bestFit, grid);
			placedWords.push({ ...bestFit, text: wordToPlace });
			attempts = 0; // 성공했으므로 시도 횟수 초기화
		} else {
			// 적절한 위치를 찾지 못하면 다시 큐에 넣음
			wordsToPlace.push(wordToPlace);
			attempts++;
		}
	}

	// 4. Map 형태의 그리드를 string[][] 형태로 변환
	return convertGridToArray(grid);
}

/**
 * 단어를 배치할 최적의 위치를 찾습니다.
 */
function findBestFit(word: string, placedWords: PlacedWord[], grid: Grid) {
	for (const placed of placedWords) {
		for (let i = 0; i < placed.text.length; i++) {
			for (let j = 0; j < word.length; j++) {
				if (placed.text[i] === word[j]) {
					const newDirection =
						placed.direction === "horizontal" ? "vertical" : "horizontal";
					let newRow: number, newCol: number;

					if (newDirection === "vertical") {
						newRow = placed.row - j;
						newCol = placed.col + i;
					} else {
						newRow = placed.row + i;
						newCol = placed.col - j;
					}

					if (canPlaceWordAt(word, newRow, newCol, newDirection, grid)) {
						// 여기서는 첫 번째 유효한 위치를 바로 반환 (더 복잡한 로직 가능)
						return {
							row: newRow,
							col: newCol,
							direction: newDirection,
						} as const;
					}
				}
			}
		}
	}
	return null;
}

/**
 * 해당 위치에 단어를 배치할 수 있는지 검사합니다.
 */
function canPlaceWordAt(
	word: string,
	row: number,
	col: number,
	direction: Direction,
	grid: Grid,
): boolean {
	for (let i = 0; i < word.length; i++) {
		const r = direction === "vertical" ? row + i : row;
		const c = direction === "horizontal" ? col + i : col;
		const key = `${r},${c}`;
		const intersectingChar = grid.get(key);

		if (intersectingChar) {
			// 교차점의 글자가 다른 경우
			if (intersectingChar !== word[i]) {
				return false;
			}
		} else {
			// 교차점이 아닌데 다른 글자가 있는 경우
			// 단어가 나란히 붙는 것을 방지
			if (direction === "horizontal") {
				if (grid.has(`${r - 1},${c}`) || grid.has(`${r + 1},${c}`)) {
					return false;
				}
			} else {
				// vertical
				if (grid.has(`${r},${c - 1}`) || grid.has(`${r},${c + 1}`)) {
					return false;
				}
			}
		}
	}

	// 단어의 시작점 바로 전이나 끝점 바로 다음이 막혀있는지 확인
	if (direction === "horizontal") {
		if (
			grid.has(`${row},${col - 1}`) ||
			grid.has(`${row},${col + word.length}`)
		) {
			return false;
		}
	} else {
		// vertical
		if (
			grid.has(`${row - 1},${col}`) ||
			grid.has(`${row + word.length},${col}`)
		) {
			return false;
		}
	}

	return true;
}

/**
 * 계산된 위치에 실제 단어를 그리드에 추가합니다.
 */
function placeWordOnGrid(
	word: string,
	placement: { row: number; col: number; direction: Direction },
	grid: Grid,
) {
	for (let i = 0; i < word.length; i++) {
		const r =
			placement.direction === "vertical" ? placement.row + i : placement.row;
		const c =
			placement.direction === "horizontal" ? placement.col + i : placement.col;
		grid.set(`${r},${c}`, word[i]);
	}
}

/**
 * 좌표 기반의 Map을 2D 문자열 배열로 변환합니다.
 */
function convertGridToArray(grid: Grid): string[][] {
	if (grid.size === 0) return [[]];

	let minRow = Infinity,
		maxRow = -Infinity,
		minCol = Infinity,
		maxCol = -Infinity;

	for (const key of grid.keys()) {
		const [r, c] = key.split(",").map(Number);
		minRow = Math.min(minRow, r);
		maxRow = Math.max(maxRow, r);
		minCol = Math.min(minCol, c);
		maxCol = Math.max(maxCol, c);
	}

	const height = maxRow - minRow + 1;
	const width = maxCol - minCol + 1;
	const arrayGrid: string[][] = Array.from({ length: height }, () =>
		Array(width).fill(""),
	);

	for (const [key, value] of grid.entries()) {
		const [r, c] = key.split(",").map(Number);
		arrayGrid[r - minRow][c - minCol] = value;
	}

	return arrayGrid;
}
