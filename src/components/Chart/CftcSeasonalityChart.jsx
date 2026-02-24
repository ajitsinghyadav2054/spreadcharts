import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';

// ============================================================
// CftcSeasonalityChart — SOD year-over-year seasonality chart
//
// - One colored line per year (2006–2026) on a shared Jan–Dec x-axis
// - Dashed "Avg" line across all active years
// - Year toggle pills below chart: single-click to show/hide a year
// - Floating tooltip listing active years' values at crosshair
// ============================================================

// ── Year colour palette ──────────────────────────────────────
const YEAR_COLORS = {
    2006: '#FF6B6B',
    2007: '#FF9F43',
    2008: '#FECA57',
    2009: '#48DBFB',
    2010: '#1DD1A1',
    2011: '#54A0FF',
    2012: '#9B59B6',
    2013: '#C8D6E5',
    2014: '#778CA3',
    2015: '#FD79A8',
    2016: '#00CEC9',
    2017: '#E17055',
    2018: '#00B894',
    2019: '#FDCB6E',
    2020: '#6C5CE7',
    2021: '#A29BFE',
    2022: '#EF5350',
    2023: '#26A69A',
    2024: '#26C6DA',
    2025: '#FFA726',
    2026: '#B0BEC5',
};

const ALL_YEARS = Object.keys(YEAR_COLORS).map(Number); // [2006 … 2026]

// ── Format large numbers like lightweight-charts does (100k, 1.2M) ──
function formatK(val) {
    if (val === undefined || val === null || isNaN(val)) return '—';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return (val / 1_000_000).toFixed(3) + 'M';
    if (abs >= 1_000) return (val / 1_000).toFixed(3) + 'k';
    return val.toFixed(2);
}

// ── Compute Avg series across active years ───────────────────
function computeAvgSeries(yearlyData, activeYears) {
    const map = new Map(); // baseTimestamp -> { sum, count }
    for (const yr of activeYears) {
        const pts = yearlyData[yr] || [];
        for (const pt of pts) {
            const existing = map.get(pt.baseTimestamp) || { sum: 0, count: 0 };
            existing.sum += pt.value;
            existing.count++;
            map.set(pt.baseTimestamp, existing);
        }
    }
    return Array.from(map.entries())
        .map(([time, { sum, count }]) => ({ time, value: sum / count }))
        .sort((a, b) => a.time - b.time);
}

