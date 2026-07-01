const data = {
    individualCurvesSeries: [{
        date: '2026-02-03',
        LCCH27: 17295,
        LCCK26: 39210,
        LCCK27: 4698,
        LCCN26: 23183,
        LCCN27: 1319,
        LCCU26: 18548,
        LCCU27: 459,
        LCCZ26: 24298,
        LCCZ27: 342,
    }]
};

const keys = new Set();
data.individualCurvesSeries.forEach(point => {
    Object.keys(point).forEach(k => { if (k !== 'date') keys.add(k); });
});

const MONTH_ORDER = { 'F': 1, 'G': 2, 'H': 3, 'J': 4, 'K': 5, 'M': 6, 'N': 7, 'Q': 8, 'U': 9, 'V': 10, 'X': 11, 'Z': 12 };
const contractList = Array.from(keys);

const parseContract = (str) => {
    // Assume format suffix is like K26 or Z25
    const match = str.match(/([FGHJKMNQUVXZ])(\d{2})$/);
    if (!match) return { year: 99, month: 99 };
    return { month: MONTH_ORDER[match[1]] || 0, year: parseInt(match[2]) };
};

const allSortedContracts = contractList.sort((a, b) => {
    const pA = parseContract(a);
    const pB = parseContract(b);
    if (pA.year !== pB.year) return pA.year - pB.year;
    return pA.month - pB.month;
});

console.log("allSortedContracts:", allSortedContracts);

const result = data.individualCurvesSeries.map(point => {
    const total = Object.keys(point).reduce((sum, k) => k !== 'date' ? sum + Number(point[k] || 0) : sum, 0);
    const available = allSortedContracts.filter(k => (point[k] || 0) > 0);
    console.log("available:", available);
    const frontVal = available.length > 0 ? Number(point[available[0]] || 0) : 0;
    const secondVal = available.length > 1 ? Number(point[available[1]] || 0) : 0;

    const rpi = (frontVal + secondVal) > 0 ? (frontVal / (frontVal + secondVal)) : 0;
    const bri = total > 0 ? (frontVal / total) : 0;
    const divergence = rpi - bri;

    return { date: point.date, rpi, bri, divergence };
});

console.log("Result:", result);
