// src/components/Tabs/OpeningVariationDashboard.jsx
//
// "Opening Variation" section
// Analyses KC (Arabica) and RC (Robusta) opening gaps vs previous settlement,
// then tracks probability of 20-tick mean-reversion trade on KC.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { fetchOpeningVariationData, triggerOpeningVariationBackfill, triggerOpeningVariationRecompute } from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (v, dec = 2) => (v == null || isNaN(+v)) ? '—' : (+v).toFixed(dec);
const fmtT = (v) => (v == null) ? '—' : (v > 0 ? `+${v}` : `${v}`);
const pct  = (num, den) => den === 0 ? '—' : ((num / den) * 100).toFixed(1) + '%';

const OUTCOME_COLOR = {
    win:  { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)',  text: '#4ade80' },
    loss: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
    open: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  text: '#fbbf24' },
    none: { bg: 'transparent',            border: 'transparent',            text: '#475569' },
};

const BIAS_COLOR = {
    long:    { bg: 'rgba(74,222,128,0.12)', text: '#4ade80' },
    short:   { bg: 'rgba(248,113,113,0.12)', text: '#f87171' },
    neutral: { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
    none:    { bg: 'transparent',            text: '#475569' },
};

function Badge({ text, color }) {
    if (!text || text === 'none' || text === 'null') return <span style={{ color: '#475569' }}>—</span>;
    const c = color || {};
    return (
        <span style={{
            background: c.bg || 'rgba(255,255,255,0.06)',
            color: c.text || '#94a3b8',
            border: `1px solid ${c.border || c.bg || 'rgba(255,255,255,0.08)'}`,
            borderRadius: 4, padding: '2px 8px',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase',
        }}>{text}</span>
    );
}

function TickBadge({ ticks }) {
    if (ticks == null) return <span style={{ color: '#475569' }}>—</span>;
    const pos = ticks > 0;
    return (
        <span style={{
            color: pos ? '#4ade80' : ticks < 0 ? '#f87171' : '#8a8a8a',
            fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        }}>
            {pos ? '+' : ''}{ticks}
        </span>
    );
}

function StatCard({ label, value, sub, accent }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${accent || 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 4,
            minWidth: 120,
        }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: accent || '#e2e8f0', letterSpacing: '-0.02em' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>}
        </div>
    );
}

