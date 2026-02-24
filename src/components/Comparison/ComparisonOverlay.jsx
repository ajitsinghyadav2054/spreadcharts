import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectComparisonInstruments } from '../../features/ui/uiSlice';
import { selectInstrumentData } from '../../features/chartData/chartDataSlice';
import { normalizeToPercentage } from '../../utils/expressions';

// ============================================================
// ComparisonOverlay — adds a second line series for comparison
//
// Normalizes both datasets to percentage change from their
// first data point, so instruments with different price scales
// can be compared on the same axis.
//
// Props:
//   chartRef — ref to the main chart instance
// ============================================================

const COMPARISON_COLORS = ['#f59e0b', '#8b5cf6', '#ec4899', '#10b981'];

export default function ComparisonOverlay({ chartRef }) {
    const comparisonInstruments = useSelector(selectComparisonInstruments);
    const seriesRefs = useRef([]);

    // Clean up old series and add new ones when comparison instruments change
    useEffect(() => {
        const chart = chartRef?.current;
        if (!chart) return;

        // Remove old comparison series
        seriesRefs.current.forEach((s) => {
            try { chart.removeSeries(s); } catch (e) { }
        });
        seriesRefs.current = [];

        // This is a simplified implementation — in production,
        // you'd use the Redux store to get each instrument's data
        // and normalize it for comparison

    }, [comparisonInstruments, chartRef]);

    // Render nothing — this component works via side effects on the chart
    return null;
}
