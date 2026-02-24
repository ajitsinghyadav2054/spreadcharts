import { useDispatch, useSelector } from 'react-redux';
import { setDrawingMode, togglePLCalculator, selectDrawingMode } from '../../features/ui/uiSlice';

// ============================================================
// ChartToolbar — floating toolbar on the left edge of the chart
//
// Provides quick-access buttons for:
// - Cursor mode (default)
// - Crosshair mode
// - Drawing tools (trendline, horizontal line)
// - P/L Calculator
// - Export (screenshot)
// - Settings
//
// Props:
//   chartRef — ref to the chart instance (for export)
// ============================================================

const tools = [
    { id: 'cursor', icon: '⊹', label: 'Cursor', action: null },
    { id: 'crosshair', icon: '⊕', label: 'Crosshair', action: null },
    { id: 'trendline', icon: '╱', label: 'Trendline', action: 'trendline' },
    { id: 'horizontal', icon: '─', label: 'Horizontal Line', action: 'horizontal' },
    { id: 'divider1', divider: true },
    { id: 'calculator', icon: '🖩', label: 'P/L Calculator', special: 'plcalc' },
    { id: 'export', icon: '⤓', label: 'Export Chart', special: 'export' },
    { id: 'divider2', divider: true },
    { id: 'settings', icon: '⚙', label: 'Settings', action: null },
];

export default function ChartToolbar({ chartRef }) {
    const dispatch = useDispatch();
    const drawingMode = useSelector(selectDrawingMode);

    const handleClick = (tool) => {
        if (tool.divider) return;

        if (tool.special === 'plcalc') {
            dispatch(togglePLCalculator());
            return;
        }

        if (tool.special === 'export') {
            // Export chart as PNG using Lightweight Charts API
            if (chartRef?.current) {
                const canvas = chartRef.current.takeScreenshot();
                if (canvas) {
                    const link = document.createElement('a');
                    link.download = `chart-export-${Date.now()}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                }
            }
            return;
        }

        // Toggle drawing mode
        if (tool.action) {
            dispatch(setDrawingMode(drawingMode === tool.action ? null : tool.action));
        } else {
            dispatch(setDrawingMode(null));
        }
    };

    return (
        <div style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            background: 'rgba(15, 15, 35, 0.9)',
            borderRadius: '8px',
            padding: '4px',
            border: '1px solid rgba(42, 42, 74, 0.7)',
            backdropFilter: 'blur(8px)',
        }}>
            {tools.map((tool) => {
                if (tool.divider) {
                    return (
                        <div
                            key={tool.id}
                            style={{
                                height: '1px',
                                background: 'rgba(42, 42, 74, 0.7)',
                                margin: '4px 2px',
                            }}
                        />
                    );
                }

                const isActive = tool.action && drawingMode === tool.action;
                return (
                    <button
                        key={tool.id}
                        title={tool.label}
                        onClick={() => handleClick(tool)}
                        style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isActive ? '#4a90d9' : 'transparent',
                            color: isActive ? '#fff' : '#8a8a8a',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) {
                                e.target.style.background = 'rgba(42, 42, 74, 0.8)';
                                e.target.style.color = '#e0e0e0';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) {
                                e.target.style.background = 'transparent';
                                e.target.style.color = '#8a8a8a';
                            }
                        }}
                    >
                        {tool.icon}
                    </button>
                );
            })}
        </div>
    );
}
