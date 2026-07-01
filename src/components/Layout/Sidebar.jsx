import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    toggleSidebar,
    selectSidebarOpen,
    setActiveSection,
    selectActiveSection,
} from '../../features/ui/uiSlice';
import { logout } from '../../features/auth/authSlice';

// ============================================================
// Sidebar — dark left navigation panel
// ============================================================

const NAV_ITEMS = [
    {
        id: 'cftc',
        icon: '📊',
        label: 'CFTC',
        activeColor: '#e53e3e',
        activeBg: 'rgba(229, 62, 62, 0.15)',
    },
    {
        id: 'ice_charts',
        icon: '🧊',
        label: 'ICE',
        activeColor: '#00BFA6',
        activeBg: 'rgba(0, 191, 166, 0.15)',
    },
    {
        id: 'cftc_weekly',
        icon: '📋',
        label: 'Change in CFTC',
        activeColor: '#f59e0b',
        activeBg: 'rgba(245, 158, 11, 0.15)',
    },
    {
        id: 'ice',
        icon: '📊',
        label: 'Change in ICE',
        activeColor: '#10b981',
        activeBg: 'rgba(16, 185, 129, 0.15)',
    },
    {
        id: 'sod',
        icon: '📅',
        label: 'Seasonal CFTC',
        activeColor: '#26a69a',
        activeBg: 'rgba(38, 166, 154, 0.15)',
    },
    {
        id: 'cocoa',
        icon: '🍫',
        label: 'Cocoa',
        activeColor: '#8d6e63',
        activeBg: 'rgba(141, 110, 99, 0.15)',
    },
    {
        id: 'opening_variation',
        icon: '⚡',
        label: 'Opening Var.',
        activeColor: '#f59e0b',
        activeBg: 'rgba(245, 158, 11, 0.15)',
    },
    {
        id: 'oi',
        icon: '📈',
        label: 'Daily OI',
        activeColor: '#4a90d9',
        activeBg: 'rgba(74, 144, 217, 0.15)',
    },
    {
        id: 'historic_oi',
        icon: '⏳',
        label: 'Historic OI',
        activeColor: '#ab47bc',
        activeBg: 'rgba(171, 71, 188, 0.15)',
    },
    {
        id: 'rolling_correlation',
        icon: '〜',
        label: 'Rolling Corr.',
        activeColor: '#3dcece',
        activeBg: 'rgba(61, 206, 206, 0.15)',
    },
    {
        id: 'volume_seasonality',
        icon: '📉',
        label: 'Vol. Seasonality',
        activeColor: '#ff9800',
        activeBg: 'rgba(255, 152, 0, 0.15)',
    },
];

export default function Sidebar() {
    const dispatch = useDispatch();
    const isOpen = useSelector(selectSidebarOpen);
    const activeSection = useSelector(selectActiveSection);
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <aside
            style={{
                width: isOpen ? '170px' : '56px',
                minWidth: isOpen ? '170px' : '56px',
                height: '100%',
                background: '#0f0f23',
                borderRight: '1px solid #2a2a4a',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s ease',
                overflow: 'hidden',
            }}
        >
            {/* Brand (keep existing) */}
            <div
                style={{
                    padding: '16px 12px',
                    borderBottom: '1px solid #2a2a4a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                }}
                onClick={() => dispatch(toggleSidebar())}
            >
                {/* ... (keep brand content) ... */}
                <span style={{
                    fontSize: '20px',
                    color: '#4a90d9',
                    minWidth: '28px',
                    textAlign: 'center',
                }}>◈</span>
                {isOpen && (
                    <span style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#e0e0e0',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.5px',
                    }}>
                        SpreadCharts
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
                {NAV_ITEMS.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                        <div
                            key={item.id}
                            onClick={() => dispatch(setActiveSection(item.id))}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px',
                                margin: '2px 6px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: isActive ? item.activeBg : 'transparent',
                                borderLeft: isActive ? `3px solid ${item.activeColor}` : '3px solid transparent',
                                color: isActive ? item.activeColor : '#8a8a8a',
                                transition: 'all 0.15s ease',
                                fontSize: '13px',
                                fontWeight: isActive ? 600 : 400,
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <span style={{ fontSize: '16px', minWidth: '24px', textAlign: 'center' }}>
                                {item.icon}
                            </span>
                            {isOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                        </div>
                    );
                })}

                {/* Spacer */}
                <div style={{ flex: 1 }}></div>

                {/* Logout Button */}
                <div
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        margin: '2px 6px 10px 6px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: 'rgba(239, 83, 80, 0.1)',
                        border: '1px solid rgba(239, 83, 80, 0.2)',
                        color: '#ef5350',
                        transition: 'all 0.15s ease',
                        fontSize: '13px',
                    }}
                >
                    <span style={{ fontSize: '16px', minWidth: '24px', textAlign: 'center' }}>
                        🚪
                    </span>
                    {isOpen && <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Logout</span>}
                </div>
            </nav>

            {/* Footer */}
            {isOpen && (
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid #2a2a4a',
                    fontSize: '11px',
                    color: '#555',
                }}>
                    <div>Terms of Service</div>
                    <div style={{ marginTop: '4px' }}>© 2025 SpreadCharts</div>
                </div>
            )}
        </aside>
    );
}
