// src/components/Tabs/VolSeasonalityDashboard.jsx
// Volume Seasonality — shows 5 years (2022-2026) of daily volume for
// any outright or spread contract, fetched live from the QH v2 OHLC API.

import { useEffect, useRef } from 'react';

const TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoyMDg2MTEwMDY3LCJpYXQiOjE3NzA3NTAwNjcsImp0aSI6IjEzNDA5Zjc5MGQ4NjQwNWFiZmEzYWZjMGNkNWRiMjAxIiwidXNlcl9pZCI6MzU5fQ.gZekPwkdpUNT59OzsdyWrum8b45V8kRUmqF1QKnZzQc';

const VOL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Volume Seasonality</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-zoom/2.0.1/chartjs-plugin-zoom.min.js"><\/script>
<style>
:root{--bg:#070a0f;--surface:#0c1018;--surface2:#131921;--border:#1c2535;--dim:#253040;--text:#7a8799;--bright:#c0ccd9;--gold:#e6b45a;--cyan:#3dcece;--green:#22c45e;--red:#ef4040;--amber:#f59e0b;--white:#dde5ef}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:'IBM Plex Mono',monospace;font-size:10px;overflow:hidden}
#app{display:flex;flex-direction:column;height:100vh}
#hdr{flex-shrink:0;display:flex;align-items:center;gap:8px;padding:6px 14px;background:var(--surface);border-bottom:1px solid var(--border);flex-wrap:wrap}
.app-title{font-size:11px;font-weight:600;color:var(--bright);letter-spacing:.08em;white-space:nowrap}
.hsep{width:1px;height:16px;background:var(--border);flex-shrink:0}
.prod-tabs{display:flex;gap:3px}
.ptab{padding:2px 9px;border:1px solid var(--border);background:transparent;color:var(--text);font-family:inherit;font-size:8.5px;font-weight:500;cursor:pointer;letter-spacing:.05em;transition:.12s}
.ptab:hover{border-color:var(--dim);color:var(--bright)}
.ptab.active{border-color:var(--gold);color:var(--gold);background:rgba(230,180,90,.07)}
#ctrl{flex-shrink:0;display:flex;align-items:center;gap:8px;padding:5px 14px;background:var(--surface2);border-bottom:1px solid var(--border);flex-wrap:wrap}
.type-btn{padding:2px 10px;border:1px solid var(--border);background:transparent;color:var(--text);font-family:inherit;font-size:8.5px;cursor:pointer;transition:.12s;letter-spacing:.04em}
.type-btn.active{border-color:var(--cyan);color:var(--cyan);background:rgba(61,206,206,.07)}
.cl{font-size:8px;color:var(--text);text-transform:uppercase;letter-spacing:.07em;white-space:nowrap}
select{background:var(--surface);border:1px solid var(--border);color:var(--bright);font-family:inherit;font-size:9px;padding:2px 6px;cursor:pointer;outline:none}
select:focus{border-color:var(--gold)}
.yr-row{display:flex;gap:5px;align-items:center}
.yr-cb{display:flex;align-items:center;gap:3px;cursor:pointer;font-size:8.5px;padding:2px 6px;border:1px solid var(--border);border-radius:1px}
.yr-cb input{cursor:pointer;accent-color:currentColor}
#btnLoad{background:var(--surface);border:1px solid var(--gold);color:var(--gold);font-family:inherit;font-size:8.5px;padding:3px 10px;cursor:pointer;letter-spacing:.05em;transition:.12s;margin-left:auto}
#btnLoad:hover{background:rgba(230,180,90,.1)}

/* New Ribbon UI Styles */
#ribbonWrap{display:flex;background:#131921;border:1px solid var(--border);border-radius:3px;overflow-x:auto;margin:8px 14px 4px 14px;}
.rib-item{display:flex;flex-direction:column;cursor:pointer;border-right:1px solid var(--border);min-width:44px;text-align:center;transition:.12s;user-select:none;}
.rib-item:last-child{border-right:none;}
.rib-item.active{box-shadow:inset 0 -2px 0 var(--gold);background:rgba(230,180,90,.05);}
.rib-item:hover:not(.active){background:rgba(255,255,255,.05);}
.rib-hdr{background:#253040;color:#e2e8f0;font-size:10px;font-weight:600;padding:4px 0;letter-spacing:.02em;}
.rib-val{background:#111827;color:#fff;font-size:10px;padding:4px 0;font-weight:500;border:none;text-align:center;width:100%;outline:none;}
.rib-val:focus{background:#1f2937;box-shadow:inset 0 0 0 1px var(--dim);}

#chartWrap{flex:1;position:relative;min-height:0;padding:8px 12px 12px;overflow-y:auto;overflow-x:hidden;}
#chartWrap canvas{display:block}
#overlay{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(7,10,15,.9);backdrop-filter:blur(2px)}
#overlay.hidden{display:none}
.load-box{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 40px;background:var(--surface);border:1px solid var(--border)}
.spin{width:26px;height:26px;border:2px solid var(--dim);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.load-title{font-size:10px;font-weight:600;color:var(--bright);letter-spacing:.07em}
.load-sub{font-size:8.5px;color:var(--text)}
.track{width:180px;height:2px;background:var(--dim);border-radius:1px;overflow:hidden}
.fill{height:100%;background:var(--gold);transition:width .2s}
#errMsg{font-size:8px;color:var(--red);margin-top:4px;min-height:12px}
#legend{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:0 12px 4px;flex-shrink:0}
.leg-item{display:flex;align-items:center;gap:4px;font-size:8.5px;cursor:pointer;opacity:1;transition:.15s}
.leg-item.hidden-ds{opacity:.3}
.leg-dot{width:10px;height:3px;border-radius:1px}
</style>
</head>
<body>
<div id="app">
  <div id="hdr">
    <span class="app-title">VOL SEASONALITY</span>
    <div class="hsep"></div>
    <div class="prod-tabs" id="prodTabs"></div>
  </div>
  <div id="ctrl">
    <span class="cl">Years (Anchor Shift):</span>
    <div class="yr-row" id="yrRow"></div>
    <button id="btnLoad" onclick="loadAndRender()">▶ LOAD GRAPH</button>
    <button id="btnClear" onclick="clearCache()" style="background:var(--surface);border:1px solid var(--dim);color:var(--text);font-family:inherit;font-size:8.5px;padding:3px 10px;cursor:pointer;letter-spacing:.05em;transition:.12s;" title="Clear cached data and force re-fetch from API">🗑 Clear Cache</button>
  </div>
  <div id="ribbonWrap"></div>
  <div id="legend" style="padding-top:8px;"></div>
  <div id="chartWrap">
    <div id="chartInner"></div>
    <div id="overlay">
      <div class="load-box">
        <div class="spin"></div>
        <div class="load-title">FETCHING VOLUME DATA</div>
        <div class="load-sub" id="loadSub">Initialising…</div>
        <div class="track"><div class="fill" id="loadFill" style="width:0%"></div></div>
        <div id="errMsg"></div>
      </div>
    </div>
  </div>
</div>
<script>
const API='https://qh-api.corp.hertshtengroup.com/api/v2/ohlc/';
const TOK='${TOKEN}';
const YEARS=[2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026];
const YR_COLORS={2016:'#00CEC9',2017:'#E17055',2018:'#00B894',2019:'#FDCB6E',2020:'#6C5CE7',2021:'#A29BFE',2022:'#ef4040',2023:'#22c45e',2024:'#f59e0b',2025:'#4a90d9',2026:'#dde5ef'};
const YR_START_TS={}; YEARS.forEach(y => { YR_START_TS[y] = Math.floor(new Date(Date.UTC(y - 2, 0, 1)).valueOf() / 1000); });
const YEAR_SECS=365.25*86400;
const PROD_CFG={
  LCC:{prefix:'LCC',name:'London Cocoa',base:[{c:'K',y:0},{c:'N',y:0},{c:'U',y:0},{c:'Z',y:0},{c:'H',y:1}]},
  CC: {prefix:'CC', name:'NY Cocoa',    base:[{c:'K',y:0},{c:'N',y:0},{c:'U',y:0},{c:'Z',y:0},{c:'H',y:1}]},
  KC: {prefix:'KC', name:'KC Arabica',  base:[{c:'K',y:0},{c:'N',y:0},{c:'U',y:0},{c:'Z',y:0},{c:'H',y:1}]},
  RC: {prefix:'LKC',name:'Robusta',     base:[{c:'K',y:0},{c:'N',y:0},{c:'U',y:0},{c:'X',y:0},{c:'F',y:1},{c:'H',y:1}]},
  CT: {prefix:'CT', name:'Cotton',      base:[{c:'K',y:0},{c:'N',y:0},{c:'V',y:0},{c:'Z',y:0},{c:'H',y:1}]},
  SB: {prefix:'SG', name:'Raw Sugar',   base:[{c:'K',y:0},{c:'N',y:0},{c:'V',y:0},{c:'H',y:1}]},
  W:  {prefix:'LSG',name:'White Sugar', base:[{c:'K',y:0},{c:'Q',y:0},{c:'V',y:0},{c:'Z',y:0},{c:'H',y:1}]},
};

const MONTH_NAME=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let curProd='LCC';
let activeYears=new Set(YEARS.slice(-5)); // default to last 5 years
let volCharts=[];
let lastAllData=null;
let hiddenYears=new Set();
let curveSequence = []; 
let curLegs = []; // e.g. [{c:'K', yOffset:0, val:1}, {c:'N', yOffset:0, val:-1}]

// ── Helpers ──────────────────────────────────────────
function yyOf(baseYear,yOffset){return String(baseYear+yOffset).slice(-2);}
function makeCode(yr){
  const cfg=PROD_CFG[curProd];
  if(curLegs.length === 0) return '';
  if(curLegs.length === 1) {
    // Outright
    return cfg.prefix+curLegs[0].c+yyOf(yr,curLegs[0].yOffset);
  } else {
    // Spread: Base + "-" + Far Code (e.g. LCCK26-N26 or LCCK26-H27)
    // The distant leg could traverse a year if yOffset differs. 
    // Usually spread format drops prefix on second leg in Hertshten API: LCCK26-N26
    const l1=curLegs[0];
    const l2=curLegs[1];
    return cfg.prefix+l1.c+yyOf(yr,l1.yOffset)+'-'+l2.c+yyOf(yr,l2.yOffset);
  }
}
function fmtNum(n){if(n==null)return'—';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'k';return n.toString();}

// ── UI builders ──────────────────────────────────────
function buildProdTabs(){
  const c=document.getElementById('prodTabs');c.innerHTML='';
  Object.entries(PROD_CFG).forEach(([k,p])=>{
    const b=document.createElement('button');
    b.className='ptab'+(k===curProd?' active':'');
    b.textContent=k;b.title=p.name;
    b.onclick=()=>{curProd=k;buildRibbon();};
    c.appendChild(b);
  });
}
function buildYearRow(){
  const r=document.getElementById('yrRow');r.innerHTML='';
  YEARS.forEach(yr=>{
    const col=YR_COLORS[yr];
    const lbl=document.createElement('label');
    lbl.className='yr-cb';lbl.style.color=col;lbl.style.borderColor=col+'55';
    lbl.innerHTML='<input type="checkbox" value="'+yr+'" '+(activeYears.has(yr)?'checked':'')+'/> '+yr;
    lbl.querySelector('input').addEventListener('change',e=>{
      if(e.target.checked)activeYears.add(yr);else activeYears.delete(yr);
    });
    r.appendChild(lbl);
  });
}

function compileRibbon() {
  const inputs = document.querySelectorAll('.rib-val');
  let legs = [];
  inputs.forEach((inp, idx) => {
    let val = parseInt(inp.value, 10);
    if(isNaN(val)) val = 0;
    if(val !== 0) {
      legs.push({ item: curveSequence[idx], val: val });
    }
  });

  if(legs.length === 0) return; // Prevent empty searches

  // The first leg is the anchor
  const anchor = legs[0].item;
  
  curLegs = legs.map(l => ({
    c: l.item.cCode,
    yOffset: l.item.targetYear - anchor.targetYear,
    val: l.val,
    baseMonthIndex: l.item.baseIdx // pass it down for render logic
  }));

  // Auto-set the active years based on the anchor's actual calendar year
  // e.g. K26 -> anchorYear=2026. Data years should be 2022, 2023, 2024, 2025, 2026
  const anchorYear = anchor.targetYear - PROD_CFG[curProd].base[anchor.baseIdx].y;
  activeYears.clear();
  for(let step = -4; step <= 0; step++){
     if(YEARS.includes(anchorYear + step)) activeYears.add(anchorYear + step);
  }
  buildYearRow();
  updateCurrentLabel();
  loadAndRender();
}

function buildRibbon() {
  const rw = document.getElementById('ribbonWrap');
  rw.innerHTML = '';
  curveSequence = [];
  
  const base = PROD_CFG[curProd].base;
  const START_YEAR = 2026;
  let ctr = 0;
  
  for(let yOffset=0; yOffset<=3; yOffset++){
    for(let i=0; i<base.length; i++){
      if(ctr >= 15) break; 
      const c = base[i].c;
      const yrStr = yyOf(START_YEAR + yOffset, base[i].y);
      curveSequence.push({
         label: c + yrStr, 
         baseIdx: i,
         targetYear: START_YEAR + yOffset + base[i].y, 
         cCode: c,
         initVal: ctr === 0 ? 1 : 0 // Default to outright on first item
      });
      ctr++;
    }
  }

  curveSequence.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'rib-item' + (item.initVal !== 0 ? ' active' : '');
    // Header div, Input field
    div.innerHTML = '<div class="rib-hdr">'+item.label+'</div><input class="rib-val" type="text" value="'+item.initVal+'" onclick="event.stopPropagation()" />';
    
    // Clicking header is shortcut to set outright and clear others
    div.querySelector('.rib-hdr').onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.rib-val').forEach(inp => inp.value = 0);
      div.querySelector('.rib-val').value = 1;
      document.querySelectorAll('.rib-item').forEach(r => r.classList.remove('active'));
      div.classList.add('active');
      compileRibbon();
    };

    // Typing changes trigger compilation
    div.querySelector('.rib-val').onchange = (e) => {
       div.classList.toggle('active', parseInt(e.target.value, 10) !== 0);
       compileRibbon();
    };
    
    rw.appendChild(div);
  });
  
  compileRibbon(); // Initial compilation
}

function updateCurrentLabel(){
  if(curLegs.length === 0) return;
  const codes=YEARS.filter(y=>activeYears.has(y)).map(y=>makeCode(y)).join(' · ');
  document.getElementById('currLabel').textContent='Contracts: '+codes;
}


// ── API rate-limit queue (800ms base, 250ms jitter) ──
class APIQueue{
  constructor(base=800,jitter=250){this._base=base;this._jitter=jitter;this._chain=Promise.resolve();}
  enqueue(fn){const p=this._chain.then(()=>new Promise(r=>setTimeout(r,this._base+Math.random()*this._jitter))).then(fn);this._chain=p.catch(()=>{});return p;}
}
const Q=new APIQueue();

// ── In-memory cache — keyed by contract code ──────────
// Only cleared by the user clicking "Clear Cache"
const CACHE={};
function clearCache(){
  Object.keys(CACHE).forEach(k=>delete CACHE[k]);
  document.getElementById('errMsg').textContent='Cache cleared. Next load will fetch fresh data from API.';
  setTimeout(()=>{const e=document.getElementById('errMsg');if(e)e.textContent='';},3000);
}

async function fetchBatch(uncachedCodes, minStart){
  if(uncachedCodes.length===0) return {};
  const data=await Q.enqueue(async()=>{
    const url=API+'?instruments='+encodeURIComponent(uncachedCodes.join(','))+'&interval=1D&count=1100&start='+minStart;
    const r=await fetch(url,{headers:{Authorization:TOK}});
    if(!r.ok)throw new Error('HTTP '+r.status+' for batch');
    return await r.json();
  });
  return data;
}

// ── Chart ─────────────────────────────────────────────
function buildLegend(datasets){
  const leg=document.getElementById('legend');leg.innerHTML='';
  datasets.forEach((ds,i)=>{
    const yr=ds._year;
    const div=document.createElement('div');
    div.className='leg-item'+(hiddenYears.has(yr)?' hidden-ds':'');
    div.id='leg-'+yr;
    div.innerHTML='<div class="leg-dot" style="background:'+ds.borderColor+'"></div><span>'+yr+'</span>';
    div.onclick=()=>{
      if(hiddenYears.has(yr)){hiddenYears.delete(yr);div.classList.remove('hidden-ds');}
      else{hiddenYears.add(yr);div.classList.add('hidden-ds');}
      const cWrap=document.getElementById('cwrap-'+yr);
      if(cWrap) cWrap.style.display=hiddenYears.has(yr)?'none':'block';
    };
    leg.appendChild(div);
  });
}
const monthLetters = { 'F':0, 'G':1, 'H':2, 'J':3, 'K':4, 'M':5, 'N':6, 'Q':7, 'U':8, 'V':9, 'X':10, 'Z':11 };

function renderChart(allData){
  lastAllData = allData;
  const BASE_YEAR=2000;
  
  const anchorLeg = curLegs.length > 0 ? curLegs[0] : { c: 'K', baseMonthIndex: 0 };
  const nc = PROD_CFG[curProd].base[anchorLeg.baseMonthIndex] || PROD_CFG[curProd].base[0];
  const targetMonth = monthLetters[nc.c] || 0;

  const datasets=YEARS.filter(y=>activeYears.has(y)&&allData[y]&&allData[y].length>0).map(yr=>{
    const targetYear = yr + nc.y;
    const startTsCutoff = Date.UTC(targetYear - 2, targetMonth, 1);
    const endTsCutoff = Date.UTC(targetYear + 1, targetMonth + 1, 0);

    const pts=allData[yr].filter(r => r.time >= startTsCutoff && r.time <= endTsCutoff).map(r=>{
      // Create a date object in UTC for the data point
      const d = new Date(r.time);
      // To align cleanly, we map the date to the BASE_YEAR + (actual year - target expiry year)
      // This means a data point from Dec 2023 for a May 2024 expiry 
      // will be plotted in Dec 1999 (relative to a BASE_YEAR of 2000 representing the expiry year)
      const dy = d.getUTCFullYear();
      
      // Calculate offset from the target expiry year (which is yr + nc.y)
      const offsetYears = dy - targetYear; 
      
      const alignedY = BASE_YEAR + offsetYears;
      const alignedTime = Date.UTC(alignedY, d.getUTCMonth(), d.getUTCDate());
      
      return {x:alignedTime, y:r.volume};
    });
    return{
      _year:yr,label:String(yr),data:pts,
      borderColor:YR_COLORS[yr],backgroundColor:YR_COLORS[yr]+'18',
      borderWidth:1.5,pointRadius:0,pointHoverRadius:4,
      fill:false,tension:0.3,spanGaps:false,
      hidden:hiddenYears.has(yr),
    };
  });

  buildLegend(datasets);

  const wrap=document.getElementById('chartWrap');
  const inner=document.getElementById('chartInner');
  inner.style = 'width:100%;height:100%;';
  inner.innerHTML = '';
  volCharts.forEach(c=>c.destroy());
  volCharts=[];

  const allX=datasets.flatMap(d=>d.data.map(p=>p.x));
  if(allX.length===0) return;
  const xMin=Math.min(...allX),xMax=Math.max(...allX);

  // Single canvas for ALL years overlaid
  const canvas = document.createElement('canvas');
  canvas.style = 'width:100%;display:block;';
  canvas.width = wrap.clientWidth - 20;
  canvas.height = wrap.clientHeight - 20;
  inner.appendChild(canvas);

  const chart = new Chart(canvas,{
    type:'line',
    data:{datasets},
    options:{
      responsive:false,
      animation:{duration:200},
      parsing:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        zoom:{
          zoom:{
            drag:{enabled:true,backgroundColor:'rgba(74,144,217,0.12)',borderColor:'rgba(74,144,217,0.7)',borderWidth:1},
            mode:'x'
          }
        },
        legend:{display:false},
        tooltip:{
          backgroundColor:'#0c1018',borderColor:'#1c2535',borderWidth:1,
          titleColor:'#7a8799',bodyColor:'#c0ccd9',padding:8,
          callbacks:{
            title:items=>{
              const d=new Date(items[0].parsed.x);
              const day = d.getUTCDate();
              const suffix = ["th","st","nd","rd"][day%10>3?0:((day%100-day%10!=10)*day%10)];
              const mo = MONTH_NAME[d.getUTCMonth()];
              const yrOff = d.getUTCFullYear() - BASE_YEAR;
              const yrLbl = yrOff === 0 ? " (Expiry Year)" : (yrOff < 0 ? " (" + yrOff + "y)" : " (+" + yrOff + "y)");
              return day + suffix + " " + mo + yrLbl;
            },
            label:item=>{
              const ds = datasets[item.datasetIndex];
              const d = new Date(item.parsed.x);
              // Calculate the actual historical year for THIS specific point to show in tooltip label
              const pointRealYr = (d.getUTCFullYear() - BASE_YEAR) + ds._year;
              return ' ' + ds._year + ' (for ' + pointRealYr + '): ' + fmtNum(item.parsed.y);
            }
          }
        },
      },
      scales:{
        x:{
          type:'linear',min:xMin,max:xMax,
          grid:{color:'rgba(28,37,53,0.6)',lineWidth:0.5},
          border:{color:'#1c2535'},
          ticks:{
            maxRotation:0,color:'#7a8799',
            font:{size:9,family:"'IBM Plex Mono',monospace"},
            maxTicksLimit:14,
            callback:function(val){
              const d=new Date(val);
              // Just show Month and maybe a relative indicator so users aren't confused by the '98/'99/'00
              const mo = MONTH_NAME[d.getUTCMonth()];
              const yrOff = d.getUTCFullYear() - BASE_YEAR;
              const yrLbl = yrOff === 0 ? " (Exp)" : (yrOff < 0 ? " (" + yrOff + "y)" : " (+" + yrOff + "y)");
              return mo + yrLbl;
            }
          }
        },
        y:{
          grid:{color:'rgba(28,37,53,0.6)',lineWidth:0.5},
          border:{color:'#1c2535'},
          ticks:{color:'#7a8799',font:{size:8,family:"'IBM Plex Mono',monospace"},callback:v=>fmtNum(v)},
          title:{display:false}
        }
      }
    }
  });
  canvas.ondblclick = () => chart.resetZoom();
  volCharts.push(chart);

  // Resize observer to keep canvas filling the wrap
  const ro = new ResizeObserver(entries=>{
    const {width,height} = entries[0].contentRect;
    canvas.width = width - 20;
    canvas.height = height - 20;
    chart.resize();
  });
  ro.observe(wrap);
}

// ── Main load ───────────────────────────────────────
async function loadAndRender(){
  if(activeYears.size===0){alert('Select at least one year.');return;}
  const overlay=document.getElementById('overlay');
  const sub=document.getElementById('loadSub');
  const fill=document.getElementById('loadFill');
  const err=document.getElementById('errMsg');
  overlay.classList.remove('hidden');fill.style.width='0%';err.textContent='';

  const yrs=[...activeYears].sort();
  const allData={};
  
  const uncachedList = [];
  let minStart = Infinity;

  for(const yr of yrs){
    const code=makeCode(yr);
    if(CACHE[code]!==undefined){
      allData[yr]=CACHE[code];
    }else{
      uncachedList.push({yr, code});
      if(YR_START_TS[yr] < minStart) minStart = YR_START_TS[yr];
    }
  }

  if(uncachedList.length > 0) {
    sub.textContent='Fetching batch ('+uncachedList.map(u=>u.code).join(', ')+')…';
    try{
      const codes = uncachedList.map(u=>u.code);
      const respJson = await fetchBatch(codes, minStart);
      
      const isArr = Array.isArray(respJson);
      
      for(const item of uncachedList) {
        let arr = [];
        if (isArr) {
          // The API returns a mixed flat array, filter by product code
          arr = respJson.filter(pt => pt.product === item.code);
        } else {
          arr = respJson[item.code] || [];
        }
        
        if(!Array.isArray(arr)) arr = [];
        
        // Exact API data: Only filter out non-numeric or <=0 volumes, 
        // DO NOT apply any artificial thresholds or "active start" logic.
        const cleanData = arr
          .filter(d => typeof d.volume === 'number' && d.volume >= 0)
          .sort((a,b) => a.time - b.time);

        CACHE[item.code] = cleanData;
        allData[item.yr] = cleanData;
      }
    }catch(e){
      err.textContent=e.message;
      for(const item of uncachedList) { allData[item.yr]=[]; }
    }
  }

  overlay.classList.add('hidden');
  renderChart(allData);
}

// ── Init ──────────────────────────────────────────────
buildProdTabs();
buildRibbon();
// Auto-load on start
setTimeout(loadAndRender,200);
<\/script>
</body>
</html>`;

export default function VolSeasonalityDashboard() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const blob = new Blob([VOL_HTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
    return () => URL.revokeObjectURL(url);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block', flex: 1 }}
      title="Volume Seasonality"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
