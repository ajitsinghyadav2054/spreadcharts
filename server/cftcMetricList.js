// server/cftcMetricList.js
// Server-side flat list of ALL CFTC metrics — mirrors src/data/columnHierarchy.js
// Each entry has: { id, label, section, getValue(row) }
// getValue(row) returns the raw metric value for a DB row (null if unavailable).
// The alert engine computes the WoW change as: getValue(currentRow) - getValue(prevRow)

// ── Core helpers ──────────────────────────────────────────────────────────────

function db(id, label, section) {
    return {
        id,
        label,
        section,
        getValue: (r) => {
            const v = r[id];
            return (v !== null && v !== undefined) ? parseFloat(v) : null;
        },
    };
}

function computed(id, label, section, fn) {
    return { id, label, section, getValue: fn };
}

// Net = Long − Short
function net(uid, label, section, longCol, shortCol) {
    return computed(`__net__${uid}`, label, section, (r) => {
        const l = parseFloat(r[longCol]);
        const s = parseFloat(r[shortCol]);
        return (isNaN(l) || isNaN(s)) ? null : l - s;
    });
}

// ── Section generators ────────────────────────────────────────────────────────

function positionMetrics(s) {
    // s = 'all' | 'old' | 'other'
    const sec = `Positions ${s.charAt(0).toUpperCase() + s.slice(1)}`;
    const spreadOtherRept = s === 'other'
        ? 'other_rept_positions_spread_othr'
        : `other_rept_positions_spread_${s}`;

    return [
        // Prod Merc
        db(`prod_merc_positions_long_${s}`,  `Prod Merc Long ${s}`,  sec),
        db(`prod_merc_positions_short_${s}`, `Prod Merc Short ${s}`, sec),
        net(`prod_merc_${s}`, `Prod Merc Net ${s}`, sec,
            `prod_merc_positions_long_${s}`, `prod_merc_positions_short_${s}`),

        // Swap Dealers
        db(`swap_positions_long_${s}`,   `Swap Long ${s}`,   sec),
        db(`swap_positions_short_${s}`,  `Swap Short ${s}`,  sec),
        db(`swap_positions_spread_${s}`, `Swap Spread ${s}`, sec),
        net(`swap_${s}`, `Swap Net ${s}`, sec,
            `swap_positions_long_${s}`, `swap_positions_short_${s}`),

        // Managed Money
        db(`m_money_positions_long_${s}`,   `M-Money Long ${s}`,   sec),
        db(`m_money_positions_short_${s}`,  `M-Money Short ${s}`,  sec),
        db(`m_money_positions_spread_${s}`, `M-Money Spread ${s}`, sec),
        net(`m_money_${s}`, `M-Money Net ${s}`, sec,
            `m_money_positions_long_${s}`, `m_money_positions_short_${s}`),

        // Other Rept
        db(`other_rept_positions_long_${s}`,  `Other Rept Long ${s}`,  sec),
        db(`other_rept_positions_short_${s}`, `Other Rept Short ${s}`, sec),
        db(spreadOtherRept,                   `Other Rept Spread ${s}`, sec),
        net(`other_rept_${s}`, `Other Rept Net ${s}`, sec,
            `other_rept_positions_long_${s}`, `other_rept_positions_short_${s}`),

        // Tot Rept
        db(`tot_rept_positions_long_${s}`,  `Tot Rept Long ${s}`,  sec),
        db(`tot_rept_positions_short_${s}`, `Tot Rept Short ${s}`, sec),
        net(`tot_rept_${s}`, `Tot Rept Net ${s}`, sec,
            `tot_rept_positions_long_${s}`, `tot_rept_positions_short_${s}`),

        // Non Rept
        db(`nonrept_positions_long_${s}`,  `Non Rept Long ${s}`,  sec),
        db(`nonrept_positions_short_${s}`, `Non Rept Short ${s}`, sec),
        net(`nonrept_${s}`, `Non Rept Net ${s}`, sec,
            `nonrept_positions_long_${s}`, `nonrept_positions_short_${s}`),
    ];
}

