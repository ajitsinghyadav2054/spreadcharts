import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { togglePLCalculator, selectPLCalculatorOpen } from '../../features/ui/uiSlice';

// ============================================================
// PLCalculator — Profit/Loss calculator modal
//
// Inputs:
//   Entry Price, Exit Price, Quantity, Contract Size
//
// Calculates:
//   Gross P/L, Per-contract P/L, Percentage return
//
// Styled as a dark-themed modal with glassmorphism
// ============================================================

export default function PLCalculator() {
    const dispatch = useDispatch();
    const isOpen = useSelector(selectPLCalculatorOpen);
    const [form, setForm] = useState({
        entryPrice: '',
        exitPrice: '',
        quantity: '',
        contractSize: '',
    });

    if (!isOpen) return null;

    const update = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const entryPrice = parseFloat(form.entryPrice) || 0;
    const exitPrice = parseFloat(form.exitPrice) || 0;
    const quantity = parseFloat(form.quantity) || 0;
    const contractSize = parseFloat(form.contractSize) || 1;

    const priceDiff = exitPrice - entryPrice;
    const perContractPL = priceDiff * contractSize;
    const grossPL = perContractPL * quantity;
    const percentReturn = entryPrice !== 0
        ? ((exitPrice - entryPrice) / Math.abs(entryPrice)) * 100
        : 0;

    const isProfit = grossPL >= 0;

    return (
        <div className="modal-overlay" onClick={() => dispatch(togglePLCalculator())}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ minWidth: '420px' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e0e0e0', margin: 0 }}>
                        🖩 P/L Calculator
                    </h3>
                    <button
                        onClick={() => dispatch(togglePLCalculator())}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#8a8a8a',
                            fontSize: '18px',
                            cursor: 'pointer',
                        }}
                    >×</button>
                </div>

                {/* Input Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    {[
                        { label: 'Entry Price', field: 'entryPrice', placeholder: '0.00' },
                        { label: 'Exit Price', field: 'exitPrice', placeholder: '0.00' },
                        { label: 'Quantity', field: 'quantity', placeholder: '1' },
                        { label: 'Contract Size', field: 'contractSize', placeholder: '1000' },
                    ].map((input) => (
                        <div key={input.field}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#8a8a8a', marginBottom: '4px' }}>
                                {input.label}
                            </label>
                            <input
                                type="number"
                                value={form[input.field]}
                                onChange={(e) => update(input.field, e.target.value)}
                                placeholder={input.placeholder}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    background: '#252547',
                                    border: '1px solid #2a2a4a',
                                    borderRadius: '6px',
                                    color: '#e0e0e0',
                                    fontSize: '13px',
                                    outline: 'none',
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Results */}
                <div style={{
                    background: 'rgba(42, 42, 74, 0.4)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '12px',
                }}>
                    <div>
                        <div style={{ fontSize: '11px', color: '#8a8a8a', marginBottom: '4px' }}>Gross P/L</div>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: isProfit ? '#26a69a' : '#ef5350',
                        }}>
                            {isProfit ? '+' : ''}{grossPL.toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#8a8a8a', marginBottom: '4px' }}>Per Contract</div>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: isProfit ? '#26a69a' : '#ef5350',
                        }}>
                            {isProfit ? '+' : ''}{perContractPL.toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#8a8a8a', marginBottom: '4px' }}>Return %</div>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: isProfit ? '#26a69a' : '#ef5350',
                        }}>
                            {isProfit ? '+' : ''}{percentReturn.toFixed(2)}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
