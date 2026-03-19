// src/data/columnHierarchy.js
// Full 3-level CFTC column hierarchy:
//   Section → Subsection → Group → Item
// Items are either 'db' (direct column) or 'computed' (formula-based).

// ── Item factories ────────────────────────────────────────────
function dbItem(id, label) {
    return { id, label, isComputed: false };
}

function computedItem(uid, label, deps, formula) {
    return { id: `__computed__${uid}`, label, isComputed: true, deps, formula };
}

function netItem(longCol, shortCol) {
    return computedItem(
        `net__${longCol}`,
        'Net',
        [longCol, shortCol],
        (row) => (parseFloat(row[longCol]) || 0) - (parseFloat(row[shortCol]) || 0)
    );
}

// ── Group builders ────────────────────────────────────────────
function posGroup(name, longCol, shortCol, spreadCol) {
    const items = [dbItem(longCol, 'Long'), dbItem(shortCol, 'Short'), netItem(longCol, shortCol)];
    if (spreadCol) items.push(dbItem(spreadCol, 'Spread'));
    return { kind: 'group', label: name, items };
}

function pctGroup(name, longCol, shortCol, spreadCol) {
    const items = [dbItem(longCol, 'Long'), dbItem(shortCol, 'Short')];
    if (spreadCol) items.push(dbItem(spreadCol, 'Spread'));
    return { kind: 'group', label: name, items };
}

// Week-over-week change item (value[week N] - value[week N-1])
function seriesComputedItem(baseCol, label) {
    return { id: `__computed__wow__${baseCol}`, label, isComputed: false, isSeriesComputed: true, baseCol };
}

function wowPctGroup(name, longCol, shortCol, spreadCol) {
    const items = [
        seriesComputedItem(longCol, 'Long (WoW Δ)'),
        seriesComputedItem(shortCol, 'Short (WoW Δ)'),
    ];
    if (spreadCol) items.push(seriesComputedItem(spreadCol, 'Spread (WoW Δ)'));
    return { kind: 'group', label: name, items };
}

function wowPctSubsection(label, s) {
    const spreadOther = s === 'other' ? 'pct_of_oi_other_rept_spread_othr' : `pct_of_oi_other_rept_spread_${s}`;
    return {
        kind: 'subsection', label,
        groups: [
            wowPctGroup('Prod Merc', `pct_of_oi_prod_merc_long_${s}`, `pct_of_oi_prod_merc_short_${s}`),
            wowPctGroup('Swap Dealers', `pct_of_oi_swap_long_${s}`, `pct_of_oi_swap_short_${s}`, `pct_of_oi_swap_spread_${s}`),
            wowPctGroup('Managed Money', `pct_of_oi_m_money_long_${s}`, `pct_of_oi_m_money_short_${s}`, `pct_of_oi_m_money_spread_${s}`),
            wowPctGroup('Other Rept', `pct_of_oi_other_rept_long_${s}`, `pct_of_oi_other_rept_short_${s}`, spreadOther),
            wowPctGroup('Tot Rept', `pct_of_oi_tot_rept_long_${s}`, `pct_of_oi_tot_rept_short_${s}`),
            wowPctGroup('Non Rept', `pct_of_oi_nonrept_long_${s}`, `pct_of_oi_nonrept_short_${s}`),
        ]
    };
}

// WoW change of positions (Old/Other — not in DB directly)
function wowPosGroup(name, longCol, shortCol, spreadCol) {
    const items = [
        seriesComputedItem(longCol, 'Long'),
        seriesComputedItem(shortCol, 'Short'),
    ];
    if (spreadCol) items.push(seriesComputedItem(spreadCol, 'Spread'));
    return { kind: 'group', label: name, items };
}

function wowPosSubsection(label, s) {
    const spreadOther = s === 'other' ? 'other_rept_positions_spread_othr' : `other_rept_positions_spread_${s}`;
    return {
        kind: 'subsection', label,
        groups: [
            wowPosGroup('Prod Merc', `prod_merc_positions_long_${s}`, `prod_merc_positions_short_${s}`),
            wowPosGroup('Swap Dealers', `swap_positions_long_${s}`, `swap_positions_short_${s}`, `swap_positions_spread_${s}`),
            wowPosGroup('Managed Money', `m_money_positions_long_${s}`, `m_money_positions_short_${s}`, `m_money_positions_spread_${s}`),
            wowPosGroup('Other Rept', `other_rept_positions_long_${s}`, `other_rept_positions_short_${s}`, spreadOther),
            wowPosGroup('Tot Rept', `tot_rept_positions_long_${s}`, `tot_rept_positions_short_${s}`),
            wowPosGroup('Non Rept', `nonrept_positions_long_${s}`, `nonrept_positions_short_${s}`),
        ]
    };
}