function changeInPositionsAllMetrics() {
    const sec = 'Change In Positions All';
    return [
        db('change_in_prod_merc_long_all',  'Change Prod Merc Long All',  sec),
        db('change_in_prod_merc_short_all', 'Change Prod Merc Short All', sec),
        net('ch_prod_merc_all', 'Change Prod Merc Net All', sec,
            'change_in_prod_merc_long_all', 'change_in_prod_merc_short_all'),

        db('change_in_swap_long_all',   'Change Swap Long All',   sec),
        db('change_in_swap_short_all',  'Change Swap Short All',  sec),
        db('change_in_swap_spread_all', 'Change Swap Spread All', sec),
        net('ch_swap_all', 'Change Swap Net All', sec,
            'change_in_swap_long_all', 'change_in_swap_short_all'),

        db('change_in_m_money_long_all',   'Change M-Money Long All',   sec),
        db('change_in_m_money_short_all',  'Change M-Money Short All',  sec),
        db('change_in_m_money_spread_all', 'Change M-Money Spread All', sec),
        net('ch_m_money_all', 'Change M-Money Net All', sec,
            'change_in_m_money_long_all', 'change_in_m_money_short_all'),

        db('change_in_other_rept_long_all',   'Change Other Rept Long All',   sec),
        db('change_in_other_rept_short_all',  'Change Other Rept Short All',  sec),
        db('change_in_other_rept_spread_all', 'Change Other Rept Spread All', sec),
        net('ch_other_rept_all', 'Change Other Rept Net All', sec,
            'change_in_other_rept_long_all', 'change_in_other_rept_short_all'),

        db('change_in_tot_rept_long_all',  'Change Tot Rept Long All',  sec),
        db('change_in_tot_rept_short_all', 'Change Tot Rept Short All', sec),
        net('ch_tot_rept_all', 'Change Tot Rept Net All', sec,
            'change_in_tot_rept_long_all', 'change_in_tot_rept_short_all'),

        db('change_in_nonrept_long_all',  'Change Non Rept Long All',  sec),
        db('change_in_nonrept_short_all', 'Change Non Rept Short All', sec),
        net('ch_nonrept_all', 'Change Non Rept Net All', sec,
            'change_in_nonrept_long_all', 'change_in_nonrept_short_all'),
    ];
}

function pctOfOiMetrics(s) {
    const sec = `Pct of OI ${s.charAt(0).toUpperCase() + s.slice(1)}`;
    const spreadOtherRept = s === 'other'
        ? 'pct_of_oi_other_rept_spread_othr'
        : `pct_of_oi_other_rept_spread_${s}`;

    return [
        db(`pct_of_oi_prod_merc_long_${s}`,  `Pct Prod Merc Long ${s}`,  sec),
        db(`pct_of_oi_prod_merc_short_${s}`, `Pct Prod Merc Short ${s}`, sec),

        db(`pct_of_oi_swap_long_${s}`,   `Pct Swap Long ${s}`,   sec),
        db(`pct_of_oi_swap_short_${s}`,  `Pct Swap Short ${s}`,  sec),
        db(`pct_of_oi_swap_spread_${s}`, `Pct Swap Spread ${s}`, sec),

        db(`pct_of_oi_m_money_long_${s}`,   `Pct M-Money Long ${s}`,   sec),
        db(`pct_of_oi_m_money_short_${s}`,  `Pct M-Money Short ${s}`,  sec),
        db(`pct_of_oi_m_money_spread_${s}`, `Pct M-Money Spread ${s}`, sec),

        db(`pct_of_oi_other_rept_long_${s}`,  `Pct Other Rept Long ${s}`,  sec),
        db(`pct_of_oi_other_rept_short_${s}`, `Pct Other Rept Short ${s}`, sec),
        db(spreadOtherRept,                   `Pct Other Rept Spread ${s}`, sec),

        db(`pct_of_oi_tot_rept_long_${s}`,  `Pct Tot Rept Long ${s}`,  sec),
        db(`pct_of_oi_tot_rept_short_${s}`, `Pct Tot Rept Short ${s}`, sec),

        db(`pct_of_oi_nonrept_long_${s}`,  `Pct Non Rept Long ${s}`,  sec),
        db(`pct_of_oi_nonrept_short_${s}`, `Pct Non Rept Short ${s}`, sec),
    ];
}

