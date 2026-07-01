import { useEffect, useState, useCallback } from 'react';
import { fetchOIScreener } from '../../services/api';

// ============================================================
// OIDashboard — Open Interest Screener & In-Depth View
// ============================================================

function formatChange(val) {
    if (val === null || val === undefined) return '—';
    return (val >= 0 ? '+' : '') + val.toLocaleString();
}

function ChangeCell({ value }) {
    if (value === null || value === undefined) {
        return (
            <span style={{ color: '#555', fontSize: '13px', fontWeight: 500 }}>—</span>
        );
    }
    const isPos = value >= 0;
    return (
        <span style={{
            color: isPos ? '#4caf50' : '#ef5350',
            background: isPos ? 'rgba(76,175,80,0.12)' : 'rgba(239,83,80,0.12)',
            borderRadius: '3px',
            padding: '1px 6px',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
        }}>
            {formatChange(value)}
        </span>
    );
}

// ============== SCREENER VIEW ==============
function GroupCard({ group }) {
    const validContracts = group.contracts.filter(c => c.change !== null);
    const net = validContracts.reduce((sum, c) => sum + c.change, 0);

    return (
        <div style={{
            background: '#16213e', border: '1px solid #2a2a4a',
            borderRadius: '8px', minWidth: '160px', flexShrink: 0,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #2a2a4a', background: '#1a2040' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#e0e0e0', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                    {group.code}
                </div>
                <div style={{ fontSize: '10px', color: '#6a7a9a', fontWeight: 500, letterSpacing: '0.04em', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {group.name}
                </div>
            </div>

            <div style={{ padding: '4px 0', flex: 1 }}>
                {group.contracts.map((c) => (
                    <div key={c.qhcode} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '3px 12px', gap: '12px', borderBottom: '1px solid rgba(42,42,74,0.4)',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <span style={{ fontSize: '12px', color: '#9a9aba', fontWeight: 500, fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                            {c.qhcode}
                        </span>
                        <ChangeCell value={c.change} />
                    </div>
                ))}
            </div>

            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', borderTop: '1px solid #2a2a4a', background: '#1a2040', gap: '12px',
            }}>
                <span style={{ fontSize: '12px', color: '#8a8aaa', fontWeight: 700, letterSpacing: '0.04em' }}>Net</span>
                <ChangeCell value={validContracts.length > 0 ? net : null} />
            </div>
        </div>
    );
}

// ============== IN-DEPTH VIEW ==============
function InDepthView({ data, selectedGroupCode, onSelectGroupCode }) {
    if (!data || !data.groups) return null;

    const group = data.groups.find(g => g.code === selectedGroupCode) || data.groups[0];
    if (!group) return null;

    const validContracts = group.contracts.filter(c => c.oi !== null);
    const contractsCount = validContracts.length;
    const totalOI = group.totalOI || 0;
    const netChange = validContracts.reduce((sum, c) => sum + (c.change || 0), 0);
    const isNetPos = netChange >= 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
            {/* Pill Tabs for Products */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Cocoa Category Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#8a8aaa', marginRight: '4px', textTransform: 'uppercase' }}>Cocoa:</span>
                    {data.groups.filter(g => g.category === 'Cocoa').map(g => (
                        <button
                            key={g.code}
                            onClick={() => onSelectGroupCode(g.code)}
                            style={{
                                padding: '6px 14px',
                                background: selectedGroupCode === g.code ? '#e0e0e0' : 'transparent',
                                color: selectedGroupCode === g.code ? '#1a1a2e' : '#a0a0c0',
                                border: `1px solid ${selectedGroupCode === g.code ? '#e0e0e0' : '#4a4a6a'}`,
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {g.code === 'ALL' ? 'All Cocoa' : `${g.code} - ${g.name}`}
                        </button>
                    ))}
                </div>

                {/* Other Products Category Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#8a8aaa', marginRight: '4px', textTransform: 'uppercase' }}>Other:</span>
                    {data.groups.filter(g => g.category !== 'Cocoa').map(g => (
                        <button
                            key={g.code}
                            onClick={() => onSelectGroupCode(g.code)}
                            style={{
                                padding: '6px 14px',
                                background: selectedGroupCode === g.code ? '#e0e0e0' : 'transparent',
                                color: selectedGroupCode === g.code ? '#1a1a2e' : '#a0a0c0',
                                border: `1px solid ${selectedGroupCode === g.code ? '#e0e0e0' : '#4a4a6a'}`,
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {`${g.code} - ${g.name}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summaries */}
            <div style={{ display: 'flex', gap: '48px' }}>
                <div>
                    <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '4px' }}>Total OI</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>{totalOI.toLocaleString()}</div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '4px' }}>Today's Change</div>
                    <div style={{
                        fontSize: '20px', fontWeight: 800,
                        color: isNetPos ? '#4caf50' : '#ef5350',
                        fontVariantNumeric: 'tabular-nums'
                    }}>{formatChange(netChange)}</div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '4px' }}>Contracts</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>{contractsCount}</div>
                </div>
            </div>

            {/* Table */}
            <div style={{
                background: '#16213e',
                border: '1px solid #2a2a4a',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                {/* Header Row */}
                <div style={{
                    display: 'flex',
                    padding: '12px 16px',
                    borderBottom: '1px solid #2a2a4a',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#8a8aaa',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                }}>
                    <div style={{ flex: 1 }}>CONTRACT</div>
                    <div style={{ flex: 1, textAlign: 'right' }}>OPEN INTEREST</div>
                    <div style={{ flex: 1.5, textAlign: 'right' }}>CHG VS YESTERDAY</div>
                    <div style={{ flex: 2.5, textAlign: 'right' }}>CONCENTRATION</div>
                </div>

                {/* Rows */}
                {validContracts.map((c, i) => {
                    const concentration = totalOI > 0 ? (c.oi / totalOI) * 100 : 0;
                    const isPos = c.change >= 0;
                    const changeColor = isPos ? '#4caf50' : '#ef5350';
                    const rowBg = isPos ? 'rgba(76,175,80,0.1)' : 'rgba(239,83,80,0.1)';
                    const rowBorder = i !== validContracts.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none';

                    return (
                        <div key={c.qhcode} style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 16px',
                            background: rowBg,
                            borderBottom: rowBorder,
                            fontSize: '13px',
                        }}>
                            <div style={{ flex: 1, fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                                {c.qhcode}
                            </div>
                            <div style={{ flex: 1, textAlign: 'right', fontWeight: 600, color: '#e0e0e0', fontVariantNumeric: 'tabular-nums' }}>
                                {c.oi.toLocaleString()}
                            </div>
                            <div style={{ flex: 1.5, textAlign: 'right', fontWeight: 600, color: changeColor, fontVariantNumeric: 'tabular-nums' }}>
                                {formatChange(c.change)}
                            </div>
                            <div style={{ flex: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                                <span style={{ fontWeight: 600, color: '#ffffff', fontVariantNumeric: 'tabular-nums', width: '45px', textAlign: 'right' }}>
                                    {concentration.toFixed(1)}%
                                </span>
                                {/* Progress bar */}
                                <div style={{ width: '120px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${concentration}%`, height: '100%', background: changeColor, borderRadius: '3px' }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
                {validContracts.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#8a8aaa', fontSize: '13px' }}>
                        No data available.
                    </div>
                )}
            </div>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div style={{
            background: '#16213e', border: '1px solid #2a2a4a', borderRadius: '8px', minWidth: '160px',
            flexShrink: 0, padding: '12px', animation: 'pulse 1.5s ease-in-out infinite',
        }}>
            {[...Array(8)].map((_, i) => (
                <div key={i} style={{ height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginBottom: '6px' }} />
            ))}
        </div>
    );
}

export default function OIDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);

    const [selectedGroupCode, setSelectedGroupCode] = useState('C'); // default group for in-depth view

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchOIScreener();
            if (result.success) {
                // Generate Synthetic "All Cocoa" Group before setting data
                if (result.groups) {
                    const cGroup = result.groups.find(g => g.code === 'C');
                    const ccGroup = result.groups.find(g => g.code === 'CC');

                    if (cGroup && ccGroup) {
                        const allCocoaContracts = [];
                        let allTotalOI = 0;
                        let allNet = 0;

                        cGroup.contracts.forEach(c1 => {
                            if (c1.oi === null) return;
                            const monthCode = c1.qhcode.slice(-3);
                            const c2 = ccGroup.contracts.find(x => x.qhcode.slice(-3) === monthCode);

                            if (c2 && c2.oi !== null) {
                                const combinedOi = c1.oi + c2.oi;
                                const combinedChange = (c1.change || 0) + (c2.change || 0);
                                allTotalOI += combinedOi;
                                allNet += combinedChange;

                                allCocoaContracts.push({
                                    qhcode: `ALL ${monthCode}`,
                                    oi: combinedOi,
                                    change: combinedChange
                                });
                            }
                        });

                        const insertIdx = result.groups.findIndex(g => g.code === 'CC') + 1;
                        result.groups.splice(insertIdx, 0, {
                            category: 'Cocoa',
                            code: 'ALL',
                            name: 'All Cocoa',
                            contracts: allCocoaContracts,
                            totalOI: allTotalOI,
                            net: allNet
                        });
                    }
                }

                setData(result);
                // Also default the selectedGroupCode to the first one available if not set
                if (!selectedGroupCode && result.groups?.length > 0) {
                    setSelectedGroupCode(result.groups[0].code);
                }
                setLastRefresh(new Date());
            } else {
                setError('API returned an error');
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch OI data');
        } finally {
            setLoading(false);
        }
    }, [selectedGroupCode]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1a2e', overflow: 'hidden' }}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                .oi-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
                .oi-scroll::-webkit-scrollbar-track { background: #0f0f23; }
                .oi-scroll::-webkit-scrollbar-thumb { background: #2a2a5a; border-radius: 3px; }
            `}</style>

            {/* Toolbar */}
            <div style={{
                background: '#16213e', borderBottom: '1px solid #2a2a4a', padding: '10px 20px',
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
            }}>
                <span style={{ fontSize: '11px', color: '#4a90d9', fontWeight: 700, letterSpacing: '0.1em' }}>
                    📈 OI DASHBOARD
                </span>

                {data?.dataDate && (
                    <span style={{
                        fontSize: '11px', color: '#5a6a8a', background: 'rgba(74,144,217,0.1)',
                        border: '1px solid rgba(74,144,217,0.2)', borderRadius: '3px', padding: '2px 8px', fontFamily: 'monospace',
                    }}>
                        Data as of: {data.dataDate}
                    </span>
                )}

                {lastRefresh && (
                    <span style={{ fontSize: '10px', color: '#3a4a6a' }}>
                        Updated {lastRefresh.toLocaleTimeString()}
                    </span>
                )}

                <div style={{ marginLeft: 'auto' }}>
                    <button
                        onClick={load} disabled={loading}
                        style={{
                            padding: '5px 14px', background: loading ? '#1a2040' : 'rgba(74,144,217,0.15)',
                            color: loading ? '#4a5a7a' : '#4a90d9', border: '1px solid rgba(74,144,217,0.3)',
                            borderRadius: '4px', fontWeight: 600, fontSize: '11px', cursor: loading ? 'default' : 'pointer',
                            transition: 'all 0.15s', letterSpacing: '0.04em',
                        }}
                        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(74,144,217,0.25)'; }}
                        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'rgba(74,144,217,0.15)'; }}
                    >
                        {loading ? '⏳ Loading…' : '↻ Refresh'}
                    </button>
                </div>
            </div>

            {/* Error state */}
            {error && !loading && (
                <div style={{ margin: '24px auto', padding: '16px 24px', background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: '6px', color: '#ef5350', fontSize: '13px', maxWidth: '500px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>Failed to load OI data</div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>{error}</div>
                    <button onClick={load} style={{ marginTop: '10px', padding: '5px 14px', background: 'rgba(239,83,80,0.2)', color: '#ef5350', border: '1px solid rgba(239,83,80,0.3)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}>
                        Retry
                    </button>
                </div>
            )}

            {/* Main Content Area */}
            <div className="oi-scroll" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

                {/* Content Rendering */}
                {loading ? (
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '20px' }} className="oi-scroll">
                        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : data && !error ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {/* 1. Screener View (Top) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Cocoa Section */}
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#8a8aaa', letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    Cocoa
                                </div>
                                <div className="oi-scroll" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: '10px' }}>
                                    {data.groups.filter(g => g.category === 'Cocoa').map(group => (
                                        <GroupCard key={group.code} group={group} />
                                    ))}
                                </div>
                            </div>

                            {/* Other Products Section */}
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#8a8aaa', letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    Other Products
                                </div>
                                <div className="oi-scroll" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: '20px' }}>
                                    {data.groups.filter(g => g.category !== 'Cocoa').map(group => (
                                        <GroupCard key={group.code} group={group} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. In-Depth View (Bottom) */}
                        <div style={{ borderTop: '1px solid #2a2a4a', paddingTop: '30px', paddingBottom: '40px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#e0e0e0', letterSpacing: '-0.5px', marginBottom: '24px' }}>
                                IN-DEPTH ANALYSIS
                            </div>
                            <InDepthView
                                data={data}
                                selectedGroupCode={selectedGroupCode}
                                onSelectGroupCode={setSelectedGroupCode}
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
