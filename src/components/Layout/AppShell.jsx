import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import TabBar from '../Tabs/TabBar';
import TabPanel from '../Tabs/TabPanel';
import IceTabBar from '../Tabs/IceTabBar';
import IceTabPanel from '../Tabs/IceTabPanel';
import OpeningVariationDashboard from '../Tabs/OpeningVariationDashboard';
import SodDashboard from '../Tabs/SodDashboard';
import CocoaDashboard from '../Tabs/CocoaDashboard';
import OIDashboard from '../Tabs/OIDashboard';
import HistoricOIDashboard from '../Tabs/HistoricOIDashboard';
import RollingCorrelationDashboard from '../Tabs/RollingCorrelationDashboard';
import VolSeasonalityDashboard from '../Tabs/VolSeasonalityDashboard';
import CftcWeeklyDashboard from '../Tabs/CftcWeeklyDashboard';
import IceDashboard from '../Tabs/IceDashboard';
import { selectActiveSection } from '../../features/ui/uiSlice';

// ============================================================
// AppShell — main layout wrapper
//
// Layout:
// ┌─────────┬──────────────────────────────┐
// │         │          Header              │
// │         ├──────────────────────────────┤
// │ Sidebar │     TabBar (CFTC only)       │
// │         ├──────────────────────────────┤
// │         │   TabPanel  /  SodDashboard  │
// └─────────┴──────────────────────────────┘
// ============================================================

export default function AppShell() {
    const activeSection = useSelector(selectActiveSection);

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            background: '#1a1a2e',
        }}>
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minWidth: 0,
            }}>
                {activeSection === 'cocoa' ? (
                    /* ── Cocoa Section ── */
                    <CocoaDashboard />
                ) : activeSection === 'opening_variation' ? (
                    /* ── Opening Variation Section ── */
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <OpeningVariationDashboard />
                    </div>
                ) : activeSection === 'sod' ? (
                    /* ── SOD Section ── */
                    <SodDashboard />
                ) : activeSection === 'oi' ? (
                    /* ── Daily OI Screener Section ── */
                    <OIDashboard />
                ) : activeSection === 'historic_oi' ? (
                    /* ── Historic OI Section ── */
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <HistoricOIDashboard />
                    </div>
                ) : activeSection === 'rolling_correlation' ? (
                    /* ── Rolling Correlation (rho Monitor) Section ── */
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <RollingCorrelationDashboard />
                    </div>
                ) : activeSection === 'volume_seasonality' ? (
                    /* ── Volume Seasonality Section ── */
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <VolSeasonalityDashboard />
                    </div>
                ) : activeSection === 'cftc_weekly' ? (
                    /* ── Change in CFTC weekly table ── */
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <CftcWeeklyDashboard />
                    </div>
                ) : activeSection === 'ice' ? (
                    /* ── Change in ICE weekly table ── */
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <IceDashboard />
                    </div>
                ) : activeSection === 'ice_charts' ? (
                    /* ── ICE Charts Section ── */
                    <>
                        <IceTabBar />
                        <IceTabPanel />
                    </>
                ) : (
                    /* ── CFTC Section (default) ── */
                    <>
                        <TabBar />
                        <TabPanel />
                    </>
                )}
            </div>
        </div>
    );
}

