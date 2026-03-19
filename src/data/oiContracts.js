// src/data/oiContracts.js
// Contract definitions for the OI (Open Interest) screener.
// Each group maps to a product traded on the Hertshten API.
//
// qhcodes follow the convention: <ROOT><MONTH><2-digit-year>
// Month codes: F=Jan, G=Feb, H=Mar, K=May, M=Jun, N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec
// (Note: K=May for ICE/LIFFE contracts)
//
// Data date note: Today's OI is typically null and only published the
// FOLLOWING evening. The backend handles this by looking back 3–5 days
// and picking the two most recent non-null OI readings to compute the change.

export const OI_GROUPS = [
    {
        code: 'C',
        name: 'London Cocoa',
        contracts: [
            'LCCH6', 'LCCK6', 'LCCN6', 'LCCU6', 'LCCZ6',
            'LCCH7', 'LCCK7', 'LCCN7', 'LCCU7', 'LCCZ7',
        ],
    },
    {
        code: 'CC',
        name: 'NY Cocoa',
        contracts: [
            'CCH6', 'CCK6', 'CCN6', 'CCU6', 'CCZ6',
            'CCH7', 'CCK7', 'CCN7', 'CCU7', 'CCZ7',
        ],
    },
    {
        code: 'KC',
        name: 'KC Arabica',
        contracts: [
            'KCH6', 'KCK6', 'KCN6', 'KCU6', 'KCZ6',
            'KCH7', 'KCK7', 'KCN7', 'KCU7', 'KCZ7',
            'KCH8',
        ],
    },
    {
        code: 'RC',
        name: 'Robusta',
        contracts: [
            'LKCK26', 'LKCN26', 'LKCU26', 'LKCX26', 'LKCF27',
            'LKCH27', 'LKCK27', 'LKCN27', 'LKCU27',
        ],
    },
    {
        code: 'CT',
        name: 'Cotton',
        contracts: [
            'CTH6', 'CTK6', 'CTN6', 'CTV6', 'CTZ6',
            'CTH7', 'CTK7', 'CTN7', 'CTZ7',
        ],
    },
    {
        code: 'SB',
        name: 'Raw Sugar',
        contracts: [
            'SGK26', 'SGN26', 'SGV26',
            'SGH27', 'SGK27', 'SGN27', 'SGV27',
            'SGH28', 'SGK28', 'SGN28', 'SGV28',
        ],
    },
    {
        code: 'W',
        name: 'White Sugar',
        contracts: [
            'LSGK26', 'LSGQ26', 'LSGV26', 'LSGZ26',
            'LSGH27', 'LSGK27', 'LSGQ27', 'LSGV27', 'LSGZ27',
            'LSGH28', 'LSGK28', 'LSGQ28', 'LSGV28',
        ]
    }
];
