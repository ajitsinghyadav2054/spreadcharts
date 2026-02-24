# CFTC SOD Seasonality Dashboard - Implementation Plan

## Overview
Add a new "SOD" (Season-Over-Day) dashboard section **below the existing CFTC multi-line chart** that renders a year-over-year seasonality chart similar to the OI Seasonality chart (first screenshot). The chart:
- Has all the same product/column options as the CFTC config (same dropdowns)
- Displays one colored line **per year** from 2006 → 2026 on a shared Jan–Dec x-axis
- X-axis shows year labels (2006, 2007, … 2026); clicking a year toggles it on/off
- A dashed "Avg" line shows the rolling mean across active years
- On single-click of a year label, that year's line is shown/hidden
- Tooltip on hover shows value per active year at that crosshair date

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/Chart/CftcSeasonalityChart.jsx` | **CREATE** | New standalone chart component (year-over-year lines) |
| `src/components/Tabs/DashboardConfig.jsx` | **MODIFY** | Add second "SOD" config section below existing section; wire generate button to also set `sodSeries` |
| `src/features/ui/uiSlice.js` | **MODIFY** | Add `sodSeries` field to each tab's state; add `setTabSodSeries` action |
| `src/components/Tabs/TabPanel.jsx` | **MODIFY** | Below `ChartContainer`, render `CftcSeasonalityChart` when `tab.sodSeries` is present |

---

## Step-by-Step Implementation

### Step 1 — Extend Redux UI Slice (`src/features/ui/uiSlice.js`)

Open the file and:
1. In the initial tab state, add `sodSeries: null`
2. Add a new reducer `setTabSodSeries(state, action)` that finds the tab by `action.payload.tabId` and sets `tab.sodSeries = action.payload.series`
3. Export the action

### Step 2 — Extend DashboardConfig (`src/components/Tabs/DashboardConfig.jsx`)

Add a **second configuration block** below the existing one (where a "SOD Seasonality" section header, same product dropdown (already shared), same 4 column dropdowns, same Generate button) — but when this second Generate is clicked, it:
1. Fetches `fetchCftcData({ market: product, limit: 20000 })`
2. Builds year-over-year data:
   - For each selected column, for each row, extract `year = new Date(row.report_date_as_mm_dd_yyyy).getFullYear()` and `dayOfYear` (or MM-DD) to normalize to a common x-axis
   - Groups data by year: `{ year: { time: MM-DD-string, value: number }[] }`
3. Dispatches `setTabSodSeries({ tabId, series: { product, column, yearlyData } })`
   - `yearlyData` = object keyed by year, each value = sorted array of `{ dayOfYear, value }`

### Step 3 — Create `CftcSeasonalityChart.jsx`

This is the main new component. Architecture:

```
CftcSeasonalityChart
  props:
    - sodSeries: { product, column, label, yearlyData: { [year]: [{dayOfYear, value}] } }
  state:
    - activeYears: Set<number>   // years the user has toggled ON
    - tooltip: { dayOfYear, values: {year: value} } | null
  chart:
    - lightweight-charts LineSeries, one per year
    - all series share the same x-axis (dayOfYear 1–365 mapped to fake timestamps of a common base year, e.g. 2000)
    - dashed "Avg" LineSeries computed from activeYears
    - year color palette: 2006–2026 each gets a unique color (21 colors)
  x-axis year toggles:
    - Rendered as a custom HTML row of clickable year pills below the chart
    - Each pill shows the year, colored with its line color
    - Clicking a pill toggles that year's line visibility and removes it from Avg
    - Selected years are highlighted; unselected are dimmed
    - Default: last 5 years active
  legend:
    - Floating legend top-left showing year + current hover value
  title:
    - Shows `{column} Seasonality` at the top, matching screenshot style
```

#### Data Transformation (inside component)

```js
// Convert yearlyData to chart series
// X-axis: use a fixed "base year" (e.g. 2000) with actual MM-DD from real dates
// This means day 1 = 2000-01-01, day 365 = 2000-12-31
// Each year's data point: time = Date.UTC(2000, month-1, day) / 1000
// value = the actual column value for that date that year

