// src/components/Chart/IceChartModal.jsx
// Modal that wraps IceComboChart.
// Opens when a user clicks the 📊 button on a metric row in IceDashboard.
// Fetches from /api/ice-data instead of /api/cftc-data.

import React, { useEffect, useState, useCallback } from 'react';
import IceComboChart from './IceComboChart';
import { fetchIceData } from '../../services/api';

export default function IceChartModal({ isOpen, onClose, product, metricId, label }) {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadData = useCallback(async () => {
        if (!isOpen || !product || !metricId) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch all ICE data for this product, then filter to 2026-01-01+
            const data = await fetchIceData({ market: product, limit: 20000 });
            const filtered = data.filter(row => {
                const d = (row.report_date_as_mm_dd_yyyy || '').split('T')[0];
                return d >= '2026-01-01';
            });
            setRawData(filtered);
        } catch (err) {
            console.error('[IceChartModal]', err);
            setError(err.message || 'Failed to load ICE chart data');
        } finally {
            setLoading(false);
        }
    }, [isOpen, product, metricId]);

    useEffect(() => {
        if (isOpen) {
            setRawData([]);
            loadData();
        }
    }, [isOpen, loadData]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.72)',
                    zIndex: 2000,
                    backdropFilter: 'blur(3px)',
                    WebkitBackdropFilter: 'blur(3px)',
                }}
            />

            {/* Modal panel */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(960px, 94vw)',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#0f172a',
                border: '1px solid #134e4a',
                borderRadius: 12,
                padding: 28,
                zIndex: 2001,
                boxShadow: '0 32px 80px rgba(0, 0, 0, 0.9)',
                fontFamily: '"Inter", sans-serif',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 24,
                    gap: 16,
                }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.3px' }}>
                            {label}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                                background: 'rgba(16,185,129,0.15)',
                                border: '1px solid rgba(16,185,129,0.3)',
                                borderRadius: 4,
                                padding: '1px 7px',
                                color: '#10b981',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                            }}>
                                {product}
                            </span>
                            Weekly ICE COT data · From 2026-01-01
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(239,83,80,0.12)',
                            border: '1px solid rgba(239,83,80,0.3)',
                            borderRadius: 8,
                            color: '#ef5350',
                            width: 32,
                            height: 32,
                            cursor: 'pointer',
                            fontSize: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,83,80,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,83,80,0.12)'; }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{
                        height: 380,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        color: '#64748b',
                    }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            border: '3px solid #1e293b',
                            borderTop: '3px solid #10b981',
                            borderRadius: '50%',
                            animation: 'iceModalSpin 0.8s linear infinite',
                        }} />
                        <div style={{ fontSize: 13 }}>Loading ICE data for <strong style={{ color: '#e2e8f0' }}>{product}</strong>…</div>
                        <style>{`@keyframes iceModalSpin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : error ? (
                    <div style={{
                        height: 380,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        color: '#ef5350',
                    }}>
                        <div style={{ fontSize: 32 }}>⚠️</div>
                        <div style={{ fontSize: 13 }}>{error}</div>
                        <button
                            onClick={loadData}
                            style={{
                                padding: '6px 16px',
                                background: 'rgba(239,83,80,0.15)',
                                border: '1px solid rgba(239,83,80,0.3)',
                                borderRadius: 6,
                                color: '#ef5350',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <IceComboChart rawData={rawData} metricId={metricId} label={label} />
                )}

                {/* Footer note */}
                <div style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: '1px solid #1e293b',
                    fontSize: 10,
                    color: '#475569',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span>ICE COT data is weekly (Fridays). Chart starts 2026-01-01 and grows as new reports are published.</span>
                    <span style={{ color: '#334155' }}>Press ESC to close</span>
                </div>
            </div>
        </>
    );
}
