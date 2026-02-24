import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectActiveTab } from '../features/ui/uiSlice';
import { selectWsConnected } from '../features/ws/wsSlice';
import * as ws from '../services/websocket';
import store from '../app/store';

// ============================================================
// useWebSocket — React hook for WebSocket lifecycle
//
// Connects on mount, subscribes when the active instrument
// changes, and disconnects on unmount.
//
// This keeps WebSocket management tied to React's component
// lifecycle so we don't leak intervals or connections.
// ============================================================

export function useWebSocket() {
    const activeTab = useSelector(selectActiveTab);
    const connected = useSelector(selectWsConnected);

    // Track previous subscription to avoid redundant calls
    const prevSubRef = useRef(null);

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        ws.connect(store);
        return () => ws.disconnect();
    }, []);

    // Subscribe to active instrument(s) changes
    useEffect(() => {
        if (!activeTab) return;

        let neededInstruments = [];

        if (activeTab.chartType === 'multiline' && activeTab.series) {
            neededInstruments = activeTab.series.map(s => s.id);
        } else if (activeTab.instrumentId) {
            neededInstruments = [activeTab.instrumentId];
        }

        // Create a signature string to compare (simple JSON stringify or join)
        const subSignature = neededInstruments.sort().join(',');

        if (subSignature && subSignature !== prevSubRef.current) {
            ws.subscribe(neededInstruments);
            prevSubRef.current = subSignature;
        }
    }, [activeTab]);

    return { connected };
}
