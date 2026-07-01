// src/components/Tabs/IceDashboard.jsx
//
// "Change in ICE" weekly snapshot — mirrors CftcWeeklyDashboard.jsx exactly,
// but calls /api/ice-data & /api/ice-products for the 3 ICE Europe products:
//   London Cocoa · White Sugar · Robusta Coffee

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { COLUMN_HIERARCHY, ITEM_MAP, computeMetricValue } from '../../data/columnHierarchy';
import IceChartModal from '../Chart/IceChartModal';

const API_BASE = '/api';
const getAuthHeaders = () => {
    const t = localStorage.getItem('token');
    return t ? { Authorization: `Bearer ${t}` } : {};
};

async function fetchIceProducts() {
    const r = await fetch(`${API_BASE}/ice-products`, { headers: getAuthHeaders() });
    if (!r.ok) throw new Error(r.statusText);
    const j = await r.json();
    return j.data || [];
}

async function fetchIceData(market, limit = 20000) {
    const r = await fetch(`${API_BASE}/ice-data?market=${encodeURIComponent(market)}&limit=${limit}`, {
        headers: getAuthHeaders(),
    });
    if (!r.ok) throw new Error(r.statusText);
    const j = await r.json();
    return j.data || [];
}

// ── Number formatter ──────────────────────────────────────────
function fmtNum(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
    if (abs >= 1_000) return (val / 1_000).toFixed(1) + 'k';
    return Number(val).toFixed(2);
}