// ── Subsection builders ───────────────────────────────────────
function positionsSubsection(label, s) {
    const spreadOther = s === 'other' ? 'other_rept_positions_spread_othr' : `other_rept_positions_spread_${s}`;
    return {
        kind: 'subsection', label,
        groups: [
            posGroup('Prod Merc', `prod_merc_positions_long_${s}`, `prod_merc_positions_short_${s}`),
            posGroup('Swap Dealers', `swap_positions_long_${s}`, `swap_positions_short_${s}`, `swap_positions_spread_${s}`),
            posGroup('Managed Money', `m_money_positions_long_${s}`, `m_money_positions_short_${s}`, `m_money_positions_spread_${s}`),
            posGroup('Other Rept', `other_rept_positions_long_${s}`, `other_rept_positions_short_${s}`, spreadOther),
            posGroup('Tot Rept', `tot_rept_positions_long_${s}`, `tot_rept_positions_short_${s}`),
            posGroup('Non Rept', `nonrept_positions_long_${s}`, `nonrept_positions_short_${s}`),
        ]
    };
}

function changeSubsection(label, s) {
    return {
        kind: 'subsection', label,
        groups: [
            posGroup('Prod Merc', `change_in_prod_merc_long_${s}`, `change_in_prod_merc_short_${s}`),
            posGroup('Swap Dealers', `change_in_swap_long_${s}`, `change_in_swap_short_${s}`, `change_in_swap_spread_${s}`),
            posGroup('Managed Money', `change_in_m_money_long_${s}`, `change_in_m_money_short_${s}`, `change_in_m_money_spread_${s}`),
            posGroup('Other Rept', `change_in_other_rept_long_${s}`, `change_in_other_rept_short_${s}`, `change_in_other_rept_spread_${s}`),
            posGroup('Tot Rept', `change_in_tot_rept_long_${s}`, `change_in_tot_rept_short_${s}`),
            posGroup('Non Rept', `change_in_nonrept_long_${s}`, `change_in_nonrept_short_${s}`),
        ]
    };
}

function pctSubsection(label, s) {
    const spreadOther = s === 'other' ? 'pct_of_oi_other_rept_spread_othr' : `pct_of_oi_other_rept_spread_${s}`;
    return {
        kind: 'subsection', label,
        groups: [
            pctGroup('Prod Merc', `pct_of_oi_prod_merc_long_${s}`, `pct_of_oi_prod_merc_short_${s}`),
            pctGroup('Swap Dealers', `pct_of_oi_swap_long_${s}`, `pct_of_oi_swap_short_${s}`, `pct_of_oi_swap_spread_${s}`),
            pctGroup('Managed Money', `pct_of_oi_m_money_long_${s}`, `pct_of_oi_m_money_short_${s}`, `pct_of_oi_m_money_spread_${s}`),
            pctGroup('Other Rept', `pct_of_oi_other_rept_long_${s}`, `pct_of_oi_other_rept_short_${s}`, spreadOther),
            pctGroup('Tot Rept', `pct_of_oi_tot_rept_long_${s}`, `pct_of_oi_tot_rept_short_${s}`),
            pctGroup('Non Rept', `pct_of_oi_nonrept_long_${s}`, `pct_of_oi_nonrept_short_${s}`),
        ]
    };
}

function tradersSubsection(label, s) {
    return {
        kind: 'subsection', label,
        groups: [
            pctGroup('Prod Merc', `traders_prod_merc_long_${s}`, `traders_prod_merc_short_${s}`),
            pctGroup('Swap Dealers', `traders_swap_long_${s}`, `traders_swap_short_${s}`, `traders_swap_spread_${s}`),
            pctGroup('Managed Money', `traders_m_money_long_${s}`, `traders_m_money_short_${s}`, `traders_m_money_spread_${s}`),
            pctGroup('Other Rept', `traders_other_rept_long_${s}`, `traders_other_rept_short_${s}`, `traders_other_rept_spread_${s}`),
            pctGroup('Tot Rept', `traders_tot_rept_long_${s}`, `traders_tot_rept_short_${s}`),
        ]
    };
}

function concSubsection(label, s) {
    return {
        kind: 'subsection', label,
        groups: [{
            kind: 'group', label: '',
            items: [
                dbItem(`conc_gross_le_4_tdr_long_${s}`, 'Top 4 Gross Long%'),
                dbItem(`conc_gross_le_4_tdr_short_${s}`, 'Top 4 Gross Short%'),
                dbItem(`conc_gross_le_8_tdr_long_${s}`, 'Top 8 Gross Long%'),
                dbItem(`conc_gross_le_8_tdr_short_${s}`, 'Top 8 Gross Short%'),
                dbItem(`conc_net_le_4_tdr_long_${s}`, 'Top 4 Net Long%'),
                dbItem(`conc_net_le_4_tdr_short_${s}`, 'Top 4 Net Short%'),
                dbItem(`conc_net_le_8_tdr_long_${s}`, 'Top 8 Net Long%'),
                dbItem(`conc_net_le_8_tdr_short_${s}`, 'Top 8 Net Short%'),
            ]
        }]
    };
}

