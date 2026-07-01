import { useEffect, useRef, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { TICKER_LIST, TICKER_DATA_MAP } from '../../data/data';
import { selectInstrumentData, setInstrumentData } from '../../features/chartData/chartDataSlice';
import { formatPrice } from '../../utils/formatters';
import { useDragZoom } from '../../hooks/useDragZoom';
import { fetchOHLC } from '../../services/api';
import { aggregateToWeekly } from '../../utils/aggregator';

// ============================================================
// SubChart — a dynamic sub-chart panel below the main chart
// ============================================================

export default function SubChart({ id, chartRef, mainChartRef, seriesRef: externalSeriesRef, onRemove, onChartReady, zoomBox, setZoomBox, defaultInstrument }) {
    const dispatch = useDispatch();
    const containerRef = useRef(null);
    const outerRef = useRef(null); // for tooltip positioning
    const internalChartRef = useRef(null);
    const seriesRef = useRef(null);

    // Custom Drag-to-Zoom Hook
    const { handleMouseDown, selectionBox } = useDragZoom(internalChartRef, containerRef, {
        onZoomBoxUpdate: setZoomBox,
        externalZoomBox: zoomBox,
    });

    const [instrument, setInstrument] = useState(defaultInstrument || 'KC');
    const [showPicker, setShowPicker] = useState(false);
    const [timeframe, setTimeframe] = useState('D'); // 'D' | 'W'

    const reduxData = useSelector(selectInstrumentData(instrument));
    const dailyData = reduxData.length > 0 ? reduxData : (TICKER_DATA_MAP[instrument] || []);

    const displayData = useMemo(() => {
        if (timeframe === 'W') {
            const weekly = aggregateToWeekly(dailyData);
            console.log(`[SubChart ${id}] Weekly aggregation:`, {
                dailyCount: dailyData.length,
                weeklyCount: weekly.length,
                firstWeekly: weekly[0],
                lastWeekly: weekly[weekly.length - 1]
            });
            return weekly;
        }
        console.log(`[SubChart ${id}] Daily data:`, {
            count: dailyData.length,
            first: dailyData[0],
            last: dailyData[dailyData.length - 1]
        });
        return dailyData;
    }, [dailyData, timeframe, id]);

    // Floating OHLC tooltip
    const [tooltip, setTooltip] = useState(null);
    const [dataSource, setDataSource] = useState('SIMULATED');
    const [lastDate, setLastDate] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Fetch data
    useEffect(() => {
        // If we already have data, set source to API immediately so we show something.
        // We REMOVED the early return to ensure we always fetch fresh data each time the instrument loads.
        // This fixes the issue where stale data (e.g. missing recent days) was persisted in the session.
        if (reduxData && reduxData.length > 0) {
            setDataSource('API');
        }

        // Fetch from API
        const loadData = async () => {
            try {
                // Count 7500 to ensure we cover history back to ~2006
                const rawData = await fetchOHLC(instrument, '1D', 7500);

                if (rawData && Array.isArray(rawData) && rawData.length > 0) {
                    const formattedData = rawData.map(d => {
                        const t = d.time || d.t;
                        return {
                            time: t > 10000000000 ? t / 1000 : t,
                            open: parseFloat(d.open || d.o),
                            high: parseFloat(d.high || d.h),
                            low: parseFloat(d.low || d.l),
                            close: parseFloat(d.close || d.c),
                        };
                    }).sort((a, b) => a.time - b.time);

                    if (formattedData.length > 0) {
                        const lastTs = formattedData[formattedData.length - 1].time;
                        const dateStr = new Date(lastTs * 1000).toISOString().split('T')[0];
                        setLastDate(`[${formattedData.length} bars] Last: ${dateStr}`);
                        setErrorMsg('');

                        dispatch(setInstrumentData({ instrumentId: instrument, data: formattedData }));
                        setDataSource('API');
                    } else {
                        throw new Error("Empty formatted data");
                    }
                } else {
                    throw new Error("No data returned from API");
                }
            } catch (err) {
                console.error("SubChart fetch error:", err);
                setDataSource('SIMULATED');
                setErrorMsg(err.message || 'Fetch failed');
                setLastDate('');
            }
        };
        loadData();
    }, [instrument, dispatch]); // Removed reduxData from dependencies to prevent loop

    // Create chart on mount
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            layout: {
                background: { color: '#1a1a2e' },
                textColor: '#e0e0e0',
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(42, 42, 74, 0.3)' },
                horzLines: { color: 'rgba(42, 42, 74, 0.3)' },
            },
            crosshair: {
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
                borderColor: 'rgba(42, 42, 74, 0.5)',
                scaleMargins: { top: 0.1, bottom: 0.05 },
            },
            timeScale: {
                borderColor: 'rgba(42, 42, 74, 0.8)',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 0, // No trailing space on the right
                barSpacing: 6,
                shiftVisibleRangeOnNewBar: false,
                allowShiftVisibleRangeOnNewBar: false,
                uniformDistribution: true, // Key for consistent bar widths
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

        // Notify parent that chart is ready for sync
        if (onChartReady) onChartReady(chart);

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
                    time: candle.time,
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

    // Update data when instrument changes (preserve zoom)
    useEffect(() => {
        if (seriesRef.current && displayData && displayData.length > 0) {
            seriesRef.current.setData(
                displayData.map((d) => ({
                    time: d.time,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                }))
            );
        }
    }, [displayData]);

    // Synchronize zoom/range with main chart when timeframe changes
    useEffect(() => {
        if (internalChartRef.current) {
            // Small delay to ensure data is loaded first
            setTimeout(() => {
                const mainChart = mainChartRef?.current;
                const subChart = internalChartRef?.current;

                if (mainChart && subChart) {
                    try {
                        const mainRange = mainChart.timeScale().getVisibleRange();
                        if (mainRange && mainRange.from && mainRange.to) {
                            subChart.timeScale().setVisibleRange(mainRange);
                            return;
                        }
                    } catch (e) {
                        console.warn('[SubChart] Failed to sync range with main chart:', e);
                    }
                }

                // Fallback to fitContent if main range is unavailable
                subChart?.timeScale().fitContent();
            }, 100);
        }
    }, [timeframe]);

    const tooltipIsUp = tooltip ? tooltip.close >= tooltip.open : true;
    const tooltipColor = tooltipIsUp ? '#26a69a' : '#ef5350';

    // Header legend
    const lastCandle = displayData && displayData.length > 0 ? displayData[displayData.length - 1] : null;

    return (
        <div ref={outerRef} style={{
            position: 'relative',
            height: '100%',
            borderTop: '1px solid rgba(42, 42, 74, 0.5)',
        }}>
            {/* Sub-chart header: instrument label + controls */}
            <div style={{
                position: 'absolute',
                top: '6px',
                left: '8px',
                right: '8px',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pointerEvents: 'none',
            }}>
                {/* Left: instrument tag + static OHLC */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', pointerEvents: 'auto' }}>
                    {/* Instrument badge (click to change) */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPicker(!showPicker);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                                padding: '3px 10px',
                                background: 'rgba(38, 166, 154, 0.15)',
                                border: '1px solid rgba(38, 166, 154, 0.3)',
                                borderRadius: '4px',
                                color: '#26a69a',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            {instrument} ▾
                        </button>
                        {/* Picker logic continues... */}
                        {showPicker && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                marginTop: '4px',
                                width: '200px',
                                background: '#1e1e3a',
                                border: '1px solid #2a2a4a',
                                borderRadius: '6px',
                                zIndex: 100,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                overflowY: 'auto',
                                maxHeight: '300px',
                            }}>
                                {TICKER_LIST.map((inst) => (
                                    <div
                                        key={inst.id}
                                        onClick={() => {
                                            setInstrument(inst.id);
                                            setShowPicker(false);
                                            setTooltip(null);
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '11px',
                                            color: instrument === inst.id ? '#26a69a' : '#e0e0e0',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid rgba(42,42,74,0.3)',
                                            background: instrument === inst.id ? 'rgba(38,166,154,0.1)' : 'transparent',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74,144,217,0.15)'; }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = instrument === inst.id ? 'rgba(38,166,154,0.1)' : 'transparent';
                                        }}
                                    >
                                        <div style={{ fontWeight: 600 }}>{inst.id}</div>
                                        <div style={{ fontSize: '10px', color: '#8a8a8a' }}>{inst.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Data Source Badge */}
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 4px',
                        borderRadius: '3px',
                        background: dataSource === 'API' ? '#26a69a' : '#ef5350',
                        color: '#fff',
                        marginLeft: '8px',
                        opacity: 0.8
                    }}>
                        {dataSource === 'API' ? 'LIVE' : 'SIMULATED'}
                    </span>
                    <span style={{ fontSize: '9px', marginLeft: '6px', color: '#ccc' }}>
                        {lastDate}
                    </span>
                    {errorMsg && (
                        <span style={{ fontSize: '9px', marginLeft: '6px', color: '#ef5350' }}>
                            {errorMsg}
                        </span>
                    )}

                    {/* Timeframe Toggles */}
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                        {['D', 'W'].map((tf) => (
                            <button
                                key={tf}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTimeframe(tf);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{
                                    padding: '2px 6px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    borderRadius: '3px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: timeframe === tf ? '#4a90d9' : 'rgba(255, 255, 255, 0.1)',
                                    color: timeframe === tf ? '#fff' : '#aaa',
                                    transition: 'background 0.2s',
                                }}
                            >
                                {tf === 'D' ? 'Daily' : 'Weekly'}
                            </button>
                        ))}
                    </div>

                    {/* Static instrument price label */}
                    {lastCandle && (
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: lastCandle.close >= lastCandle.open ? '#26a69a' : '#ef5350',
                        }}>
                            {formatPrice(lastCandle.close)}
                        </span>
                    )}
                </div>

                {/* Right: close button */}
                <div style={{ display: 'flex', gap: '4px', pointerEvents: 'auto' }}>
                    <button
                        onClick={onRemove}
                        title="Remove sub-chart"
                        style={{
                            width: '22px',
                            height: '22px',
                            background: 'rgba(239, 83, 80, 0.15)',
                            border: '1px solid rgba(239, 83, 80, 0.3)',
                            borderRadius: '4px',
                            color: '#ef5350',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                        }}
                    >×</button>
                </div>
            </div>

            {/* Floating OHLC Tooltip Box */}
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: Math.min(tooltip.x + 15, (containerRef.current?.clientWidth || 600) - 130),
                    top: Math.max(tooltip.y - 70, 35),
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
                    <div style={{ color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: '4px', paddingBottom: '2px', fontWeight: 'bold' }}>
                        {new Date(tooltip.time * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ color: tooltipColor }}>O: {formatPrice(tooltip.open)}</div>
                    <div style={{ color: tooltipColor }}>H: {formatPrice(tooltip.high)}</div>
                    <div style={{ color: tooltipColor }}>L: {formatPrice(tooltip.low)}</div>
                    <div style={{ color: tooltipColor }}>C: {formatPrice(tooltip.close)}</div>
                </div>
            )}

            {/* Chart canvas */}
            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '150px',
                    position: 'relative',
                    cursor: 'crosshair',
                }}
            >
                {selectionBox}
            </div>
        </div>
    );
}
