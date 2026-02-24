import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setTabMultiChart } from '../../features/ui/uiSlice';
import { setInstrumentData, setLoading } from '../../features/chartData/chartDataSlice';
import { fetchCftcData, fetchProducts, fetchColumns } from '../../services/api';

// ============================================================
// DashboardConfig
//
// A configuration screen displayed when no instrument is selected.
// Allows users to select a Product (e.g. SOYBEAN OIL) and configure
// up to 4 columns (metrics like Producer Long, Open Interest).
// ============================================================

export default function DashboardConfig({ tabId }) {
    const dispatch = useDispatch();

    const [product, setProduct] = useState('');
    const [products, setProducts] = useState([]);
    const [columns, setColumns] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [configs, setConfigs] = useState([
        { id: 1, selection: '', type: 'line' },
        { id: 2, selection: '', type: 'line' },
        { id: 3, selection: '', type: 'line' },
        { id: 4, selection: '', type: 'line' },
    ]);

    // Fetch products and columns from DB on mount
    useEffect(() => {
        fetchProducts()
            .then(data => setProducts(data))
            .catch(err => console.error('Failed to load products:', err));
        fetchColumns()
            .then(data => setColumns(data))
            .catch(err => console.error('Failed to load columns:', err));
    }, []);

    const handleConfigChange = (index, field, value) => {
        const newConfigs = [...configs];
        newConfigs[index] = { ...newConfigs[index], [field]: value };
        setConfigs(newConfigs);
    };

    const handleGenerate = async () => {
        const validConfigs = configs.filter(c => c.selection);
        if (validConfigs.length === 0) return;

        setIsGenerating(true);
        dispatch(setLoading({ instrumentId: 'all', isLoading: true }));

        try {
            console.log("DashboardConfig: Fetching with limit 20000...");
            const data = await fetchCftcData({
                market: product,
                limit: 20000,
            });
            console.log("DashboardConfig: Received data rows:", data.length);
            if (data.length > 0) {
                console.log("First row date:", data[0].report_date_as_mm_dd_yyyy);
                console.log("Last row date:", data[data.length - 1].report_date_as_mm_dd_yyyy);
            }

            validConfigs.forEach(config => {
                const metricId = config.selection;
                const instrumentId = `${product}-${metricId}`;
                const apiKey = metricId;

                const chartData = data
                    .map(row => {
                        const val = row[apiKey];
                        if (val === undefined || val === null) return null;

                        const datePart = row.report_date_as_mm_dd_yyyy.split('T')[0];
                        const [year, month, day] = datePart.split('-').map(Number);
                        const time = { year, month, day };
                        const sortKey = datePart;

                        return {
                            time,
                            sortKey,
                            value: parseFloat(val),
                        };
                    })
                    .filter(d => d !== null && !isNaN(d.value))
                    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

                dispatch(setInstrumentData({ instrumentId, data: chartData }));
            });

            const series = validConfigs.map(c => ({
                id: `${product}-${c.selection}`,
                label: columns.find(m => m.id === c.selection)?.name || c.selection,
                type: c.type,
            }));

            if (series.length > 0) {
                dispatch(setTabMultiChart({ tabId, series }));
            }

        } catch (error) {
            console.error("Error generating chart data:", error);
            alert("Failed to fetch data for " + product);
        } finally {
            setIsGenerating(false);
            dispatch(setLoading({ instrumentId: 'all', isLoading: false }));
        }
    };

    const GRAPH_TYPES = ['line', 'bar', 'scatter'];

    // ── Shared input styles ──────────────────────────────────
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

    const hasSelection = configs.some(c => c.selection);

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            background: '#1a1a2e',
            color: '#e0e0e0',
            overflowY: 'auto',
            position: 'relative'
        }}>
            {/* ── Loading overlay ─────────────────────── */}
            {isGenerating && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(26, 26, 46, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                }}>
                    <span style={{ color: '#4a90d9', fontWeight: 'bold' }}>GENERATING...</span>
                </div>
            )}

            {/* ── Product Selector ──────────────────────── */}
            <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                    Select Product (Live Data)
                </label>
                <select
                    value={product}
                    onChange={(e) => {
                        setProduct(e.target.value);
                        setConfigs(prev => prev.map(c => ({ ...c, selection: '' })));
                    }}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #2a2a4a',
                        background: '#16213e',
                        color: '#fff',
                        width: '300px',
                        fontSize: '13px',
                    }}
                >
                    <option value="" disabled>Nothing selected</option>
                    {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            {/* ── CFTC Multi-Line Chart Config ─────────── */}
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#4a90d9', marginBottom: '6px', letterSpacing: '0.04em' }}>
                CFTC Multi-Line Chart
            </div>
            <div style={{ fontSize: '11px', color: '#8a8a8a', marginBottom: '20px' }}>
                Select up to 4 columns to overlay on the main chart
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '24px',
                width: '100%',
            }}>
                {configs.map((config, idx) => (
                    <div key={config.id} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                                Column {config.id}
                            </label>
                            <select
                                value={config.selection}
                                onChange={(e) => handleConfigChange(idx, 'selection', e.target.value)}
                                disabled={!product}
                                style={selectStyle(!!product)}
                            >
                                <option value="" disabled>Nothing selected</option>
                                {columns.map(col => (
                                    <option key={col.id} value={col.id}>{col.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                                Graph Type
                            </label>
                            <select
                                value={config.type}
                                onChange={(e) => handleConfigChange(idx, 'type', e.target.value)}
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
                        background: hasSelection && !isGenerating ? '#4a90d9' : '#2a2a4a',
                        color: hasSelection && !isGenerating ? '#fff' : '#8a8a8a',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 600,
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
