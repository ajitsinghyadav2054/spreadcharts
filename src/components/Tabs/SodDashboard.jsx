import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSodDashboard, selectSodDashboard } from '../../features/ui/uiSlice';
import { fetchCftcData, fetchProducts } from '../../services/api';
import { ITEM_MAP, computeMetricValue } from '../../data/columnHierarchy';
import CftcSeasonalityChart from '../Chart/CftcSeasonalityChart';
import CustomColumnDropdown from '../Input/CustomColumnDropdown';

// ============================================================
// SodDashboard — Seasonal CFTC section
//
// Mirrors DashboardConfig: supports 4 column selectors with
// the full 3-level hierarchy (including computed / WoW fields).
// Generates year-over-year seasonality lines for each column.
// ============================================================

// ── ISO week helpers (unchanged) ─────────────────────────────
function getISOWeek(y, m, d) {
    const date = new Date(Date.UTC(y, m - 1, d));
    const thu = new Date(date);
    thu.setUTCDate(thu.getUTCDate() + (4 - (thu.getUTCDay() || 7)));
    const yearStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
    return Math.ceil((((thu - yearStart) / 86400000) + 1) / 7);
}

const ANCHOR_MS = Date.UTC(2000, 0, 3);
function isoWeekToTimestamp(week) {
    return (ANCHOR_MS + (week - 1) * 7 * 24 * 60 * 60 * 1000) / 1000;
}

// ── Build yearlyData for one metric ID from full raw data ────
function buildYearlyData(metricId, rawData) {
    const item = ITEM_MAP[metricId];
    const yearlyData = {};

    let processedRows;

    if (item?.isSeriesComputed) {
        // WoW: sort globally → compute consecutive diff → use as value
        const sorted = [...rawData]
            .map(row => {
                const datePart = row.report_date_as_mm_dd_yyyy.split('T')[0];
                return { row, datePart };
            })
            .sort((a, b) => a.datePart.localeCompare(b.datePart));

        processedRows = sorted
            .map(({ row, datePart }, i) => {
                if (i === 0) return null;
                const curr = parseFloat(row[item.baseCol]);
                const prev = parseFloat(sorted[i - 1].row[item.baseCol]);
                if (isNaN(curr) || isNaN(prev)) return null;
                return { datePart, value: curr - prev };
            })
            .filter(Boolean);
    } else {
        // Row-level: DB column or row-computed (Net, OI %, etc.)
        processedRows = rawData
            .map(row => {
                const datePart = row.report_date_as_mm_dd_yyyy.split('T')[0];
                const value = computeMetricValue(metricId, row);
                if (value === null || value === undefined || isNaN(value)) return null;
                return { datePart, value };
            })
            .filter(Boolean);
    }

    // Group by year
    processedRows.forEach(({ datePart, value }) => {
        const [yearStr, monthStr, dayStr] = datePart.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        if (year < 2006 || year > 2026) return;

        const isoWeek = getISOWeek(year, month, day);
        const clampedWeek = Math.min(isoWeek, 52);
        const baseTimestamp = isoWeekToTimestamp(clampedWeek);

        if (!yearlyData[year]) yearlyData[year] = [];
        yearlyData[year].push({ baseTimestamp, value, date: datePart });
    });

    // Deduplicate within year
    Object.keys(yearlyData).forEach(yr => {
        yearlyData[yr].sort((a, b) => a.baseTimestamp - b.baseTimestamp);
        const seen = new Map();
        yearlyData[yr].forEach(pt => seen.set(pt.baseTimestamp, pt));
        yearlyData[yr] = Array.from(seen.values());
    });

    return yearlyData;
}

