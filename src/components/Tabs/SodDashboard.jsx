import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSodDashboard, selectSodDashboard } from '../../features/ui/uiSlice';
import { fetchCftcData, fetchProducts, fetchColumns } from '../../services/api';
import CftcSeasonalityChart from '../Chart/CftcSeasonalityChart';

// ============================================================
// SodDashboard
//
// Standalone SOD (Seasonality Over Decades) section.
// Rendered when the user clicks "SOD" in the sidebar.
// Has its own config panel (product + columns) and renders
// CftcSeasonalityChart in the space below.
// ============================================================

export default function SodDashboard() {
    const dispatch = useDispatch();
    const { sodSeries } = useSelector(selectSodDashboard);

    const [product, setProduct] = useState('');
    const [products, setProducts] = useState([]);
    const [columns, setColumns] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedColumn, setSelectedColumn] = useState('');

    useEffect(() => {
        fetchProducts()
            .then(data => setProducts(data))
            .catch(err => console.error('SodDashboard: failed to load products', err));
        fetchColumns()
            .then(data => setColumns(data))
            .catch(err => console.error('SodDashboard: failed to load columns', err));
    }, []);

    const handleGenerate = async () => {
        if (!selectedColumn || !product) return;
        setIsGenerating(true);

        try {
            const data = await fetchCftcData({ market: product, limit: 20000 });
            const metricId = selectedColumn;
            const label = columns.find(c => c.id === metricId)?.name || metricId;
            const yearlyData = {};

            // ── Helper: get ISO week number (1-52/53) for a date ──────────────
            // We compute which ISO week this date falls in (Mon=start of week).
            function getISOWeek(y, m, d) {
                const date = new Date(Date.UTC(y, m - 1, d));
                // Shift to nearest Thursday (ISO weeks are counted by Thursday)
                const thu = new Date(date);
                thu.setUTCDate(thu.getUTCDate() + (4 - (thu.getUTCDay() || 7)));
                const yearStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
                return Math.ceil((((thu - yearStart) / 86400000) + 1) / 7);
            }

            // ── Helper: canonical Monday timestamp for a given ISO week ────────
            // We anchor to Jan 3 2000 which is a Monday and ISO week 1 of 2000.
            // Every other week W gets exactly (W-1)*7 days added.
            // This means Week 14 of 2019 and Week 14 of 2023 both map to the
            // *exact same* Unix timestamp, eliminating any zigzag in the avg line.
            const ANCHOR_MS = Date.UTC(2000, 0, 3); // Mon Jan 3 2000 = week 1
            function isoWeekToTimestamp(week) {
                return (ANCHOR_MS + (week - 1) * 7 * 24 * 60 * 60 * 1000) / 1000;
            }

            data.forEach(row => {
                const rawVal = row[metricId];
                if (rawVal === undefined || rawVal === null) return;
                const value = parseFloat(rawVal);
                if (isNaN(value)) return;

                const datePart = row.report_date_as_mm_dd_yyyy.split('T')[0];
                const [yearStr, monthStr, dayStr] = datePart.split('-');
                const year = parseInt(yearStr, 10);
                const month = parseInt(monthStr, 10);
                const day = parseInt(dayStr, 10);

                if (year < 2006 || year > 2026) return;

                // Get the ISO week number for this data point
                const isoWeek = getISOWeek(year, month, day);
                // Clamp to 1–52 (week 53 in some years → treat as 52)
                const clampedWeek = Math.min(isoWeek, 52);

                // Map to the canonical timestamp for that week (same for ALL years)
                const baseTimestamp = isoWeekToTimestamp(clampedWeek);

                if (!yearlyData[year]) yearlyData[year] = [];
                yearlyData[year].push({ baseTimestamp, value, date: datePart });
            });

            // Deduplicate: if the same year has two reports in the same ISO week
            // keep the later one (larger date value)
            Object.keys(yearlyData).forEach(yr => {
                yearlyData[yr].sort((a, b) => a.baseTimestamp - b.baseTimestamp);
                const seen = new Map();
                yearlyData[yr].forEach(pt => seen.set(pt.baseTimestamp, pt));
                yearlyData[yr] = Array.from(seen.values());
            });

            dispatch(setSodDashboard([{ columnId: metricId, label, yearlyData }]));
        } catch (err) {
            console.error('SodDashboard: generate error', err);
            alert('Failed to fetch SOD data for ' + product);
        } finally {
            setIsGenerating(false);
        }
    };

    const hasSelection = !!selectedColumn;

    const selectStyle = (enabled) => ({
        width: '100%',
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #2a2a4a',
        background: enabled ? '#16213e' : '#111',
        color: enabled ? '#fff' : '#666',
        fontSize: '13px',
        cursor: enabled ? 'pointer' : 'not-allowed',
    });

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#1a1a2e',
        }}>
            {/* ── Config Panel (collapsible top strip) ─────────── */}
            <div style={{
                background: '#16213e',
                borderBottom: '1px solid #2a2a4a',
                padding: '14px 20px',
                flexShrink: 0,
                position: 'relative',
            }}>
                {/* Loading overlay */}
                {isGenerating && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(22,33,62,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10, borderRadius: '0',
                    }}>
                        <span style={{ color: '#26a69a', fontWeight: 700, fontSize: '13px' }}>GENERATING...</span>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Section label + Product */}
                    <div style={{ minWidth: '80px' }}>
                        <div style={{ fontSize: '11px', color: '#26a69a', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.06em' }}>
                            SOD — Seasonality
                        </div>
                        <select
                            value={product}
                            onChange={(e) => {
                                setProduct(e.target.value);
                                setSelectedColumn('');
                                dispatch(setSodDashboard(null));
                            }}
                            style={{
                                padding: '7px 10px',
                                borderRadius: '4px',
                                border: '1px solid #2a2a4a',
                                background: '#16213e',
                                color: '#fff',
                                fontSize: '13px',
                                minWidth: '160px',
                            }}
                        >
                            <option value="" disabled>Select Product</option>
                            {products.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {/* Single column selector */}
                    <div style={{ minWidth: '220px', flex: 1, maxWidth: '340px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#8a8a8a', marginBottom: '6px', fontWeight: 600 }}>
                            Column
                        </label>
                        <select
                            value={selectedColumn}
                            onChange={(e) => setSelectedColumn(e.target.value)}
                            disabled={!product}
                            style={selectStyle(!!product)}
                        >
                            <option value="" disabled>Nothing selected</option>
                            {columns.map(col => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Generate button */}
                    <div>
                        <button
                            onClick={handleGenerate}
                            disabled={!hasSelection || !product || isGenerating}
                            style={{
                                padding: '9px 22px',
                                background: hasSelection && product && !isGenerating ? '#26a69a' : '#1e3a3a',
                                color: hasSelection && product && !isGenerating ? '#fff' : '#4a6a6a',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: hasSelection && product && !isGenerating ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {isGenerating ? 'GENERATING...' : '▶ Generate'}
                        </button>
                    </div>

                    {/* Clear button — only shown when chart is active */}
                    {sodSeries && (
                        <button
                            onClick={() => dispatch(setSodDashboard(null))}
                            style={{
                                padding: '9px 14px',
                                background: 'transparent',
                                color: '#ef5350',
                                border: '1px solid rgba(239,83,80,0.4)',
                                borderRadius: '4px',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            ✕ Clear
                        </button>
                    )}
                </div>
            </div>

            {/* ── Chart area ───────────────────────────────────── */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {sodSeries ? (
                    <CftcSeasonalityChart sodSeries={sodSeries} />
                ) : (
                    /* Empty state */
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        color: '#3a3a5a',
                    }}>
                        <div style={{ fontSize: '48px' }}>📅</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#4a4a6a' }}>
                            SOD Seasonality Chart
                        </div>
                        <div style={{ fontSize: '12px', color: '#3a3a5a', textAlign: 'center', maxWidth: '320px' }}>
                            Select a product and at least one column above,<br />then click <strong>▶ Generate</strong> to view year-over-year seasonality (2006–2026).
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
