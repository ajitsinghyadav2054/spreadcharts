import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';

// ── Column Labels and Colors ──────────────────────────────────────
const COL_META = {
    'total_bags': { label: 'Total Bags', color: '#FFFFFF' },
    'arriba_ecuador_grp_b': { label: 'Arriba Ecuador', color: '#FF6B6B' },
    'cameroon_grp_b': { label: 'Cameroon', color: '#FF9F43' },
    'colombia_grp_b': { label: 'Colombia', color: '#FECA57' },
    'ecuador_grp_b': { label: 'Ecuador', color: '#4CAF50' },
    'ghana_grp_a': { label: 'Ghana (A)', color: '#1DD1A1' },
    'ghana_grp_b': { label: 'Ghana (B)', color: '#00D2D3' },
    'grenada_grp_b': { label: 'Grenada', color: '#54A0FF' },
    'haiti_grp_c': { label: 'Haiti', color: '#9B59B6' },
    'hispaniolas_grp_b': { label: 'Hispaniolas', color: '#C8D6E5' },
    'indonesia_grp_b': { label: 'Indonesia', color: '#FD79A8' },
    'ivory_coast_grp_a': { label: 'Ivory Coast (A)', color: '#00CEC9' },
    'ivory_coast_grp_b': { label: 'Ivory Coast (B)', color: '#E17055' },
    'ivory_coast_grp_c': { label: 'Ivory Coast (C)', color: '#00B894' },
    'new_guinea_grp_b': { label: 'New Guinea (B)', color: '#FDCB6E' },
    'new_guinea_grp_c': { label: 'New Guinea (C)', color: '#6C5CE7' },
    'nicaragua_grp_b': { label: 'Nicaragua', color: '#A29BFE' },
    'nigeria_grp_a': { label: 'Nigeria (A)', color: '#EF5350' },
    'nigeria_grp_b': { label: 'Nigeria (B)', color: '#26A69A' },
    'nigeria_grp_c': { label: 'Nigeria (C)', color: '#26C6DA' },
    'panama_grp_b': { label: 'Panama', color: '#FFA726' },
    'papua_new_guinea_grp_b': { label: 'Papua New Guinea (B)', color: '#B0BEC5' },
    'papua_new_guinea_grp_c': { label: 'Papua New Guinea (C)', color: '#7E57C2' },
    'peru_grp_b': { label: 'Peru', color: '#EC407A' },
    'sanchez_grp_b': { label: 'Sanchez', color: '#AB47BC' },
    'tanzania_grp_b': { label: 'Tanzania (B)', color: '#5C6BC0' },
    'tanzania_grp_c': { label: 'Tanzania (C)', color: '#29B6F6' },
    'venezuela_grp_b': { label: 'Venezuela', color: '#9CCC65' },
    // London Cols
    'valid_stocks': { label: 'Valid Stocks', color: '#B39DDB' },
    'total_stock': { label: 'Total Stock', color: '#FFFFFF' },
    'amsterdam': { label: 'Amsterdam', color: '#FFAB91' },
    'antwerp': { label: 'Antwerp', color: '#81D4FA' },
    'bremen': { label: 'Bremen', color: '#A5D6A7' },
    'hamburg': { label: 'Hamburg', color: '#FFF59D' },
    'liverpool': { label: 'Liverpool', color: '#CE93D8' },
    'london': { label: 'London', color: '#90CAF9' },
    'rotterdam': { label: 'Rotterdam', color: '#F48FB1' },
    'daily_valid_delta': { label: 'Daily Valid Delta', color: '#B2EBF2' },
    'daily_total_delta': { label: 'Daily Total Delta', color: '#FFF9C4' },
    // London Origins
    'GRAND_TOTAL': { label: 'Grand Total', color: '#FFFFFF' },
    'CAM': { label: 'Cameroon', color: '#FF9F43' },
    'CGO': { label: 'Congo', color: '#00D2D3' },
    'COL': { label: 'Colombia', color: '#FECA57' },
    'DOM': { label: 'Dominican Rep.', color: '#4CAF50' },
    'ECU': { label: 'Ecuador', color: '#1DD1A1' },
    'GUI': { label: 'Guinea', color: '#54A0FF' },
    'HON': { label: 'Honduras', color: '#9B59B6' },
    'IVY': { label: 'Ivory Coast', color: '#00CEC9' },
    'LIB': { label: 'Liberia', color: '#FD79A8' },
    'MAD': { label: 'Madagascar', color: '#E17055' },
    'NIG': { label: 'Nigeria', color: '#00B894' },
    'PER': { label: 'Peru', color: '#A29BFE' },
    'SLE': { label: 'Sierra Leone', color: '#EF5350' },
    'STH': { label: 'STH', color: '#C8D6E5' },
    'TAN': { label: 'Tanzania', color: '#FDCB6E' },
    'TOG': { label: 'Togo', color: '#6C5CE7' },
    'UGA': { label: 'Uganda', color: '#26A69A' },
    'VEN': { label: 'Venezuela', color: '#26C6DA' },
    'ZAI': { label: 'Zaire', color: '#FFA726' },
    // Ivory Arrivals
    'close': { label: 'Close', color: '#4CAF50' },
    'weekly_changes': { label: 'Weekly Changes', color: '#FF9F43' },
    // Cocoa Product Ratios
    'Asia': { label: 'Asia', color: '#00E5FF' }, // Bright cyan
    'Europe': { label: 'Europe', color: '#FFB74D' }, // Bright orange-yellow
    'Ivory Coast Boxed': { label: 'Ivory Coast Boxed', color: '#FF5252' }, // Bright red-coral
    'Asia Natural': { label: 'Asia Natural', color: '#69F0AE' }, // Bright neon green
};

