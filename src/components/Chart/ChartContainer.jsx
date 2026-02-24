import { useRef, useMemo, useState, useEffect, useCallback, createRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import CandlestickChart from './CandlestickChart';
import ChartToolbar from './ChartToolbar';
import TimeRangeSelector from './TimeRangeSelector';
import MultiLineChart from './MultiLineChart';
import SubChart from './SubChart';
import SubChartModal from './SubChartModal';
import { useChartSync } from '../../hooks/useChartSync';
import { selectInstrumentData, setInstrumentData } from '../../features/chartData/chartDataSlice';
import { formatPrice } from '../../utils/formatters';
import { fetchOHLC } from '../../services/api';

// ============================================================
// ChartContainer — main chart + dynamic sub-charts
//
// Features:
// - Main candlestick chart + N dynamic sub-charts
// - "Add sub-chart" button to add new panels
// - Draggable resize handle between main & sub-chart area
// - Default 50/50 split when sub-charts exist
// - All charts time-scale synced
// ============================================================

let subChartIdCounter = 0;

export default function ChartContainer({ instrumentId, chartType = 'candlestick', series = [] }) {
    const dispatch = useDispatch();
    // Select data for the specific instrument passed as prop
    const data = useSelector(selectInstrumentData(instrumentId));
    // Use the prop as the active instrument
    const activeInstrument = instrumentId;

    // Fetch data for the main chart if it's a candlestick chart
    useEffect(() => {
        if (chartType === 'candlestick' && instrumentId) {
            const loadData = async () => {
                try {
                    // Fetch 7500 candles to cover back to ~2006
                    const rawData = await fetchOHLC(instrumentId, '1D', 7500);
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
                        dispatch(setInstrumentData({ instrumentId, data: formattedData }));
                    }
                } catch (err) {
                    console.error("Main chart fetch error:", err);
                }
            };
            loadData();
        }
    }, [instrumentId, chartType, dispatch]);

    const mainChartRef = useRef(null);
    const mainSeriesRef = useRef(null);
    const containerRef = useRef(null);

    // ── Dynamic Sub-Charts ─────────────────────────────────
    const [subCharts, setSubCharts] = useState([]);
    // Shared Zoom Box State (for syncing the blue shadow)
    const [zoomBox, setZoomBox] = useState(null);
    // Shared crosshair X position (for CSS overlay line spanning both charts)
    const [crosshairX, setCrosshairX] = useState(null);

    const subChartRefs = useMemo(() => subCharts.map(() => createRef()), [subCharts.length]);
    const subSeriesRefs = useMemo(() => subCharts.map(() => createRef()), [subCharts.length]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const handleModalAdd = useCallback((ticker) => {
        subChartIdCounter++;
        setSubCharts((prev) => [...prev, { id: `sub-${subChartIdCounter}`, ticker }]);
        setSyncTrigger((n) => n + 1);
        closeModal();
    }, [closeModal]);

    const removeSubChart = useCallback((id) => {
        setSubCharts((prev) => prev.filter((sc) => sc.id !== id));
        setSyncTrigger((n) => n + 1); // trigger sync re-setup
    }, []);

    // Counter that increments when sub-charts mount/unmount → forces useChartSync to re-run
    const [syncTrigger, setSyncTrigger] = useState(0);
    const onSubChartReady = useCallback(() => {
        setSyncTrigger((n) => n + 1);
    }, []);

    // ── Resizable Split ────────────────────────────────────
    // splitPosition = percentage of available height for main chart
    // Default 50% when sub-charts exist, 100% when none
    const [splitPosition, setSplitPosition] = useState(50);
    const isDragging = useRef(false);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            // The split is relative to the "Chart Area" div (which has flex: 1)
            // We need to find that element. Since we are in strict mode, let's use the containerRef
            // and assume it points to the main wrapper.
            // Actually, we can just use the containerRef's rect if we wrap the split area.

            // Let's rely on the containerRef being the wrapper of the *split* area.
            // We'll wrap the MainChart + Resizer + SubCharts in a div with ref={splitAreaRef}

            // For now, let's use global calculation or careful checking.
            const rect = containerRef.current.getBoundingClientRect();
            // Subtract Toolbar? No, typical layout is flexible.
            // Let's assume containerRef is the flex container of the charts.

            const offsetY = moveEvent.clientY - rect.top;
            let pct = (offsetY / rect.height) * 100;
            // Clamp
            pct = Math.max(20, Math.min(80, pct));
            setSplitPosition(pct);
        };

        const onMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, []);

    // ── Time Scale + Crosshair Sync ─────────────────────────
    useChartSync(mainChartRef, mainSeriesRef, subChartRefs, subSeriesRefs, syncTrigger);

    // ── OHLC Legend ────────────────────────────────────────
    const lastCandle = useMemo(() => {
        if (!data || data.length === 0) return null;
        return data[data.length - 1];
    }, [data]);

    const [legendCandle, setLegendCandle] = useState(null);

    useEffect(() => {
        if (lastCandle) setLegendCandle(lastCandle);
    }, [lastCandle]);

    useEffect(() => {
        const chart = mainChartRef?.current;
        if (!chart) return;
        const onMove = (param) => {
            if (!param || !param.time || !param.seriesData) {
                if (lastCandle) setLegendCandle(lastCandle);
                return;
            }
            const values = param.seriesData.values();
            const candle = values.next()?.value;
            if (candle && (candle.open !== undefined || candle.value !== undefined)) {
                // Adapt for Line Series (value only)
                if (candle.value !== undefined && candle.open === undefined) {
                    setLegendCandle({ ...candle, close: candle.value, open: candle.value, high: candle.value, low: candle.value });
                } else {
                    setLegendCandle(candle);
                }
            }
        };
        chart.subscribeCrosshairMove(onMove);
        return () => { try { chart.unsubscribeCrosshairMove(onMove); } catch (e) { } };
    }, [mainChartRef?.current, lastCandle]);

    const display = legendCandle || lastCandle;
    const isUp = display ? display.close >= display.open : true;
    const color = isUp ? '#26a69a' : '#ef5350';

    const hasSubCharts = subCharts.length > 0;
    const currentSplit = hasSubCharts ? splitPosition : 100;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative', // Context for absolute children
                background: '#1a1a2e',
            }}
        >
            {/* Toolbar - Floating (Only if instrument selected) */}
            {/* {activeInstrument && <ChartToolbar chartRef={mainChartRef} />} */}
            {/* {activeInstrument && <TimeRangeSelector chartRef={mainChartRef} />} */}

            {/* Modal */}
            <SubChartModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onAdd={handleModalAdd}
            />

            {/* OHLC Legend - Floating (Only for candlestick charts) */}
            {activeInstrument && display && chartType !== 'multiline' && (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '60px', // Shift right to avoid Toolbar
                    zIndex: 10,
                    display: 'flex',
                    gap: '16px',
                    fontSize: '12px',
                    fontWeight: 500,
                    pointerEvents: 'none',
                    background: 'rgba(26, 26, 46, 0.4)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                }}>
                    <span style={{ color: '#8a8a8a' }}>{activeInstrument}</span>
                    <span style={{ color: '#e0e0e0' }}>O <span style={{ color }}>{formatPrice(display.open)}</span></span>
                    <span style={{ color: '#e0e0e0' }}>H <span style={{ color }}>{formatPrice(display.high)}</span></span>
                    <span style={{ color: '#e0e0e0' }}>L <span style={{ color }}>{formatPrice(display.low)}</span></span>
                    <span style={{ color: '#e0e0e0' }}>C <span style={{ color }}>{formatPrice(display.close)}</span></span>
                </div>
            )}

            {/* Chart Split Area */}
            <div
                ref={containerRef}
                onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) setCrosshairX(e.clientX - rect.left);
                }}
                onMouseLeave={() => setCrosshairX(null)}
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* CSS Overlay Crosshair Line — spans both charts */}
                {crosshairX !== null && hasSubCharts && (
                    <div style={{
                        position: 'absolute',
                        left: crosshairX,
                        top: 0,
                        width: '1px',
                        height: '100%',
                        background: '#ef5350',
                        pointerEvents: 'none',
                        zIndex: 40,
                    }} />
                )}
                {/* Top Section: Main Chart */}
                <div style={{
                    height: `${currentSplit}%`,
                    position: 'relative',
                    minHeight: hasSubCharts ? '20%' : '100%',
                    transition: isDragging.current ? 'none' : 'height 0.1s ease',
                    display: 'flex',
                }}>
                    {activeInstrument ? (
                        chartType === 'multiline' ? (
                            <MultiLineChart
                                seriesConfig={series}
                                chartRef={mainChartRef}
                                firstSeriesRef={mainSeriesRef}
                                zoomBox={zoomBox}
                                setZoomBox={setZoomBox}
                            />
                        ) : (
                            <CandlestickChart
                                data={data}
                                chartRef={mainChartRef}
                                seriesRef={mainSeriesRef}
                                zoomBox={zoomBox}
                                setZoomBox={setZoomBox}
                            />
                        )
                    ) : (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#e0e0e0',
                            fontSize: '16px',
                            fontWeight: 600,
                            opacity: 0.5,
                        }}>
                            There is nothing to display yet.
                        </div>
                    )}

                    {/* Floating Add Button (if alone) */}
                    {!hasSubCharts && (
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            zIndex: 20,
                            pointerEvents: 'none', // button has pointer-events: auto
                        }}>
                            <button
                                onClick={openModal}
                                style={{
                                    pointerEvents: 'auto',
                                    padding: '6px 12px',
                                    background: '#1e1e3a',
                                    border: '1px solid #4a90d9',
                                    color: '#4a90d9',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                }}
                            >
                                Add sub-chart
                            </button>
                        </div>
                    )}
                </div>

                {/* Resizer Handle */}
                {hasSubCharts && (
                    <div
                        onMouseDown={handleMouseDown}
                        style={{
                            height: '6px',
                            background: '#2a2a4a',
                            cursor: 'row-resize',
                            zIndex: 30, // Above charts
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            flexShrink: 0,
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#4a90d9'}
                        onMouseLeave={(e) => e.target.style.background = '#2a2a4a'}
                    />
                )}

                {/* Bottom Section: Sub Graphs */}
                {hasSubCharts && (
                    <div style={{
                        flex: 1,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                    }}>
                        {subCharts.map((sc, idx) => (
                            <div key={sc.id} style={{
                                flex: 1,
                                position: 'relative',
                                borderBottom: idx < subCharts.length - 1 ? '1px solid #2a2a4a' : 'none'
                            }}>
                                <SubChart
                                    id={sc.id}
                                    defaultInstrument={sc.ticker} // Pass ticker!
                                    chartRef={subChartRefs[idx]}
                                    mainChartRef={mainChartRef}
                                    seriesRef={subSeriesRefs[idx]}
                                    onRemove={() => removeSubChart(sc.id)}
                                    onChartReady={onSubChartReady}
                                    zoomBox={zoomBox}
                                    setZoomBox={setZoomBox}
                                />
                            </div>
                        ))}

                        {/* Floating Add Button in sub-chart area */}
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            zIndex: 20,
                            pointerEvents: 'none',
                        }}>
                            <button
                                onClick={openModal}
                                style={{
                                    pointerEvents: 'auto',
                                    padding: '6px 12px',
                                    background: '#1e1e3a',
                                    border: '1px solid #4a90d9',
                                    color: '#4a90d9',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                }}
                            >
                                Add sub-chart
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
