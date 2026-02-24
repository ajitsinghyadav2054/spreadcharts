import { useState } from 'react';

// ============================================================
// RollMethodSelector — roll method dropdown
// Used for futures contracts that need to "roll" to the next
// expiration month. Options mimic SpreadCharts reference.
// ============================================================

const rollMethods = [
    'On Last Trading Day',
    'On First Notice Day',
    'Open Interest Switch',
    'Custom Date',
];

export default function RollMethodSelector() {
    const [selected, setSelected] = useState(rollMethods[0]);
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
                    color: '#8a8a8a',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'border-color 0.15s ease',
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4a90d9'; }}
                onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = '#2a2a4a'; }}
            >
                <span style={{ color: '#666' }}>Roll:</span>
                <span style={{ color: '#e0e0e0' }}>{selected}</span>
                <span style={{ fontSize: '8px' }}>▼</span>
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
                        minWidth: '180px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    }}
                    className="animate-fade-in"
                >
                    {rollMethods.map((method) => (
                        <div
                            key={method}
                            onClick={() => {
                                setSelected(method);
                                setOpen(false);
                            }}
                            style={{
                                padding: '8px 14px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: selected === method ? '#4a90d9' : '#e0e0e0',
                                fontWeight: selected === method ? 600 : 400,
                                background: selected === method ? 'rgba(74, 144, 217, 0.1)' : 'transparent',
                                transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(74, 144, 217, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = selected === method
                                    ? 'rgba(74, 144, 217, 0.1)' : 'transparent';
                            }}
                        >
                            {method}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