const ALL_COLS = Object.keys(COL_META);

// Format large numbers
function formatK(val) {
    if (val === undefined || val === null || isNaN(val)) return '—';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return (val / 1_000_000).toFixed(3) + 'M';
    if (abs >= 1_000) return (val / 1_000).toFixed(3) + 'k';
    return val.toFixed(2);
}

// Ensure local YYYY-MM-DD strings are parsed identically to avoid timezone shifts
// e.g. "2026-03-09" -> Timestamp at UTC 00:00:00
function dateStringToTimestamp(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)) / 1000;
}

export default function CocoaMultiLineChart({ title, data }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesMapRef = useRef({});

    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const [dragRect, setDragRect] = useState(null);

    // ── Dynamically discover columns from data ──────────────────────────────
    const [dynamicCols, setDynamicCols] = useState(ALL_COLS);

    // Initial state: Only 'total_bags' active by default to prevent chart clutter
    // Or we could make ALL active, but 28 lines might be noisy. 
    // Let's activate a reasonable default subset, or all items with data > 0.
    const [activeCols, setActiveCols] = useState(() => new Set(['total_bags']));

    // On first data load, enable all columns that appear in any row
    useEffect(() => {
        if (!data || data.length === 0) return;

        const presentCols = new Set();
        data.forEach(row => {
            Object.keys(row).forEach(key => {
                if (key !== 'trade_date' && key !== 'report_date_as_mm_dd_yyyy' && key !== 'date' && row[key] !== undefined && row[key] !== null) {
                    presentCols.add(key);

                    // Dynamically map unknown columns so they render
                    if (!COL_META[key]) {
                        // Generate a deterministic bright/pastel color
                        let hash = 0;
                        for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);

                        const r = (Math.abs(Math.sin(hash)) * 127 + 128) | 0;
                        const g = (Math.abs(Math.sin(hash + 1)) * 127 + 128) | 0;
                        const b = (Math.abs(Math.sin(hash + 2)) * 127 + 128) | 0;
                        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

                        COL_META[key] = { label: key, color: hex };
                    }
                }
            });
        });

        const newColsArray = Array.from(new Set([...ALL_COLS, ...presentCols]));
        setDynamicCols(newColsArray);
        setActiveCols(new Set(newColsArray.filter(col => presentCols.has(col))));
    }, [data]);

    const [tooltip, setTooltip] = useState(null);

    // ── Create chart ──────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || !data || data.length === 0) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#161a25' },
                textColor: '#d1d4dc',
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
            },
            crosshair: {
                mode: 1,
                vertLine: { color: 'rgba(255,255,255,0.3)', width: 1, style: 2, labelBackgroundColor: '#2b2b43' },
                horzLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 2, labelBackgroundColor: '#2b2b43' },
            },
            timeScale: {
                borderColor: '#2B2B43',
                timeVisible: false,
            },
            rightPriceScale: {
                borderColor: '#2B2B43',
                scaleMargins: { top: 0.08, bottom: 0.08 },
            },
            handleScale: {
                axisPressedMouseMove: false,
                mouseWheel: false,
                pinch: false,
            },
            handleScroll: false,
        });
        chartRef.current = chart;

        // Process data - use report_date_as_mm_dd_yyyy (what the API returns) with fallback to trade_date
        const getDateKey = (row) => row.report_date_as_mm_dd_yyyy || row.trade_date || row.date || '';
        const sortedData = [...data].sort((a, b) => getDateKey(a).localeCompare(getDateKey(b)));

        const newSeriesMap = {};

        // Derive present columns from data directly inside this closure to prevent stale state issues
        const currentDataCols = new Set();
        sortedData.forEach(row => {
            Object.keys(row).forEach(key => {
                if (key !== 'trade_date' && key !== 'report_date_as_mm_dd_yyyy' && key !== 'date' && row[key] !== undefined && row[key] !== null) {
                    currentDataCols.add(key);
                    // Dynamically map unknown columns so they render
                    if (!COL_META[key]) {
                        // Generate a deterministic color
                        let hash = 0;
                        for (let i = 0; i < key.length; i++) {
                            hash = key.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        const c = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777215)).toString(16);
                        const hex = '#' + '000000'.substring(0, 6 - c.length) + c;

                        COL_META[key] = { label: key, color: hex };
                    }
                }
            });
        });

        const colsToRender = Array.from(new Set([...dynamicCols, ...currentDataCols]));

        colsToRender.forEach(col => {
            // Check if column exists in our data and has at least one non-zero value to plot
            // (Only for columns that exist in the active table data)
            const hasData = sortedData.some(d => d[col] !== undefined);
            if (!hasData) return;

            const isTotal = col === 'total_bags' || col === 'total_stock';
            const series = chart.addSeries(LineSeries, {
                color: COL_META[col].color,
                lineWidth: isTotal ? 2.5 : 1.5,
                title: COL_META[col].label,
                crosshairMarkerVisible: true,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            const points = sortedData.map(d => {
                const rawTime = getDateKey(d).split('T')[0];
                const timeStamp = dateStringToTimestamp(rawTime);
                const val = parseFloat(d[col]);
                return {
                    time: timeStamp,
                    value: isNaN(val) ? 0 : val
                };
            });

            // Make sure timestamps are strictly ascending and unique
            const validPoints = [];
            const seenTimes = new Set();
            for (const pt of points) {
                if (!isNaN(pt.time) && !seenTimes.has(pt.time)) {
                    seenTimes.add(pt.time);
                    validPoints.push(pt);
                }
            }
            validPoints.sort((a, b) => a.time - b.time);

            console.log(`[Chart] Series ${col} generated ${validPoints.length} points:`, validPoints.slice(0, 3));

            if (validPoints.length > 0) {
                try {
                    series.setData(validPoints);
                } catch (err) {
                    console.error(`[Chart] lightweight-charts error for ${col}:`, err);
                }
            }
            newSeriesMap[col] = series;
        });

        seriesMapRef.current = newSeriesMap;
        try { chart.timeScale().fitContent(); } catch (_) { }

        // Crosshair tooltip
        chart.subscribeCrosshairMove((param) => {
            if (!param || !param.point || param.point.x < 0 || !containerRef.current) {
                setTooltip(null);
                return;
            }
            const values = {};
            Object.entries(seriesMapRef.current).forEach(([col, series]) => {
                const sv = param.seriesData?.get(series);
                if (!sv) return;
                const val = sv.value ?? sv.close ?? null;
                if (val !== null && val !== undefined) values[col] = val;
            });

            if (Object.keys(values).length > 0) {
                setTooltip({
                    x: param.point.x,
                    y: param.point.y,
                    time: param.time,
                    values,
                });
            } else {
                setTooltip(null);
            }
        });

        // ResizeObserver
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        ro.observe(containerRef.current);

        const el = containerRef.current;
        const onDbl = () => chart.timeScale().fitContent();
        el.addEventListener('dblclick', onDbl);

        return () => {
            el.removeEventListener('dblclick', onDbl);
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesMapRef.current = {};
        };
    }, [data]);

    // Sync visibility
    useEffect(() => {
        const smap = seriesMapRef.current;
        dynamicCols.forEach(col => {
            if (smap[col]) {
                smap[col].applyOptions({ visible: activeCols.has(col) });
            }
        });
    }, [activeCols, dynamicCols]);

    // Drag zoom
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        isDraggingRef.current = true;
        dragStartXRef.current = x;
        setDragRect({ startX: x, endX: x });
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDraggingRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        setDragRect(prev => prev ? { ...prev, endX: x } : null);
    }, []);

    const handleMouseUp = useCallback((e) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        const rect = e.currentTarget.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const startX = dragStartXRef.current;
        setDragRect(null);

        if (Math.abs(endX - startX) < 6) return;

        const chart = chartRef.current;
        if (!chart) return;

        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);

        const fromLogical = chart.timeScale().coordinateToLogical(minX);
        const toLogical = chart.timeScale().coordinateToLogical(maxX);

        if (fromLogical !== null && toLogical !== null) {
            chart.timeScale().setVisibleLogicalRange({ from: fromLogical, to: toLogical });
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setDragRect(null);
    }, []);

    const colsWithData = useMemo(() => {
        if (!data || data.length === 0) return [];
        // Scan ALL rows so countries that don't appear in the first row are still shown
        const presentCols = new Set();
        data.forEach(row => {
            dynamicCols.forEach(col => {
                if (row[col] !== undefined) presentCols.add(col);
            });
        });
        return dynamicCols.filter(col => presentCols.has(col));
    }, [data, dynamicCols]);

    const handleSelectAll = useCallback(() => setActiveCols(new Set(colsWithData)), [colsWithData]);
    const handleDeselectAll = useCallback(() => setActiveCols(new Set()), []);

    // Toggle logic
    const handleColToggle = useCallback((col) => {
        setActiveCols(prev => {
            const next = new Set(prev);
            const allCount = colsWithData.length;

            if (prev.size === allCount) {
                return new Set([col]); // first click isolates
            } else if (prev.has(col)) {
                if (prev.size === 1) return new Set(colsWithData); // last one resets
                next.delete(col);
                return next;
            } else {
                next.add(col);
                return next;
            }
        });
    }, [colsWithData]);

    const tooltipRows = useMemo(() => {
        if (!tooltip) return [];
        const rows = Object.entries(tooltip.values)
            .filter(([col]) => activeCols.has(col))
            .map(([col, val]) => ({ key: col, label: COL_META[col].label, val, color: COL_META[col].color }));

        rows.sort((a, b) => b.val - a.val); // Sort descending
        return rows;
    }, [tooltip, activeCols]);

    const tooltipDate = useMemo(() => {
        if (!tooltip?.time) return '';
        const d = new Date(tooltip.time * 1000);
        return d.toISOString().split('T')[0];
    }, [tooltip]);

    const containerWidth = containerRef.current?.clientWidth || 600;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#161a25', borderRadius: '6px', overflow: 'hidden', border: '1px solid #2a2a4a' }}>
            {/* Header */}
            <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2a4a', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#d1d4dc', letterSpacing: '0.03em' }}>
                    {title} — Origins
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleSelectAll}
                        style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '3px', border: '1px solid #4a90d9', background: 'transparent', color: '#4a90d9', cursor: 'pointer' }}
                    >All</button>
                    <button
                        onClick={handleDeselectAll}
                        style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '3px', border: '1px solid #4a2a4a', background: 'transparent', color: '#ef5350', cursor: 'pointer' }}
                    >None</button>
                </div>
            </div>

            {/* Chart Area */}
            <div
                style={{ flex: 1, position: 'relative', minHeight: 0, userSelect: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: dragRect ? 'ew-resize' : 'crosshair' }} />

                {/* Drag Rect */}
                {dragRect && Math.abs(dragRect.endX - dragRect.startX) > 4 && (
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: Math.min(dragRect.startX, dragRect.endX),
                        width: Math.abs(dragRect.endX - dragRect.startX),
                        background: 'rgba(74, 144, 217, 0.12)', borderLeft: '1px solid rgba(74, 144, 217, 0.7)', borderRight: '1px solid rgba(74, 144, 217, 0.7)',
                        pointerEvents: 'none', zIndex: 10,
                    }} />
                )}

                {/* Tooltip */}
                {tooltip && tooltipRows.length > 0 && (
                    <div style={{
                        position: 'absolute', left: Math.min(tooltip.x + 14, containerWidth - 180), top: Math.max(tooltip.y - 20, 8),
                        zIndex: 50, background: 'rgba(22, 26, 37, 0.96)', border: '1px solid #2a2a4a', borderRadius: '5px',
                        padding: '7px 10px', pointerEvents: 'none', fontSize: '11px', lineHeight: '1.7', fontFamily: 'monospace',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.6)', minWidth: '150px',
                    }}>
                        <div style={{ color: '#8a9ab5', borderBottom: '1px solid #2a2a4a', marginBottom: '4px', paddingBottom: '3px', fontWeight: 600, fontSize: '10px' }}>
                            {tooltipDate}
                        </div>
                        {tooltipRows.map(({ key, label, val, color }) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                                    <span style={{ color, fontWeight: 700 }}>{label}</span>
                                </span>
                                <span style={{ color: '#e0e0e0', fontWeight: 500 }}>{formatK(val)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pills */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '5px', padding: '7px 10px',
                borderTop: '1px solid #2a2a4a', background: '#12151e', flexShrink: 0, alignItems: 'center',
            }}>
                {colsWithData.map(col => {
                    const active = activeCols.has(col);
                    const color = COL_META[col].color;
                    const allActive = activeCols.size === colsWithData.length;
                    const inSubsetMode = !allActive;
                    const isSolo = inSubsetMode && active && activeCols.size === 1;
                    const isDimmed = inSubsetMode && !active;

                    return (
                        <button
                            key={col}
                            onClick={() => handleColToggle(col)}
                            style={{
                                padding: '2px 8px', fontSize: '10px',
                                fontWeight: isSolo ? 800 : active ? 600 : 400,
                                borderRadius: '11px',
                                border: `1px solid ${isSolo ? color : isDimmed ? 'rgba(255,255,255,0.07)' : active ? color : 'rgba(255,255,255,0.18)'}`,
                                background: isSolo ? `${color}40` : active ? `${color}20` : 'transparent',
                                color: isSolo ? color : isDimmed ? 'rgba(255,255,255,0.18)' : active ? color : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer', transition: 'all 0.12s',
                                letterSpacing: '0.02em', boxShadow: isSolo ? `0 0 5px ${color}55` : 'none',
                            }}
                        >
                            {COL_META[col].label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
