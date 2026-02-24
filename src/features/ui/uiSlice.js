import { createSlice } from '@reduxjs/toolkit';

// ============================================================
// uiSlice — manages all UI state
//
// This keeps UI concerns separate from data concerns.
// Tabs, sidebar, modals, drawing mode — all lives here.
// ============================================================

let nextTabId = 2; // Tab 1 is created by default

const initialState = {
    tabs: [
        { id: 'tab-1', name: 'Chart 1', instrumentId: null, chartType: 'candlestick', sodSeries: null },
    ],
    activeTabId: 'tab-1',
    activeSection: 'cftc',    // 'cftc' | 'sod'
    sodDashboard: {           // SOD section owns its own state
        sodSeries: null,      // array of { columnId, label, yearlyData } once generated
    },
    sidebarOpen: true,
    drawingMode: null,
    plCalculatorOpen: false,
    comparisonInstruments: [],
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        // Add a new tab with a default instrument
        addTab(state) {
            const id = `tab-${nextTabId++}`;
            state.tabs.push({
                id,
                name: `Chart ${state.tabs.length + 1}`,
                instrumentId: null,
                chartType: 'candlestick',
                sodSeries: null,
            });
            state.activeTabId = id; // Switch to new tab (charts stay mounted via CSS)
        },

        // Close a tab (can't close the last tab)
        closeTab(state, action) {
            const tabId = action.payload;
            if (state.tabs.length <= 1) return; // keep at least one tab

            const idx = state.tabs.findIndex((t) => t.id === tabId);
            state.tabs.splice(idx, 1);

            // If we closed the active tab, switch to the nearest remaining tab
            if (state.activeTabId === tabId) {
                state.activeTabId = state.tabs[Math.max(0, idx - 1)].id;
            }
        },

        // Switch to a tab
        setActiveTab(state, action) {
            state.activeTabId = action.payload;
        },

        // Rename a tab (double-click to rename)
        renameTab(state, action) {
            const { tabId, name } = action.payload;
            const tab = state.tabs.find((t) => t.id === tabId);
            if (tab) tab.name = name;
        },

        // Update the instrument for a tab (Single Instrument Mode)
        setTabInstrument(state, action) {
            const { tabId, instrumentId } = action.payload;
            const tab = state.tabs.find((t) => t.id === tabId);
            if (tab) {
                tab.instrumentId = instrumentId;
                tab.chartType = 'candlestick';
                tab.series = null;
            }
        },

        // Setup a multi-series chart
        setTabMultiChart(state, action) {
            const { tabId, series } = action.payload;
            const tab = state.tabs.find((t) => t.id === tabId);
            if (tab) {
                tab.chartType = 'multiline';
                tab.series = series;
                // Set instrumentId to first series so TabPanel renders the chart view
                if (series.length > 0) {
                    tab.instrumentId = series[0].id;
                }
            }
        },

        // Setup a SOD (Season-Over-Day) seasonality chart below the main CFTC chart
        setTabSodSeries(state, action) {
            const { tabId, sodSeries } = action.payload;
            const tab = state.tabs.find((t) => t.id === tabId);
            if (tab) {
                tab.sodSeries = sodSeries;
                if (sodSeries) {
                    // If no main chart is active yet, use a placeholder so TabPanel
                    // routes to the chart view (instead of staying on the config screen)
                    if (!tab.instrumentId) {
                        tab.instrumentId = 'SOD';
                        tab.chartType = 'sod';
                    }
                } else {
                    // Clearing SOD — if it was a SOD-only placeholder tab, go back to config
                    if (tab.chartType === 'sod') {
                        tab.instrumentId = null;
                        tab.chartType = 'candlestick';
                    }
                }
            }
        },

        // Switch between top-level sections (CFTC vs SOD)
        setActiveSection(state, action) {
            state.activeSection = action.payload; // 'cftc' | 'sod'
        },

        // Store the generated SOD series for the standalone SOD dashboard
        setSodDashboard(state, action) {
            state.sodDashboard.sodSeries = action.payload; // null to clear
        },

        // Toggle sidebar visibility
        toggleSidebar(state) {
            state.sidebarOpen = !state.sidebarOpen;
        },

        // Set drawing mode (trendline, horizontal, or null to disable)
        setDrawingMode(state, action) {
            state.drawingMode = action.payload;
        },

        // Toggle P/L calculator modal
        togglePLCalculator(state) {
            state.plCalculatorOpen = !state.plCalculatorOpen;
        },

        // Add/remove comparison instrument overlays
        addComparisonInstrument(state, action) {
            if (!state.comparisonInstruments.includes(action.payload)) {
                state.comparisonInstruments.push(action.payload);
            }
        },
        removeComparisonInstrument(state, action) {
            state.comparisonInstruments = state.comparisonInstruments.filter(
                (id) => id !== action.payload
            );
        },
    },
});

export const {
    addTab,
    closeTab,
    setActiveTab,
    renameTab,
    setTabInstrument,
    setTabMultiChart,
    setTabSodSeries,
    setActiveSection,
    setSodDashboard,
    toggleSidebar,
    setDrawingMode,
    togglePLCalculator,
    addComparisonInstrument,
    removeComparisonInstrument,
} = uiSlice.actions;

// Selectors
export const selectTabs = (state) => state.ui.tabs;
export const selectActiveTabId = (state) => state.ui.activeTabId;
export const selectActiveTab = (state) =>
    state.ui.tabs.find((t) => t.id === state.ui.activeTabId);
export const selectActiveSection = (state) => state.ui.activeSection;
export const selectSodDashboard = (state) => state.ui.sodDashboard;
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectDrawingMode = (state) => state.ui.drawingMode;
export const selectPLCalculatorOpen = (state) => state.ui.plCalculatorOpen;
export const selectComparisonInstruments = (state) => state.ui.comparisonInstruments;

export default uiSlice.reducer;
