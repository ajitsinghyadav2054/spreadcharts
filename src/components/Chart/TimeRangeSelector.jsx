import { useState } from 'react';

// ============================================================
// TimeRangeSelector — vertical button group on the right side
//
// Filters the visible time range on the chart.
// Options: 3M, 1Y, 2Y, 5Y, 20Y, ALL
//
// Uses the chart's timeScale().setVisibleRange() API to zoom
// to the selected period relative to the last data point.
//
// Props:
//   chartRef — ref to the main chart instance
// ============================================================

const ranges = [
    { label: '3M', days: 90 },
    { label: '1Y', days: 365 },
    { label: '2Y', days: 730 },
    { label: '5Y', days: 1825 },
    { label: '20Y', days: 7300 },
    { label: 'ALL', days: null },
];

export default function TimeRangeSelector({ chartRef }) {
    const [active, setActive] = useState('ALL');

    const handleClick = (range) => {
        setActive(range.label);

        if (!chartRef?.current) return;

        if (range.days === null) {
            // ALL — fit all data to screen
            chartRef.current.timeScale().fitContent();
            return;
        }

        // Calculate the "from" timestamp (now minus range.days)
        const now = Math.floor(Date.now() / 1000);
        const from = now - range.days * 86400;

        chartRef.current.timeScale().setVisibleRange({
            from,
            to: now,
        });
    };

    return (
        <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            background: 'rgba(15, 15, 35, 0.9)',
            borderRadius: '8px',
            padding: '4px',
            border: '1px solid rgba(42, 42, 74, 0.7)',
            backdropFilter: 'blur(8px)',
        }}>
            {ranges.map((r) => (
                <button
                    key={r.label}
                    onClick={() => handleClick(r)}
                    style={{
                        padding: '6px 8px',
                        background: active === r.label ? '#4a90d9' : 'transparent',
                        color: active === r.label ? '#fff' : '#8a8a8a',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: active === r.label ? 600 : 400,
                        transition: 'all 0.15s ease',
                        minWidth: '36px',
                        textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                        if (active !== r.label) {
                            e.target.style.background = 'rgba(42, 42, 74, 0.8)';
                            e.target.style.color = '#e0e0e0';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (active !== r.label) {
                            e.target.style.background = 'transparent';
                            e.target.style.color = '#8a8a8a';
                        }
                    }}
                >
                    {r.label}
                </button>
            ))}
        </div>
    );
}