// Mini SVG equity curve
function EquityCurve({ rows }) {
    const dataPoints = useMemo(() => {
        const qualified = [...rows]
            .filter(r => r.kc_qualifies && r.kc_ticks_pnl != null)
            .sort((a, b) => a.trade_date.localeCompare(b.trade_date));
        let cum = 0;
        return qualified.map(r => {
            cum += Number(r.kc_ticks_pnl);
            return {
                date: r.trade_date,
                bias: r.kc_bias,
                ticks: r.kc_tick_move,
                outcome: r.kc_outcome,
                pnl: r.kc_ticks_pnl,
                cum
            };
        });
    }, [rows]);

    const [hovered, setHovered] = useState(null);

    if (dataPoints.length < 2) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#475569', fontSize: 13 }}>
            Not enough data yet
        </div>
    );

    const W = 800, H = 120, PAD = 8;
    const values = dataPoints.map(d => d.cum);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;

    const toX = i => PAD + (i / (dataPoints.length - 1)) * (W - 2 * PAD);
    const toY = v => PAD + (1 - (v - min) / range) * (H - 2 * PAD);

    const pts = dataPoints.map((d, i) => `${toX(i)},${toY(d.cum)}`).join(' ');
    const zeroY = toY(0);
    const lastVal = dataPoints[dataPoints.length - 1].cum;
    const lineColor = lastVal >= 0 ? '#4ade80' : '#f87171';

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const pct = clientX / rect.width;
        
        let closestIdx = Math.round(pct * (dataPoints.length - 1));
        closestIdx = Math.max(0, Math.min(dataPoints.length - 1, closestIdx));
        
        const d = dataPoints[closestIdx];
        const x = toX(closestIdx);
        const y = toY(d.cum);
        
        const tooltipX = e.clientX - rect.left + 15;
        const tooltipY = e.clientY - rect.top - 70;

        setHovered({
            point: d,
            idx: closestIdx,
            x,
            y,
            tooltipX,
            tooltipY
        });
    };

    const handleMouseLeave = () => {
        setHovered(null);
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: 120, cursor: 'crosshair' }}
             onMouseMove={handleMouseMove}
             onMouseLeave={handleMouseLeave}>
            
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
                {/* Zero line */}
                <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4,4" />
                
                {/* Filled area */}
                <polygon
                    points={`${PAD},${toY(0)} ${pts} ${toX(dataPoints.length - 1)},${toY(0)}`}
                    fill={lastVal >= 0 ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)'}
                />
                
                {/* Line */}
                <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" />
                
                {/* Last point dot */}
                <circle cx={toX(dataPoints.length - 1)} cy={toY(lastVal)} r={3} fill={lineColor} />

                {/* Hover tracking lines and highlight rings */}
                {hovered && (
                    <>
                        <line x1={hovered.x} y1={PAD} x2={hovered.x} y2={H - PAD} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="2,2" />
                        <circle cx={hovered.x} cy={hovered.y} r={6} fill={lineColor} stroke="#0f0f1a" strokeWidth={2} />
                    </>
                )}
            </svg>

            {/* Hover Tooltip overlay */}
            {hovered && (
                <div style={{
                    position: 'absolute',
                    left: hovered.tooltipX,
                    top: hovered.tooltipY,
                    background: 'rgba(22, 22, 38, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.7)',
                    zIndex: 10,
                    pointerEvents: 'none',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '11px',
                    color: '#e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minWidth: '150px',
                    transform: hovered.tooltipX > 600 ? 'translateX(-110%)' : 'none',
                }}>
                    <div style={{ color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {hovered.point.date.slice(0, 10)}
                    </div>
                    <div>
                        <span style={{ color: '#94a3b8' }}>Trade: </span>
                        <span style={{ color: hovered.point.bias === 'short' ? '#f87171' : '#4ade80', fontWeight: 700, textTransform: 'uppercase' }}>
                            KC {hovered.point.bias} ({hovered.point.ticks > 0 ? `+${hovered.point.ticks}` : hovered.point.ticks}t)
                        </span>
                    </div>
                    <div>
                        <span style={{ color: '#94a3b8' }}>PnL: </span>
                        <span style={{ color: hovered.point.pnl >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                            {hovered.point.pnl >= 0 ? `+${hovered.point.pnl}` : hovered.point.pnl} ticks ({hovered.point.outcome})
                        </span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Cumulative PnL:</span>
                        <span style={{ color: hovered.point.cum >= 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>
                            {hovered.point.cum >= 0 ? `+${hovered.point.cum}` : hovered.point.cum} ticks
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OpeningVariationDashboard() {
    const [filter,   setFilter]   = useState('both');
    const [data,     setData]     = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const [backfill,  setBackfill]  = useState(false);
    const [recompute, setRecompute] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        setError(null);
        fetchOpeningVariationData(filter)
            .then(rows => { setData(rows); setLoading(false); })
            .catch(err  => { setError(err.message); setLoading(false); });
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const handleBackfill = async () => {
        setBackfill(true);
        try { await triggerOpeningVariationBackfill(); alert('Backfill started — fetches raw data from API then computes stats.\nCheck server logs for progress.'); }
        catch { alert('Failed to trigger backfill.'); }
        finally { setBackfill(false); }
    };

    const handleRecompute = async () => {
        setRecompute(true);
        try { await triggerOpeningVariationRecompute(); alert('Recompute started — reads purely from DB, no API calls.\nCheck server logs for progress.'); }
        catch { alert('Failed to trigger recompute.'); }
        finally { setRecompute(false); }
    };

    // ── Statistics ──────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const kcQ   = data.filter(r => r.kc_qualifies);
        const wins  = kcQ.filter(r => r.kc_outcome === 'win').length;
        const losses= kcQ.filter(r => r.kc_outcome === 'loss').length;
        const opens = kcQ.filter(r => r.kc_outcome === 'open').length;
        const closed= wins + losses;
        const totalT= kcQ.reduce((s, r) => s + (Number(r.kc_ticks_pnl) || 0), 0);
        const rcQ   = data.filter(r => r.rc_qualifies).length;
        return { kcQ: kcQ.length, wins, losses, opens, closed, totalT, rcQ };
    }, [data]);

    // ── Styles ──────────────────────────────────────────────────────────────
    const thStyle = {
        padding: '8px 12px', textAlign: 'left',
        fontSize: 10, fontWeight: 700, color: '#64748b',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, background: '#161628', zIndex: 1,
        whiteSpace: 'nowrap',
    };
    const tdStyle = (even) => ({
        padding: '7px 12px', fontSize: 12,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: even ? 'rgba(255,255,255,0.015)' : 'transparent',
        whiteSpace: 'nowrap',
    });

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: '#0f0f1a', color: '#e2e8f0', fontFamily: "'Inter', sans-serif",
        }}>
            {/* ── Header ── */}
            <div style={{
                padding: '14px 20px',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                flexShrink: 0,
            }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        ⚡ Opening Variation
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                        KC Arabica (±40 ticks · 09:15–09:20) &nbsp;|&nbsp; RC Robusta (±30 ticks · 09:00–09:14) &nbsp;·&nbsp; Since 1 Jan 2026
                    </div>
                </div>



                {/* Right actions */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={load} style={{
                        padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                        border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer',
                    }}>↻ Refresh</button>
                    <button onClick={handleBackfill} disabled={backfill} style={{
                        padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: backfill ? 'rgba(0,0,0,0.2)' : 'rgba(245,158,11,0.15)',
                        color: backfill ? '#64748b' : '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.3)', cursor: backfill ? 'default' : 'pointer',
                    }}>{backfill ? 'Fetching…' : '⬇ Backfill (API)'}</button>
                    <button onClick={handleRecompute} disabled={recompute} style={{
                        padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: recompute ? 'rgba(0,0,0,0.2)' : 'rgba(99,102,241,0.15)',
                        color: recompute ? '#64748b' : '#818cf8',
                        border: '1px solid rgba(99,102,241,0.3)', cursor: recompute ? 'default' : 'pointer',
                    }} title="Re-derives stats from stored DB data. No API calls needed.">
                        {recompute ? 'Computing…' : '⚡ Recompute (DB only)'}
                    </button>
                </div>
            </div>

            {/* ── Body ── */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Contract schedule legend */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                        { label: 'KCH26 / LKCH26', sub: '1 Jan → 20 Feb' },
                        { label: 'KCK26 / LKCK26', sub: '20 Feb → 20 Apr' },
                        { label: 'KCN26 / LKCN26', sub: '20 Apr → present' },
                    ].map(c => (
                        <div key={c.label} style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8, padding: '6px 14px', fontSize: 11,
                        }}>
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{c.label}</span>
                            <span style={{ color: '#64748b' }}> · {c.sub}</span>
                        </div>
                    ))}
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: '#475569', alignSelf: 'center' }}>
                        Tick sizes: KC = 0.05 c/lb &nbsp;|&nbsp; RC = $1/tonne &nbsp;|&nbsp; Target = 20 ticks &nbsp;|&nbsp; Mean-reversion bias
                    </div>
                </div>

                {/* Stats cards */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <StatCard label="KC Qualified Days" value={stats.kcQ} accent="rgba(245,158,11,0.5)" />
                    <StatCard label="RC Qualified Days" value={stats.rcQ} accent="rgba(139,92,246,0.5)" />
                    <StatCard label="Win Rate" value={pct(stats.wins, stats.closed)}
                        sub={`${stats.wins}W / ${stats.losses}L (closed only)`}
                        accent="rgba(74,222,128,0.4)" />
                    <StatCard label="Wins" value={stats.wins} accent="rgba(74,222,128,0.3)" />
                    <StatCard label="Losses" value={stats.losses} accent="rgba(248,113,113,0.3)" />
                    <StatCard label="Open / Inconclusive" value={stats.opens} />
                    <StatCard
                        label="Cumulative KC Ticks"
                        value={stats.totalT >= 0 ? `+${stats.totalT}` : `${stats.totalT}`}
                        accent={stats.totalT >= 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}
                    />
                </div>



                {/* Data table */}
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#f59e0b', padding: 40, fontSize: 14 }}>Loading…</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', color: '#f87171', padding: 40 }}>{error}</div>
                ) : data.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>
                        <div style={{ fontSize: 16, marginBottom: 8 }}>No data yet</div>
                        <div style={{ fontSize: 12 }}>Click "⚙ Backfill" to populate historical data from 1 Jan 2026.</div>
                    </div>
                ) : (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 520px)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Date</th>
                                        <th style={thStyle}>Contract</th>
                                        <th style={{ ...thStyle, borderLeft: '1px solid rgba(139,92,246,0.2)' }}>RC Prev Sett.</th>
                                        <th style={thStyle}>RC Ticks</th>
                                        <th style={{ ...thStyle, borderLeft: '1px solid rgba(245,158,11,0.2)' }}>KC Prev Sett.</th>
                                        <th style={thStyle}>KC Ticks</th>
                                        <th style={thStyle}>Bias</th>
                                        <th style={thStyle}>Entry</th>
                                        <th style={thStyle}>Stop</th>
                                        <th style={thStyle}>Target</th>
                                        <th style={thStyle}>Outcome</th>
                                        <th style={thStyle}>Max Ticks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, idx) => {
                                        const even = idx % 2 === 0;
                                        const td = (extra) => ({ ...tdStyle(even), ...extra });
                                        const oc = OUTCOME_COLOR[row.kc_outcome] || {};
                                        return (
                                            <tr key={row.trade_date}>
                                                <td style={td({ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 })}>
                                                    {row.trade_date}
                                                </td>
                                                <td style={td({ color: '#64748b', fontSize: 11 })}>
                                                    <span title={`RC: ${row.rc_contract}`}>
                                                        <span style={{ color: '#a78bfa' }}>{row.kc_contract}</span>
                                                        <span style={{ color: '#475569' }}> / {row.rc_contract}</span>
                                                    </span>
                                                </td>

                                                {/* RC columns */}
                                                <td style={td({ borderLeft: '1px solid rgba(139,92,246,0.1)', color: '#94a3b8' })}>
                                                    {fmt(row.rc_prev_settlement, 0)}
                                                </td>
                                                <td style={td()}>
                                                    <TickBadge ticks={row.rc_tick_move} />
                                                </td>

                                                {/* KC columns */}
                                                <td style={td({ borderLeft: '1px solid rgba(245,158,11,0.1)', color: '#94a3b8' })}>
                                                    {fmt(row.kc_prev_settlement, 2)}
                                                </td>
                                                <td style={td()}>
                                                    <TickBadge ticks={row.kc_tick_move} />
                                                </td>
                                                <td style={td()}>
                                                    {row.kc_bias
                                                        ? <Badge text={row.kc_bias} color={BIAS_COLOR[row.kc_bias] || {}} />
                                                        : <span style={{ color: '#334155' }}>—</span>}
                                                </td>
                                                <td style={td({ color: '#94a3b8', fontFamily: 'monospace' })}>
                                                    {fmt(row.kc_entry_price, 2)}
                                                </td>
                                                <td style={td({ color: '#f87171', fontFamily: 'monospace' })}>
                                                    {fmt(row.kc_stop_level, 2)}
                                                </td>
                                                <td style={td({ color: '#4ade80', fontFamily: 'monospace' })}>
                                                    {fmt(row.kc_target_price, 2)}
                                                </td>
                                                <td style={td()}>
                                                    {row.kc_outcome
                                                        ? <Badge text={row.kc_outcome} color={oc} />
                                                        : <span style={{ color: '#334155' }}>—</span>}
                                                </td>
                                                <td style={td()}>
                                                    <TickBadge ticks={row.kc_max_ticks} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
