import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';

// Format values as K/M
function formatK(val) {
    if (val === undefined || val === null || isNaN(val)) return '—';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return (val / 1_000_000).toFixed(3) + 'M';
    if (abs >= 1_000) return (val / 1_000).toFixed(3) + 'k';
    return val.toFixed(2);
}

export default function CocoaLineChart({ title, data, color = '#8d6e63' }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);

    const [tooltip, setTooltip] = useState(null);

    useEffect(() => {
        if (!containerRef.current || !data) return;

        // Initialize chart
        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#161a25' },
                textColor: '#d1d4dc',
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
            },
            crosshair: {
                mode: 1,
                vertLine: { color: 'rgba(255,255,255,0.3)', width: 1, style: 2, labelBackgroundColor: '#2b2b43' },
                horzLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 2, labelBackgroundColor: '#2b2b43' },
            },
            timeScale: {
                borderColor: '#2B2B43',
                timeVisible: false,
                rightOffset: 5,
            },
            rightPriceScale: {
                borderColor: '#2B2B43',
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
        });
        chartRef.current = chart;

        const series = chart.addSeries(LineSeries, {
            color: color,
            lineWidth: 2,
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: false,
        });
        seriesRef.current = series;

        // Ensure data is sorted by time
        const sortedData = [...data]
            .filter(d => d.date && !isNaN(d.value))
            .map(d => ({ time: d.date, value: d.value }))
            .sort((a, b) => a.time.localeCompare(b.time));

        series.setData(sortedData);
        chart.timeScale().fitContent();

        // Crosshair tooltip
        chart.subscribeCrosshairMove((param) => {
            if (!param || !param.point || param.point.x < 0 || !containerRef.current) {
                setTooltip(null);
                return;
            }
            const sv = param.seriesData?.get(series);
            if (!sv) return;

            setTooltip({
                x: param.point.x,
                y: param.point.y,
                time: param.time,
                value: sv.value ?? sv.close ?? null,
            });
        });

        // ResizeObserver
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
        };
    }, [data, color]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#161a25', borderRadius: '6px', overflow: 'hidden', border: '1px solid #2a2a4a' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #2a2a4a', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#d1d4dc', letterSpacing: '0.03em' }}>
                    {title}
                </span>
            </div>

            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

                {tooltip && tooltip.value !== null && (
                    <div style={{
                        position: 'absolute',
                        left: tooltip.x + 14,
                        top: Math.max(tooltip.y - 20, 8),
                        zIndex: 50,
                        background: 'rgba(22, 26, 37, 0.96)',
                        border: '1px solid #2a2a4a',
                        borderRadius: '5px',
                        padding: '7px 10px',
                        pointerEvents: 'none',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                        minWidth: '120px',
                    }}>
                        <div style={{ color: '#8a9ab5', marginBottom: '4px', fontWeight: 600, fontSize: '10px' }}>
                            {typeof tooltip.time === 'string' ? tooltip.time : new Date(tooltip.time * 1000).toISOString().split('T')[0]}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                            <span style={{ color: color, fontWeight: 700 }}>Value:</span>
                            <span style={{ color: '#fff', fontWeight: 600 }}>{formatK(tooltip.value)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