function buildSeriesData(yearlyData, year) {
  return yearlyData[year].map(pt => ({
    time: pt.baseTimestamp,  // pre-computed in Step 2 above
    value: pt.value
  })).sort((a, b) => a.time - b.time);
}
```

#### Year Color Palette

```js
const YEAR_COLORS = {
  2006: '#FF6B6B', 2007: '#FF9F43', 2008: '#FECA57',
  2009: '#48DBFB', 2010: '#1DD1A1', 2011: '#54A0FF',
  2012: '#5F27CD', 2013: '#C8D6E5', 2014: '#576574',
  2015: '#FF9FF3', 2016: '#00D2D3', 2017: '#FF6348',
  2018: '#2ED573', 2019: '#FFA502', 2020: '#3742FA',
  2021: '#A29BFE', 2022: '#EF5350', 2023: '#26A69A',
  2024: '#26C6DA', 2025: '#FFA726', 2026: '#808080',
};
```

#### Avg Line Computation

```js
// Average is computed in X space (dayOfYear axis)
// For each unique x-timestamp that appears in any activeYear series,
// average the values of all active years that have data at that timestamp
function computeAvg(yearlyData, activeYears, baseYear = 2000) {
  const valueMap = new Map(); // timestamp -> { sum, count }
  for (const year of activeYears) {
    for (const pt of yearlyData[year] || []) {
      const existing = valueMap.get(pt.baseTimestamp) || { sum: 0, count: 0 };
      existing.sum += pt.value;
      existing.count++;
      valueMap.set(pt.baseTimestamp, existing);
    }
  }
  return Array.from(valueMap.entries())
    .map(([time, { sum, count }]) => ({ time, value: sum / count }))
    .sort((a, b) => a.time - b.time);
}
```

#### Year Toggle Click

```js
function handleYearToggle(year) {
  setActiveYears(prev => {
    const next = new Set(prev);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    return next;
  });
}
```

After `activeYears` changes, a `useEffect` updates each series' `visible` option and recomputes the Avg series.

### Step 4 — Wire into TabPanel

In `TabPanel.jsx`, after the `<ChartContainer>` block, add:

```jsx
{tab.sodSeries && (
  <div style={{ height: '340px', borderTop: '2px solid #2a2a4a', flexShrink: 0 }}>
    <CftcSeasonalityChart sodSeries={tab.sodSeries} />
  </div>
)}
```

---

## UI/UX Details

### Year Toggle Bar (Below Chart)
```
[2006] [2007] [2008] ... [2026]    (Avg ···)
```
- Each pill: background = year color at 20% opacity when active, 5% when inactive
- Border = year color (solid when active, dashed when inactive)
- Text = year number, colored with year color
- Clicking toggles; multiple years can be active simultaneously
- "Avg" pill is a special white/dashed pill always visible

### Title Bar (Inside Chart, Top-Center)
```
CT_Total_OI_1D    (or whatever column was selected)
```
Render as absolute-positioned text inside the chart div, matching lightweight-charts styling.

### Tooltip
On `crosshairMove`:
- Show a floating box listing each active year's value at that X position
- Sorted by value descending
- Each row: `[year color dot] [year] [formatted value]`
- As seen in the screenshot (e.g. "242.093k 2021", "226.545k 2024")

### Responsive Resizing
Use a `ResizeObserver` on the container to call `chart.applyOptions({ width, height })`.

---

## Data Flow Summary

```
User configures SOD section → clicks "Generate SOD Chart"
  → fetchCftcData() called
  → data transformed into yearlyData (grouped by year, x-axis normalized)
  → dispatch setTabSodSeries(...)
  → TabPanel renders CftcSeasonalityChart with sodSeries prop
  → chart draws one line per year (2006–2026)
  → user clicks years on toggle bar to show/hide
  → avg line updates automatically
```

---

## Key Implementation Notes

1. **X-axis normalization**: All years share an x-axis from Jan 1 to Dec 31 mapped to a fixed base year (2000). This makes 2024's Jan 1 and 2006's Jan 1 appear at the same x-position.

2. **Lightweight Charts time format**: Use numeric unix timestamps (seconds). For the base year mapping, convert `new Date(Date.UTC(2000, month-1, day))` to seconds.

3. **Default active years**: On first render, default to years that have data. Show all years active by default (or last 5 if too many).

4. **No scroll/pan**: Mirror the OI Seasonality chart — use `handleScroll: false` and `fixLeftEdge: true, fixRightEdge: true` so the full Jan–Dec range is always visible.

5. **Column label**: The chart title should show the selected column label (from `columns` list).

6. **Data gap handling**: Some years may have sparse data. Use `.filter(d => d.value !== null && !isNaN(d.value))` to clean.

7. **Multiple column support**: For simplicity, the SOD section can start with a single column dropdown, but can be extended to 4 columns like the main chart (each would render its own SOD chart, stacked vertically).
