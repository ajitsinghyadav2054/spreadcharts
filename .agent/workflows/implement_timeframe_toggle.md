---
description: Implementation plan for adding Daily/Weekly timeframe toggles.
---

# Objective
Add functionality to toggle between Daily and Weekly timeframes on the Sub-Chart. Since the API provides daily data, we will aggregate this into weekly candles using a client-side utility/library.

# Steps

1.  **Install Dependency**
    - Install `date-fns` to reliably calculate the start of the week for grouping daily candles.
    ```bash
    npm install date-fns
    ```

2.  **Create Aggregation Utility**
    - Create `src/utils/aggregator.js`.
    - Implement `aggregateToWeekly(dailyData)` function:
        - Sort data by time.
        - Group candles by "Week Start Date" (Monday or Sunday).
        - For each group:
            - `Open` = Open of the first candle.
            - `High` = Max High of all candles in the group.
            - `Low` = Min Low of all candles in the group.
            - `Close` = Close of the last candle.
            - `Time` = Time of the week start (Unix timestamp).

3.  **Update Sub-Chart Component (`SubChart.jsx`)**
    - **State**: Add `timeframe` state ('D' | 'W'), default to 'D'.
    - **Data Processing**:
        - Use `useMemo` to compute `weeklyData` from the raw daily data whenever the raw data changes.
        - Create a derived `displayData` variable that points to either daily or weekly data based on the current state.
    - **UI**:
        - Add a toggle UI (Buttons: "Daily", "Weekly") next to the "LIVE/SIMULATED" badge.
        - Style the active button to look selected.
    - **Chart Update**:
        - Pass `displayData` to the chart series instead of the raw data.

4.  **Verification**
    - Fetch Daily data for a ticker (e.g., KCN26).
    - Switch to "Weekly".
    - Verify that the chart displays fewer candles (approx 1/5th) and the dates align with week starts.