// ── Main hierarchy ────────────────────────────────────────────
export const COLUMN_HIERARCHY = [
    {
        kind: 'section', label: 'Open Interest',
        items: [
            dbItem('open_interest_all', 'Open Interest All'),
            dbItem('open_interest_old', 'Open Interest Old'),
            dbItem('open_interest_other', 'Open Interest Other'),
            computedItem('oi_old_pct', 'Open Interest Old %', ['open_interest_old', 'open_interest_all'],
                (row) => row.open_interest_all ? (row.open_interest_old / row.open_interest_all) * 100 : null),
            computedItem('oi_other_pct', 'Open Interest Other %', ['open_interest_other', 'open_interest_all'],
                (row) => row.open_interest_all ? (row.open_interest_other / row.open_interest_all) * 100 : null),
        ]
    },
    {
        kind: 'section', label: 'Positions',
        subsections: [
            positionsSubsection('Positions All', 'all'),
            positionsSubsection('Positions Old', 'old'),
            positionsSubsection('Positions Other', 'other'),
        ]
    },
    {
        kind: 'section', label: 'Change In Positions',
        subsections: [
            changeSubsection('Change In Positions All', 'all'),
            wowPosSubsection('Change In Positions Old', 'old'),
            wowPosSubsection('Change In Positions Other', 'other'),
        ]
    },
    {
        kind: 'section', label: 'Percent of Open Interest',
        subsections: [
            pctSubsection('Pct of OI All', 'all'),
            pctSubsection('Pct of OI Old', 'old'),
            pctSubsection('Pct of OI Other', 'other'),
            wowPctSubsection('Pct of OI Old — WoW Δ', 'old'),
            wowPctSubsection('Pct of OI Other — WoW Δ', 'other'),
        ]
    },
    {
        kind: 'section', label: 'Number of Traders',
        subsections: [
            tradersSubsection('Traders All', 'all'),
            tradersSubsection('Traders Old', 'old'),
            tradersSubsection('Traders Other', 'other'),
        ]
    },
    {
        kind: 'section', label: 'Concentration',
        subsections: [
            concSubsection('Concentration All', 'all'),
            concSubsection('Concentration Old', 'old'),
            concSubsection('Concentration Other', 'other'),
        ]
    },
    {
        kind: 'section', label: 'Spreading',
        subsections: [
            // ── Spreading OI: (Sum of spreads) / Open Interest ────
            {
                kind: 'subsection', label: 'Spreading OI',
                groups: [{
                    kind: 'group', label: '',
                    items: [
                        computedItem('spreading_oi_all', 'Spreading OI All',
                            ['swap_positions_spread_all', 'm_money_positions_spread_all', 'other_rept_positions_spread_all', 'open_interest_all'],
                            (row) => {
                                const oi = parseFloat(row.open_interest_all) || 0;
                                if (!oi) return null;
                                return ((parseFloat(row.swap_positions_spread_all) || 0) +
                                    (parseFloat(row.m_money_positions_spread_all) || 0) +
                                    (parseFloat(row.other_rept_positions_spread_all) || 0)) / oi;
                            }),
                        computedItem('spreading_oi_old', 'Spreading OI Old',
                            ['swap_positions_spread_old', 'm_money_positions_spread_old', 'other_rept_positions_spread_old', 'open_interest_old'],
                            (row) => {
                                const oi = parseFloat(row.open_interest_old) || 0;
                                if (!oi) return null;
                                return ((parseFloat(row.swap_positions_spread_old) || 0) +
                                    (parseFloat(row.m_money_positions_spread_old) || 0) +
                                    (parseFloat(row.other_rept_positions_spread_old) || 0)) / oi;
                            }),
                        computedItem('spreading_oi_other', 'Spreading OI Other',
                            ['swap_positions_spread_other', 'm_money_positions_spread_other', 'other_rept_positions_spread_othr', 'open_interest_other'],
                            (row) => {
                                const oi = parseFloat(row.open_interest_other) || 0;
                                if (!oi) return null;
                                return ((parseFloat(row.swap_positions_spread_other) || 0) +
                                    (parseFloat(row.m_money_positions_spread_other) || 0) +
                                    (parseFloat(row.other_rept_positions_spread_othr) || 0)) / oi;
                            }),
                    ]
                }]
            },
            // ── Old-Other Spreading: Spread All − (Spread Old + Spread Other) ──
            {
                kind: 'subsection', label: 'Old-Other Spreading',
                groups: [
                    {
                        kind: 'group', label: 'Swap Dealers',
                        items: [computedItem('old_other_spread_swap', 'Old-Other Spreading',
                            ['swap_positions_spread_all', 'swap_positions_spread_old', 'swap_positions_spread_other'],
                            (row) => (parseFloat(row.swap_positions_spread_all) || 0) -
                                ((parseFloat(row.swap_positions_spread_old) || 0) + (parseFloat(row.swap_positions_spread_other) || 0))
                        )]
                    },
                    {
                        kind: 'group', label: 'Managed Money',
                        items: [computedItem('old_other_spread_mm', 'Old-Other Spreading',
                            ['m_money_positions_spread_all', 'm_money_positions_spread_old', 'm_money_positions_spread_other'],
                            (row) => (parseFloat(row.m_money_positions_spread_all) || 0) -
                                ((parseFloat(row.m_money_positions_spread_old) || 0) + (parseFloat(row.m_money_positions_spread_other) || 0))
                        )]
                    },
                    {
                        kind: 'group', label: 'Other Rept',
                        items: [computedItem('old_other_spread_or', 'Old-Other Spreading',
                            ['other_rept_positions_spread_all', 'other_rept_positions_spread_old', 'other_rept_positions_spread_othr'],
                            (row) => (parseFloat(row.other_rept_positions_spread_all) || 0) -
                                ((parseFloat(row.other_rept_positions_spread_old) || 0) + (parseFloat(row.other_rept_positions_spread_othr) || 0))
                        )]
                    },
                ]
            },
            // ── Spread Exposure: (Spread / (Long + Short + Spread)) × 100 ────
            {
                kind: 'subsection', label: 'Spread Exposure',
                groups: [
                    {
                        kind: 'group', label: 'Swap Dealers',
                        items: [computedItem('spread_exposure_swap', 'Spread Exposure',
                            ['swap_positions_spread_all', 'swap_positions_long_all', 'swap_positions_short_all'],
                            (row) => {
                                const spread = parseFloat(row.swap_positions_spread_all) || 0;
                                const total = (parseFloat(row.swap_positions_long_all) || 0) +
                                    (parseFloat(row.swap_positions_short_all) || 0) + spread;
                                return total ? (spread / total) * 100 : null;
                            }
                        )]
                    },
                    {
                        kind: 'group', label: 'Managed Money',
                        items: [computedItem('spread_exposure_mm', 'Spread Exposure',
                            ['m_money_positions_spread_all', 'm_money_positions_long_all', 'm_money_positions_short_all'],
                            (row) => {
                                const spread = parseFloat(row.m_money_positions_spread_all) || 0;
                                const total = (parseFloat(row.m_money_positions_long_all) || 0) +
                                    (parseFloat(row.m_money_positions_short_all) || 0) + spread;
                                return total ? (spread / total) * 100 : null;
                            }
                        )]
                    },
                    {
                        kind: 'group', label: 'Other Rept',
                        items: [computedItem('spread_exposure_or', 'Spread Exposure',
                            ['other_rept_positions_spread_all', 'other_rept_positions_long_all', 'other_rept_positions_short_all'],
                            (row) => {
                                const spread = parseFloat(row.other_rept_positions_spread_all) || 0;
                                const total = (parseFloat(row.other_rept_positions_long_all) || 0) +
                                    (parseFloat(row.other_rept_positions_short_all) || 0) + spread;
                                return total ? (spread / total) * 100 : null;
                            }
                        )]
                    },
                ]
            },
        ]
    },
];

// ── Flat ITEM_MAP for O(1) lookup ─────────────────────────────
export const ITEM_MAP = {};

COLUMN_HIERARCHY.forEach(section => {
    if (section.items) {
        section.items.forEach(item => {
            ITEM_MAP[item.id] = { ...item, fullLabel: `${section.label} — ${item.label}` };
        });
    }
    if (section.subsections) {
        section.subsections.forEach(sub => {
            sub.groups.forEach(grp => {
                grp.items.forEach(item => {
                    const fullLabel = grp.label
                        ? `${sub.label} — ${grp.label} — ${item.label}`
                        : `${sub.label} — ${item.label}`;
                    ITEM_MAP[item.id] = { ...item, fullLabel };
                });
            });
        });
    }
});

// ── Helpers ───────────────────────────────────────────────────
export function getItemLabel(id) {
    return ITEM_MAP[id]?.fullLabel || ITEM_MAP[id]?.label || id;
}

export function computeMetricValue(metricId, row) {
    const item = ITEM_MAP[metricId];
    if (!item) return null;
    if (item.isComputed) return item.formula(row);
    const v = row[metricId];
    return v !== undefined && v !== null ? parseFloat(v) : null;
}
