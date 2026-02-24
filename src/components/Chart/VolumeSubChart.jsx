import { useEffect, useRef } from 'react';
import { createChart, HistogramSeries } from 'lightweight-charts';

// ============================================================
// VolumeSubChart — histogram below the main chart
//
// Shows volume bars colored by candle direction:
//   green = close > open (bullish)
//   red   = close < open (bearish)
//
// Props:
//   data           — same OHLC data array as the main chart
//   onCrosshairMove — callback for crosshair sync
//   chartRef       — ref to expose chart instance to parent
// ============================================================

export default function VolumeSubChart({ data, chartRef }) {
    const containerRef = useRef(null);
    const internalChartRef = useRef(null);
    const seriesRef = useRef(null);

    // Create sub-chart on mount
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            layout: {
                background: { color: '#1a1a2e' },
                textColor: '#8a8a8a',
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(42, 42, 74, 0.3)' },
                horzLines: { color: 'rgba(42, 42, 74, 0.3)' },
            },
            crosshair: {
                vertLine: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#4a90d9',
                },
                horzLine: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#4a90d9',
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(42, 42, 74, 0.5)',
                scaleMargins: { top: 0.1, bottom: 0 },
            },
            timeScale: {
                borderColor: 'rgba(42, 42, 74, 0.5)',
                visible: false, // hide time axis — it's on the main chart
            },
            handleScale: { axisPressedMouseMove: true },
        });

        // Histogram series
        const series = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });

        series.priceScale().applyOptions({
            scaleMargins: { top: 0.1, bottom: 0 },
        });

        internalChartRef.current = chart;
        seriesRef.current = series;

        if (chartRef) chartRef.current = chart;


        // Responsive resize
        const resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            internalChartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    // Update volume data
    useEffect(() => {
        if (seriesRef.current && data && data.length > 0) {
            seriesRef.current.setData(
                data.map((d) => ({
                    time: d.time,
                    value: d.volume || 0,
                    color: d.close >= d.open
                        ? 'rgba(38, 166, 154, 0.5)'   // green/bullish
                        : 'rgba(239, 83, 80, 0.5)',    // red/bearish
                }))
            );
        }
    }, [data]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '100px',
            }}
        />
    );
}
