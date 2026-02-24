import { useSelector } from 'react-redux';
import { selectActiveInstrumentData, selectActiveInstrument } from '../../features/chartData/chartDataSlice';

// ============================================================
// ExportChart — export functionality
//
// Two export modes:
// 1. PNG: Uses chart.takeScreenshot() from Lightweight Charts
// 2. CSV: Converts Redux OHLC data to CSV and triggers download
//
// This component provides the CSV export logic.
// PNG export is handled directly in ChartToolbar.jsx
//
// Props:
//   chartRef — ref to the chart instance (for PNG)
// ============================================================

export function exportToCSV(data, instrumentId) {
    if (!data || data.length === 0) return;

    const headers = 'Date,Open,High,Low,Close,Volume';
    const rows = data.map((d) => {
        const date = new Date(d.time * 1000).toISOString().split('T')[0];
        return `${date},${d.open},${d.high},${d.low},${d.close},${d.volume || 0}`;
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `${instrumentId}-ohlc-${Date.now()}.csv`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
}

export default function ExportChart({ chartRef }) {
    const data = useSelector(selectActiveInstrumentData);
    const instrumentId = useSelector(selectActiveInstrument);

    const handlePNGExport = () => {
        if (chartRef?.current) {
            const canvas = chartRef.current.takeScreenshot();
            if (canvas) {
                const link = document.createElement('a');
                link.download = `${instrumentId}-chart-${Date.now()}.png`;
                link.href = canvas.toDataURL();
                link.click();
            }
        }
    };

    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            <button
                className="btn-icon"
                onClick={handlePNGExport}
                title="Export as PNG"
            >
                📷
            </button>
            <button
                className="btn-icon"
                onClick={() => exportToCSV(data, instrumentId)}
                title="Export as CSV"
            >
                📄
            </button>
        </div>
    );
}
