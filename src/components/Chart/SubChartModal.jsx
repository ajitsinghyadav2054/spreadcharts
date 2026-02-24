import { useState, useEffect } from 'react';
import { TICKER_LIST } from '../../data/data';

// ============================================================
// SubChartModal — Configuration modal for adding new sub-charts
//
// Features:
// - Ticker selection (futures instruments with OHLC data)
// - Action/Analysis selection (placeholder)
// - "Chart" button to confirm and add
// ============================================================

export default function SubChartModal({ isOpen, onClose, onAdd }) {
    const [ticker, setTicker] = useState('');
    const [action, setAction] = useState('');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setTicker('');
            setAction('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
        }}>
            <div style={{
                width: '600px',
                backgroundColor: '#1e1e3a',
                border: '1px solid #4a90d9',
                borderRadius: '6px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'fade-in 0.2s ease-out',
            }}>
                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    background: '#4a90d9',
                    color: '#fff',
                    fontWeight: 600,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span>Add new sub-chart</span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '18px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >×</button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>

                    {/* Ticker Input */}
                    <div style={{ flex: 1 }}>
                        <select
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#16213e',
                                border: '1px solid #2a2a4a',
                                borderRadius: '4px',
                                color: '#e0e0e0',
                                outline: 'none',
                            }}
                        >
                            <option value="" disabled>Select ticker</option>
                            {TICKER_LIST.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.id} - {inst.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Action Input (Placeholder) */}
                    <div style={{ flex: 1 }}>
                        <input
                            type="text"
                            placeholder="No available action"
                            disabled
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#16213e',
                                border: '1px solid #2a2a4a',
                                borderRadius: '4px',
                                color: '#8a8a8a',
                                cursor: 'not-allowed',
                            }}
                        />
                    </div>

                    {/* Chart Button */}
                    <button
                        onClick={() => {
                            if (ticker) onAdd(ticker);
                        }}
                        disabled={!ticker}
                        style={{
                            padding: '10px 20px',
                            background: ticker ? '#888' : '#555', // Greyish as per screenshot?
                            // Screenshot has "Chart" button in grey.
                            backgroundColor: ticker ? '#4a90d9' : '#555',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: ticker ? 'pointer' : 'default',
                            fontWeight: 600,
                        }}
                    >
                        Chart
                    </button>

                    {/* Tools Button */}
                    <button
                        style={{
                            padding: '10px 20px',
                            background: '#9e9e9e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Tools
                    </button>

                </div>
            </div>
        </div>
    );
}
