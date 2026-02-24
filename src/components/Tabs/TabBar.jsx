import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    addTab,
    closeTab,
    setActiveTab,
    renameTab,
    selectTabs,
    selectActiveTabId,
} from '../../features/ui/uiSlice';

// ============================================================
// TabBar — horizontal tab strip
//
// Features:
// - Each tab shows its name + close (×) button
// - "+" button to add new tabs
// - Double-click to rename a tab
// - Active tab is highlighted with white background
// - Can't close the last remaining tab
// ============================================================

export default function TabBar() {
    const dispatch = useDispatch();
    const tabs = useSelector(selectTabs);
    const activeTabId = useSelector(selectActiveTabId);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const handleDoubleClick = (tab) => {
        setEditingId(tab.id);
        setEditValue(tab.name);
    };

    const handleRenameSubmit = (tabId) => {
        if (editValue.trim()) {
            dispatch(renameTab({ tabId, name: editValue.trim() }));
        }
        setEditingId(null);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            height: '36px',
            minHeight: '36px',
            background: '#16213e',
            borderBottom: '1px solid #2a2a4a',
            padding: '0 8px',
            gap: '2px',
            overflowX: 'auto',
        }}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                    <div
                        key={tab.id}
                        onClick={() => dispatch(setActiveTab(tab.id))}
                        onDoubleClick={() => handleDoubleClick(tab)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: '6px 6px 0 0',
                            cursor: 'pointer',
                            background: isActive ? '#ffffff' : 'transparent',
                            color: isActive ? '#1a1a2e' : '#8a8a8a',
                            fontSize: '12px',
                            fontWeight: isActive ? 600 : 400,
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                            position: 'relative',
                        }}
                    >
                        {editingId === tab.id ? (
                            <input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleRenameSubmit(tab.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameSubmit(tab.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                }}
                                style={{
                                    width: '80px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid #4a90d9',
                                    color: isActive ? '#1a1a2e' : '#e0e0e0',
                                    fontSize: '12px',
                                    outline: 'none',
                                    padding: '0',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span>{tab.name}</span>
                        )}

                        {/* Close button (hidden if only one tab) */}
                        {tabs.length > 1 && (
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(closeTab(tab.id));
                                }}
                                style={{
                                    fontSize: '14px',
                                    lineHeight: 1,
                                    color: isActive ? '#999' : '#666',
                                    cursor: 'pointer',
                                    borderRadius: '2px',
                                    padding: '0 2px',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.color = '#e53e3e';
                                    e.target.style.background = 'rgba(229, 62, 62, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.color = isActive ? '#999' : '#666';
                                    e.target.style.background = 'transparent';
                                }}
                            >
                                ×
                            </span>
                        )}
                    </div>
                );
            })}

            {/* Add Tab Button */}
            <button
                onClick={() => dispatch(addTab())}
                style={{
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: '1px dashed #2a2a4a',
                    borderRadius: '6px',
                    color: '#8a8a8a',
                    cursor: 'pointer',
                    fontSize: '16px',
                    marginLeft: '4px',
                    transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    e.target.style.borderColor = '#4a90d9';
                    e.target.style.color = '#4a90d9';
                }}
                onMouseLeave={(e) => {
                    e.target.style.borderColor = '#2a2a4a';
                    e.target.style.color = '#8a8a8a';
                }}
            >
                +
            </button>
        </div>
    );
}
