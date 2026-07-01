// src/data/oiContracts.js
// Contract definitions for the OI (Open Interest) screener.
// Each group maps to a product traded on the Hertshten API.
//
// qhcodes follow the convention: <ROOT><MONTH><2-digit-year>
// Month codes: F=Jan, G=Feb, H=Mar, J=Apr, K=May, M=Jun, N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec
//
// Data date note: Today's OI is typically null and only published the
// FOLLOWING evening. The backend handles this by looking back 3–5 days
// and picking the two most recent non-null OI readings to compute the change.

export const OI_GROUPS = [
    // ── Cocoa & Softs ──
    {
        category: 'Cocoa',
        code: 'ALL_COCOA',
        name: 'All Cocoa',
        contracts: [], // Synthetic group — built at runtime
    },
    {
        category: 'Cocoa',
        code: 'C',
        name: 'London Cocoa',
        contracts: [
            'LCCH6', 'LCCK6', 'LCCN6', 'LCCU6', 'LCCZ6',
            'LCCH7', 'LCCK7', 'LCCN7', 'LCCU7', 'LCCZ7',
        ],
    },
    {
        category: 'Cocoa',
        code: 'CC',
        name: 'NY Cocoa',
        contracts: [
            'CCH6', 'CCK6', 'CCN6', 'CCU6', 'CCZ6',
            'CCH7', 'CCK7', 'CCN7', 'CCU7', 'CCZ7',
        ],
    },
    {
        category: 'Cocoa',
        code: 'KC',
        name: 'KC Arabica',
        contracts: [
            'KCH6', 'KCK6', 'KCN6', 'KCU6', 'KCZ6',
            'KCH7', 'KCK7', 'KCN7', 'KCU7', 'KCZ7',
            'KCH8',
        ],
    },
    {
        category: 'Cocoa',
        code: 'RC',
        name: 'Robusta',
        contracts: [
            'LKCK26', 'LKCN26', 'LKCU26', 'LKCX26', 'LKCF27',
            'LKCH27', 'LKCK27', 'LKCN27', 'LKCU27',
        ],
    },
    {
        category: 'Cocoa',
        code: 'CT',
        name: 'Cotton',
        contracts: [
            'CTH6', 'CTK6', 'CTN6', 'CTV6', 'CTZ6',
            'CTH7', 'CTK7', 'CTN7', 'CTZ7',
        ],
    },
    {
        category: 'Cocoa',
        code: 'SB',
        name: 'Raw Sugar',
        contracts: [
            'SGK26', 'SGN26', 'SGV26',
            'SGH27', 'SGK27', 'SGN27', 'SGV27',
            'SGH28', 'SGK28', 'SGN28', 'SGV28',
        ],
    },
    {
        category: 'Cocoa',
        code: 'W',
        name: 'White Sugar',
        contracts: [
            'LSGK26', 'LSGQ26', 'LSGV26', 'LSGZ26',
            'LSGH27', 'LSGK27', 'LSGQ27', 'LSGV27', 'LSGZ27',
            'LSGH28', 'LSGK28', 'LSGQ28', 'LSGV28',
        ],
    },

    // ── Other Products ──
    {
        category: 'Other Products',
        code: 'DC',
        name: 'Milk Class III',
        contracts: [
            'DCH26', 'DCJ26', 'DCK26', 'DCM26', 'DCN26',
            'DCQ26', 'DCU26', 'DCV26', 'DCX26', 'DCZ26',
            'DCF27', 'DCG27', 'DCH27', 'DCJ27', 'DCK27',
        ],
    },
    {
        category: 'Other Products',
        code: 'OJ',
        name: 'Orange Juice',
        contracts: [
            'OJK26', 'OJN26', 'OJU26', 'OJX26',
            'OJF27', 'OJH27', 'OJK27',
        ],
    },
    {
        category: 'Other Products',
        code: 'CSC',
        name: 'Cash Settled Cheese',
        contracts: [
            'CSCH26', 'CSCJ26', 'CSCK26', 'CSCM26', 'CSCN26',
            'CSCQ26', 'CSCU26', 'CSCV26', 'CSCX26', 'CSCZ26',
            'CSCF27', 'CSCG27', 'CSCH27', 'CSCJ27', 'CSCK27',
        ],
    },
    {
        category: 'Other Products',
        code: 'ZR',
        name: 'Rough Rice',
        contracts: [
            'ZRK26', 'ZRN26', 'ZRU26', 'ZRX26', 'ZRF27', 'ZRH27',
        ],
    },
    {
        category: 'Other Products',
        code: 'LBR',
        name: 'Lumber',
        contracts: [
            'LBRK26', 'LBRN26', 'LBRU26', 'LBRX26', 'LBRF27',
        ],
    },
    {
        category: 'Other Products',
        code: 'OTS',
        name: 'Oats',
        contracts: [
            'OTSK26', 'OTSN26', 'OTSU26', 'OTSZ26', 'OTSH27',
        ],
    },
];
