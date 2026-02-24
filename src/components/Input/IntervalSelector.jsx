import { useState } from 'react';

// ============================================================
// IntervalSelector — time interval dropdown
// Options: 1m, 5m, 15m, 1H, 4H, 1D, 1W, 1M
//
// Currently visual-only (dummy data is daily).
// When connected to a real API, changing interval will trigger
// a new data fetch for the selected instrument.
// ============================================================

const intervals = ['1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M'];

export default function IntervalSelector() {
    const [selected, setSelected] = useState('1D');
    const [open, setOpen] = useState(false);

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    padding: '6px 12px',
                    background: '#252547',
                    border: '1px solid #2a2a4a',
                    borderRadius: '6px',
                    color: '#e0e0e0',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = '#4a90d9'; }}
                onMouseLeave={(e) => { if (!open) e.target.style.borderColor = '#2a2a4a'; }}
            >
                <span style={{ fontWeight: 600 }}>{selected}</span>
                <span style={{ fontSize: '8px', color: '#8a8a8a' }}>▼</span>
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        background: '#1e1e3a',
                        border: '1px solid #2a2a4a',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        zIndex: 100,
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    }}
                    className="animate-fade-in"
                >
                    {intervals.map((int) => (
                        <div
                            key={int}
                            onClick={() => {
                                setSelected(int);
                                setOpen(false);
                            }}
                            style={{
                                padding: '6px 16px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: selected === int ? '#4a90d9' : '#e0e0e0',
                                fontWeight: selected === int ? 600 : 400,
                                background: selected === int ? 'rgba(74, 144, 217, 0.1)' : 'transparent',
                                transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(74, 144, 217, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = selected === int
                                    ? 'rgba(74, 144, 217, 0.1)' : 'transparent';
                            }}
                        >
                            {int}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