function tradersMetrics(s) {
    const sec = `Traders ${s.charAt(0).toUpperCase() + s.slice(1)}`;
    const swapShortCol = s === 'other' ? 'traders_swap_short_other' : `traders_swap_short_${s}`;
    return [
        db(`traders_prod_merc_long_${s}`,  `Traders Prod Merc Long ${s}`,  sec),
        db(`traders_prod_merc_short_${s}`, `Traders Prod Merc Short ${s}`, sec),

        db(`traders_swap_long_${s}`,   `Traders Swap Long ${s}`,   sec),
        db(swapShortCol,               `Traders Swap Short ${s}`,  sec),
        db(`traders_swap_spread_${s}`, `Traders Swap Spread ${s}`, sec),

        db(`traders_m_money_long_${s}`,   `Traders M-Money Long ${s}`,   sec),
        db(`traders_m_money_short_${s}`,  `Traders M-Money Short ${s}`,  sec),
        db(`traders_m_money_spread_${s}`, `Traders M-Money Spread ${s}`, sec),

        db(`traders_other_rept_long_${s}`,   `Traders Other Rept Long ${s}`,   sec),
        db(`traders_other_rept_short_${s}`,  `Traders Other Rept Short ${s}`,  sec),
        db(`traders_other_rept_spread_${s}`, `Traders Other Rept Spread ${s}`, sec),

        db(`traders_tot_rept_long_${s}`,  `Traders Tot Rept Long ${s}`,  sec),
        db(`traders_tot_rept_short_${s}`, `Traders Tot Rept Short ${s}`, sec),
    ];
}

function concentrationMetrics(s) {
    const sec = `Concentration ${s.charAt(0).toUpperCase() + s.slice(1)}`;
    return [
        db(`conc_gross_le_4_tdr_long_${s}`,  `Top 4 Gross Long% ${s}`,  sec),
        db(`conc_gross_le_4_tdr_short_${s}`, `Top 4 Gross Short% ${s}`, sec),
        db(`conc_gross_le_8_tdr_long_${s}`,  `Top 8 Gross Long% ${s}`,  sec),
        db(`conc_gross_le_8_tdr_short_${s}`, `Top 8 Gross Short% ${s}`, sec),
        db(`conc_net_le_4_tdr_long_${s}`,    `Top 4 Net Long% ${s}`,    sec),
        db(`conc_net_le_4_tdr_short_${s}`,   `Top 4 Net Short% ${s}`,   sec),
        db(`conc_net_le_8_tdr_long_${s}`,    `Top 8 Net Long% ${s}`,    sec),
        db(`conc_net_le_8_tdr_short_${s}`,   `Top 8 Net Short% ${s}`,   sec),
    ];
}