// ── Month names for x-axis labels ───────────────────────────
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Single chart panel ───────────────────────────────────────
function SeasonalityPanel({ columnId, label, yearlyData }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesMapRef = useRef({}); // year -> series
    const avgSeriesRef = useRef(null);

    // ── Drag-zoom state ──────────────────────────────────────
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const [dragRect, setDragRect] = useState(null); // { startX, endX } in px

    // Default: all years that actually have data are active
    const yearsWithData = useMemo(
        () => ALL_YEARS.filter(yr => yearlyData[yr]?.length > 0),
        [yearlyData]
    );

    const [activeYears, setActiveYears] = useState(() => new Set(yearsWithData));
    const [showAvg, setShowAvg] = useState(false);
    const [tooltip, setTooltip] = useState(null);

    // Reset active years and hide avg whenever data changes (new Generate)
    useEffect(() => {
        setActiveYears(new Set(yearsWithData));
        setShowAvg(false);
    }, [yearsWithData]);

    // ── Create chart once ──────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;

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
                vertLine: {
                    color: 'rgba(255,255,255,0.3)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#2b2b43',
                },
                horzLine: {
                    color: 'rgba(255,255,255,0.15)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#2b2b43',
                },
            },
            timeScale: {
                borderColor: '#2B2B43',
                timeVisible: true,
                secondsVisible: false,
                uniformDistribution: true,
                fixLeftEdge: true,
                fixRightEdge: true,
                minBarSpacing: 0.3,
                barSpacing: 3,
                // Override tick formatter to show month labels (Jan, Feb …)
                tickMarkFormatter: (time) => {
                    const d = new Date(time * 1000);
                    const month = d.getUTCMonth();
                    const day = d.getUTCDate();
                    if (day <= 7) return MONTH_LABELS[month];
                    return '';
                },
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
            handleScroll: false, // locked — full Jan-Dec always visible
        });

        chartRef.current = chart;

        // ── Add one LineSeries per year ──────────────────
        const newSeriesMap = {};

        ALL_YEARS.forEach(yr => {
            const pts = yearlyData[yr] || [];
            if (pts.length === 0) return;

            const series = chart.addSeries(LineSeries, {
                color: YEAR_COLORS[yr],
                lineWidth: 1.5,
                title: String(yr),
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 3,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            series.setData(pts.map(p => ({ time: p.baseTimestamp, value: p.value })));
            newSeriesMap[yr] = series;
        });

        seriesMapRef.current = newSeriesMap;

        // ── Avg series (dashed white) — hidden by default ────────────────────
        // Data is set dynamically by the activeYears/showAvg effect below.
        const avgSeries = chart.addSeries(LineSeries, {
            color: '#ffffff',
            lineWidth: 2.5,
            lineStyle: 1, // dashed
            title: 'Avg',
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
            visible: false, // toggled ON by clicking the Avg pill
        });
        avgSeriesRef.current = avgSeries;

        // Fit content
        try { chart.timeScale().fitContent(); } catch (_) { }

        // ── Crosshair tooltip ────────────────
        chart.subscribeCrosshairMove((param) => {
            if (!param || !param.point || param.point.x < 0 || !containerRef.current) {
                setTooltip(null);
                return;
            }
            const values = {};
            Object.entries(seriesMapRef.current).forEach(([yr, series]) => {
                const sv = param.seriesData?.get(series);
                if (!sv) return;
                const val = sv.value ?? sv.close ?? null;
                if (val !== null && val !== undefined) values[Number(yr)] = val;
            });

            // Also read the avg series value at this crosshair position
            let avgValue = null;
            if (avgSeriesRef.current) {
                const sv = param.seriesData?.get(avgSeriesRef.current);
                if (sv) avgValue = sv.value ?? sv.close ?? null;
            }

            if (Object.keys(values).length > 0) {
                setTooltip({
                    x: param.point.x,
                    y: param.point.y,
                    time: param.time,
                    values,
                    avgValue,
                });
            } else {
                setTooltip(null);
            }
        });

        // ── ResizeObserver ───────────────────────────────
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        ro.observe(containerRef.current);

        // ── Double-click = fit content ───────────────────
        const el = containerRef.current;
        const onDbl = () => chart.timeScale().fitContent();
        el.addEventListener('dblclick', onDbl);

        return () => {
            el.removeEventListener('dblclick', onDbl);
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesMapRef.current = {};
            avgSeriesRef.current = null;
        };
    }, [yearlyData]); // re-create when data changes

    // ── Sync year-series visibility ──────────────────────────
    useEffect(() => {
        const smap = seriesMapRef.current;
        ALL_YEARS.forEach(yr => {
            if (smap[yr]) {
                smap[yr].applyOptions({ visible: activeYears.has(yr) });
            }
        });
    }, [activeYears]);

    // ── Recompute avg from CURRENT activeYears, then sync visibility ──
    // Runs whenever selection changes OR avg is toggled, so the line
    // always reflects exactly the years currently shown on the chart.
    useEffect(() => {
        const avg = avgSeriesRef.current;
        if (!avg) return;
        if (showAvg && activeYears.size > 0) {
            const freshData = computeAvgSeries(yearlyData, activeYears);
            avg.setData(freshData);
            avg.applyOptions({ visible: true });
        } else {
            avg.applyOptions({ visible: false });
        }
    }, [activeYears, showAvg, yearlyData]);

    // ── Year toggle: accumulate logic ─────────────────────────
    //   All active  + click Y  → isolate Y (solo)
    //   Solo/subset + click Y (not active) → add Y
    //   Solo/subset + click Y (active, not last) → remove Y
    //   Last year  + click Y  → restore all
    const handleYearToggle = useCallback((yr) => {
        setActiveYears(prev => {
            const allCount = yearsWithData.length;
            const next = new Set(prev);

            if (prev.size === allCount) {
                // ALL years visible → first click: isolate
                return new Set([yr]);
            } else if (prev.has(yr)) {
                // Already active in a subset:
                if (prev.size === 1) {
                    // Last one → restore all
                    return new Set(yearsWithData);
                } else {
                    // Remove from subset
                    next.delete(yr);
                    return next;
                }
            } else {
                // Not in set → add to current subset
                next.add(yr);
                return next;
            }
        });
    }, [yearsWithData]);

    // ── Drag-zoom handlers ───────────────────────────────────
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return; // left-click only
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

        // Ignore tiny drags (treated as normal clicks)
        if (Math.abs(endX - startX) < 6) return;

        const chart = chartRef.current;
        if (!chart) return;

        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);

        const fromTime = chart.timeScale().coordinateToTime(minX);
        const toTime = chart.timeScale().coordinateToTime(maxX);

        if (fromTime !== null && toTime !== null && fromTime !== toTime) {
            chart.timeScale().setVisibleRange({ from: fromTime, to: toTime });
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setDragRect(null);
    }, []);

    const handleSelectAll = useCallback(() => {
        setActiveYears(new Set(yearsWithData));
    }, [yearsWithData]);

    const handleDeselectAll = useCallback(() => {
        setActiveYears(new Set());
    }, []);

    // ── Tooltip rows: year values + avg, all sorted by value desc ──
    const tooltipRows = useMemo(() => {
        if (!tooltip) return [];
        // Year rows — only active years
        const rows = Object.entries(tooltip.values)
            .filter(([yr]) => activeYears.has(Number(yr)))
            .map(([yr, val]) => ({ key: yr, label: yr, val, color: YEAR_COLORS[Number(yr)], isAvg: false }));

        // Avg row — only when Avg is ON and we have a value at this position
        if (showAvg && tooltip.avgValue !== null && tooltip.avgValue !== undefined) {
            rows.push({ key: 'avg', label: 'Avg', val: tooltip.avgValue, color: '#ffffff', isAvg: true });
        }

        // Sort all together by value descending (highest at top)
        rows.sort((a, b) => b.val - a.val);
        return rows;
    }, [tooltip, activeYears, showAvg]);

    const tooltipDate = useMemo(() => {
        if (!tooltip?.time) return '';
        const d = new Date(tooltip.time * 1000);
        return MONTH_LABELS[d.getUTCMonth()] + ' ' + d.getUTCDate();
    }, [tooltip]);

    const containerWidth = containerRef.current?.clientWidth || 600;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#161a25', borderRadius: '6px', overflow: 'hidden', border: '1px solid #2a2a4a' }}>

            {/* ── Chart title ────────────────────────── */}
            <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2a4a', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#d1d4dc', letterSpacing: '0.03em' }}>
                    {label} — Seasonality
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleSelectAll}
                        style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '3px', border: '1px solid #4a90d9', background: 'transparent', color: '#4a90d9', cursor: 'pointer' }}
                    >
                        All
                    </button>
                    <button
                        onClick={handleDeselectAll}
                        style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '3px', border: '1px solid #4a2a4a', background: 'transparent', color: '#ef5350', cursor: 'pointer' }}
                    >
                        None
                    </button>
                </div>
            </div>

            {/* ── Lightweight-charts canvas + drag-zoom overlay ── */}
            <div
                style={{ flex: 1, position: 'relative', minHeight: 0, userSelect: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                <div
                    ref={containerRef}
                    style={{ width: '100%', height: '100%', cursor: dragRect ? 'ew-resize' : 'crosshair' }}
                />

                {/* Drag selection rectangle */}
                {dragRect && Math.abs(dragRect.endX - dragRect.startX) > 4 && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: Math.min(dragRect.startX, dragRect.endX),
                        width: Math.abs(dragRect.endX - dragRect.startX),
                        background: 'rgba(74, 144, 217, 0.12)',
                        borderLeft: '1px solid rgba(74, 144, 217, 0.7)',
                        borderRight: '1px solid rgba(74, 144, 217, 0.7)',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }} />
                )}

                {/* Floating tooltip */}
                {tooltip && tooltipRows.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        left: Math.min(tooltip.x + 14, containerWidth - 160),
                        top: Math.max(tooltip.y - 20, 8),
                        zIndex: 50,
                        background: 'rgba(22, 26, 37, 0.96)',
                        border: '1px solid #2a2a4a',
                        borderRadius: '5px',
                        padding: '7px 10px',
                        pointerEvents: 'none',
                        fontSize: '11px',
                        lineHeight: '1.7',
                        fontFamily: 'monospace',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                        minWidth: '130px',
                    }}>
                        <div style={{ color: '#8a9ab5', borderBottom: '1px solid #2a2a4a', marginBottom: '4px', paddingBottom: '3px', fontWeight: 600, fontSize: '10px' }}>
                            {tooltipDate}
                        </div>
                        {tooltipRows.map(({ key, label, val, color, isAvg }) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {isAvg ? (
                                        // Dashed white line icon for Avg
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            width: '14px', height: '8px', flexShrink: 0,
                                        }}>
                                            <svg width="14" height="2" viewBox="0 0 14 2">
                                                <line x1="0" y1="1" x2="14" y2="1"
                                                    stroke="#ffffff" strokeWidth="2"
                                                    strokeDasharray="3,2" />
                                            </svg>
                                        </span>
                                    ) : (
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                                    )}
                                    <span style={{ color, fontWeight: isAvg ? 700 : 700 }}>{label}</span>
                                </span>
                                <span style={{ color: isAvg ? '#ffffff' : '#e0e0e0', fontWeight: 500 }}>{formatK(val)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Year Toggle Pills ──────────────────────── */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px',
                padding: '7px 10px',
                borderTop: '1px solid #2a2a4a',
                background: '#12151e',
                flexShrink: 0,
                alignItems: 'center',
            }}>
                {yearsWithData.map(yr => {
                    const active = activeYears.has(yr);
                    const color = YEAR_COLORS[yr];
                    const allActive = activeYears.size === yearsWithData.length;
                    // In subset mode (not all): dim inactive years, highlight active ones
                    const inSubsetMode = !allActive;
                    const isSolo = inSubsetMode && active && activeYears.size === 1;
                    const isDimmed = inSubsetMode && !active;

                    return (
                        <button
                            key={yr}
                            onClick={() => handleYearToggle(yr)}
                            title={
                                allActive ? `Click to isolate ${yr}` :
                                    active ? (activeYears.size === 1 ? `Click to restore all years` : `Click to remove ${yr}`) :
                                        `Click to add ${yr}`
                            }
                            style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                fontWeight: isSolo ? 800 : active ? 600 : 400,
                                borderRadius: '11px',
                                border: `1px solid ${isSolo ? color :
                                    isDimmed ? 'rgba(255,255,255,0.07)' :
                                        active ? color : 'rgba(255,255,255,0.18)'
                                    }`,
                                background: isSolo ? `${color}40` : active ? `${color}20` : 'transparent',
                                color: isSolo ? color : isDimmed ? 'rgba(255,255,255,0.18)' : active ? color : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.12s',
                                lineHeight: '1.4',
                                letterSpacing: '0.02em',
                                boxShadow: isSolo ? `0 0 5px ${color}55` : 'none',
                            }}
                        >
                            {yr}
                        </button>
                    );
                })}

                {/* Avg toggle pill */}
                <button
                    onClick={() => setShowAvg(v => !v)}
                    title={showAvg ? 'Hide average line' : `Show average of ${activeYears.size} selected year${activeYears.size === 1 ? '' : 's'}`}
                    style={{
                        padding: '2px 10px',
                        fontSize: '10px',
                        fontWeight: 600,
                        borderRadius: '11px',
                        border: showAvg
                            ? '1px dashed #ffffff'
                            : '1px dashed rgba(255,255,255,0.3)',
                        background: showAvg ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: showAvg ? '#ffffff' : 'rgba(255,255,255,0.35)',
                        boxShadow: showAvg ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
                        cursor: 'pointer',
                        letterSpacing: '0.04em',
                        lineHeight: '1.4',
                        transition: 'all 0.15s',
                    }}
                >
                    ···· Avg
                </button>
            </div>
        </div>
    );
}

// ── Root export: renders one panel per selected column ────────
export default function CftcSeasonalityChart({ sodSeries }) {
    if (!sodSeries || sodSeries.length === 0) return null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            height: '100%',
            padding: '6px 8px',
            background: '#1a1a2e',
            overflow: 'hidden',
        }}>
            {sodSeries.map((s) => (
                <div key={s.columnId} style={{ flex: 1, minHeight: 0 }}>
                    <SeasonalityPanel
                        columnId={s.columnId}
                        label={s.label}
                        yearlyData={s.yearlyData}
                    />
                </div>
            ))}
        </div>
    );
}
