// src/data/cocoaHierarchy.js
// Cocoa-specific column hierarchy for the dedicated Cocoa section.
// Sections match real Cocoa market data categories.
//
// Structure: Section → Sub-section → Item
// Items use placeholder IDs (cocoa_<category>_<sub>) — these can be
// wired to real data columns / API feeds as they become available.

function item(id, label) {
    return { id, label };
}

export const COCOA_HIERARCHY = [
    {
        kind: 'section',
        label: 'Warehouse Stocks',
        subsections: [
            {
                label: 'C(London)',
                items: [
                    item('cocoa_warehouse_london_total', 'Total Stocks'),
                    item('cocoa_warehouse_london_change', 'Daily Change'),
                    item('cocoa_warehouse_london_product_region', 'Monthly Changes'),
                ],
            },
            {
                label: 'CC(US)',
                items: [
                    item('cocoa_warehouse_us_total', 'Total Stocks'),
                    item('cocoa_warehouse_us_change', 'Daily Change'),
                ],
            },
        ],
    },
    {
        kind: 'section',
        label: 'Arrivals',
        subsections: [
            {
                label: 'Ivory_Arrivals',
                items: [
                    item('cocoa_arrivals_ivory', 'Ivory Coast Arrivals (Trend)'),
                    item('cocoa_arrivals_ivory_seasonality', 'Ivory Coast Arrivals (Seasonality)')
                ]
            }
        ]
    },
    {
        kind: 'section',
        label: 'Differentials',
        items: [],
    },
    {
        kind: 'section',
        label: 'Choc Butter / Power Ratios',
        subsections: [
            {
                label: 'Liquor',
                items: [item('cocoa_ratios_liquor', 'Liquor Pricing Ratio')]
            },
            {
                label: 'Butter',
                items: [item('cocoa_ratios_butter', 'Butter Pricing Ratio')]
            },
            {
                label: 'Powder',
                items: [item('cocoa_ratios_powder', 'Powder Pricing Ratio')]
            },
            {
                label: 'Combined',
                items: [item('cocoa_ratios_combined', 'Combined Pricing Ratio')]
            }
        ]
    },
    {
        kind: 'section',
        label: 'Open Interest',
        subsections: [
            {
                label: 'C(London)',
                items: [
                    item('cocoa_oi_london_total', 'Total Open Interest'),
                    item('cocoa_oi_london_change', 'Weekly Change'),
                    item('cocoa_oi_london_cot_net', 'COT Net Position'),
                ],
            },
            {
                label: 'CC(US)',
                items: [
                    item('cocoa_oi_us_total', 'Total Open Interest'),
                    item('cocoa_oi_us_change', 'Weekly Change'),
                    item('cocoa_oi_us_cot_net', 'COT Net Position'),
                ],
            },
        ],
    },
];

// Flat map for O(1) lookup
export const COCOA_ITEM_MAP = {};

COCOA_HIERARCHY.forEach(section => {
    if (section.subsections) {
        section.subsections.forEach(sub => {
            sub.items.forEach(it => {
                COCOA_ITEM_MAP[it.id] = {
                    ...it,
                    fullLabel: `${section.label} — ${sub.label} — ${it.label}`,
                    section: section.label,
                    subsection: sub.label,
                };
            });
        });
    }
    if (section.items) {
        section.items.forEach(it => {
            COCOA_ITEM_MAP[it.id] = {
                ...it,
                fullLabel: `${section.label} — ${it.label}`,
                section: section.label,
            };
        });
    }
});
