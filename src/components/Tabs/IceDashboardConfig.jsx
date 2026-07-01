import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setIceTabMultiChart } from '../../features/ui/uiSlice';
import { setInstrumentData, setLoading } from '../../features/chartData/chartDataSlice';
import { fetchIceData, fetchIceProducts } from '../../services/api';
import { ITEM_MAP, computeMetricValue } from '../../data/columnHierarchy';
import CustomColumnDropdown from '../Input/CustomColumnDropdown';

// ============================================================
// IceDashboardConfig
// Allows user to select a Product and configure up to 4 columns
// (metrics). Supports both DB columns and computed fields.
// ============================================================

export default function IceDashboardConfig({ tabId }) {
    const dispatch = useDispatch();

    const [product, setProduct] = useState('');
    const [products, setProducts] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [configs, setConfigs] = useState([
        { id: 1, selection: '', label: '', type: 'line' },
        { id: 2, selection: '', label: '', type: 'line' },
        { id: 3, selection: '', label: '', type: 'line' },
        { id: 4, selection: '', label: '', type: 'line' },
    ]);

    useEffect(() => {
        fetchIceProducts()
            .then(data => setProducts(data))
            .catch(err => console.error('Failed to load ICE products:', err));
    }, []);

    const handleColumnSelect = (index, { id, label }) => {
        const newConfigs = [...configs];
        newConfigs[index] = { ...newConfigs[index], selection: id, label };
        setConfigs(newConfigs);
    };

    const handleTypeChange = (index, type) => {
        const newConfigs = [...configs];
        newConfigs[index] = { ...newConfigs[index], type };
        setConfigs(newConfigs);
    };

    const handleGenerate = async () => {
        const validConfigs = configs.filter(c => c.selection);
        if (validConfigs.length === 0) return;

        setIsGenerating(true);
        dispatch(setLoading({ instrumentId: 'all', isLoading: true }));

        try {
            const data = await fetchIceData({ market: product, limit: 20000 });

            validConfigs.forEach(config => {
                const metricId = config.selection;
                const instrumentId = `${product}-${metricId}`;
                const item = ITEM_MAP[metricId];

                let chartData;

                if (item?.isSeriesComputed) {
                    // Week-over-week change: sort all rows by date, then diff consecutive values
                    const sorted = [...data]
                        .map(row => {
                            const datePart = row.report_date_as_mm_dd_yyyy.split('T')[0];
                            return { row, datePart, time: datePart };
                        })
                        .sort((a, b) => a.datePart.localeCompare(b.datePart));

                    chartData = sorted
                        .map(({ row, datePart, time }, i) => {
                            if (i === 0) return null; // no previous week
                            const curr = parseFloat(row[item.baseCol]);
                            const prev = parseFloat(sorted[i - 1].row[item.baseCol]);
                            if (isNaN(curr) || isNaN(prev)) return null;
                            return { time, sortKey: datePart, value: curr - prev };
                        })
                        .filter(Boolean);
                } else {
                    // Row-level: direct DB column or row-computed (Net, OI Old%, etc.)
                    chartData = data
                        .map(row => {
                            const val = computeMetricValue(metricId, row);
                            if (val === null || val === undefined || isNaN(val)) return null;
                            const datePart = row.report_date_as_mm_dd_yyyy.split('T')[0];
                            return { time: datePart, sortKey: datePart, value: val };
                        })
                        .filter(Boolean)
                        .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
                }

                dispatch(setInstrumentData({ instrumentId, data: chartData }));
            });

            const series = validConfigs.map(c => ({
                id: `${product}-${c.selection}`,
                label: c.label || ITEM_MAP[c.selection]?.fullLabel || c.selection,
                type: c.type,
            }));

            if (series.length > 0) {
                dispatch(setIceTabMultiChart({ tabId, series, product }));
            }

        } catch (error) {
            console.error('Error generating ICE chart data:', error);
            alert('Failed to fetch data for ' + product);
        } finally {
            setIsGenerating(false);
            dispatch(setLoading({ instrumentId: 'all', isLoading: false }));
        }
    };

    const GRAPH_TYPES = ['line', 'bar', 'scatter'];

    const selectStyle = (enabled) => ({
        width: '100%', padding: '8px 12px', borderRadius: '4px',
        border: '1px solid #2a2a4a',
        background: enabled ? '#16213e' : '#111',
        color: enabled ? '#fff' : '#666',
        fontSize: '13px', cursor: enabled ? 'pointer' : 'not-allowed',
        boxSizing: 'border-box',
    });

    const hasSelection = configs.some(c => c.selection);

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            padding: '24px', background: '#1a1a2e', color: '#e0e0e0',
            overflowY: 'auto', position: 'relative'
        }}>
            {isGenerating && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(26, 26, 46, 0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                }}>
                    <span style={{ color: '#00BFA6', fontWeight: 'bold' }}>GENERATING...</span>
                </div>
            )}

            {/* Product Selector */}
            <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                    Select ICE Product (Live Data)
                </label>
                <select
                    value={product}
                    onChange={(e) => {
                        setProduct(e.target.value);
                        setConfigs(prev => prev.map(c => ({ ...c, selection: '', label: '' })));
                    }}
                    style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #2a2a4a', background: '#16213e', color: '#fff', width: '300px', fontSize: '13px' }}
                >
                    <option value="" disabled>Nothing selected</option>
                    {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            {/* Column config */}
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#00BFA6', marginBottom: '6px', letterSpacing: '0.04em' }}>
                ICE Multi-Line Chart
            </div>
            <div style={{ fontSize: '11px', color: '#8a8a8a', marginBottom: '20px' }}>
                Select up to 4 columns to overlay on the main chart
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', width: '100%' }}>
                {configs.map((config, idx) => (
                    <div key={config.id} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                                Column {config.id}
                            </label>
                            <CustomColumnDropdown
                                value={config.selection}
                                onChange={({ id, label }) => handleColumnSelect(idx, { id, label })}
                                disabled={!product}
                                product={product || undefined}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                                Graph Type
                            </label>
                            <select
                                value={config.type}
                                onChange={(e) => handleTypeChange(idx, e.target.value)}
                                style={selectStyle(true)}
                            >
                                {GRAPH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '32px' }}>
                <button
                    onClick={handleGenerate}
                    disabled={!hasSelection || isGenerating}
                    style={{
                        padding: '10px 24px',
                        background: hasSelection && !isGenerating ? '#00BFA6' : '#2a2a4a',
                        color: hasSelection && !isGenerating ? '#fff' : '#8a8a8a',
                        border: 'none', borderRadius: '4px', fontWeight: 600,
                        cursor: hasSelection && !isGenerating ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                    }}
                >
                    {isGenerating ? 'GENERATING...' : 'Generate Chart'}
                </button>
            </div>
        </div>
    );
}
