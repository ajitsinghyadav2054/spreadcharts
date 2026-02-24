import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, CandlestickSeries } from 'lightweight-charts';
import { formatPrice } from '../../utils/formatters';
import { useDragZoom } from '../../hooks/useDragZoom';

// ============================================================
// CandlestickChart — the main price chart
//
// Features:
// - Red crosshair line (vertical + horizontal) like SpreadCharts
// - Floating OHLC tooltip box near the crosshair
// - Custom Left-Click Drag-to-Zoom (replaces default Pan)
// - Exposes chart + series refs for cross-chart sync
// ============================================================

export default function CandlestickChart({ data, chartRef, seriesRef: externalSeriesRef, zoomBox, setZoomBox }) {
    const containerRef = useRef(null);
    const internalChartRef = useRef(null);
    const seriesRef = useRef(null);

    // Custom Drag-to-Zoom Hook
    const { handleMouseDown, selectionBox } = useDragZoom(internalChartRef, containerRef, {
        onZoomBoxUpdate: setZoomBox,
        externalZoomBox: zoomBox,
    });

    // Tooltip state
    const [tooltip, setTooltip] = useState(null);

    // Create chart on mount
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            layout: {
                background: { color: '#1a1a2e' },
                textColor: '#e0e0e0',
                fontSize: 12,
            },
            grid: {
                vertLines: { color: 'rgba(42, 42, 74, 0.5)' },
                horzLines: { color: 'rgba(42, 42, 74, 0.5)' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: '#ef5350',       // RED vertical line
                    width: 1,
                    style: 0,               // solid
                    labelBackgroundColor: '#ef5350',
                },
                horzLine: {
                    color: '#ef5350',       // RED horizontal line
                    width: 1,
                    style: 2,               // dashed
                    labelBackgroundColor: '#ef5350',
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(42, 42, 74, 0.8)',
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: 'rgba(42, 42, 74, 0.8)',
                timeVisible: true,
                rightOffset: 0,
                barSpacing: 6,
                shiftVisibleRangeOnNewBar: false,
                allowShiftVisibleRangeOnNewBar: false,
                uniformDistribution: true,
                fixLeftEdge: true,
                fixRightEdge: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
            handleScroll: {
                vertTouchDrag: false,
                horzTouchDrag: false,
                pressedMouseMove: false,
                mouseWheel: true,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderUpColor: '#26a69a',
            borderDownColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        internalChartRef.current = chart;
        seriesRef.current = series;

        if (chartRef) chartRef.current = chart;
        if (externalSeriesRef) externalSeriesRef.current = series;

        // OHLC tooltip on crosshair move
        chart.subscribeCrosshairMove((param) => {
            if (!param || !param.time || !param.point || !param.seriesData) {
                setTooltip(null);
                return;
            }
            const values = param.seriesData.values();
            const candle = values.next()?.value;
            if (candle && candle.open !== undefined) {
                setTooltip({
                    x: param.point.x,
                    y: param.point.y,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                });
            } else {
                setTooltip(null);
            }
        });

        // Responsive resize
        const resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        resizeObserver.observe(containerRef.current);

        // Double-click to reset zoom
        const container = containerRef.current;
        const onDblClick = () => chart.timeScale().fitContent();
        container.addEventListener('dblclick', onDblClick);

        return () => {
            container.removeEventListener('dblclick', onDblClick);
            resizeObserver.disconnect();
            chart.remove();
            internalChartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    // Update data
    useEffect(() => {
        if (seriesRef.current && data && data.length > 0) {
            seriesRef.current.setData(
                data.map((d) => ({
                    time: d.time,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                }))
            );

            // Update extender series to include future range
            if (internalChartRef.current && internalChartRef.current.extenderSeries) {
                const lastTime = data[data.length - 1].time;
                // Add a point 1 year in the future
                // 365 days * 24 * 60 * 60 = 31536000 seconds
                const futureTime = lastTime + 31536000;
                internalChartRef.current.extenderSeries.setData([
                    { time: data[0].time, value: data[0].close },
                    { time: lastTime, value: data[data.length - 1].close },
                    { time: futureTime, value: data[data.length - 1].close }
                ]);
            }

            // Fit content to remove side spaces
            if (internalChartRef.current) {
                internalChartRef.current.timeScale().fitContent();
            }
        }
    }, [data]);

    const isUp = tooltip ? tooltip.close >= tooltip.open : true;
    const tooltipColor = isUp ? '#26a69a' : '#ef5350';

    return (
        <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '300px',
                position: 'relative',
                cursor: 'crosshair', // Indicate Zoom mode
            }}
        >
            {/* Custom Selection Box */}
            {selectionBox}

            {/* Floating OHLC Tooltip Box */}
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: Math.min(tooltip.x + 15, (containerRef.current?.clientWidth || 800) - 130),
                    top: Math.max(tooltip.y - 70, 5),
                    zIndex: 50,
                    background: 'rgba(30, 30, 58, 0.95)',
                    border: `1px solid ${tooltipColor}`,
                    borderRadius: '4px',
                    padding: '6px 10px',
                    pointerEvents: 'none',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    fontFamily: 'monospace',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap',
                }}>
                    <div style={{ color: tooltipColor }}>O: {formatPrice(tooltip.open)}</div>
                    <div style={{ color: tooltipColor }}>H: {formatPrice(tooltip.high)}</div>
                    <div style={{ color: tooltipColor }}>L: {formatPrice(tooltip.low)}</div>
                    <div style={{ color: tooltipColor }}>C: {formatPrice(tooltip.close)}</div>
                </div>
            )}
        </div>
    );
}
