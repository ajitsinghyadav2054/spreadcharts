// src/components/Input/CustomColumnDropdown.jsx
// A 3-level expandable dropdown: Section → Subsection → Group → Item
// Each item row now has a 📊 button (when product is provided) that opens
// a CftcChartModal showing the absolute-value line + weekly-change bar chart.

import { useState, useRef, useEffect, useCallback } from 'react';
import { COLUMN_HIERARCHY, ITEM_MAP } from '../../data/columnHierarchy';
import CftcChartModal from '../Chart/CftcChartModal';

export default function CustomColumnDropdown({ value, onChange, disabled, product }) {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedSubsections, setExpandedSubsections] = useState({});
    const [expandedGroups, setExpandedGroups] = useState({});
    const containerRef = useRef(null);

    // Chart modal state
    const [chartModal, setChartModal] = useState({ isOpen: false, metricId: null, label: '' });

    const openChart = useCallback((e, itemId, fullLabel) => {
        e.stopPropagation(); // Prevent dropdown from selecting this item
        setIsOpen(false);    // Close the dropdown
        setChartModal({ isOpen: true, metricId: itemId, label: fullLabel });
    }, []);

    const closeChart = useCallback(() => {
        setChartModal({ isOpen: false, metricId: null, label: '' });
    }, []);

    const selectedLabel = value ? (ITEM_MAP[value]?.fullLabel || value) : 'Nothing selected';

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const toggleSection = (k) => setExpandedSections(p => ({ ...p, [k]: !p[k] }));
    const toggleSubsection = (k) => setExpandedSubsections(p => ({ ...p, [k]: !p[k] }));
    const toggleGroup = (k) => setExpandedGroups(p => ({ ...p, [k]: !p[k] }));

    const handleSelect = (item, fullLabel) => {
        onChange({ id: item.id, label: fullLabel });
        setIsOpen(false);
    };

    // Styles
    const triggerStyle = {
        width: '100%', padding: '8px 12px', borderRadius: '4px',
        border: `1px solid ${isOpen ? '#4a90d9' : '#2a2a4a'}`,
        background: disabled ? '#111' : '#16213e',
        color: disabled ? '#666' : '#fff',
        fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        userSelect: 'none', boxSizing: 'border-box',
    };

    const panelStyle = {
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
        background: '#0f1629', border: '1px solid #2a2a4a', borderRadius: '4px',
        maxHeight: '380px', overflowY: 'auto', marginTop: '2px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    };

    const sectionHdr = (expanded) => ({
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 10px', cursor: 'pointer', userSelect: 'none',
        background: expanded ? 'rgba(74,144,217,0.1)' : 'transparent',
        color: '#4a90d9', fontWeight: 700, fontSize: '12px',
        letterSpacing: '0.05em', borderBottom: '1px solid #1a2040',
    });

    const subsectionHdr = (expanded) => ({
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 10px 6px 22px', cursor: 'pointer', userSelect: 'none',
        background: expanded ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: '#a0b4cc', fontWeight: 600, fontSize: '12px',
    });

    const groupHdr = (expanded) => ({
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '5px 10px 5px 36px', cursor: 'pointer', userSelect: 'none',
        background: expanded ? 'rgba(255,255,255,0.03)' : 'transparent',
        color: '#7a8fa8', fontWeight: 500, fontSize: '12px',
    });

    const leafStyle = (selected) => ({
        padding: '5px 12px 5px 52px', cursor: 'pointer',
        background: selected ? 'rgba(74,144,217,0.2)' : 'transparent',
        color: selected ? '#4a90d9' : '#ccc', fontSize: '12px',
        borderLeft: selected ? '2px solid #4a90d9' : '2px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    });

    const leafStyleFlat = (selected) => ({
        padding: '5px 12px 5px 36px', cursor: 'pointer',
        background: selected ? 'rgba(74,144,217,0.2)' : 'transparent',
        color: selected ? '#4a90d9' : '#ccc', fontSize: '12px',
        borderLeft: selected ? '2px solid #4a90d9' : '2px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    });

    const ChartBtn = ({ itemId, fullLabel }) => {
        if (!product) return null;
        return (
            <button
                title={`Open chart: ${fullLabel}`}
                onClick={(e) => openChart(e, itemId, fullLabel)}
                style={{
                    background: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '3px',
                    color: '#f59e0b',
                    fontSize: '10px',
                    padding: '1px 5px',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    flexShrink: 0,
                    transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(245,158,11,0.25)';
                    e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(245,158,11,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)';
                }}
            >
                📊
            </button>
        );
    };

    const renderItem = (item, fullLabel, styleGetter) => (
        <div
            key={item.id}
            style={styleGetter(item.id === value)}
            onClick={() => handleSelect(item, fullLabel)}
            onMouseEnter={(e) => {
                if (item.id !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
                if (item.id !== value) e.currentTarget.style.background = 'transparent';
            }}
        >
            {/* Label + optional "calculated" tag */}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
                {item.isComputed && (
                    <span style={{ marginLeft: '6px', fontSize: '10px', color: '#f0a500', fontStyle: 'italic' }}>
                        calculated
                    </span>
                )}
            </span>

            {/* Chart btn — stops propagation so it doesn't select the item */}
            <ChartBtn itemId={item.id} fullLabel={fullLabel} />
        </div>
    );

    return (
        <>
            <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
                {/* Trigger */}
                <div
                    style={triggerStyle}
                    onClick={() => !disabled && setIsOpen(o => !o)}
                >
                    <span style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: value ? '#fff' : '#666', flex: 1,
                    }}>
                        {selectedLabel}
                    </span>
                    <span style={{ color: '#4a90d9', fontSize: '10px', marginLeft: '8px', flexShrink: 0 }}>
                        {isOpen ? '▲' : '▼'}
                    </span>
                </div>

                {/* Dropdown panel */}
                {isOpen && (
                    <div style={panelStyle}>
                        {/* Nothing selected option */}
                        <div
                            style={{ padding: '7px 12px', color: '#666', fontSize: '12px', cursor: 'pointer', borderBottom: '1px solid #1a2040' }}
                            onClick={() => { onChange({ id: '', label: '' }); setIsOpen(false); }}
                        >
                            — Nothing selected —
                        </div>

                        {COLUMN_HIERARCHY.map(section => {
                            const secOpen = !!expandedSections[section.label];
                            return (
                                <div key={section.label}>
                                    {/* Section header */}
                                    <div style={sectionHdr(secOpen)} onClick={() => toggleSection(section.label)}>
                                        <span>{secOpen ? '▼' : '▶'}</span>
                                        <span>{section.label.toUpperCase()}</span>
                                    </div>

                                    {secOpen && (
                                        <div>
                                            {/* Flat items (e.g. Open Interest) */}
                                            {section.items && section.items.map(item => {
                                                const fullLabel = `${section.label} — ${item.label}`;
                                                return renderItem(item, fullLabel, leafStyleFlat);
                                            })}

                                            {/* Subsections */}
                                            {section.subsections && section.subsections.map(sub => {
                                                const subKey = `${section.label}::${sub.label}`;
                                                const subOpen = !!expandedSubsections[subKey];
                                                return (
                                                    <div key={sub.label}>
                                                        <div style={subsectionHdr(subOpen)} onClick={() => toggleSubsection(subKey)}>
                                                            <span>{subOpen ? '▼' : '▶'}</span>
                                                            <span>{sub.label}</span>
                                                        </div>
                                                        {subOpen && sub.groups.map(grp => {
                                                            const grpKey = `${subKey}::${grp.label}`;
                                                            const grpOpen = !!expandedGroups[grpKey];
                                                            // Flat group (Concentration — no group name)
                                                            if (!grp.label) {
                                                                return grp.items.map(item => {
                                                                    const fullLabel = `${sub.label} — ${item.label}`;
                                                                    return renderItem(item, fullLabel, leafStyleFlat);
                                                                });
                                                            }
                                                            return (
                                                                <div key={grp.label}>
                                                                    <div style={groupHdr(grpOpen)} onClick={() => toggleGroup(grpKey)}>
                                                                        <span>{grpOpen ? '▼' : '▶'}</span>
                                                                        <span>{grp.label}</span>
                                                                    </div>
                                                                    {grpOpen && grp.items.map(item => {
                                                                        const fullLabel = `${sub.label} — ${grp.label} — ${item.label}`;
                                                                        return renderItem(item, fullLabel, leafStyle);
                                                                    })}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Chart modal — rendered outside the dropdown div so z-index works correctly */}
            <CftcChartModal
                isOpen={chartModal.isOpen}
                onClose={closeChart}
                product={product}
                metricId={chartModal.metricId}
                label={chartModal.label}
            />
        </>
    );
}