export default function SodDashboard() {
    const dispatch = useDispatch();
    const { sodSeries } = useSelector(selectSodDashboard);

    const [product, setProduct] = useState('');
    const [products, setProducts] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [configs, setConfigs] = useState([
        { id: 1, selection: '', label: '' },
    ]);

    useEffect(() => {
        fetchProducts()
            .then(data => setProducts(data))
            .catch(err => console.error('SodDashboard: failed to load products', err));
    }, []);

    const handleColumnSelect = (index, { id, label }) => {
        const next = [...configs];
        next[index] = { ...next[index], selection: id, label };
        setConfigs(next);
    };

    const handleGenerate = async () => {
        const validConfigs = configs.filter(c => c.selection);
        if (!product || validConfigs.length === 0) return;
        setIsGenerating(true);

        try {
            const data = await fetchCftcData({ market: product, limit: 20000 });

            const series = validConfigs.map(config => {
                const metricId = config.selection;
                const label = config.label || ITEM_MAP[metricId]?.fullLabel || metricId;
                const yearlyData = buildYearlyData(metricId, data);
                return { columnId: metricId, label, yearlyData };
            });

            dispatch(setSodDashboard(series));
        } catch (err) {
            console.error('SodDashboard: generate error', err);
            alert('Failed to fetch SOD data for ' + product);
        } finally {
            setIsGenerating(false);
        }
    };

    const hasSelection = configs.some(c => c.selection);

    // Quick column switcher used in the chart toolbar
    const handleColumnChange = async ({ id: newMetricId, label }) => {
        if (!newMetricId || !product || isGenerating) return;
        setIsGenerating(true);
        try {
            const data = await fetchCftcData({ market: product, limit: 20000 });
            const yearlyData = buildYearlyData(newMetricId, data);
            dispatch(setSodDashboard([{ columnId: newMetricId, label, yearlyData }]));
        } catch (err) {
            console.error('SodDashboard: column switch error', err);
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Styles ──────────────────────────────────────────────
    const selectStyle = {
        padding: '7px 10px', borderRadius: '4px', border: '1px solid #2a2a4a',
        background: '#16213e', color: '#fff', fontSize: '13px', minWidth: '160px',
    };

    // ══ If chart already generated — show chart + thin toolbar ══
    if (sodSeries) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1a1a2e' }}>
                {/* Thin toolbar */}
                <div style={{ background: '#16213e', borderBottom: '1px solid #2a2a4a', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#26a69a', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        SEASONAL CFTC
                    </span>
                    <span style={{ fontSize: '11px', color: '#8a8a8a', whiteSpace: 'nowrap' }}>{product}</span>
                    {/* Live column switcher */}
                    <div style={{ minWidth: '260px', maxWidth: '400px', position: 'relative', flex: 1 }}>
                        {isGenerating && (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(22,33,62,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#26a69a', fontWeight: 600 }}>Loading…</span>
                            </div>
                        )}
                        <CustomColumnDropdown
                            value={sodSeries[0]?.columnId || ''}
                            onChange={handleColumnChange}
                            disabled={isGenerating}
                        />
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => dispatch(setSodDashboard(null))}
                            style={{ padding: '6px 14px', background: 'transparent', color: '#ef5350', border: '1px solid rgba(239,83,80,0.4)', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                            ✕ Clear & Reconfigure
                        </button>
                    </div>
                </div>
                {/* Chart */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <CftcSeasonalityChart sodSeries={sodSeries} />
                </div>
            </div>
        );
    }

    // ══ Config page (no chart yet) ════════════════════════════
    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            padding: '24px', background: '#1a1a2e', color: '#e0e0e0',
            overflowY: 'auto', position: 'relative',
        }}>
            {isGenerating && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,46,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                    <span style={{ color: '#26a69a', fontWeight: 'bold' }}>GENERATING...</span>
                </div>
            )}

            {/* Product Selector */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '11px', color: '#26a69a', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.06em' }}>
                    SEASONAL CFTC — Seasonality
                </div>
                <select
                    value={product}
                    onChange={(e) => {
                        setProduct(e.target.value);
                        setConfigs(prev => prev.map(c => ({ ...c, selection: '', label: '' })));
                        dispatch(setSodDashboard(null));
                    }}
                    style={selectStyle}
                >
                    <option value="" disabled>Select Product</option>
                    {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            {/* Section header */}
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#26a69a', marginBottom: '6px', letterSpacing: '0.04em' }}>
                Seasonal Multi-Line Chart
            </div>
            <div style={{ fontSize: '11px', color: '#8a8a8a', marginBottom: '20px' }}>
                Select a column to view year-over-year seasonality
            </div>

            {/* Single column selector */}
            <div style={{ maxWidth: '400px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                    Column
                </label>
                <CustomColumnDropdown
                    value={configs[0].selection}
                    onChange={({ id, label }) => handleColumnSelect(0, { id, label })}
                    disabled={!product}
                />
            </div>

            {/* Generate button */}
            <div style={{ marginTop: '32px' }}>
                <button
                    onClick={handleGenerate}
                    disabled={!hasSelection || !product || isGenerating}
                    style={{
                        padding: '10px 24px',
                        background: hasSelection && product && !isGenerating ? '#26a69a' : '#1e3a3a',
                        color: hasSelection && product && !isGenerating ? '#fff' : '#4a6a6a',
                        border: 'none', borderRadius: '4px', fontWeight: 600,
                        cursor: hasSelection && product && !isGenerating ? 'pointer' : 'default',
                        transition: 'all 0.2s', fontSize: '13px',
                    }}
                >
                    {isGenerating ? 'GENERATING...' : '▶ Generate Seasonal Chart'}
                </button>
            </div>

            {/* Empty-state hint */}
            {!sodSeries && !isGenerating && (
                <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#3a3a5a' }}>
                    <div style={{ fontSize: '48px' }}>📅</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#4a4a6a' }}>Seasonal CFTC Chart</div>
                    <div style={{ fontSize: '12px', color: '#3a3a5a', textAlign: 'center', maxWidth: '340px' }}>
                        Select a product and at least one column above,<br />
                        then click <strong>▶ Generate</strong> to view year-over-year seasonality (2006–2026).
                    </div>
                </div>
            )}
        </div>
    );
}
