import { useSelector, useDispatch } from 'react-redux';
import ChartContainer from '../Chart/ChartContainer';
import DashboardConfig from './DashboardConfig';
import InstrumentInput from '../Input/InstrumentInput';
import IntervalSelector from '../Input/IntervalSelector';
import RollMethodSelector from '../Input/RollMethodSelector';
import CftcSeasonalityChart from '../Chart/CftcSeasonalityChart';
import CftcQuickSelector from '../Input/CftcQuickSelector';
import { setTabSodSeries } from '../../features/ui/uiSlice';

// ============================================================
// TabPanel — content area for tabs
//
// Renders ALL tabs, but only the active one is visible.
// This prevents charts from being destroyed on tab switch.
// ============================================================

export default function TabPanel() {
    const dispatch = useDispatch();
    const tabs = useSelector((state) => state.ui.tabs);
    const activeTabId = useSelector((state) => state.ui.activeTabId);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {tabs.map(tab => {
                const isActive = tab.id === activeTabId;

                // Tab without instrument — show config screen
                if (!tab.instrumentId) {
                    return (
                        <div
                            key={tab.id}
                            style={{
                                display: isActive ? 'flex' : 'none',
                                flex: 1,
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            <DashboardConfig tabId={tab.id} />
                        </div>
                    );
                }

                // SOD-only tab — chartType === 'sod', no main chart underneath
                if (tab.chartType === 'sod' && tab.sodSeries) {
                    return (
                        <div
                            key={tab.id}
                            style={{
                                display: isActive ? 'flex' : 'none',
                                flex: 1,
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Thin header with back-to-config button */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '6px 12px',
                                background: '#16213e',
                                borderBottom: '1px solid #2a2a4a',
                                flexShrink: 0,
                            }}>
                                <button
                                    onClick={() => dispatch(setTabSodSeries({ tabId: tab.id, sodSeries: null }))}
                                    style={{
                                        padding: '3px 10px',
                                        background: 'rgba(74,144,217,0.12)',
                                        border: '1px solid rgba(74,144,217,0.35)',
                                        borderRadius: '4px',
                                        color: '#4a90d9',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    ← Reconfigure
                                </button>
                                <span style={{ fontSize: '11px', color: '#8a8a8a' }}>
                                    SOD Seasonality &mdash;&nbsp;
                                    {tab.sodSeries.map(s => s.label).join(', ')}
                                </span>
                            </div>

                            {/* Full-height SOD chart */}
                            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <CftcSeasonalityChart sodSeries={tab.sodSeries} />
                            </div>
                        </div>
                    );
                }

                // Tab with instrument — show chart (always mounted, hidden when inactive)
                return (
                    <div
                        key={tab.id}
                        style={{
                            display: isActive ? 'flex' : 'none',
                            flex: 1,
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                        className="animate-fade-in"
                    >
                        {/* Toolbar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 12px',
                            background: '#16213e',
                            borderBottom: '1px solid #2a2a4a',
                        }}>
                            {tab.chartType === 'multiline'
                                ? <CftcQuickSelector tab={tab} />
                                : <InstrumentInput tabId={tab.id} currentInstrument={tab.instrumentId} />
                            }
                            {tab.chartType !== 'multiline' && <IntervalSelector tabId={tab.id} />}
                            {tab.chartType !== 'multiline' && <RollMethodSelector />}

                            <div style={{
                                marginLeft: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
                            }}>
                                <span style={{
                                    padding: '3px 8px',
                                    background: 'rgba(74, 144, 217, 0.15)',
                                    color: '#4a90d9',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                }}>
                                    {tab.instrumentId}
                                </span>
                                <span style={{ color: '#8a8a8a' }}>Daily</span>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ flex: tab.sodSeries ? '0 0 55%' : '1', minHeight: 0, overflow: 'hidden' }}>
                                <ChartContainer
                                    instrumentId={tab.instrumentId}
                                    chartType={tab.chartType}
                                    series={tab.series}
                                />
                            </div>

                            {/* SOD Seasonality Chart — shown below main chart when sodSeries is set */}
                            {tab.sodSeries && (
                                <div style={{
                                    flex: '0 0 45%',
                                    minHeight: 0,
                                    borderTop: '2px solid #2a2a4a',
                                    overflow: 'hidden',
                                }}>
                                    <CftcSeasonalityChart sodSeries={tab.sodSeries} />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
