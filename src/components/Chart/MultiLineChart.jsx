import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';
import { useSelector } from 'react-redux';
import { useDragZoom } from '../../hooks/useDragZoom';
import { formatPrice } from '../../utils/formatters';

// ============================================================
// MultiLineChart — Renders multiple overlaying line series
//
// - Locked chart (no scroll/pan)
// - Red crosshair synced with sub-charts
// - Floating tooltip showing each series' value at crosshair
// - Shared drag-to-zoom
// - Double-click = reset zoom
// ============================================================

const COLORS = ['#2962FF', '#E91E63', '#4CAF50', '#FFC107', '#9C27B0'];

export default function MultiLineChart({
    seriesConfig = [],
    chartRef,
    firstSeriesRef,
    zoomBox,
    setZoomBox
}) {
    const containerRef = useRef(null);
    const localChartRef = useRef(null);
    const seriesListRef = useRef([]);
    const instrumentsMap = useSelector((state) => state.chartData.instruments);
    const instrumentsRef = useRef(instrumentsMap);
    instrumentsRef.current = instrumentsMap;

    // State for legend values (key: config.id, value: price)
    const [legendValues, setLegendValues] = useState({});

    // Keep track of the "Last" values (most recent) to fallback to when not hovering
    const lastValuesRef = useRef({});

    // Shared drag-to-zoom hook (syncs with sub-charts via zoomBox/setZoomBox)
    const { handleMouseDown, selectionBox } = useDragZoom(localChartRef, containerRef, {
        onZoomBoxUpdate: setZoomBox,
        externalZoomBox: zoomBox,
    });

    useEffect(() => {
        if (!containerRef.current) return;
        if (!seriesConfig || seriesConfig.length === 0) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#161a25' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
            },
            timeScale: {
                borderColor: '#2B2B43',
                timeVisible: true,
                secondsVisible: false,
                uniformDistribution: true,
                fixLeftEdge: true,
                fixRightEdge: true,
                minBarSpacing: 0.5,
                rightOffset: 10,
                barSpacing: 6,
            },
            rightPriceScale: {
                borderColor: '#2B2B43',
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            crosshair: {
                mode: 0, // CrosshairMode.Normal — Magnet mode (1) ignores horzLine.visible
                vertLine: {
                    color: '#ef5350',
                    width: 1,
                    style: 0,
                    labelBackgroundColor: '#ef5350',
                },
                horzLine: {
                    visible: false,
                    labelVisible: false,
                },
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
            handleScroll: false,
        });

        localChartRef.current = chart;
        if (chartRef) chartRef.current = chart;

        // Add series
        const iMap = instrumentsRef.current;
        const seriesList = [];
        const newLastValues = {};

        seriesConfig.forEach((config, idx) => {
            const scaleId = `scale-${idx}`;
            const color = COLORS[idx % COLORS.length];

            // Debug mapping
            // const hasData = !!iMap[config.id]?.data?.length;
            // console.log(`Series ${idx}: ${config.id} - Data found: ${hasData}`);


            const series = chart.addSeries(LineSeries, {
                color,
                lineWidth: 2,
                title: '',
                crosshairMarkerVisible: true,
                lastValueVisible: false,   // Disabled — we use createPriceLine instead
                priceLineVisible: false,   // Disable built-in price line
                priceScaleId: scaleId,
            });

            const position = idx % 2 === 0 ? 'right' : 'left';
            chart.priceScale(scaleId).applyOptions({
                visible: true,
                borderColor: color,
                scaleMargins: { top: 0.1, bottom: 0.1 },
                autoScale: true,
                position,
            });

            const instrumentData = iMap[config.id];
            let lineData = [];
            if (instrumentData?.data) {
                lineData = instrumentData.data
                    .map(d => {
                        // Normalize time to midnight UTC to ensure alignment across series
                        let time = d.time;
                        if (typeof time === 'string') {
                            const date = new Date(time);
                            // Zero out time part to ensure daily alignment
                            time = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
                        } else if (typeof time === 'number') {
                            // Assume unix timestamp, flatten to midnight?
                            // If it's > 2000000000 (ms) vs < (s), handle it.
                            if (time > 10000000000) time = time / 1000;
                            const date = new Date(time * 1000);
                            time = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
                        }
                        return {
                            time: time,
                            value: d.value !== undefined ? d.value : (d.close !== undefined ? d.close : null)
                        };
                    })
                    .filter(d => d.time && d.value !== null && !isNaN(d.value) && isFinite(d.value))
                    .sort((a, b) => a.time - b.time);
            }
            // Remove duplicates if any (merging overlapping days?)
            // Simple approach: Use a Map to keep last value for each time
            const uniqueMap = new Map();
            lineData.forEach(item => uniqueMap.set(item.time, item));
            lineData = Array.from(uniqueMap.values()).sort((a, b) => a.time - b.time);

            // Capture last value
            series.setData(lineData);
            const lastVal = lineData.length > 0 ? lineData[lineData.length - 1].value : null;
            newLastValues[config.id] = lastVal;

            // Show Y-axis price label WITHOUT any horizontal line:
            // lineVisible:false hides the horizontal line; axisLabelVisible:true keeps the Y-axis box.
            // This is confirmed in the v5.1.0 source: CustomPriceLinePaneView checks !lineOptions.lineVisible
            if (lastVal !== null) {
                series.createPriceLine({
                    price: lastVal,
                    color,
                    lineWidth: 1,
                    lineStyle: 0,
                    lineVisible: false,
                    axisLabelVisible: true,
                    title: '',
                });
            }

            seriesList.push({ series, config, color });
        });

        seriesListRef.current = seriesList;
        lastValuesRef.current = newLastValues;
        setLegendValues(newLastValues); // Init legend with last values

        if (firstSeriesRef && seriesList.length > 0) {
            firstSeriesRef.current = seriesList[0].series;
        }
        try { chart.timeScale().fitContent(); } catch (e) { }

        // Crosshair move listener
        chart.subscribeCrosshairMove((param) => {
            if (!param || !param.point || !param.seriesData) {
                // Revert to last values when crosshair leaves
                setLegendValues(lastValuesRef.current);
                return;
            }

            const currentValues = {};
            // Start with last values as base? No, show what we have, else empty.
            // Actually, for a nicer UX, if a series is missing at this point, show "—"

            seriesList.forEach(({ series, config }) => {
                const val = param.seriesData.get(series);
                if (val && val.value !== undefined) {
                    currentValues[config.id] = val.value;
                } else {
                    currentValues[config.id] = undefined; // Mark as missing for this specific timestamp
                }
            });

            setLegendValues(currentValues);
        });

        // Double-click to reset zoom
        const container = containerRef.current;
        const onDblClick = () => chart.timeScale().fitContent();
        container.addEventListener('dblclick', onDblClick);

        // Resize observer
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        ro.observe(container);

        return () => {
            container.removeEventListener('dblclick', onDblClick);
            ro.disconnect();
            chart.remove();
            localChartRef.current = null;
            seriesListRef.current = [];
            if (chartRef) chartRef.current = null;
        };
    }, [seriesConfig]);

    return (
        <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                cursor: 'crosshair',
            }}
        >
            {/* Shared zoom selection box */}
            {selectionBox}

            {/* Static Legend (Top-Left) with Values */}
            <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 10,
                display: 'flex',
                gap: '16px', // Horizontal layout for cleaner look, or column?
                pointerEvents: 'none',
                background: 'rgba(26, 26, 46, 0.8)',
                padding: '8px 12px',
                borderRadius: '6px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                flexWrap: 'wrap',
                maxWidth: '90%'
            }}>
                {seriesConfig.map((config, idx) => {
                    const price = legendValues[config.id];
                    const color = COLORS[idx % COLORS.length];
                    return (
                        <div key={config.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}></div>
                            <span style={{ color: '#aaa', fontWeight: 500 }}>{config.label || config.id}</span>
                            <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>
                                {price !== undefined && price !== null ? formatPrice(price) : '—'}
                            </span>
                        </div>
                    );
                })}
            </div>

            {(!seriesConfig || seriesConfig.length === 0) && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#666', fontSize: '14px', pointerEvents: 'none',
                }}>
                    No Series Selected
                </div>
            )}
        </div>
    );
}
