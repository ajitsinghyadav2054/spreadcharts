import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCocoaDashboard, selectCocoaDashboard } from '../../features/ui/uiSlice';
import { fetchCocoaBagsData, fetchLondonOriginData, fetchIvoryArrivalsData, fetchCocoaRatiosData } from '../../services/api';
import CocoaColumnDropdown from '../Input/CocoaColumnDropdown';
import CocoaMultiLineChart from '../Chart/CocoaMultiLineChart';
import SeasonalityChart from '../Chart/CftcSeasonalityChart';

// ============================================================
// CocoaDashboard — Real Cocoa Market Bags Data
// ============================================================

export default function CocoaDashboard() {
    const dispatch = useDispatch();
    const { sodSeries } = useSelector(selectCocoaDashboard);

    const [isGenerating, setIsGenerating] = useState(false);
    const [selection, setSelection] = useState({ id: '', label: '' });

    // UI state for London Product/Region
    const [originAgeCategory, setOriginAgeCategory] = useState('TOTAL Valid');
    const [originMetric, setOriginMetric] = useState('total_mt');

    const handleGenerate = async (metricId, label, optAge = originAgeCategory, optMetric = originMetric) => {
        if (!metricId) return;
        setIsGenerating(true);
        try {
            let table = 'cocoa_us_bags';
            let title = 'Warehouse Stocks (US)';

            if (metricId === 'cocoa_warehouse_us_change') {
                table = 'cocoa_us_daily_changes';
                title = 'Warehouse Stocks (US) (Daily Change)';
            } else if (metricId === 'cocoa_warehouse_london_total') {
                table = 'cocoa_london_bags';
                title = 'Warehouse Stocks (UK)';
            } else if (metricId === 'cocoa_warehouse_london_change') {
                table = 'cocoa_london_daily_changes';
                title = 'Warehouse Stocks (UK) (Daily Change)';
            }

            let data;
            let isSeasonality = false;

            if (metricId === 'cocoa_warehouse_london_product_region') {
                title = `Product/Region (UK) — ${optAge} — ${optMetric}`;
                data = await fetchLondonOriginData(optAge, optMetric);
            } else if (metricId.startsWith('cocoa_arrivals_ivory')) {
                // Fetch full data explicitly ignoring the 2020 filter
                data = await fetchIvoryArrivalsData();

                if (metricId === 'cocoa_arrivals_ivory_seasonality') {
                    isSeasonality = true;
                    title = 'Ivory Coast Arrivals (Seasonality)';

                    // Filter to only include data from year >= 2015 as requested
                    const filteredData = data.filter(r => {
                        return parseInt(r.trade_date.substring(0, 4)) >= 2015;
                    });

                    // The standard CFTC Seasonality Chart takes data arrays directly,
                    // but it expects standard keys like report_date_as_mm_dd_yyyy and a value representing the line.
                    // We'll map trade_date to report_date_as_mm_dd_yyyy to trick it into reading the date,
                    // and use 'close' as the single metric.
                    data = filteredData.map(r => ({
                        report_date_as_mm_dd_yyyy: r.trade_date,
                        close: r.close
                    }));
                } else {
                    title = 'Ivory Coast Arrivals';
                }
            } else if (metricId.startsWith('cocoa_ratios_')) {
                // Determine category from ID, e.g., 'cocoa_ratios_liquor' -> 'Liquor'
                const categoryRaw = metricId.split('_').pop();
                const category = categoryRaw.charAt(0).toUpperCase() + categoryRaw.slice(1);

                title = `Choc Ratios — ${category}`;
                // Using the specific API to fetch the ratio data
                data = await fetchCocoaRatiosData(category);

            } else {
                data = await fetchCocoaBagsData(null, '2020-01-01', null, table);
            }

            // dispatch the full raw dataset for the chart
            dispatch(setCocoaDashboard([{ columnId: metricId, label, chartData: data, table, title, isSeasonality }]));
        } catch (err) {
            console.error('CocoaDashboard: generate error', err);
            alert('Failed to fetch Cocoa data');
        } finally {
            setIsGenerating(false);
        }
    };

    // Live column switcher (used in chart toolbar)
    const handleColumnChange = ({ id, label }) => {
        setSelection({ id, label });
        handleGenerate(id, label);
    };

    // Auto-regen if sub-params change for Product/Region
    const onOriginParamChange = (newAge, newMetric) => {
        setOriginAgeCategory(newAge);
        setOriginMetric(newMetric);
        // Only fetch if we are actually looking at this view
        if (sodSeries?.[0]?.columnId === 'cocoa_warehouse_london_product_region') {
            // Pass directly to avoid React stale closure reading the previous state
            handleGenerate('cocoa_warehouse_london_product_region', sodSeries[0].label, newAge, newMetric);
        }
    };

    // ══ Chart view ════════════════════════════════════════════
    if (sodSeries) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1a1a2e' }}>
                {/* Thin toolbar */}
                <div style={{
                    background: '#16213e',
                    borderBottom: '1px solid #2a2a4a',
                    padding: '10px 20px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                }}>
                    <span style={{ fontSize: '11px', color: '#8d6e63', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        🍫 COCOA
                    </span>
                    <span style={{ fontSize: '11px', color: '#8a8a8a', whiteSpace: 'nowrap' }}>Market Data</span>

                    {/* Live column switcher */}
                    <div style={{ minWidth: '260px', maxWidth: '400px', position: 'relative', flex: 1 }}>
                        {isGenerating && (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(22,33,62,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#8d6e63', fontWeight: 600 }}>Loading…</span>
                            </div>
                        )}
                        <CocoaColumnDropdown
                            value={sodSeries[0]?.columnId || ''}
                            onChange={handleColumnChange}
                            disabled={isGenerating}
                        />
                    </div>

                    {/* Conditional Toolbar for London Product/Region */}
                    {sodSeries[0]?.columnId === 'cocoa_warehouse_london_product_region' && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#222b40', padding: '6px 12px', borderRadius: '4px', border: '1px solid #2a344a' }}>
                            <span style={{ fontSize: '11px', color: '#8a8a8a' }}>Months Since Graded:</span>
                            <select
                                value={originAgeCategory}
                                onChange={(e) => onOriginParamChange(e.target.value, originMetric)}
                                style={{ background: '#161a25', color: '#d1d4dc', border: '1px solid #4a90d9', borderRadius: '3px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}
                            >
                                <option value="TOTAL Valid">TOTAL Valid</option>
                                <option value="Expired">Expired</option>
                                <option value="Suspended">Suspended</option>
                                {[...Array(13).keys()].map(i => <option key={i} value={String(i)}>{i} Months</option>)}
                                <option value="13 - 24">13-24 Months</option>
                                <option value="25 - 36">25-36 Months</option>
                                <option value="37 - 48">37-48 Months</option>
                                <option value="49+">49+ Months</option>
                            </select>

                            <span style={{ fontSize: '11px', color: '#8a8a8a', marginLeft: '5px' }}>Metric:</span>
                            <select
                                value={originMetric}
                                onChange={(e) => onOriginParamChange(originAgeCategory, e.target.value)}
                                style={{ background: '#161a25', color: '#d1d4dc', border: '1px solid #4a90d9', borderRadius: '3px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}
                            >
                                <option value="total_mt">Combined (Grand Total)</option>
                                <option value="sdu_ldu_mt">SDUs / LDUs</option>
                                <option value="bdu_mt">BDUs</option>
                            </select>
                        </div>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => dispatch(setCocoaDashboard(null))}
                            style={{
                                padding: '6px 14px',
                                background: 'transparent',
                                color: '#ef5350',
                                border: '1px solid rgba(239,83,80,0.4)',
                                borderRadius: '4px',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            ✕ Clear &amp; Reconfigure
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px' }}>
                    {sodSeries.map((s) => {
                        if (s.isSeasonality) {
                            const yearlyData = {};
                            s.chartData.forEach(row => {
                                const dateStr = row.report_date_as_mm_dd_yyyy;
                                if (!dateStr) return;

                                const [y, m, d] = dateStr.substring(0, 10).split('-');
                                const yr = Number(y);

                                // Base year for seasonality alignment, 2000 is a leap year
                                const baseTimestamp = Date.UTC(2000, Number(m) - 1, Number(d)) / 1000;

                                if (!yearlyData[yr]) yearlyData[yr] = [];
                                yearlyData[yr].push({ baseTimestamp, value: row.close });
                            });

                            return (
                                <SeasonalityChart
                                    key={s.columnId}
                                    sodSeries={[{
                                        columnId: s.columnId,
                                        label: s.title || 'Ivory Coast Arrivals',
                                        yearlyData
                                    }]}
                                />
                            );
                        } else {
                            return (
                                <CocoaMultiLineChart
                                    key={s.columnId}
                                    title={s.title || 'Warehouse Stocks'}
                                    data={s.chartData}
                                />
                            );
                        }
                    })}
                </div>
            </div>
        );
    }

    // ══ Config page ════════════════════════════════════════════
    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            background: '#1a1a2e',
            color: '#e0e0e0',
            overflowY: 'auto',
            position: 'relative',
        }}>
            {isGenerating && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(26,26,46,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                }}>
                    <span style={{ color: '#8d6e63', fontWeight: 'bold' }}>GENERATING...</span>
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '28px' }}>🍫</span>
                    <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#c8a98a', letterSpacing: '0.04em' }}>
                            Cocoa
                        </div>
                        <div style={{ fontSize: '11px', color: '#8a8a8a', letterSpacing: '0.06em' }}>
                            SEASONAL CFTC — ICE FUTURES U.S.
                        </div>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #2a2a4a', marginBottom: '24px' }} />

            {/* Column selector */}
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#c8a98a', marginBottom: '6px' }}>
                Chart Configuration
            </div>
            <div style={{ fontSize: '11px', color: '#8a8a8a', marginBottom: '20px' }}>
                Select a Cocoa metric to view real-time Excel-synced warehouse volumes (2020 – 2026)
            </div>

            <div style={{ maxWidth: '420px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: '#c8a98a' }}>
                    Column / Metric
                </label>
                <CocoaColumnDropdown
                    value={selection.id}
                    onChange={({ id, label }) => setSelection({ id, label })}
                    disabled={false}
                />
            </div>

            {/* Generate button */}
            <div style={{ marginTop: '32px' }}>
                <button
                    onClick={() => handleGenerate(selection.id, selection.label)}
                    disabled={!selection.id || isGenerating}
                    style={{
                        padding: '10px 28px',
                        background: selection.id && !isGenerating ? '#8d6e63' : '#2a1f1a',
                        color: selection.id && !isGenerating ? '#fff' : '#6a4a3a',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 600,
                        cursor: selection.id && !isGenerating ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        fontSize: '13px',
                        letterSpacing: '0.04em',
                    }}
                >
                    {isGenerating ? 'GENERATING...' : '▶ Generate Cocoa Chart'}
                </button>
            </div>

            {/* Empty state */}
            {!sodSeries && !isGenerating && (
                <div style={{ marginTop: '56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: '#3a3a5a' }}>
                    <div style={{ fontSize: '56px' }}>🍫</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#5a4a3a' }}>Cocoa Market Chart</div>
                    <div style={{ fontSize: '12px', color: '#4a3a2a', textAlign: 'center', maxWidth: '360px', lineHeight: 1.6 }}>
                        Select a Cocoa metric above (e.g. <em>Warehouse Stocks — Total Stocks</em>), then click
                        <strong> ▶ Generate</strong> to view historical volume data going back to 2020.
                    </div>
                </div>
            )}
        </div>
    );
}
