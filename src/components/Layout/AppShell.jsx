import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import TabBar from '../Tabs/TabBar';
import TabPanel from '../Tabs/TabPanel';
import SodDashboard from '../Tabs/SodDashboard';
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
                {activeSection === 'sod' ? (
                    /* ── SOD Section ── */
                    <SodDashboard />
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

