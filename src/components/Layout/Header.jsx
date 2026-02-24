import { useSelector } from 'react-redux';
import { selectWsConnected } from '../../features/ws/wsSlice';

// ============================================================
// Header — top bar with branding and user info
//
// Shows:
// - "Spread Charts" brand + connection status indicator
// - User email on the right
// - Settings/profile icons
// ============================================================

export default function Header() {
    const wsConnected = useSelector(selectWsConnected);

    return (
        <header
            style={{
                height: '48px',
                minHeight: '48px',
                background: '#0f0f23',
                borderBottom: '1px solid #2a2a4a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
            }}
        >
            {/* Left — Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#e0e0e0',
                    letterSpacing: '0.5px',
                }}>
                    📈 Spread Charts
                </span>

                {/* WebSocket Connection Indicator */}
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: wsConnected ? '#26a69a' : '#ef5350',
                    boxShadow: wsConnected
                        ? '0 0 6px rgba(38, 166, 154, 0.5)'
                        : '0 0 6px rgba(239, 83, 80, 0.5)',
                    transition: 'all 0.3s ease',
                }} />
                <span style={{ fontSize: '11px', color: '#8a8a8a' }}>
                    {wsConnected ? 'Live' : 'Offline'}
                </span>
            </div>

            {/* Right — User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8a8a8a',
                    fontSize: '16px',
                    cursor: 'pointer',
                }}>⚙</button>
                <button style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8a8a8a',
                    fontSize: '16px',
                    cursor: 'pointer',
                }}>🔔</button>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px',
                    background: 'rgba(42, 42, 74, 0.5)',
                    borderRadius: '20px',
                }}>
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4a90d9, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#fff',
                        fontWeight: 600,
                    }}>A</div>
                    <span style={{ fontSize: '12px', color: '#e0e0e0' }}>
                        ajit@example.com
                    </span>
                </div>
            </div>
        </header>
    );
}
