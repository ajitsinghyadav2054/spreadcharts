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
// - Double-click on legend item = isolate that series only
// - Single-click on legend item  = toggle that series on/off
// - Double-click on chart canvas = reset zoom (fitContent)
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

    // ── Legend values (price at crosshair) ────────────────────
    const [legendValues, setLegendValues] = useState({});
    const lastValuesRef = useRef({});

    // ── Visible series tracking ────────────────────────────────
    // Initialise all series as visible
    const [visibleSeries, setVisibleSeries] = useState(
        () => new Set(seriesConfig.map(c => c.id))
    );
    // Reset visibility whenever the series config changes (new columns chosen)
    useEffect(() => {
        setVisibleSeries(new Set(seriesConfig.map(c => c.id)));
    }, [seriesConfig.map(c => c.id).join(',')]);

    // Apply visibility to actual lightweight-charts series whenever state changes
    useEffect(() => {
        seriesListRef.current.forEach(({ series, config }) => {
            try {
                series.applyOptions({ visible: visibleSeries.has(config.id) });
            } catch (_) { }
        });
    }, [visibleSeries]);

    // ── Click-timer for single vs double-click ─────────────────
    const clickTimerRef = useRef(null);

    const handleLegendItemClick = (configId) => {
        if (clickTimerRef.current) {
            // Second click within 260 ms ⟹ double-click → isolate
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            setVisibleSeries(new Set([configId]));
        } else {
            // Start timer; if no second click in 260 ms ⟹ single-click → toggle
            clickTimerRef.current = setTimeout(() => {
                clickTimerRef.current = null;
                setVisibleSeries(prev => {
                    const next = new Set(prev);
                    if (next.has(configId)) {
                        // Don't allow hiding the very last visible series
                        if (next.size === 1) return prev;
                        next.delete(configId);
                    } else {
                        next.add(configId);
                    }
                    return next;
                });
            }, 260);
        }
    };

    // ── Shared drag-to-zoom ────────────────────────────────────
    const { handleMouseDown, selectionBox } = useDragZoom(localChartRef, containerRef, {
        onZoomBoxUpdate: setZoomBox,
        externalZoomBox: zoomBox,
    });

    // ── Chart creation ─────────────────────────────────────────
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
                mode: 0,
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

            const series = chart.addSeries(LineSeries, {
                color,
                lineWidth: 2,
                title: '',
                crosshairMarkerVisible: true,
                lastValueVisible: false,
                priceLineVisible: false,
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
                        let time = d.time;
                        if (typeof time === 'string') {
                            const date = new Date(time);
                            time = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
                        } else if (typeof time === 'number') {
                            if (time > 10000000000) time = time / 1000;
                            const date = new Date(time * 1000);
                            time = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
                        }
                        return {
                            time,
                            value: d.value !== undefined ? d.value : (d.close !== undefined ? d.close : null)
                        };
                    })
                    .filter(d => d.time && d.value !== null && !isNaN(d.value) && isFinite(d.value))
                    .sort((a, b) => a.time - b.time);
            }

            const uniqueMap = new Map();
            lineData.forEach(item => uniqueMap.set(item.time, item));
            lineData = Array.from(uniqueMap.values()).sort((a, b) => a.time - b.time);

            series.setData(lineData);
            const lastVal = lineData.length > 0 ? lineData[lineData.length - 1].value : null;
            newLastValues[config.id] = lastVal;

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
        setLegendValues(newLastValues);

        if (firstSeriesRef && seriesList.length > 0) {
            firstSeriesRef.current = seriesList[0].series;
        }
        try { chart.timeScale().fitContent(); } catch (e) { }

        // Crosshair move listener
        chart.subscribeCrosshairMove((param) => {
            if (!param || !param.point || !param.seriesData) {
                setLegendValues(lastValuesRef.current);
                return;
            }
            const currentValues = {};
            seriesList.forEach(({ series, config }) => {
                const val = param.seriesData.get(series);
                if (val && val.value !== undefined) {
                    currentValues[config.id] = val.value;
                } else {
                    currentValues[config.id] = undefined;
                }
            });
            setLegendValues(currentValues);
        });

        // Double-click on the chart CANVAS resets zoom (fitContent)
        // (double-click on legend items is handled separately via pointer-events)
        const container = containerRef.current;
        const onDblClick = (e) => {
            // Only reset zoom when clicking the chart area itself (not legend)
            if (!e.target.closest('[data-legend-item]')) {
                chart.timeScale().fitContent();
            }
        };
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

    // ── Derive how many series are currently visible ───────────
    const allVisible = seriesConfig.every(c => visibleSeries.has(c.id));

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

            {/* ── Interactive Legend ─────────────────────────────── */}
            <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                pointerEvents: 'none',   // chart area passes through
                background: 'rgba(22, 26, 37, 0.88)',
                padding: '10px 14px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                maxWidth: '90%',
                backdropFilter: 'blur(4px)',
            }}>
                {/* Hint line — only shown when not all series visible */}
                {!allVisible && (
                    <div style={{
                        fontSize: '10px',
                        color: '#64748b',
                        fontStyle: 'italic',
                        pointerEvents: 'none',
                        marginBottom: '2px',
                    }}>
                        Double-click to isolate · Single-click to toggle
                    </div>
                )}
                {allVisible && (
                    <div style={{
                        fontSize: '10px',
                        color: '#475569',
                        fontStyle: 'italic',
                        pointerEvents: 'none',
                        marginBottom: '2px',
                    }}>
                        Double-click a series to isolate it
                    </div>
                )}

                {seriesConfig.map((config, idx) => {
                    const price = legendValues[config.id];
                    const color = COLORS[idx % COLORS.length];
                    const isVisible = visibleSeries.has(config.id);

                    return (
                        <div
                            key={config.id}
                            data-legend-item="true"
                            onClick={() => handleLegendItemClick(config.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                pointerEvents: 'auto',   // capture clicks
                                opacity: isVisible ? 1 : 0.35,
                                transition: 'opacity 0.2s ease, transform 0.1s ease',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                background: isVisible
                                    ? 'rgba(255,255,255,0.04)'
                                    : 'rgba(255,255,255,0.01)',
                                border: isVisible
                                    ? `1px solid ${color}33`
                                    : '1px solid transparent',
                                userSelect: 'none',
                            }}
                            title={isVisible
                                ? 'Double-click to isolate · Single-click to hide'
                                : 'Single-click to show'}
                        >
                            {/* Colour dot — strikethrough when hidden */}
                            <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: isVisible ? color : '#4a5568',
                                flexShrink: 0,
                                boxShadow: isVisible ? `0 0 5px ${color}66` : 'none',
                                transition: 'background 0.2s',
                            }} />

                            {/* Label */}
                            <span style={{
                                color: isVisible ? '#c8d4e3' : '#64748b',
                                fontWeight: 500,
                                textDecoration: isVisible ? 'none' : 'line-through',
                                transition: 'color 0.2s',
                                maxWidth: '220px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {config.label || config.id}
                            </span>

                            {/* Value */}
                            <span style={{
                                color: isVisible ? '#ffffff' : '#64748b',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                marginLeft: 'auto',
                                paddingLeft: '12px',
                                transition: 'color 0.2s',
                            }}>
                                {isVisible
                                    ? (price !== undefined && price !== null ? formatPrice(price) : '—')
                                    : '—'
                                }
                            </span>
                        </div>
                    );
                })}

                {/* "Show All" button — shown when any series is hidden */}
                {!allVisible && (
                    <div
                        data-legend-item="true"
                        onClick={() => setVisibleSeries(new Set(seriesConfig.map(c => c.id)))}
                        style={{
                            pointerEvents: 'auto',
                            marginTop: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(74,144,217,0.4)',
                            background: 'rgba(74,144,217,0.1)',
                            color: '#4a90d9',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                            letterSpacing: '0.04em',
                            userSelect: 'none',
                        }}
                        title="Show all series"
                    >
                        ↺ Show All
                    </div>
                )}
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