// ── Change badge ──────────────────────────────────────────────
function ChangeBadge({ value }) {
    if (value === null || value === undefined || isNaN(value))
        return <span style={{ color: '#475569', fontSize: 12 }}>—</span>;
    const isPos = value >= 0;
    return (
        <span style={{
            color: isPos ? '#4ade80' : '#f87171',
            background: isPos ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${isPos ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
            borderRadius: 4, padding: '1px 6px', fontSize: 12, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        }}>
            {isPos ? '+' : ''}{fmtNum(value)}
        </span>
    );
}

// ── Metric row ────────────────────────────────────────────────
function MetricRow({ label, itemId, currentRow, prevRow, isComputed, isSeriesComp, product, onOpenChart, rowIndex }) {
    const [hovered, setHovered] = useState(false);
    const [btnHovered, setBtnHovered] = useState(false);

    const currentVal = useMemo(() => {
        if (!currentRow || !itemId) return null;
        if (isSeriesComp) {
            const item = ITEM_MAP[itemId];
            if (!item) return null;
            const v = parseFloat(currentRow[item.baseCol]);
            return isNaN(v) ? null : v;
        }
        return computeMetricValue(itemId, currentRow);
    }, [itemId, currentRow, isSeriesComp]);

    const prevVal = useMemo(() => {
        if (!prevRow || !itemId) return null;
        if (isSeriesComp) {
            const item = ITEM_MAP[itemId];
            if (!item) return null;
            const v = parseFloat(prevRow[item.baseCol]);
            return isNaN(v) ? null : v;
        }
        return computeMetricValue(itemId, prevRow);
    }, [itemId, prevRow, isSeriesComp]);

    const change = (currentVal !== null && prevVal !== null && !isNaN(currentVal) && !isNaN(prevVal))
        ? currentVal - prevVal : null;

    const isEven = rowIndex % 2 === 0;

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', padding: '5px 20px',
                background: hovered ? 'rgba(16,185,129,0.07)' : (isEven ? 'rgba(255,255,255,0.016)' : 'transparent'),
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                minHeight: 30, transition: 'background 0.1s', gap: 0,
            }}
        >
            <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12 }}>
                <span style={{ fontSize: 12, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {label}
                </span>
                {isComputed && (
                    <span style={{ fontSize: 9, color: '#10b981', fontStyle: 'italic', flexShrink: 0 }}>calculated</span>
                )}
                {product && (
                    <button
                        title={`Chart: ${label}`}
                        onMouseEnter={() => setBtnHovered(true)}
                        onMouseLeave={() => setBtnHovered(false)}
                        onClick={e => { e.stopPropagation(); onOpenChart(itemId, label); }}
                        style={{
                            background: btnHovered ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.12)',
                            border: `1px solid ${btnHovered ? 'rgba(16,185,129,0.7)' : 'rgba(16,185,129,0.35)'}`,
                            borderRadius: 4, color: '#10b981', fontSize: 11,
                            padding: '1px 6px', cursor: 'pointer', flexShrink: 0,
                            lineHeight: 1.5, transition: 'all 0.12s', fontWeight: 500,
                        }}
                    >📊</button>
                )}
            </div>
            <div style={{ width: 110, textAlign: 'right', fontSize: 12, color: '#60a5fa', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {fmtNum(prevVal)}
            </div>
            <div style={{ width: 120, textAlign: 'right', fontSize: 12, color: '#e2e8f0', fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {fmtNum(currentVal)}
            </div>
            <div style={{ width: 110, textAlign: 'right', flexShrink: 0 }}>
                <ChangeBadge value={change} />
            </div>
        </div>
    );
}

function SectionHeader({ label, isOpen, onToggle }) {
    const [h, setH] = useState(false);
    return (
        <div onClick={onToggle} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', cursor: 'pointer',
                background: h ? 'rgba(16,185,129,0.14)' : 'rgba(16,185,129,0.08)',
                borderTop: '1px solid rgba(16,185,129,0.15)',
                borderBottom: '1px solid rgba(16,185,129,0.15)',
                transition: 'background 0.12s',
            }}>
            <span style={{ color: '#10b981', fontSize: 9, minWidth: 10 }}>{isOpen ? '▼' : '▶'}</span>
            <span style={{ color: '#10b981', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
            </span>
        </div>
    );
}

function SubsectionHeader({ label, isOpen, onToggle }) {
    const [h, setH] = useState(false);
    return (
        <div onClick={onToggle} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 20px 6px 32px', cursor: 'pointer',
                background: h ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.12s',
            }}>
            <span style={{ color: '#64748b', fontSize: 8, minWidth: 10 }}>{isOpen ? '▼' : '▶'}</span>
            <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em' }}>{label}</span>
        </div>
    );
}

function GroupHeader({ label }) {
    return (
        <div style={{ padding: '4px 20px 4px 44px', background: 'rgba(255,255,255,0.012)', borderBottom: '1px solid rgba(255,255,255,0.025)' }}>
            <span style={{ color: '#64748b', fontWeight: 700, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {label}
            </span>
        </div>
    );
}

function Skeleton() {
    return (
        <div style={{ padding: '6px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 12 }}>
            {[1, 0.3, 0.3, 0.3].map((w, i) => (
                <div key={i} style={{
                    flex: i === 0 ? 1 : `0 0 ${110 + i * 5}px`, height: 13,
                    background: `rgba(255,255,255,${0.05 * w})`, borderRadius: 3,
                    animation: 'icePulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s`,
                }} />
            ))}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────
export default function IceDashboard() {
    const [products, setProducts] = useState([]);
    const [product, setProduct] = useState('LONDON COCOA');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentRow, setCurrentRow] = useState(null);
    const [prevRow, setPrevRow] = useState(null);
    const [currentDate, setCurrentDate] = useState(null);
    const [prevDate, setPrevDate] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedSubsections, setExpandedSubsections] = useState({});
    const [chartModal, setChartModal] = useState({ isOpen: false, metricId: null, label: '' });

    useEffect(() => {
        fetchIceProducts().then(setProducts).catch(console.error);
    }, []);

    const loadData = useCallback(async () => {
        if (!product) return;
        setLoading(true); setError(null); setCurrentRow(null); setPrevRow(null);
        try {
            const data = await fetchIceData(product);
            const sorted = [...data].sort((a, b) => {
                const da = (a.report_date_as_mm_dd_yyyy || '').split('T')[0];
                const db = (b.report_date_as_mm_dd_yyyy || '').split('T')[0];
                return db.localeCompare(da);
            });
            setCurrentRow(sorted[0] || null);
            setPrevRow(sorted[1] || null);
            setCurrentDate(sorted[0]?.report_date_as_mm_dd_yyyy?.split('T')[0] || null);
            setPrevDate(sorted[1]?.report_date_as_mm_dd_yyyy?.split('T')[0] || null);
        } catch (err) {
            setError(err.message || 'Failed to load ICE data');
        } finally {
            setLoading(false);
        }
    }, [product]);

    useEffect(() => { loadData(); }, [loadData]);

    const toggleSection = label => setExpandedSections(p => ({ ...p, [label]: p[label] === false ? true : false }));
    const toggleSubsection = key => setExpandedSubsections(p => ({ ...p, [key]: p[key] === false ? true : false }));
    const isSectionOpen = label => expandedSections[label] !== false;
    const isSubOpen = key => expandedSubsections[key] !== false;
    const openChart = useCallback((metricId, label) => setChartModal({ isOpen: true, metricId, label }), []);

    const rowCounter = useRef(0);

    const renderItems = useCallback(items => items.map(item => {
        const idx = rowCounter.current++;
        return (
            <MetricRow
                key={item.id}
                label={item.label}
                itemId={item.id}
                currentRow={currentRow}
                prevRow={prevRow}
                isComputed={!!item.isComputed}
                isSeriesComp={!!item.isSeriesComputed}
                product={product}
                onOpenChart={openChart}
                rowIndex={idx}
            />
        );
    }), [currentRow, prevRow, product, openChart]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'hidden', fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
            <style>{`
                @keyframes icePulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.2; } }
                .ice-scroll::-webkit-scrollbar { width: 6px; }
                .ice-scroll::-webkit-scrollbar-track { background: #0f172a; }
                .ice-scroll::-webkit-scrollbar-thumb { background: #134e4a; border-radius: 3px; }
                .ice-scroll::-webkit-scrollbar-thumb:hover { background: #10b981; }
            `}</style>

            {/* ── Toolbar ───────────────────────────────────── */}
            <div style={{
                background: '#1e293b', borderBottom: '1px solid #134e4a',
                padding: '10px 20px', display: 'flex', alignItems: 'center',
                gap: 14, flexShrink: 0, flexWrap: 'wrap',
            }}>
                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                    🧊 CHANGE IN ICE
                </span>
                <span style={{ fontSize: 11, color: '#475569' }}>London Cocoa · White Sugar · Robusta Coffee — Last Week vs Current Week</span>

                <select
                    value={product}
                    onChange={e => setProduct(e.target.value)}
                    style={{
                        padding: '5px 10px', background: '#0f172a',
                        border: '1px solid #1e3a5f', borderRadius: 5,
                        color: '#e2e8f0', fontSize: 12, cursor: 'pointer', minWidth: 160,
                    }}
                >
                    {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {prevDate && (
                    <span style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 4, padding: '2px 8px', fontFamily: 'monospace' }}>
                        Last Week: {prevDate}
                    </span>
                )}
                {currentDate && (
                    <span style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 4, padding: '2px 8px', fontFamily: 'monospace' }}>
                        Current: {currentDate}
                    </span>
                )}

                <div style={{ marginLeft: 'auto' }}>
                    <button
                        onClick={loadData} disabled={loading}
                        style={{
                            padding: '5px 14px',
                            background: loading ? 'transparent' : 'rgba(16,185,129,0.15)',
                            color: loading ? '#475569' : '#10b981',
                            border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: 5, fontWeight: 600, fontSize: 11,
                            cursor: loading ? 'default' : 'pointer',
                        }}
                    >
                        {loading ? '⏳ Loading…' : '↻ Refresh'}
                    </button>
                </div>
            </div>

            {/* ── Column headers ─────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '7px 20px', background: '#0d2a2a', borderBottom: '2px solid #134e4a', flexShrink: 0 }}>
                <div style={{ flex: '1 1 0', fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>COLUMN</div>
                <div style={{ width: 110, textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>LAST WEEK</div>
                <div style={{ width: 120, textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CURRENT WEEK</div>
                <div style={{ width: 110, textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CHANGE</div>
            </div>

            {/* ── Error ─────────────────────────────────────── */}
            {error && !loading && (
                <div style={{ margin: 24, padding: '14px 20px', background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 8, color: '#ef5350', fontSize: 13, textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Failed to load ICE data</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{error}</div>
                    <button onClick={loadData} style={{ marginTop: 10, padding: '5px 14px', background: 'rgba(239,83,80,0.2)', color: '#ef5350', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
                        Retry
                    </button>
                </div>
            )}

            {/* ── Table body ─────────────────────────────────── */}
            <div className="ice-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    [...Array(30)].map((_, i) => <Skeleton key={i} />)
                ) : !currentRow ? (
                    <div style={{ padding: 48, textAlign: 'center', color: '#475569', fontSize: 14 }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🧊</div>
                        {products.length === 0
                            ? 'No ICE data yet — run the backfill first via POST /api/ice-backfill'
                            : 'Select a product above to view ICE COT weekly data.'}
                    </div>
                ) : (() => {
                    rowCounter.current = 0;
                    return COLUMN_HIERARCHY.map(section => {
                        const secOpen = isSectionOpen(section.label);
                        return (
                            <div key={section.label}>
                                <SectionHeader label={section.label} isOpen={secOpen} onToggle={() => toggleSection(section.label)} />
                                {secOpen && (
                                    <div>
                                        {section.items && renderItems(section.items)}
                                        {section.subsections && section.subsections.map(sub => {
                                            const subKey = `${section.label}::${sub.label}`;
                                            const subOpen = isSubOpen(subKey);
                                            return (
                                                <div key={sub.label}>
                                                    <SubsectionHeader label={sub.label} isOpen={subOpen} onToggle={() => toggleSubsection(subKey)} />
                                                    {subOpen && sub.groups.map(grp => (
                                                        <div key={grp.label || '_flat'}>
                                                            {grp.label && <GroupHeader label={grp.label} />}
                                                            {renderItems(grp.items)}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    });
                })()}
            </div>

            {/* ── Chart Modal ────────────────────────────────── */}
            <IceChartModal
                isOpen={chartModal.isOpen}
                onClose={() => setChartModal({ isOpen: false, metricId: null, label: '' })}
                product={product}
                metricId={chartModal.metricId}
                label={chartModal.label}
            />
        </div>
    );
}