function spreadingMetrics() {
    const sec = 'Spreading';
    return [
        computed('__spreading_oi_all', 'Spreading OI All', sec, (r) => {
            const oi = parseFloat(r.open_interest_all) || 0;
            if (!oi) return null;
            return ((parseFloat(r.swap_positions_spread_all) || 0) +
                    (parseFloat(r.m_money_positions_spread_all) || 0) +
                    (parseFloat(r.other_rept_positions_spread_all) || 0)) / oi;
        }),
        computed('__spreading_oi_old', 'Spreading OI Old', sec, (r) => {
            const oi = parseFloat(r.open_interest_old) || 0;
            if (!oi) return null;
            return ((parseFloat(r.swap_positions_spread_old) || 0) +
                    (parseFloat(r.m_money_positions_spread_old) || 0) +
                    (parseFloat(r.other_rept_positions_spread_old) || 0)) / oi;
        }),
        computed('__spreading_oi_other', 'Spreading OI Other', sec, (r) => {
            const oi = parseFloat(r.open_interest_other) || 0;
            if (!oi) return null;
            return ((parseFloat(r.swap_positions_spread_other) || 0) +
                    (parseFloat(r.m_money_positions_spread_other) || 0) +
                    (parseFloat(r.other_rept_positions_spread_othr) || 0)) / oi;
        }),
        computed('__old_other_swap', 'Swap Old-Other Spreading', sec, (r) =>
            (parseFloat(r.swap_positions_spread_all) || 0) -
            ((parseFloat(r.swap_positions_spread_old) || 0) + (parseFloat(r.swap_positions_spread_other) || 0))),
        computed('__old_other_mm', 'M-Money Old-Other Spreading', sec, (r) =>
            (parseFloat(r.m_money_positions_spread_all) || 0) -
            ((parseFloat(r.m_money_positions_spread_old) || 0) + (parseFloat(r.m_money_positions_spread_other) || 0))),
        computed('__old_other_or', 'Other Rept Old-Other Spreading', sec, (r) =>
            (parseFloat(r.other_rept_positions_spread_all) || 0) -
            ((parseFloat(r.other_rept_positions_spread_old) || 0) + (parseFloat(r.other_rept_positions_spread_othr) || 0))),
        computed('__spread_exp_swap', 'Swap Spread Exposure', sec, (r) => {
            const sp = parseFloat(r.swap_positions_spread_all) || 0;
            const total = (parseFloat(r.swap_positions_long_all) || 0) +
                          (parseFloat(r.swap_positions_short_all) || 0) + sp;
            return total ? (sp / total) * 100 : null;
        }),
        computed('__spread_exp_mm', 'M-Money Spread Exposure', sec, (r) => {
            const sp = parseFloat(r.m_money_positions_spread_all) || 0;
            const total = (parseFloat(r.m_money_positions_long_all) || 0) +
                          (parseFloat(r.m_money_positions_short_all) || 0) + sp;
            return total ? (sp / total) * 100 : null;
        }),
        computed('__spread_exp_or', 'Other Rept Spread Exposure', sec, (r) => {
            const sp = parseFloat(r.other_rept_positions_spread_all) || 0;
            const total = (parseFloat(r.other_rept_positions_long_all) || 0) +
                          (parseFloat(r.other_rept_positions_short_all) || 0) + sp;
            return total ? (sp / total) * 100 : null;
        }),
    ];
}

// ── Full flat metric list ─────────────────────────────────────────────────────
export const CFTC_METRICS = [
    // Open Interest
    db('open_interest_all',   'Open Interest All',   'Open Interest'),
    db('open_interest_old',   'Open Interest Old',   'Open Interest'),
    db('open_interest_other', 'Open Interest Other', 'Open Interest'),
    computed('__oi_old_pct', 'OI Old %', 'Open Interest', (r) =>
        r.open_interest_all ? (parseFloat(r.open_interest_old) / parseFloat(r.open_interest_all)) * 100 : null),
    computed('__oi_other_pct', 'OI Other %', 'Open Interest', (r) =>
        r.open_interest_all ? (parseFloat(r.open_interest_other) / parseFloat(r.open_interest_all)) * 100 : null),

    // Positions All / Old / Other
    ...positionMetrics('all'),
    ...positionMetrics('old'),
    ...positionMetrics('other'),

    // Change In Positions All (Old/Other are WoW of position cols — covered above)
    ...changeInPositionsAllMetrics(),

    // Percent of Open Interest
    ...pctOfOiMetrics('all'),
    ...pctOfOiMetrics('old'),
    ...pctOfOiMetrics('other'),

    // Number of Traders
    ...tradersMetrics('all'),
    ...tradersMetrics('old'),
    ...tradersMetrics('other'),

    // Concentration
    ...concentrationMetrics('all'),
    ...concentrationMetrics('old'),
    ...concentrationMetrics('other'),

    // Spreading
    ...spreadingMetrics(),
];
