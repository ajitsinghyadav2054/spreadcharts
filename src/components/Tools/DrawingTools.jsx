import { useSelector } from 'react-redux';
import { selectDrawingMode } from '../../features/ui/uiSlice';

// ============================================================
// DrawingTools — manages drawing overlays on the chart
//
// Two drawing modes:
// 1. Trendline: click two points to draw a line between them
// 2. Horizontal: click one price level to draw a persistent line
//
// Horizontal lines use Lightweight Charts' createPriceLine() API
// Trendlines use an SVG overlay positioned on top of the chart
//
// The actual drawing logic is triggered by the drawingMode
// state in Redux (set by ChartToolbar)
// ============================================================

export default function DrawingTools({ chartRef, containerRef }) {
    const drawingMode = useSelector(selectDrawingMode);

    // When no drawing mode is active, render nothing
    if (!drawingMode) return null;

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 50,
                cursor: drawingMode === 'trendline' ? 'crosshair' : 'ew-resize',
                pointerEvents: 'auto',
            }}
            onClick={(e) => {
                if (!chartRef?.current) return;

                if (drawingMode === 'horizontal') {
                    // Get the price coordinate from the click position
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;

                    // Add a price line to the chart series
                    try {
                        const series = chartRef.current.series?.[0];
                        if (series) {
                            const price = series.coordinateToPrice(y);
                            if (price !== null) {
                                series.createPriceLine({
                                    price: price,
                                    color: '#4a90d9',
                                    lineWidth: 1,
                                    lineStyle: 2, // dashed
                                    axisLabelVisible: true,
                                    title: `${price.toFixed(4)}`,
                                });
                            }
                        }
                    } catch (err) {
                        console.log('Drawing: could not place horizontal line', err);
                    }
                }
            }}
        >
            {/* Drawing mode indicator */}
            <div style={{
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 12px',
                background: 'rgba(74, 144, 217, 0.9)',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                pointerEvents: 'none',
            }}>
                {drawingMode === 'trendline' ? '📐 Click two points for trendline' : '── Click to place horizontal line'}
            </div>
        </div>
    );
}
