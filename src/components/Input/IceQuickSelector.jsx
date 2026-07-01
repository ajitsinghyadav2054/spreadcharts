// src/components/Input/IceQuickSelector.jsx
//
// Toolbar component for multiline ICE tabs.
// Shows 4 column slots — each maps to one series on the chart.
// Selecting / changing any slot fetches data and updates the chart live.

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setIceTabMultiChart } from '../../features/ui/uiSlice';
import { setInstrumentData } from '../../features/chartData/chartDataSlice';
import { fetchIceData } from '../../services/api';
import { ITEM_MAP, computeMetricValue } from '../../data/columnHierarchy';
import CustomColumnDropdown from './CustomColumnDropdown';

// ── Helper: build chart-ready data for one metric ────────────
async function buildChartData(metricId, product) {
    const data = await fetchIceData({ market: product, limit: 20000 });
    const item = ITEM_MAP[metricId];
    let chartData;

    if (item?.isSeriesComputed) {
        const sorted = [...data]
            .map(row => {
                const datePart = row.report_date_as_mm_dd_yyyy.split('T')[0];
                const [year, month, day] = datePart.split('-').map(Number);
                return { row, datePart, time: { year, month, day } };
            })
            .sort((a, b) => a.datePart.localeCompare(b.datePart));

        chartData = sorted
            .map(({ row, datePart, time }, i) => {
                if (i === 0) return null;
                const curr = parseFloat(row[item.baseCol]);
                const prev = parseFloat(sorted[i - 1].row[item.baseCol]);
                if (isNaN(curr) || isNaN(prev)) return null;
                return { time, sortKey: datePart, value: curr - prev };
            })
            .filter(Boolean);
    } else {
        chartData = data
            .map(row => {
                const val = computeMetricValue(metricId, row);
                if (val === null || val === undefined || isNaN(val)) return null;
                const datePart = row.report_date_as_mm_dd_yyyy.split('T')[0];
                const [year, month, day] = datePart.split('-').map(Number);
                return { time: { year, month, day }, sortKey: datePart, value: val };
            })
            .filter(Boolean)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }

    return chartData;
}

// ── Extract metricId from instrumentId ────────────────────────
function extractMetricId(instrumentId, product) {
    if (product && instrumentId.startsWith(product + '-')) {
        return instrumentId.slice(product.length + 1);
    }
    return instrumentId;
}

export default function IceQuickSelector({ tab }) {
    const dispatch = useDispatch();
    const product = tab.product || '';

    // Track loading state per slot (0–3)
    const [loadingSlot, setLoadingSlot] = useState(null);

    // Build 4 slots from current series (fill gaps with null)
    const slots = [0, 1, 2, 3].map(i => tab.series?.[i] || null);

    const handleSlotChange = async (slotIndex, { id: metricId, label }) => {
        if (!metricId || !product || loadingSlot !== null) return;
        setLoadingSlot(slotIndex);

        try {
            const instrumentId = `${product}-${metricId}`;
            const chartData = await buildChartData(metricId, product);

            dispatch(setInstrumentData({ instrumentId, data: chartData }));

            // Build updated series array — replace only this slot
            const newSeries = [...(tab.series || [])];
            newSeries[slotIndex] = {
                id: instrumentId,
                label: label || ITEM_MAP[metricId]?.fullLabel || metricId,
                type: tab.series?.[slotIndex]?.type || 'line',
            };

            // Remove null/undefined gaps, keep only real entries
            const cleanSeries = newSeries.filter(Boolean);

            dispatch(setIceTabMultiChart({ tabId: tab.id, series: cleanSeries, product }));
        } catch (err) {
            console.error('[IceQuickSelector] slot', slotIndex, 'error:', err);
        } finally {
            setLoadingSlot(null);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {slots.map((slot, i) => {
                const currentMetricId = slot ? extractMetricId(slot.id, product) : '';
                const isLoadingThis = loadingSlot === i;
                const isDisabled = loadingSlot !== null;

                return (
                    <div
                        key={i}
                        style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '280px' }}
                    >
                        {/* Slot label */}
                        <div style={{ fontSize: '10px', color: '#00BFA6', fontWeight: 600, marginBottom: '2px', letterSpacing: '0.05em' }}>
                            COL {i + 1}
                        </div>

                        {/* Loading overlay for this slot */}
                        {isLoadingThis && (
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: 5,
                                background: 'rgba(22,33,62,0.85)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '4px', top: '16px',
                            }}>
                                <span style={{ fontSize: '10px', color: '#00BFA6', fontWeight: 600 }}>
                                    Loading…
                                </span>
                            </div>
                        )}

                        <CustomColumnDropdown
                            value={currentMetricId}
                            onChange={(selection) => handleSlotChange(i, selection)}
                            disabled={isDisabled}
                            product={product || undefined}
                        />
                    </div>
                );
            })}
        </div>
    );
}
