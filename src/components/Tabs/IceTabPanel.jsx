import { useSelector, useDispatch } from 'react-redux';
import ChartContainer from '../Chart/ChartContainer';
import IceDashboardConfig from './IceDashboardConfig';
import InstrumentInput from '../Input/InstrumentInput';
import IntervalSelector from '../Input/IntervalSelector';
import RollMethodSelector from '../Input/RollMethodSelector';
import IceQuickSelector from '../Input/IceQuickSelector';
import { selectIceTabs, selectActiveIceTabId } from '../../features/ui/uiSlice';

// ============================================================
// IceTabPanel — content area for ICE tabs
// ============================================================

export default function IceTabPanel() {
    const dispatch = useDispatch();
    const tabs = useSelector(selectIceTabs);
    const activeTabId = useSelector(selectActiveIceTabId);

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
                            <IceDashboardConfig tabId={tab.id} />
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
                                ? <IceQuickSelector tab={tab} />
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
                                    background: 'rgba(0, 191, 166, 0.15)',
                                    color: '#00BFA6',
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
                            <div style={{ flex: '1', minHeight: 0, overflow: 'hidden' }}>
                                <ChartContainer
                                    instrumentId={tab.instrumentId}
                                    chartType={tab.chartType}
                                    series={tab.series}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
