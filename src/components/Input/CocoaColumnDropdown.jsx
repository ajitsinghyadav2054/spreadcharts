// src/components/Input/CocoaColumnDropdown.jsx
// A 3-level expandable dropdown for the Cocoa section hierarchy:
//   Section → Sub-section → Item

import { useState, useRef, useEffect } from 'react';
import { COCOA_HIERARCHY, COCOA_ITEM_MAP } from '../../data/cocoaHierarchy';

export default function CocoaColumnDropdown({ value, onChange, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedSubsections, setExpandedSubsections] = useState({});
    const containerRef = useRef(null);

    const selectedLabel = value ? (COCOA_ITEM_MAP[value]?.fullLabel || value) : 'Select metric...';

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

    const handleSelect = (item) => {
        const fullLabel = COCOA_ITEM_MAP[item.id]?.fullLabel || item.label;
        onChange({ id: item.id, label: fullLabel });
        setIsOpen(false);
    };

    // ─── Styles ──────────────────────────────────────────────────
    const triggerStyle = {
        width: '100%',
        padding: '8px 12px',
        borderRadius: '4px',
        border: `1px solid ${isOpen ? '#8d6e63' : '#2a2a4a'}`,
        background: disabled ? '#111' : '#16213e',
        color: disabled ? '#666' : '#fff',
        fontSize: '13px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        boxSizing: 'border-box',
    };

    const panelStyle = {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 999,
        background: '#0f1629',
        border: '1px solid #2a2a4a',
        borderRadius: '4px',
        maxHeight: '420px',
        overflowY: 'auto',
        marginTop: '2px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    };

    const sectionHdrStyle = (expanded) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '9px 12px',
        cursor: 'pointer',
        userSelect: 'none',
        background: expanded ? 'rgba(141,110,99,0.12)' : 'transparent',
        color: '#c8a98a',
        fontWeight: 700,
        fontSize: '12px',
        letterSpacing: '0.06em',
        borderBottom: '1px solid #1a2040',
        textTransform: 'uppercase',
    });

    const subHdrStyle = (expanded) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px 6px 26px',
        cursor: 'pointer',
        userSelect: 'none',
        background: expanded ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: '#a09080',
        fontWeight: 600,
        fontSize: '12px',
    });

    const leafStyle = (selected, isFlat) => ({
        padding: isFlat ? '5px 12px 5px 26px' : '5px 12px 5px 42px',
        cursor: 'pointer',
        background: selected ? 'rgba(141,110,99,0.2)' : 'transparent',
        color: selected ? '#c8a98a' : '#ccc',
        fontSize: '12px',
        borderLeft: selected ? '2px solid #8d6e63' : '2px solid transparent',
    });

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {/* Trigger button */}
            <div
                style={triggerStyle}
                onClick={() => !disabled && setIsOpen(o => !o)}
            >
                <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: value ? '#fff' : '#666',
                    flex: 1,
                }}>
                    {selectedLabel}
                </span>
                <span style={{ color: '#8d6e63', fontSize: '10px', marginLeft: '8px', flexShrink: 0 }}>
                    {isOpen ? '▲' : '▼'}
                </span>
            </div>

            {/* Dropdown panel */}
            {isOpen && (
                <div style={panelStyle}>
                    {/* Clear option */}
                    <div
                        style={{ padding: '7px 12px', color: '#666', fontSize: '12px', cursor: 'pointer', borderBottom: '1px solid #1a2040' }}
                        onClick={() => { onChange({ id: '', label: '' }); setIsOpen(false); }}
                    >
                        — Nothing selected —
                    </div>

                    {COCOA_HIERARCHY.map(section => {
                        const secOpen = !!expandedSections[section.label];
                        return (
                            <div key={section.label}>
                                {/* Section header */}
                                <div
                                    style={sectionHdrStyle(secOpen)}
                                    onClick={() => toggleSection(section.label)}
                                >
                                    <span style={{ fontSize: '9px', opacity: 0.8 }}>{secOpen ? '▼' : '▶'}</span>
                                    <span>{section.label}</span>
                                </div>

                                {secOpen && (
                                    <div>
                                        {/* Flat items (no sub-sections) */}
                                        {section.items && section.items.map(it => (
                                            <div
                                                key={it.id}
                                                style={leafStyle(it.id === value, true)}
                                                onClick={() => handleSelect(it)}
                                                onMouseEnter={e => { if (it.id !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                                onMouseLeave={e => { if (it.id !== value) e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                {it.label}
                                            </div>
                                        ))}

                                        {/* Sub-sections */}
                                        {section.subsections && section.subsections.map(sub => {
                                            const subKey = `${section.label}::${sub.label}`;
                                            const subOpen = !!expandedSubsections[subKey];
                                            return (
                                                <div key={sub.label}>
                                                    {/* Sub-section header */}
                                                    <div
                                                        style={subHdrStyle(subOpen)}
                                                        onClick={() => toggleSubsection(subKey)}
                                                    >
                                                        <span style={{ fontSize: '9px', opacity: 0.7 }}>{subOpen ? '▼' : '▶'}</span>
                                                        <span>{sub.label}</span>
                                                    </div>

                                                    {/* Items inside sub-section */}
                                                    {subOpen && sub.items.map(it => (
                                                        <div
                                                            key={it.id}
                                                            style={leafStyle(it.id === value, false)}
                                                            onClick={() => handleSelect(it)}
                                                            onMouseEnter={e => { if (it.id !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                                            onMouseLeave={e => { if (it.id !== value) e.currentTarget.style.background = 'transparent'; }}
                                                        >
                                                            {it.label}
                                                        </div>
                                                    ))}
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
    );
}
