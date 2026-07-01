// src/components/Chart/IceComboChart.jsx
// Renders a Recharts ComposedChart for ICE COT data with:
//   - Line (left Y-axis, amber) → absolute weekly value
//   - Bars (right Y-axis, green/red) → week-over-week change
// Data starts from 2026-01-01 and grows as each week passes.

import React, { useMemo } from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
} from 'recharts';
import { computeMetricValue, ITEM_MAP } from '../../data/columnHierarchy';

// ── Axis / KPI formatter ──────────────────────────────────────
function fmtK(val) {
    if (val === null || val === undefined || isNaN(val)) return '';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
    if (abs >= 1_000) return (val / 1_000).toFixed(1) + 'k';
    return Number(val).toFixed(2);
}

// ── Custom Tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div style={{
            background: '#1e293b',
            border: '1px solid #134e4a',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            minWidth: 180,
        }}>
            <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: 6, borderBottom: '1px solid #334155', paddingBottom: 4 }}>
                Week of {label}
            </div>
            {payload.map((p, i) => {
                const isChange = p.dataKey === 'weeklyChange';
                const color = isChange
                    ? (p.value >= 0 ? '#4ade80' : '#f87171')
                    : '#f59e0b';
                return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '2px 0', color }}>
                        <span>{isChange ? '📊 Weekly Δ' : '📈 Absolute'}</span>
                        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {p.value !== null && p.value !== undefined
                                ? (isChange && p.value > 0 ? '+' : '') + fmtK(p.value)
                                : '—'}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────
export default function IceComboChart({ rawData, metricId, label }) {
    const item = ITEM_MAP[metricId];

    const chartData = useMemo(() => {
        if (!rawData || rawData.length === 0 || !metricId) return [];

        // Filter to 2026-01-01+ and sort ascending
        const filtered = rawData
            .map(row => {
                const datePart = (row.report_date_as_mm_dd_yyyy || '').split('T')[0];
                return { row, datePart };
            })
            .filter(({ datePart }) => datePart >= '2026-01-01')
            .sort((a, b) => a.datePart.localeCompare(b.datePart));

        if (filtered.length === 0) return [];

        return filtered.map(({ row, datePart }, i) => {
            let absoluteVal = null;

            if (item?.isSeriesComputed) {
                const raw = parseFloat(row[item.baseCol]);
                absoluteVal = isNaN(raw) ? null : raw;
            } else {
                absoluteVal = computeMetricValue(metricId, row);
            }

            // Weekly change = current − previous week
            let weeklyChange = null;
            if (i > 0) {
                let prevVal = null;
                const prevRow = filtered[i - 1].row;
                if (item?.isSeriesComputed) {
                    const raw = parseFloat(prevRow[item.baseCol]);
                    prevVal = isNaN(raw) ? null : raw;
                } else {
                    prevVal = computeMetricValue(metricId, prevRow);
                }
                if (absoluteVal !== null && prevVal !== null) {
                    weeklyChange = absoluteVal - prevVal;
                }
            }

            return {
                date: datePart,
                absolute: absoluteVal,
                weeklyChange,
                _changeIsPos: weeklyChange === null ? true : weeklyChange >= 0,
            };
        });
    }, [rawData, metricId, item]);

    if (chartData.length === 0) {
        return (
            <div style={{
                height: 340,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: 14,
                flexDirection: 'column',
                gap: 8,
            }}>
                <div style={{ fontSize: 32 }}>🧊</div>
                <div>No ICE data available from 2026-01-01 onwards.</div>
                <div style={{ fontSize: 11 }}>This metric may not have data yet for the current year.</div>
            </div>
        );
    }

    const latestAbsolute = chartData[chartData.length - 1]?.absolute;
    const latestChange = chartData[chartData.length - 1]?.weeklyChange;

    return (
        <div style={{ width: '100%' }}>
            {/* Mini KPI strip */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{
                    background: '#1e293b', border: '1px solid #134e4a', borderRadius: 8,
                    padding: '10px 16px', minWidth: 140,
                }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Latest Value
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                        {latestAbsolute !== null ? fmtK(latestAbsolute) : '—'}
                    </div>
                </div>
                <div style={{
                    background: '#1e293b', border: '1px solid #134e4a', borderRadius: 8,
                    padding: '10px 16px', minWidth: 140,
                }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Weekly Change
                    </div>
                    <div style={{
                        fontSize: 20, fontWeight: 800, marginTop: 4,
                        color: latestChange === null ? '#64748b' : latestChange >= 0 ? '#4ade80' : '#f87171',
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {latestChange !== null
                            ? (latestChange > 0 ? '+' : '') + fmtK(latestChange)
                            : '—'}
                    </div>
                </div>
                <div style={{
                    background: '#1e293b', border: '1px solid #134e4a', borderRadius: 8,
                    padding: '10px 16px', minWidth: 140,
                }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Data Points
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', marginTop: 4 }}>
                        {chartData.length} weeks
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>━━</span> Absolute Value (left axis) &nbsp;|&nbsp;
                <span style={{ color: '#4ade80', fontWeight: 700 }}>▌</span> Weekly Change (right axis)
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 65, left: 10, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

                        <XAxis
                            dataKey="date"
                            stroke="#475569"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickFormatter={val => val.slice(5)}
                            minTickGap={40}
                            axisLine={{ stroke: '#334155' }}
                            tickLine={false}
                        />

                        {/* LEFT Y-axis: Absolute values — amber */}
                        <YAxis
                            yAxisId="left"
                            stroke="#f59e0b"
                            tick={{ fontSize: 10, fill: '#f59e0b' }}
                            tickFormatter={fmtK}
                            axisLine={{ stroke: '#f59e0b', strokeOpacity: 0.3 }}
                            tickLine={false}
                            width={58}
                        />

                        {/* RIGHT Y-axis: Weekly change — blue */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#60a5fa"
                            tick={{ fontSize: 10, fill: '#60a5fa' }}
                            tickFormatter={fmtK}
                            axisLine={{ stroke: '#60a5fa', strokeOpacity: 0.3 }}
                            tickLine={false}
                            width={58}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <ReferenceLine yAxisId="right" y={0} stroke="#475569" strokeDasharray="4 2" strokeWidth={1} />

                        {/* BARS (behind line) */}
                        <Bar
                            yAxisId="right"
                            dataKey="weeklyChange"
                            maxBarSize={28}
                            isAnimationActive={false}
                            radius={[3, 3, 0, 0]}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry._changeIsPos ? '#4ade80' : '#f87171'}
                                    fillOpacity={0.8}
                                />
                            ))}
                        </Bar>

                        {/* LINE on top */}
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="absolute"
                            stroke="#f59e0b"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, fill: '#f59e0b', stroke: '#1e293b', strokeWidth: 2 }}
                            isAnimationActive={false}
                            connectNulls
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
