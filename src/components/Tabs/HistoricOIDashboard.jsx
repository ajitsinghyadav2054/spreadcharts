import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell, ComposedChart,
    LineChart, Line, Legend, ReferenceArea
} from 'recharts';
import { OI_GROUPS } from '../../data/oiContracts';

const TABS = OI_GROUPS.map(c => ({ code: c.code, name: c.name }));
const RANGES = ['30D', '90D', '180D', 'ALL'];

// Beautiful Colors for Multi-line chart (like Screenshot 3)
const LINE_COLORS = [
    '#e57373', '#f06292', '#ba68c8', '#9575cd', '#7986cb', '#64b5f6', '#4fc3f7', '#4dd0e1',
    '#4db6ac', '#81c784', '#aed581', '#dce775', '#fff176', '#ffd54f', '#ffb74d', '#ff8a65'
];

export default function HistoricOIDashboard() {
    const [selectedTab, setSelectedTab] = useState('C');
    const [selectedRange, setSelectedRange] = useState('ALL');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    // Zoom State — Total OI Chart
    const [leftTotal, setLeftTotal] = useState('dataMin');
    const [rightTotal, setRightTotal] = useState('dataMax');
    const [refAreaLeftTotal, setRefAreaLeftTotal] = useState('');
    const [refAreaRightTotal, setRefAreaRightTotal] = useState('');

    // Zoom State — Daily Change Chart
    const [leftChange, setLeftChange] = useState('dataMin');
    const [rightChange, setRightChange] = useState('dataMax');
    const [refAreaLeftChange, setRefAreaLeftChange] = useState('');
    const [refAreaRightChange, setRefAreaRightChange] = useState('');

    // Zoom State — Individual Curves Chart
    const [leftCurves, setLeftCurves] = useState('dataMin');
    const [rightCurves, setRightCurves] = useState('dataMax');
    const [refAreaLeftCurves, setRefAreaLeftCurves] = useState('');
    const [refAreaRightCurves, setRefAreaRightCurves] = useState('');

    // Zoom State — Concentration Chart
    const [leftConc, setLeftConc] = useState('dataMin');
    const [rightConc, setRightConc] = useState('dataMax');
    const [refAreaLeftConc, setRefAreaLeftConc] = useState('');
    const [refAreaRightConc, setRefAreaRightConc] = useState('');

    // Zoom State — Roll Pressure Chart
    const [leftRpi, setLeftRpi] = useState('dataMin');
    const [rightRpi, setRightRpi] = useState('dataMax');
    const [refAreaLeftRpi, setRefAreaLeftRpi] = useState('');
    const [refAreaRightRpi, setRefAreaRightRpi] = useState('');

    // Zoom State — Divergence Chart
    const [leftDiv, setLeftDiv] = useState('dataMin');
    const [rightDiv, setRightDiv] = useState('dataMax');
    const [refAreaLeftDiv, setRefAreaLeftDiv] = useState('');
    const [refAreaRightDiv, setRefAreaRightDiv] = useState('');

    // Zoom State — Back Month Chart
    const [leftBack, setLeftBack] = useState('dataMin');
    const [rightBack, setRightBack] = useState('dataMax');
    const [refAreaLeftBack, setRefAreaLeftBack] = useState('');
    const [refAreaRightBack, setRefAreaRightBack] = useState('');

    // Shared Reset Zoom (Double Click) logic
    const resetAllZoom = () => {
        setLeftTotal('dataMin'); setRightTotal('dataMax');
        setLeftChange('dataMin'); setRightChange('dataMax');
        setLeftCurves('dataMin'); setRightCurves('dataMax');
        setLeftConc('dataMin'); setRightConc('dataMax');
        setLeftRpi('dataMin'); setRightRpi('dataMax');
        setLeftDiv('dataMin'); setRightDiv('dataMax');
        setLeftBack('dataMin'); setRightBack('dataMax');
    };

    const loadData = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            setLoading(true);
            resetAllZoom();
        }
        setError(null);
        try {
            // Try multiple possible token keys used by the app
            const token = localStorage.getItem('token') || localStorage.getItem('sessionToken') || localStorage.getItem('authToken') || '';
            const res = await axios.get(`/api/historic-oi?product=${selectedTab}&range=${selectedRange}`, {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
            });
            if (res.data.success) {
                setData(res.data.data);
            } else {
                setError('API returned no data');
            }
        } catch (err) {
            console.error('Failed to load historic OI:', err);
            setError(err.response?.data?.error || err.message || 'Failed to load data');
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [selectedTab, selectedRange]);

    useEffect(() => {
        loadData();

        // Auto-refresh every 5 minutes without resetting zoom
        const intervalId = setInterval(() => {
            loadData(true); // maybe pass a flag to tell loadData we don't want a heavy reset?
        }, 300000); // 5 minutes

        return () => clearInterval(intervalId);
    }, [loadData]);

    const activeContracts = useMemo(() => {
        if (!data?.individualCurvesSeries || data.individualCurvesSeries.length === 0) return [];
        const keys = new Set();
        data.individualCurvesSeries.forEach(point => {
            Object.keys(point).forEach(k => {
                if (k !== 'date') keys.add(k);
            });
        });
        const contractList = Array.from(keys);

        const MONTH_ORDER = { 'F': 1, 'G': 2, 'H': 3, 'J': 4, 'K': 5, 'M': 6, 'N': 7, 'Q': 8, 'U': 9, 'V': 10, 'X': 11, 'Z': 12 };
        const parseContract = (str) => {
            const match = str.match(/([FGHJKMNQUVXZ])(\d{2})$/);
            if (!match) return { year: 99, month: 99 };
            return { month: MONTH_ORDER[match[1]] || 0, year: parseInt(match[2]) };
        };

        // Sort by LATEST OI value for the legend/stack order (biggest at bottom)
        const latestPoint = data.individualCurvesSeries[data.individualCurvesSeries.length - 1];
        return contractList.sort((a, b) => {
            const oiA = latestPoint[a] || 0;
            const oiB = latestPoint[b] || 0;
            return oiB - oiA;
        });
    }, [data]);

    // Filtered data for zooming
    const filteredTotalOi = useMemo(() => {
        if (!data?.totalOiSeries) return [];
        if (leftTotal === 'dataMin' && rightTotal === 'dataMax') return data.totalOiSeries;
        return data.totalOiSeries.filter(d => d.date >= leftTotal && d.date <= rightTotal);
    }, [data, leftTotal, rightTotal]);

    const filteredDailyChange = useMemo(() => {
        if (!data?.dailyChangeSeries) return [];
        if (leftChange === 'dataMin' && rightChange === 'dataMax') return data.dailyChangeSeries;
        return data.dailyChangeSeries.filter(d => d.date >= leftChange && d.date <= rightChange);
    }, [data, leftChange, rightChange]);

    const filteredIndividualCurves = useMemo(() => {
        if (!data?.individualCurvesSeries) return [];
        if (leftCurves === 'dataMin' && rightCurves === 'dataMax') return data.individualCurvesSeries;
        return data.individualCurvesSeries.filter(d => d.date >= leftCurves && d.date <= rightCurves);
    }, [data, leftCurves, rightCurves]);

    const filteredConc = useMemo(() => {
        if (!data?.individualCurvesSeries) return [];
        if (leftConc === 'dataMin' && rightConc === 'dataMax') return data.individualCurvesSeries;
        return data.individualCurvesSeries.filter(d => d.date >= leftConc && d.date <= rightConc);
    }, [data, leftConc, rightConc]);

    const rollPressureData = useMemo(() => {
        if (!data?.individualCurvesSeries) return [];
        // Extract all contracts to find front/second
        const keys = new Set();
        data.individualCurvesSeries.forEach(point => {
            Object.keys(point).forEach(k => { if (k !== 'date') keys.add(k); });
        });
        // Custom sort for cocoa contracts (e.g. LCCH26, LCCK26)
        const MONTH_ORDER = { 'F': 1, 'G': 2, 'H': 3, 'J': 4, 'K': 5, 'M': 6, 'N': 7, 'Q': 8, 'U': 9, 'V': 10, 'X': 11, 'Z': 12 };
        const contractList = Array.from(keys);

        const parseContract = (str) => {
            // Assume format suffix is like K26 or Z25
            const match = str.match(/([FGHJKMNQUVXZ])(\d{2})$/);
            if (!match) return { year: 99, month: 99 };
            return { month: MONTH_ORDER[match[1]] || 0, year: parseInt(match[2]) };
        };

        const allSortedContracts = contractList.sort((a, b) => {
            const pA = parseContract(a);
            const pB = parseContract(b);
            if (pA.year !== pB.year) return pA.year - pB.year;
            return pA.month - pB.month;
        });

        return data.individualCurvesSeries.map(point => {
            // Total for this date
            const total = Object.keys(point).reduce((sum, k) => k !== 'date' ? sum + Number(point[k] || 0) : sum, 0);

            // Filter contracts for this specific date that have OI
            const available = allSortedContracts.filter(k => (point[k] || 0) > 0);
            const frontVal = available.length > 0 ? Number(point[available[0]] || 0) : 0;
            const secondVal = available.length > 1 ? Number(point[available[1]] || 0) : 0;

            const rpi = (frontVal + secondVal) > 0 ? (frontVal / (frontVal + secondVal)) : 0;
            const bri = total > 0 ? (frontVal / total) : 0;
            const divergence = rpi - bri;

            const backOi = Math.max(0, total - frontVal - secondVal);
            const backOiPct = total > 0 ? (backOi / total) : 0;

            return { date: point.date, rpi, bri, divergence, backOi, backOiPct };
        });
    }, [data]);

    const filteredRpi = useMemo(() => {
        if (!rollPressureData) return [];
        if (leftRpi === 'dataMin' && rightRpi === 'dataMax') return rollPressureData;
        return rollPressureData.filter(d => d.date >= leftRpi && d.date <= rightRpi);
    }, [rollPressureData, leftRpi, rightRpi]);

    const filteredDiv = useMemo(() => {
        if (!rollPressureData) return [];
        if (leftDiv === 'dataMin' && rightDiv === 'dataMax') return rollPressureData;
        return rollPressureData.filter(d => d.date >= leftDiv && d.date <= rightDiv);
    }, [rollPressureData, leftDiv, rightDiv]);

    const filteredBack = useMemo(() => {
        if (!rollPressureData) return [];
        if (leftBack === 'dataMin' && rightBack === 'dataMax') return rollPressureData;
        return rollPressureData.filter(d => d.date >= leftBack && d.date <= rightBack);
    }, [rollPressureData, leftBack, rightBack]);

    // Format helpers
    const formatNumber = (num) => num?.toLocaleString() || '0';
    const formatPercent = (num) => (num * 100).toFixed(2) + '%';

    // KPI Data computation based on latest entries
    const latestTotalOi = data?.totalOiSeries?.length > 0 ? data.totalOiSeries[data.totalOiSeries.length - 1].totalOI : 0;
    const latestDate = data?.totalOiSeries?.length > 0 ? data.totalOiSeries[data.totalOiSeries.length - 1].date : 'N/A';

    const latestChangeObj = data?.dailyChangeSeries?.length > 0 ? data.dailyChangeSeries[data.dailyChangeSeries.length - 1] : { change: 0 };
    const latestChange = latestChangeObj.change;
    const prevTotalOi = latestTotalOi - latestChange;
    const pctChange = prevTotalOi !== 0 ? (latestChange / prevTotalOi) : 0;

    const latestRpiData = rollPressureData.length > 0 ? rollPressureData[rollPressureData.length - 1] : { rpi: 0, divergence: 0, backOiPct: 0 };
    const rollPressure = latestRpiData.rpi;
    const rollDivergence = latestRpiData.divergence;
    const backMonthPct = latestRpiData.backOiPct;

    const CustomConcTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataRow = payload[0].payload;
            const total = Object.keys(dataRow).reduce((sum, k) => k !== 'date' ? sum + Number(dataRow[k] || 0) : sum, 0);

            return (
                <div style={{ background: '#1e293b', border: '1px solid #333', borderRadius: '4px', padding: '10px', fontSize: '12px' }}>
                    <div style={{ color: '#fff', borderBottom: '1px solid #333', marginBottom: '6px', paddingBottom: '4px', fontWeight: 700 }}>{label}</div>
                    {[...payload].sort((a, b) => (dataRow[b.dataKey] || 0) - (dataRow[a.dataKey] || 0)).map((entry, index) => {
                        const rawVal = dataRow[entry.dataKey] || 0;
                        const pct = total > 0 ? ((rawVal / total) * 100).toFixed(1) : '0.0';
                        return (
                            <div key={index} style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '20px', padding: '1px 0' }}>
                                <span>{entry.name}:</span>
                                <span style={{ color: '#fff' }}>{pct}%</span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ padding: '16px 20px', fontFamily: '"Inter", sans-serif', color: '#e0e0e0', width: '100%', boxSizing: 'border-box', overflowY: 'auto', height: '100%' }}>

            {/* Control Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Cocoa Group */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#8a8aaa', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Cocoa:</span>
                        {OI_GROUPS.filter(g => g.category === 'Cocoa').map(tab => (
                            <button
                                key={tab.code}
                                onClick={() => setSelectedTab(tab.code)}
                                style={{
                                    padding: '6px 16px',
                                    background: selectedTab === tab.code ? '#1a2040' : 'transparent',
                                    color: selectedTab === tab.code ? '#fff' : '#6a7a9a',
                                    border: '1px solid',
                                    borderColor: selectedTab === tab.code ? '#4a6cf7' : '#2a2a4a',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {tab.code} - {tab.name}
                            </button>
                        ))}
                    </div>
                    {/* Other Products Group */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#8a8aaa', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Other:</span>
                        {OI_GROUPS.filter(g => g.category === 'Other Products').map(tab => (
                            <button
                                key={tab.code}
                                onClick={() => setSelectedTab(tab.code)}
                                style={{
                                    padding: '6px 16px',
                                    background: selectedTab === tab.code ? '#1a2040' : 'transparent',
                                    color: selectedTab === tab.code ? '#fff' : '#6a7a9a',
                                    border: '1px solid',
                                    borderColor: selectedTab === tab.code ? '#4a6cf7' : '#2a2a4a',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {tab.code} - {tab.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', background: '#16213e', border: '1px solid #2a2a4a', borderRadius: '4px', padding: '2px' }}>
                    {RANGES.map(r => (
                        <button
                            key={r}
                            onClick={() => setSelectedRange(r)}
                            style={{
                                padding: '4px 12px',
                                background: selectedRange === r ? '#4a6cf7' : 'transparent',
                                color: selectedRange === r ? '#fff' : '#6a7a9a',
                                border: 'none',
                                borderRadius: '2px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Header */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {/* Total OI Box */}
                <div style={{ flex: 1, minWidth: '180px', background: '#16213e', border: '1px solid #2a2a4a', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total OI</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{formatNumber(latestTotalOi)}</div>
                    <div style={{ fontSize: '11px', color: '#6a7a9a', marginTop: '4px' }}>{latestDate}</div>
                </div>

                {/* 1-Day Change Box */}
                <div style={{ flex: 1, minWidth: '180px', background: '#16213e', border: '1px solid #2a2a4a', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>1-Day Change</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: latestChange >= 0 ? '#4caf50' : '#ef5350', marginTop: '4px' }}>
                        {latestChange > 0 ? '+' : ''}{formatNumber(latestChange)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6a7a9a', marginTop: '4px' }}>{formatPercent(pctChange)} vs prev</div>
                </div>

                {/* Roll Pressure Box */}
                <div style={{ flex: 1, minWidth: '180px', background: '#16213e', border: '1px solid #2a2a4a', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll Pressure (RPI)</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{rollPressure.toFixed(3)}</div>
                    <div style={{ fontSize: '11px', color: '#6a7a9a', marginTop: '4px' }}>late / post-roll</div>
                </div>

                {/* Roll Divergence Box */}
                <div style={{ flex: 1, minWidth: '180px', background: '#16213e', border: '1px solid #2a2a4a', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll Divergence</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{rollDivergence.toFixed(3)}</div>
                    <div style={{ fontSize: '11px', color: '#6a7a9a', marginTop: '4px' }}>normal spread</div>
                </div>

                {/* Back Month Box */}
                <div style={{ flex: 1, minWidth: '180px', background: '#16213e', border: '1px solid #2a2a4a', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Back Month OI %</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffb74d', marginTop: '4px' }}>{formatPercent(backMonthPct)}</div>
                    <div style={{ fontSize: '11px', color: '#6a7a9a', marginTop: '4px' }}>contracts 3+ of total</div>
                </div>
            </div>

            {loading ? (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8aaa', fontSize: '16px' }}>
                    <div className="loader">⏳ Loading historical data...</div>
                </div>
            ) : error ? (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef5350', fontSize: '14px', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '32px' }}>⚠️</div>
                    <div>{error}</div>
                    <button onClick={loadData} style={{ padding: '8px 20px', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Retry</button>
                </div>
            ) : !data || data.totalOiSeries?.length === 0 ? (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8aaa', fontSize: '14px', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '32px' }}>📭</div>
                    <div>No historical data found for <strong style={{ color: '#fff' }}>{selectedTab}</strong>.</div>
                    <div style={{ fontSize: '12px' }}>The backfill may still be running. Try another product or wait a few minutes.</div>
                </div>
            ) : (
                <>
                    {/* Charts Grid */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', width: '100%' }}>

                        {/* Total OI Area Chart */}
                        <div style={{ flex: 1.5, minWidth: '0', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>Total Open Interest</div>
                            <div style={{ width: '100%', height: '300px' }}>
                                <ResponsiveContainer>
                                    <AreaChart
                                        data={filteredTotalOi}
                                        margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                                        onMouseDown={(e) => e && setRefAreaLeftTotal(e.activeLabel)}
                                        onMouseMove={(e) => e && refAreaLeftTotal && setRefAreaRightTotal(e.activeLabel)}
                                        onMouseUp={() => {
                                            if (refAreaLeftTotal && refAreaRightTotal && refAreaLeftTotal !== refAreaRightTotal) {
                                                const [l, r] = refAreaLeftTotal < refAreaRightTotal ? [refAreaLeftTotal, refAreaRightTotal] : [refAreaRightTotal, refAreaLeftTotal];
                                                setLeftTotal(l); setRightTotal(r);
                                            }
                                            setRefAreaLeftTotal(''); setRefAreaRightTotal('');
                                        }}
                                        onDoubleClick={() => { setLeftTotal('dataMin'); setRightTotal('dataMax'); }}
                                    >
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4a6cf7" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#4a6cf7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#64748b"
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(val) => val.slice(5)}
                                            domain={[leftTotal, rightTotal]}
                                            allowDataOverflow
                                        />
                                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'} />
                                        <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', fontSize: '12px' }} />
                                        <Area type="monotone" dataKey="totalOI" stroke="#4a6cf7" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" isAnimationActive={false} />
                                        {refAreaLeftTotal && refAreaRightTotal ? (
                                            <ReferenceArea x1={refAreaLeftTotal} x2={refAreaRightTotal} strokeOpacity={0.3} fill="#4a6cf7" fillOpacity={0.3} />
                                        ) : null}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Daily Change Bar Chart */}
                        <div style={{ flex: 1, minWidth: '0', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>Daily OI Change</div>
                            <div style={{ width: '100%', height: '300px' }}>
                                <ResponsiveContainer>
                                    <BarChart
                                        data={filteredDailyChange}
                                        margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                                        onMouseDown={(e) => e && setRefAreaLeftChange(e.activeLabel)}
                                        onMouseMove={(e) => e && refAreaLeftChange && setRefAreaRightChange(e.activeLabel)}
                                        onMouseUp={() => {
                                            if (refAreaLeftChange && refAreaRightChange && refAreaLeftChange !== refAreaRightChange) {
                                                const [l, r] = refAreaLeftChange < refAreaRightChange ? [refAreaLeftChange, refAreaRightChange] : [refAreaRightChange, refAreaLeftChange];
                                                setLeftChange(l); setRightChange(r);
                                            }
                                            setRefAreaLeftChange(''); setRefAreaRightChange('');
                                        }}
                                        onDoubleClick={() => { setLeftChange('dataMin'); setRightChange('dataMax'); }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#64748b"
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(val) => val.slice(5)}
                                            domain={[leftChange, rightChange]}
                                            allowDataOverflow
                                        />
                                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(val) => (val / 1000).toFixed(1) + 'k'} />
                                        <RechartsTooltip cursor={{ fill: '#1e293b' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '12px' }} />
                                        <Bar dataKey="change" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                                            {
                                                (data?.dailyChangeSeries || []).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.change >= 0 ? '#4caf50' : '#ef5350'} />
                                                ))
                                            }
                                        </Bar>
                                        {refAreaLeftChange && refAreaRightChange ? (
                                            <ReferenceArea x1={refAreaLeftChange} x2={refAreaRightChange} strokeOpacity={0.3} fill="#4a6cf7" fillOpacity={0.3} />
                                        ) : null}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Individual Contract Curves */}
                    <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', boxSizing: 'border-box', marginBottom: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>Contract OI — Individual Curves</div>
                        <div style={{ width: '100%', height: '400px' }}>
                            <ResponsiveContainer>
                                <LineChart
                                    data={filteredIndividualCurves}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    onMouseDown={(e) => e && setRefAreaLeftCurves(e.activeLabel)}
                                    onMouseMove={(e) => e && refAreaLeftCurves && setRefAreaRightCurves(e.activeLabel)}
                                    onMouseUp={() => {
                                        if (refAreaLeftCurves && refAreaRightCurves && refAreaLeftCurves !== refAreaRightCurves) {
                                            const [l, r] = refAreaLeftCurves < refAreaRightCurves ? [refAreaLeftCurves, refAreaRightCurves] : [refAreaRightCurves, refAreaLeftCurves];
                                            setLeftCurves(l); setRightCurves(r);
                                        }
                                        setRefAreaLeftCurves(''); setRefAreaRightCurves('');
                                    }}
                                    onDoubleClick={() => { setLeftCurves('dataMin'); setRightCurves('dataMax'); }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} horizontal={true} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(val) => val.slice(5)}
                                        minTickGap={30}
                                        domain={[leftCurves, rightCurves]}
                                        allowDataOverflow
                                    />
                                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'} />
                                    <RechartsTooltip
                                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', fontSize: '11px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
                                        itemStyle={{ fontSize: '11px', padding: '2px 0' }}
                                    />
                                    {activeContracts.map((key, i) => (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                            strokeWidth={2}
                                            dot={false}
                                            isAnimationActive={false} // Faster rendering for massive datasets
                                        />
                                    ))}
                                    {refAreaLeftCurves && refAreaRightCurves ? (
                                        <ReferenceArea x1={refAreaLeftCurves} x2={refAreaRightCurves} strokeOpacity={0.3} fill="#4a6cf7" fillOpacity={0.3} />
                                    ) : null}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Concentration by Contract — Stacked Area Chart */}
                        <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', boxSizing: 'border-box', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>Concentration by Contract</div>
                                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>% share of total OI</div>
                            </div>
                            <div style={{ width: '100%', height: '500px' }}>
                                <ResponsiveContainer>
                                    <AreaChart
                                        data={filteredConc}
                                        stackOffset="expand"
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                        onMouseDown={(e) => e && setRefAreaLeftConc(e.activeLabel)}
                                        onMouseMove={(e) => e && refAreaLeftConc && setRefAreaRightConc(e.activeLabel)}
                                        onMouseUp={() => {
                                            if (refAreaLeftConc && refAreaRightConc && refAreaLeftConc !== refAreaRightConc) {
                                                const [l, r] = refAreaLeftConc < refAreaRightConc ? [refAreaLeftConc, refAreaRightConc] : [refAreaRightConc, refAreaLeftConc];
                                                setLeftConc(l); setRightConc(r);
                                            }
                                            setRefAreaLeftConc(''); setRefAreaRightConc('');
                                        }}
                                        onDoubleClick={() => {
                                            setLeftConc('dataMin');
                                            setRightConc('dataMax');
                                            setRefAreaLeftConc('');
                                            setRefAreaRightConc('');
                                        }}
                                    >
                                        <XAxis
                                            dataKey="date"
                                            stroke="#64748b"
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(val) => val.slice(5)}
                                            allowDataOverflow
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(val) => (val * 100).toFixed(0) + '%'}
                                        />
                                        <RechartsTooltip content={<CustomConcTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: '10px', marginTop: '10px' }}
                                            formatter={(value) => {
                                                const latestPoint = data.individualCurvesSeries[data.individualCurvesSeries.length - 1];
                                                const total = latestPoint ? Object.keys(latestPoint).reduce((sum, k) => k !== 'date' ? sum + latestPoint[k] : sum, 0) : 0;
                                                const val = latestPoint ? latestPoint[value] : 0;
                                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                                                return `${value} (${pct}%)`;
                                            }}
                                        />
                                        {activeContracts.map((key, i) => (
                                            <Area
                                                key={key}
                                                type="monotone"
                                                dataKey={key}
                                                stackId="1"
                                                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                                fill={LINE_COLORS[i % LINE_COLORS.length]}
                                                fillOpacity={0.8}
                                                isAnimationActive={false}
                                            />
                                        ))}
                                        {refAreaLeftConc && refAreaRightConc ? (
                                            <ReferenceArea x1={refAreaLeftConc} x2={refAreaRightConc} strokeOpacity={0.3} fill="#4a6cf7" fillOpacity={0.3} />
                                        ) : null}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Rollover Heatmap Section */}
                    <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', boxSizing: 'border-box', marginBottom: '32px' }} onDoubleClick={resetAllZoom}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>Rollover Heatmap</div>
                            <button
                                onClick={resetAllZoom}
                                style={{ background: 'transparent', border: '1px solid #334155', color: '#64748b', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Reset All Zoom
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {/* Time Labels for Heatmap */}
                            <div style={{ display: 'flex', paddingLeft: '80px', marginBottom: '8px' }}>
                                {filteredConc.filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 10)) === 0).map((d, i) => (
                                    <div key={i} style={{ flex: 1, fontSize: '9px', color: '#64748b', textAlign: 'left' }}>{d.date.slice(5)}</div>
                                ))}
                            </div>

                            {activeContracts.map((key) => {
                                return (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ width: '80px', fontSize: '10px', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {key}
                                        </div>
                                        <div style={{ flex: 1, height: '18px', display: 'flex', borderRadius: '2px', overflow: 'hidden', background: '#020617' }}>
                                            {filteredConc.map((d, i) => {
                                                const val = d[key] || 0;
                                                const total = Object.keys(d).reduce((sum, k) => k !== 'date' ? sum + Number(d[k] || 0) : sum, 0);
                                                const pct = total > 0 ? (val / total) : 0;

                                                // Math.pow gives a nice non-linear curve so mid-levels aren't completely dark
                                                const opacity = pct > 0 ? 0.05 + Math.pow(pct, 0.75) * 0.95 : 0;

                                                return (
                                                    <div
                                                        key={i}
                                                        title={`${d.date}: ${key} is ${(pct * 100).toFixed(1)}%`}
                                                        style={{
                                                            flex: 1,
                                                            height: '100%',
                                                            backgroundColor: '#00e5ff',
                                                            opacity: opacity,
                                                            borderRight: '1px solid #0f172a'
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Roll Pressure Index Section */}
                    <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', boxSizing: 'border-box', marginBottom: '32px' }}>
                        <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                <div style={{ fontSize: '11px', color: '#4a6cf7', textTransform: 'uppercase', fontWeight: 800 }}>Custom Indicators</div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>roll pressure • front vs field • back month absorption</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Roll Pressure Index</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    Tracks the pure 1→2 roll. Approaches 1 when front dominates. Drops toward 0 as OI moves to 2nd.
                                    Crossing 0.5 = mid-roll. Compare this with BRI to isolate where the OI is actually going.
                                </div>
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>front ÷ (front + 2nd)</div>
                        </div>

                        <div style={{ width: '100%', height: '400px', marginTop: '24px' }}>
                            <ResponsiveContainer>
                                <AreaChart
                                    data={filteredRpi}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    onMouseDown={(e) => e && setRefAreaLeftRpi(e.activeLabel)}
                                    onMouseMove={(e) => e && refAreaLeftRpi && setRefAreaRightRpi(e.activeLabel)}
                                    onMouseUp={() => {
                                        if (refAreaLeftRpi && refAreaRightRpi && refAreaLeftRpi !== refAreaRightRpi) {
                                            const [l, r] = refAreaLeftRpi < refAreaRightRpi ? [refAreaLeftRpi, refAreaRightRpi] : [refAreaRightRpi, refAreaLeftRpi];
                                            setLeftRpi(l); setRightRpi(r);
                                        }
                                        setRefAreaLeftRpi(''); setRefAreaRightRpi('');
                                    }}
                                    onDoubleClick={() => { setLeftRpi('dataMin'); setRightRpi('dataMax'); }}
                                >
                                    <defs>
                                        <linearGradient id="colorRpi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ffb74d" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ffb74d" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(val) => val.slice(5)}
                                        allowDataOverflow
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        tick={{ fontSize: 10 }}
                                        domain={[0, 1.0]}
                                        ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', fontSize: '11px' }}
                                        formatter={(val) => [val.toFixed(3), 'RPI']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="rpi"
                                        stroke="#ffb74d"
                                        fillOpacity={1}
                                        fill="url(#colorRpi)"
                                        strokeWidth={2}
                                        isAnimationActive={false}
                                    />
                                    {refAreaLeftRpi && refAreaRightRpi ? (
                                        <ReferenceArea x1={refAreaLeftRpi} x2={refAreaRightRpi} strokeOpacity={0.3} fill="#4a6cf7" fillOpacity={0.3} />
                                    ) : null}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* RPI vs BRI Chart Section */}
                    <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', boxSizing: 'border-box', marginBottom: '48px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>RPI vs BRI — Roll Divergence</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', maxWidth: '800px' }}>
                                    RPI (amber) measures pressure against the 2nd contract only. BRI (cyan) measures front vs the entire curve.
                                    When both fall together, the 2nd is absorbing — a clean, normal roll. When BRI falls faster than RPI
                                    (divergence shrinks or goes negative, pink line), OI is leaking into back contracts instead.
                                </div>
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>
                                front / (front + 2nd) vs front / total<br />
                                divergence = RPI — BRI
                            </div>
                        </div>

                        <div style={{ width: '100%', height: '500px', marginTop: '24px' }}>
                            <ResponsiveContainer>
                                <LineChart
                                    data={filteredDiv}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    onMouseDown={(e) => e && setRefAreaLeftDiv(e.activeLabel)}
                                    onMouseMove={(e) => e && refAreaLeftDiv && setRefAreaRightDiv(e.activeLabel)}
                                    onMouseUp={() => {
                                        if (refAreaLeftDiv && refAreaRightDiv && refAreaLeftDiv !== refAreaRightDiv) {
                                            const [l, r] = refAreaLeftDiv < refAreaRightDiv ? [refAreaLeftDiv, refAreaRightDiv] : [refAreaRightDiv, refAreaLeftDiv];
                                            setLeftDiv(l); setRightDiv(r);
                                        }
                                        setRefAreaLeftDiv(''); setRefAreaRightDiv('');
                                    }}
                                    onDoubleClick={() => { setLeftDiv('dataMin'); setRightDiv('dataMax'); }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(val) => val.slice(5)}
                                        allowDataOverflow
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        tick={{ fontSize: 10 }}
                                        domain={[0, 1.0]}
                                        ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', fontSize: '11px' }}
                                        formatter={(val, name) => [val.toFixed(3), name.toUpperCase()]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', marginTop: '-10px' }} />

                                    <Line type="monotone" dataKey="rpi" name="RPI (Front/2nd)" stroke="#ffb74d" strokeWidth={2} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="bri" name="BRI (Front/Total)" stroke="#4fc3f7" strokeWidth={2} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="divergence" name="Divergence (RPI - BRI)" stroke="#f06292" strokeWidth={2} dot={false} isAnimationActive={false} />

                                    {refAreaLeftDiv && refAreaRightDiv ? (
                                        <ReferenceArea x1={refAreaLeftDiv} x2={refAreaRightDiv} strokeOpacity={0.3} fill="#4a6cf7" fillOpacity={0.3} />
                                    ) : null}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Back Month Absorption Section */}
                    <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', boxSizing: 'border-box', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Back Month Absorption</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', maxWidth: '800px' }}>
                                    Bars show absolute OI held in contracts beyond the front two. Red line = back month share of total OI. A rising red line during a roll period signals unusual back month flow — the wider the spread between this and a normal roll pattern, the larger the potential mispricing opportunity in those illiquid back contracts.
                                </div>
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>
                                OI in contracts 3+ - absolute and % of total
                            </div>
                        </div>

                        <div style={{ width: '100%', height: '500px', marginTop: '24px' }}>
                            <ResponsiveContainer>
                                <ComposedChart
                                    data={filteredBack}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    onMouseDown={(e) => e && setRefAreaLeftBack(e.activeLabel)}
                                    onMouseMove={(e) => e && refAreaLeftBack && setRefAreaRightBack(e.activeLabel)}
                                    onMouseUp={() => {
                                        if (refAreaLeftBack && refAreaRightBack && refAreaLeftBack !== refAreaRightBack) {
                                            const [l, r] = refAreaLeftBack < refAreaRightBack ? [refAreaLeftBack, refAreaRightBack] : [refAreaRightBack, refAreaLeftBack];
                                            setLeftBack(l); setRightBack(r);
                                        }
                                        setRefAreaLeftBack(''); setRefAreaRightBack('');
                                    }}
                                    onDoubleClick={() => { setLeftBack('dataMin'); setRightBack('dataMax'); }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(val) => val.slice(5)}
                                        allowDataOverflow
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        stroke="#64748b"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="#64748b"
                                        tick={{ fontSize: 10 }}
                                        domain={[0, 1.0]}
                                        tickFormatter={(val) => (val * 100).toFixed(0) + '%'}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', fontSize: '11px' }}
                                        formatter={(val, name) => {
                                            if (name === 'backOi') return [formatNumber(val), 'Back OI (abs)'];
                                            if (name === 'backOiPct') return [(val * 100).toFixed(2) + '%', 'Back OI % of total'];
                                            return [val, name];
                                        }}
                                        labelStyle={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '5px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', marginTop: '-10px' }} formatter={(val) => val === 'backOi' ? 'Back OI (abs)' : 'Back OI % of total'} />

                                    <Bar yAxisId="left" dataKey="backOi" fill="#8e24aa" barSize={4} />
                                    <Line yAxisId="right" type="monotone" dataKey="backOiPct" stroke="#e53935" strokeWidth={2} dot={false} isAnimationActive={false} />

                                    {refAreaLeftBack && refAreaRightBack ? (
                                        <ReferenceArea yAxisId="left" x1={refAreaLeftBack} x2={refAreaRightBack} strokeOpacity={0.3} fill="#4a6cf7" fillOpacity={0.3} />
                                    ) : null}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                .loader {
                    animation: blink 1.5s infinite;
                }
                @keyframes blink {
                    0% { opacity: 0.3; }
                    50% { opacity: 1; }
                    100% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
}
