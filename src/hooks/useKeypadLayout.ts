import { useCallback, useRef } from "react";
import { convertQwertyToHangul } from "es-hangul";

export type KeypadLayout = {
    label: string;
    value: string;
    width?: number;
    height?: number;
    type?: string;
}[][];

export type Viewport = {
    width: number;
    height: number;
    scale: number;
    offsetLeft: number;
    offsetTop: number;
};

export type KeyBounds = {
    x: number;
    y: number;
    w: number;
    h: number;
    value: string;
    type?: string;
    label: string;
    rowIndex: number;
    colIndex: number;
    isAction: boolean;
};

export function useKeypadLayout({
    layout,
    viewport,
    hangulMode,
    shift
}: {
    layout: KeypadLayout;
    viewport: Viewport;
    hangulMode: boolean;
    shift: boolean;
}) {
    const keyBoundsRef = useRef<KeyBounds[]>([]);

    const getTransformedValue = useCallback(
        (cell: { label?: string; value: string; type?: string }) => {
            if (cell.type === "char") {
                const isConvertibleHangulSource =
                    hangulMode && /[a-zA-Z]/.test(cell.value) && cell.value.length === 1;

                if (isConvertibleHangulSource) {
                    return convertQwertyToHangul(cell.value);
                }
                if (shift) {
                    return cell.value.toUpperCase();
                }
                return cell.value;
            }
            return cell.label ?? cell.value;
        },
        [hangulMode, shift],
    );

    const calculateLayout = useCallback(() => {
        if (!layout) return [];

        const scale = viewport.scale;
        const compactRatio = Math.max(0, Math.min(1, (viewport.width - 260) / 140));

        const padding = (2 + (10 - 2) * compactRatio) / scale;
        const gap = (2 + (8 - 2) * compactRatio) / scale;

        const totalHeight = 200 / scale;

        // We assume usage within the standard container size logic for now
        // But the previous code used containerRef to get actual size if available.
        // For pure calculation based on props, we use viewport.width/height or defaults.
        // The original code used containerRef.current?.getBoundingClientRect() || viewport.
        // Moving this to a pure calculation based on passed viewport might lose the "real-time" DOM read
        // but typically viewport passed is what matters.
        // Let's rely on viewport.

        const width = viewport.width;
        const height = totalHeight;

        // Content Area
        const contentW = width - padding * 2;
        const contentH = height - padding * 2;

        const bounds: KeyBounds[] = [];

        const rowCount = layout.length;
        const rowHeight = (contentH - (rowCount - 1) * gap) / rowCount;

        let currentY = padding;

        layout.forEach((row, rowIndex) => {
            const rowWidth = contentW;
            const totalFlexGrow = row.reduce((acc, cell) => acc + (cell.width || 1), 0);
            const totalGapW = (row.length - 1) * gap;
            const availableW = rowWidth - totalGapW;

            const unitW = availableW / totalFlexGrow;

            let currentX = padding;

            row.forEach((cell, colIndex) => {
                const flex = cell.width || 1;
                const cellW = flex * unitW;

                bounds.push({
                    x: currentX,
                    y: currentY,
                    w: cellW,
                    h: rowHeight,
                    value: cell.value,
                    type: cell.type,
                    label: getTransformedValue(cell),
                    rowIndex,
                    colIndex,
                    isAction: cell.type === "action"
                });

                currentX += cellW + gap;
            });

            currentY += rowHeight + gap;
        });

        return bounds;
    }, [layout, viewport, getTransformedValue]);

    // Calculate once or when deps change, update ref
    // Actually the original code called calculateLayout() inside draw or checked if empty.
    // We can expose the function or the result.
    // Exposing the function is safer for canvas draw loop usage.

    return {
        keyBoundsRef,
        calculateLayout,
        getTransformedValue
    };
}
