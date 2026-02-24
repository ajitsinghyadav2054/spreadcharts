import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setTabInstrument } from '../../features/ui/uiSlice';
import { setActiveInstrument } from '../../features/chartData/chartDataSlice';
import { AVAILABLE_INSTRUMENTS, INSTRUMENT_DATA_MAP } from '../../data/data';

// ============================================================
// InstrumentInput — autocomplete instrument selector
//
// Features:
// - Text input for typing instrument codes
// - Dropdown with filtered suggestions from AVAILABLE_INSTRUMENTS
// - Selecting an instrument updates both the tab and the active instrument
// - Click-away to close dropdown
//
// Props:
//   tabId             — ID of the current tab
//   currentInstrument — currently selected instrument ID
// ============================================================

export default function InstrumentInput({ tabId, currentInstrument }) {
    const dispatch = useDispatch();
    const [value, setValue] = useState(currentInstrument || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredItems, setFilteredItems] = useState(AVAILABLE_INSTRUMENTS);
    const wrapperRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickAway = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickAway);
        return () => document.removeEventListener('mousedown', handleClickAway);
    }, []);

    const handleChange = (e) => {
        const input = e.target.value;
        setValue(input);
        setShowDropdown(true);

        // Filter instruments by ID or name
        const filtered = AVAILABLE_INSTRUMENTS.filter(
            (inst) =>
                inst.id.toLowerCase().includes(input.toLowerCase()) ||
                inst.name.toLowerCase().includes(input.toLowerCase())
        );
        setFilteredItems(filtered);
    };

    const handleSelect = (instrument) => {
        setValue(instrument.id);
        setShowDropdown(false);

        // Only dispatch if instrument has data
        if (INSTRUMENT_DATA_MAP[instrument.id]) {
            dispatch(setTabInstrument({ tabId, instrumentId: instrument.id }));
            dispatch(setActiveInstrument(instrument.id));
        }
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onFocus={(e) => {
                    e.target.style.borderColor = '#4a90d9';
                    setShowDropdown(true);
                    setFilteredItems(AVAILABLE_INSTRUMENTS);
                }}
                placeholder="Search instrument..."
                style={{
                    width: '180px',
                    padding: '6px 10px',
                    background: '#252547',
                    border: '1px solid #2a2a4a',
                    borderRadius: '6px',
                    color: '#e0e0e0',
                    fontSize: '12px',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = '#2a2a4a';
                }}
            />

            {/* Dropdown */}
            {showDropdown && filteredItems.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    width: '260px',
                    background: '#1e1e3a',
                    border: '1px solid #2a2a4a',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    zIndex: 100,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
                    className="animate-fade-in"
                >
                    {filteredItems.map((inst) => (
                        <div
                            key={inst.id}
                            onClick={() => handleSelect(inst)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px',
                                color: '#e0e0e0',
                                borderBottom: '1px solid rgba(42, 42, 74, 0.3)',
                                transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(74, 144, 217, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 600 }}>{inst.id}</div>
                                <div style={{ fontSize: '11px', color: '#8a8a8a' }}>{inst.name}</div>
                            </div>
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: inst.type === 'spread'
                                    ? 'rgba(99, 102, 241, 0.2)'
                                    : 'rgba(38, 166, 154, 0.2)',
                                color: inst.type === 'spread' ? '#818cf8' : '#26a69a',
                                borderRadius: '4px',
                            }}>
                                {inst.type}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
