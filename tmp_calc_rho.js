import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const token = process.env.QH_API_TOKEN;
const outCode = 'KCK26';
const sprCode = 'KCK26-N26';
const W = 15;

async function fetchOHLC(code) {
    const url = `https://qh-api.corp.hertshtengroup.com/api/v2/ohlc/?instruments=${encodeURIComponent(code)}&interval=1D&start=1767225600&count=300`;
    const resp = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    const arr = resp.data;
    arr.sort((a, b) => a.time - b.time);
    return arr.map(r => ({ d: new Date(r.time).toISOString().slice(0, 10), c: r.close })).filter(r => r.d >= '2026-01-01');
}

function pearson(x, y) {
    const pairs = [];
    for (let i = 0; i < x.length; i++) {
        if (x[i] === null || y[i] === null || isNaN(x[i]) || isNaN(y[i])) continue;
        pairs.push([x[i], y[i]]);
    }
    const n = pairs.length;
    if (n < 2) return NaN;
    const mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n;
    let num = 0, dx2 = 0, dy2 = 0;
    for (const [a, b] of pairs) {
        const da = a - mx, db = b - my;
        num += da * db;
        dx2 += da * da;
        dy2 += db * db;
    }
    return (dx2 === 0 || dy2 === 0) ? 0 : num / Math.sqrt(dx2 * dy2);
}

function computeRho(outArr, sprArr) {
    if (!outArr || !sprArr || outArr.length < 2 || sprArr.length < 2) return null;
    const om = {}, sm = {};
    outArr.forEach(r => om[r.d] = r.c);
    sprArr.forEach(r => sm[r.d] = r.c);
    const dates = Object.keys(om).filter(d => sm[d] !== undefined).sort();
    if (dates.length < W + 2) return null;
    const oC = dates.map(d => om[d]), sC = dates.map(d => sm[d]);
    const oR = oC.slice(1).map((c, i) => oC[i] === 0 ? null : ((c - oC[i]) / oC[i]) * 100);
    const sR = sC.slice(1).map((c, i) => sC[i] === 0 ? null : ((c - sC[i]) / sC[i]) * 100);
    const rDates = dates.slice(1);
    const rho = [];
    for (let i = W - 1; i < oR.length; i++) {
        const r = pearson(oR.slice(i - W + 1, i + 1), sR.slice(i - W + 1, i + 1));
        rho.push(isNaN(r) ? null : r * 100);
    }
    const rhoDates = rDates.slice(W - 1);
    return { dates, rhoDates, rho };
}

async function run() {
    try {
        console.log(`Fetching ${outCode} and ${sprCode}...`);
        const outArr = await fetchOHLC(outCode);
        const sprArr = await fetchOHLC(sprCode);

        const res = computeRho(outArr, sprArr);
        if (!res) {
            console.log("Not enough data to compute.");
            return;
        }

        const last14Dates = res.rhoDates.slice(-14);
        const last14Rhos = res.rho.slice(-14);

        console.log("\n--- EXACT RHO VALUES (LAST 14 DAYS) ---");
        for (let i = 0; i < 14; i++) {
            console.log(`${last14Dates[i]} : ${last14Rhos[i] !== null ? last14Rhos[i].toFixed(1) : 'null'}`);
        }
    } catch (e) {
        console.error(e.message);
    }
}

run();
