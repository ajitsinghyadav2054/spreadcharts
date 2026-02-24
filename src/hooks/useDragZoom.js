import { useState, useEffect, useRef, useCallback, createElement } from 'react';

// ============================================================
// useDragZoom — Custom Left-Click Box Zoom Hook
//
// Replaces default Panning with "Draw a Box to Zoom" interaction.
//
// How it works:
// 1. Listens for mousedown on the chart container.
// 2. Tracks mouse movement to draw a visual selection box.
// 3. On mouseup, calculates the time range (logical indices) covered
//    by the box width and applies it to the chart.
//
// Usage:
// const { handleMouseDown, selectionBox } = useDragZoom(chartRef, containerRef);
// <div onMouseDown={handleMouseDown}> ... {selectionBox} </div>
// ============================================================

export function useDragZoom(chartRef, containerRef, { onZoomBoxUpdate, externalZoomBox } = {}) {
    const [isDragging, setIsDragging] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [currentPoint, setCurrentPoint] = useState(null);

    // Mouse Down: Start the drag
    const handleMouseDown = useCallback((e) => {
        // Only trigger on Left Click (button 0)
        if (e.button !== 0) return;

        // Prevent default text selection
        e.preventDefault();

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setStartPoint({ x, y });
        setCurrentPoint({ x, y });
        setIsDragging(true);

        // Notify parent of start
        if (onZoomBoxUpdate) {
            onZoomBoxUpdate({ left: x, width: 0 });
        }
    }, [containerRef, onZoomBoxUpdate]);

    // Mouse Move: Update selection box
    useEffect(() => {
        if (!isDragging) return;

        const onMouseMove = (e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            setCurrentPoint({ x, y });

            // Notify parent of update
            if (onZoomBoxUpdate && startPoint) {
                const left = Math.min(startPoint.x, x);
                const width = Math.abs(x - startPoint.x);
                onZoomBoxUpdate({ left, width });
            }
        };

        const onMouseUp = () => {
            if (!isDragging || !chartRef.current || !startPoint || !currentPoint) {
                setIsDragging(false);
                // Clear external box
                if (onZoomBoxUpdate) onZoomBoxUpdate(null);
                return;
            }

            // Calculate Zoom Region
            const chart = chartRef.current;
            const timeScale = chart.timeScale();

            const leftX = Math.min(startPoint.x, currentPoint.x);
            const rightX = Math.max(startPoint.x, currentPoint.x);

            if (rightX - leftX > 10) {
                const fromLogical = timeScale.coordinateToLogical(leftX);
                const toLogical = timeScale.coordinateToLogical(rightX);

                console.log('[DragZoom] Coordinates:', { leftX, rightX });
                console.log('[DragZoom] Logical:', { fromLogical, toLogical });

                if (fromLogical !== null && toLogical !== null) {
                    try {
                        timeScale.setVisibleLogicalRange({
                            from: fromLogical,
                            to: toLogical,
                        });
                        console.log('[DragZoom] Successfully set logical range');
                    } catch (e) {
                        console.error('[DragZoom] Failed to set range:', e);
                    }
                }
            }

            // Reset state
            setIsDragging(false);
            setStartPoint(null);
            setCurrentPoint(null);

            // Clear external box
            if (onZoomBoxUpdate) onZoomBoxUpdate(null);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, startPoint, currentPoint, chartRef, containerRef, onZoomBoxUpdate]);

    // Determine Box Style (Local or External)
    let boxStyle = null;

    if (isDragging && startPoint && currentPoint) {
        // Local Dragging
        const left = Math.min(startPoint.x, currentPoint.x);
        const width = Math.abs(currentPoint.x - startPoint.x);
        boxStyle = { left, width };
    } else if (externalZoomBox) {
        // Remote Dragging (Sync)
        boxStyle = { left: externalZoomBox.left, width: externalZoomBox.width };
    }

    // Visual Selection Box Component
    const selectionBox = boxStyle ? (
        createElement('div', {
            style: {
                position: 'absolute',
                left: boxStyle.left,
                top: 0,
                width: boxStyle.width,
                height: '100%',
                background: 'rgba(74, 144, 217, 0.2)',
                borderLeft: '1px solid rgba(74, 144, 217, 0.6)',
                borderRight: '1px solid rgba(74, 144, 217, 0.6)',
                pointerEvents: 'none',
                zIndex: 100,
            }
        })
    ) : null;

    return { handleMouseDown, selectionBox };
}
