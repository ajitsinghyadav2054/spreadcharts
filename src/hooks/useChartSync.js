import { useEffect, useRef } from 'react';

// ============================================================
// useChartSync — synchronizes time scale + crosshair across N charts
//
// TIME SCALE SYNC — Uses setVisibleRange (time-based) instead of
//   setVisibleLogicalRange, so mixed data frequencies (weekly + daily)
//   stay aligned to the same calendar range.
//
// CROSSHAIR SYNC — Reports the crosshair time to a callback so the
//   parent container can draw a unified CSS overlay line that spans
//   all charts accurately regardless of data frequency.
// ============================================================

export function useChartSync(
    mainChartRef,
    mainSeriesRef,
    subChartRefs = [],
    subSeriesRefs = [],
    syncTrigger = 0,
    onCrosshairTimeChange = null // callback: (time | null) => void
) {
    const isSyncing = useRef(false);
    const isCrosshairSyncing = useRef(false);

    useEffect(() => {
        const mainChart = mainChartRef?.current;
        const mainSeries = mainSeriesRef?.current;
        if (!mainChart) return;

        // Collect all live sub-chart + series pairs
        const subs = subChartRefs
            .map((ref, i) => ({
                chart: ref?.current,
                series: subSeriesRefs[i]?.current,
            }))
            .filter((s) => s.chart && s.series);

        if (subs.length === 0) return;

        const cleanups = [];

        // ────────────────────────────────────────────────────
        // SYNC DISABLED TEMPORARILY TO FIX WEEKLY ZOOM ISSUE
        // The automatic sync was overriding user zoom actions
        // ────────────────────────────────────────────────────

        // Main → all subs (DISABLED)
        // const onMainRangeChange = () => {
        //     if (isSyncing.current) return;
        //     isSyncing.current = true;
        //     try {
        //         const range = mainChart.timeScale().getVisibleRange();
        //         if (range) {
        //             subs.forEach((s) => {
        //                 try { s.chart.timeScale().setVisibleRange(range); } catch (e) { }
        //             });
        //         }
        //     } catch (e) { }
        //     isSyncing.current = false;
        // };
        // mainChart.timeScale().subscribeVisibleLogicalRangeChange(onMainRangeChange);
        // cleanups.push(() => {
        //     try { mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(onMainRangeChange); } catch (e) { }
        // });

        // Each sub → main + other subs (DISABLED)
        // subs.forEach((sub, idx) => {
        //     // Initial sync for newly added sub-charts (with delay to avoid race conditions)
        //     // This ensures new sub-charts start aligned, but won't override user zoom
        //     setTimeout(() => {
        //         try {
        //             const mainRange = mainChart.timeScale().getVisibleRange();
        //             if (mainRange && sub.chart) {
        //                 sub.chart.timeScale().setVisibleRange(mainRange);
        //             }
        //         } catch (e) { 
        //             console.warn('[ChartSync] Initial sync failed:', e);
        //         }
        //     }, 100);

        //     const handler = () => {
        //         if (isSyncing.current) return;
        //         isSyncing.current = true;
        //         try {
        //             const range = sub.chart.timeScale().getVisibleRange();
        //             if (range) {
        //                 try { mainChart.timeScale().setVisibleRange(range); } catch (e) { }
        //                 subs.forEach((other, j) => {
        //                     if (j !== idx) {
        //                         try { other.chart.timeScale().setVisibleRange(range); } catch (e) { }
        //                     }
        //                 });
        //             }
        //         } catch (e) { }
        //         isSyncing.current = false;
        //     };
        //     sub.chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
        //     cleanups.push(() => {
        //         try { sub.chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler); } catch (e) { }
        //     });
        // });

        // Initial sync: snap ALL to the WIDEST visible range
        // This ensures the sub-chart's newer data (e.g. Today) isn't clipped
        // by the main chart's older end date (e.g. Tuesday).
        // Initial sync removed to prevent overriding the main chart's full history view
        // with a potentially narrower default view from a newly added sub-chart.

        // ────────────────────────────────────────────────────
        // 2. CROSSHAIR SYNC
        // ────────────────────────────────────────────────────

        function syncCrosshairTo(targetChart, targetSeries, time) {
            if (!time || !targetChart || !targetSeries) return;
            try {
                targetChart.setCrosshairPosition(undefined, time, targetSeries);
            } catch (e) { }
        }

        function clearCrosshairOn(targetChart) {
            if (!targetChart) return;
            try { targetChart.clearCrosshairPosition(); } catch (e) { }
        }

        // Main chart crosshair → sync to all subs + report time
        const onMainCrosshairMove = (param) => {
            if (isCrosshairSyncing.current) return;
            isCrosshairSyncing.current = true;

            if (!param || !param.time) {
                subs.forEach((s) => clearCrosshairOn(s.chart));
                if (onCrosshairTimeChange) onCrosshairTimeChange(null);
            } else {
                let syncTime = param.time;

                subs.forEach((s) => syncCrosshairTo(s.chart, s.series, syncTime));
                if (onCrosshairTimeChange) onCrosshairTimeChange(param.time);
            }

            isCrosshairSyncing.current = false;
        };
        mainChart.subscribeCrosshairMove(onMainCrosshairMove);
        cleanups.push(() => {
            try { mainChart.unsubscribeCrosshairMove(onMainCrosshairMove); } catch (e) { }
        });

        // Each sub chart crosshair → sync to main + other subs + report time
        subs.forEach((sub, idx) => {
            const handler = (param) => {
                if (isCrosshairSyncing.current) return;
                isCrosshairSyncing.current = true;

                if (!param || !param.time) {
                    // Cursor left sub-chart — clear crosshair on main + sibling subs
                    clearCrosshairOn(mainChart);
                    subs.forEach((other, j) => {
                        if (j !== idx) clearCrosshairOn(other.chart);
                    });
                    if (onCrosshairTimeChange) onCrosshairTimeChange(null);
                } else {
                    // Cursor on sub-chart — sync to main chart + sibling subs via time
                    if (mainSeries) syncCrosshairTo(mainChart, mainSeries, param.time);
                    subs.forEach((other, j) => {
                        if (j !== idx) syncCrosshairTo(other.chart, other.series, param.time);
                    });
                    if (onCrosshairTimeChange) onCrosshairTimeChange(param.time);
                }

                isCrosshairSyncing.current = false;
            };
            sub.chart.subscribeCrosshairMove(handler);
            cleanups.push(() => {
                try { sub.chart.unsubscribeCrosshairMove(handler); } catch (e) { }
            });
        });

        // Cleanup all subscriptions
        return () => {
            cleanups.forEach((fn) => fn());
        };
    }, [syncTrigger]);
}
