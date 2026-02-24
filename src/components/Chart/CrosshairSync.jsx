import { useEffect } from 'react';

// ============================================================
// CrosshairSync — component that wires up crosshair sync
// between main chart and volume sub-chart
//
// This is a "headless" component — it renders nothing visible.
// It only subscribes to crosshair move events on both charts
// and calls the sync callbacks provided by useChartSync.
//
// Why a separate component?
//   Keeps sync logic out of CandlestickChart and VolumeSubChart,
//   so those stay focused on rendering. CrosshairSync is the
//   "glue" that coordinates them.
//
// Props:
//   mainChartRef         — ref to the main candlestick chart instance
//   volumeChartRef       — ref to the volume sub-chart instance
//   syncCrosshairFromMain — callback: when main chart crosshair moves
//   syncCrosshairFromSub  — callback: when sub-chart crosshair moves
// ============================================================

export default function CrosshairSync({
    mainChartRef,
    volumeChartRef,
    syncCrosshairFromMain,
    syncCrosshairFromSub,
}) {
    // Subscribe to main chart crosshair events → sync to sub-chart
    useEffect(() => {
        const chart = mainChartRef?.current;
        if (!chart || !syncCrosshairFromMain) return;

        chart.subscribeCrosshairMove(syncCrosshairFromMain);

        return () => {
            try {
                chart.unsubscribeCrosshairMove(syncCrosshairFromMain);
            } catch (e) {
                // chart may have been removed already
            }
        };
    }, [mainChartRef?.current, syncCrosshairFromMain]);

    // Subscribe to sub-chart crosshair events → sync to main chart
    useEffect(() => {
        const chart = volumeChartRef?.current;
        if (!chart || !syncCrosshairFromSub) return;

        chart.subscribeCrosshairMove(syncCrosshairFromSub);

        return () => {
            try {
                chart.unsubscribeCrosshairMove(syncCrosshairFromSub);
            } catch (e) {
                // chart may have been removed already
            }
        };
    }, [volumeChartRef?.current, syncCrosshairFromSub]);

    // Headless component — renders nothing
    return null;
}
