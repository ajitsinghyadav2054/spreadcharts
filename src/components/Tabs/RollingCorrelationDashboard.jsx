// src/components/Tabs/RollingCorrelationDashboard.jsx
// Embeds the rho Monitor Spread Grid as a full-screen iframe
// using an inline blob URL so it runs entirely client-side.

import { useEffect, useRef } from 'react';

const RHO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>rho Monitor — Spread Grid</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"><\/script>
  <style>
    :root{--bg:#070a0f;--surface:#0c1018;--surface2:#131921;--border:#1c2535;--dim:#253040;--text:#7a8799;--bright:#c0ccd9;--gold:#e6b45a;--cyan:#3dcece;--green:#22c45e;--red:#ef4040;--amber:#f59e0b;--white:#dde5ef}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%;background:var(--bg);color:var(--text);font-family:'IBM Plex Mono',monospace;font-size:10px;overflow:hidden}
    #app{display:flex;flex-direction:column;height:100vh}
    #hdr{flex-shrink:0;display:flex;align-items:center;gap:10px;padding:6px 14px;background:var(--surface);border-bottom:1px solid var(--border)}
    .app-title{font-size:11px;font-weight:600;color:var(--bright);letter-spacing:.08em;white-space:nowrap}
    .hsep{width:1px;height:16px;background:var(--border);flex-shrink:0}
    .prod-tabs{display:flex;gap:3px}
    .ptab{padding:2px 9px;border:1px solid var(--border);background:transparent;color:var(--text);font-family:inherit;font-size:8.5px;font-weight:500;cursor:pointer;letter-spacing:.05em;transition:.12s}
    .ptab:hover{border-color:var(--dim);color:var(--bright)}
    .ptab.active{border-color:var(--gold);color:var(--gold);background:rgba(230,180,90,.07)}
    .out-ref{display:flex;align-items:center;gap:8px;margin-left:auto}
    .out-lbl{font-size:8px;color:var(--text);letter-spacing:.07em;text-transform:uppercase}
    .out-price{font-size:13px;font-weight:500;color:var(--bright)}
    .out-chg{font-size:9px}
    .up{color:var(--green)}.dn{color:var(--red)}
    .cg{display:flex;align-items:center;gap:5px}
    .cl{font-size:8px;color:var(--text);text-transform:uppercase;letter-spacing:.07em;white-space:nowrap}
    .cv{font-size:10px;color:var(--bright);font-weight:500;min-width:18px;text-align:right}
    input[type=range]{-webkit-appearance:none;height:2px;background:var(--dim);border-radius:1px;outline:none;width:65px;cursor:pointer}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:9px;height:9px;border-radius:50%;background:var(--bright);cursor:pointer}
    #grid{flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:1px;background:var(--border);overflow:hidden;position:relative}
    .cell{background:var(--bg);display:flex;flex-direction:column;cursor:pointer;position:relative;overflow:hidden;transition:background .1s}
    .cell:hover{background:#0a0e15}
    .cell.nd{cursor:default}
    .cell.sb{box-shadow:inset 2px 0 0 var(--red)}
    .cell.sl{box-shadow:inset 2px 0 0 var(--amber)}
    .chdr{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:5px 9px;border-bottom:1px solid var(--border)}
    .clbl{font-size:9.5px;font-weight:600;color:var(--bright);letter-spacing:.07em}
    .cbadge{padding:1px 6px;border-radius:1px;font-size:7px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
    .b-in{color:var(--green);background:rgba(34,196,94,.09);border:1px solid rgba(34,196,94,.22)}
    .b-brk{color:var(--red);background:rgba(239,64,64,.09);border:1px solid rgba(239,64,64,.22)}
    .b-lead{color:var(--amber);background:rgba(245,158,11,.09);border:1px solid rgba(245,158,11,.22)}
    .b-pend{color:var(--amber);background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.14)}
    .b-out{color:var(--text);background:rgba(28,37,53,.4);border:1px solid var(--border)}
    .b-mask{color:var(--dim);background:rgba(18,25,35,.4);border:1px solid var(--border)}
    .cbody{flex:1;position:relative;min-height:0}
    .cbody canvas{position:absolute;inset:0;width:100%!important;height:100%!important}
    .ndmsg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}
    .ndmsg span:first-child{font-size:8px;color:var(--dim);letter-spacing:.1em}
    .ndmsg span:last-child{font-size:7px;color:#1a2535}
    .cftr{flex-shrink:0;display:flex;justify-content:space-between;align-items:center;padding:3px 9px;border-top:1px solid var(--border)}
    .crho{font-size:9px;font-weight:500}
    .csub{font-size:8px;color:var(--text)}
    #loadOverlay{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(7,10,15,.88);backdrop-filter:blur(2px)}
    #loadOverlay.hidden{display:none}
    .load-box{display:flex;flex-direction:column;align-items:center;gap:12px;padding:28px 40px;background:var(--surface);border:1px solid var(--border)}
    .load-icon{width:28px;height:28px;border:2px solid var(--dim);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .load-title{font-size:11px;font-weight:600;color:var(--bright);letter-spacing:.08em}
    .load-sub{font-size:9px;color:var(--text);letter-spacing:.06em}
    .load-track{width:200px;height:2px;background:var(--dim);border-radius:1px;overflow:hidden}
    .load-fill{height:100%;background:var(--gold);border-radius:1px;transition:width .25s ease}
    .load-err{font-size:8px;color:var(--red);letter-spacing:.05em}
    #modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center}
    #modal.hidden{display:none}
    #mov{position:absolute;inset:0;background:rgba(3,5,9,.88)}
    #mbox{position:relative;z-index:1;width:91vw;height:89vh;display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--border)}
    #mhdr{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:7px 14px;background:var(--surface);border-bottom:1px solid var(--border)}
    .mhl{display:flex;align-items:center;gap:10px}
    .badge{padding:2px 8px;border-radius:2px;font-size:9px;font-weight:500;letter-spacing:.05em}
    .bo{color:var(--gold);background:rgba(230,180,90,.07);border:1px solid rgba(230,180,90,.18)}
    .bs{color:var(--cyan);background:rgba(61,206,206,.06);border:1px solid rgba(61,206,206,.15)}
    #mstats{display:flex;gap:16px;align-items:center}
    .ms{display:flex;flex-direction:column;align-items:flex-end}
    .msl{font-size:7.5px;color:var(--text);text-transform:uppercase;letter-spacing:.07em}
    .msv{font-size:12px;font-weight:500;color:var(--bright);line-height:1.2}
    .msv.g{color:var(--green)}.msv.r{color:var(--red)}.msv.a{color:var(--amber)}
    .rpill{padding:2px 8px;border-radius:2px;font-size:8.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase}
    .rp-in{color:var(--green);background:rgba(34,196,94,.1);border:1px solid rgba(34,196,94,.25)}
    .rp-brk{color:var(--red);background:rgba(239,64,64,.1);border:1px solid rgba(239,64,64,.25)}
    .rp-lead{color:var(--amber);background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25)}
    .rp-out{color:var(--text);background:rgba(28,37,53,.4);border:1px solid var(--border)}
    #mclose{background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:inherit;font-size:9px;padding:4px 11px;cursor:pointer;letter-spacing:.05em;transition:.12s}
    #mclose:hover{border-color:var(--text);color:var(--bright)}
    #mpanels{flex:1;display:flex;flex-direction:column;overflow:hidden}
    .mpanel{flex:1;position:relative;border-bottom:1px solid var(--border);min-height:0}
    .mpanel:last-child{border-bottom:none}
    .mpanel canvas{position:absolute;inset:0;width:100%!important;height:100%!important}
    .plbl{position:absolute;top:6px;left:10px;z-index:2;font-size:7.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;pointer-events:none}
    .plo{color:var(--gold)}.pls{color:var(--cyan)}.plr{color:var(--white)}
  </style>
</head>
<body>
<div id="app">
  <div id="hdr">
    <span class="app-title">rho MONITOR</span>
    <div class="prod-tabs" id="prodTabs"></div>
    <div class="hsep"></div>
    <div class="out-ref">
      <span class="out-lbl" id="outLbl">—</span>
      <span class="out-price" id="outPrice">—</span>
      <span class="out-chg" id="outChg">—</span>
    </div>
    <div class="hsep"></div>
    <div class="cg"><span class="cl">W</span><input type="range" id="slW" min="5" max="30" value="15" step="1"><span class="cv" id="cvW">15</span></div>
    <div class="hsep"></div>
    <div class="cg"><span class="cl">Thr</span><input type="range" id="slT" min="10" max="95" value="50" step="5"><span class="cv" id="cvT">50</span></div>
    <div class="hsep"></div>
    <div class="cg"><span class="cl">Conf</span><input type="range" id="slC" min="2" max="7" value="3" step="1"><span class="cv" id="cvC">3</span></div>
    <div class="hsep"></div>
    <button id="btnRefresh" onclick="doRefresh()" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:inherit;font-size:8px;padding:3px 10px;cursor:pointer;letter-spacing:.05em;transition:.12s;" onmouseover="this.style.borderColor='var(--text)'" onmouseout="this.style.borderColor='var(--border)'">↺ REFRESH</button>
  </div>
  <div id="grid">
    <div id="loadOverlay">
      <div class="load-box">
        <div class="load-icon"></div>
        <div class="load-title">FETCHING DATA</div>
        <div class="load-sub" id="loadSub">Initialising…</div>
        <div class="load-track"><div class="load-fill" id="loadFill" style="width:0%"></div></div>
        <div class="load-err hidden" id="loadErr"></div>
      </div>
    </div>
  </div>
</div>
<div id="modal" class="hidden">
  <div id="mov" onclick="closeModal()"></div>
  <div id="mbox">
    <div id="mhdr">
      <div class="mhl">
        <span class="app-title">rho MONITOR</span>
        <span class="badge bo" id="mOutLbl">—</span>
        <span class="badge bs" id="mSprLbl">—</span>
      </div>
      <div id="mstats">
        <div class="ms"><span class="msl">rho Current</span><span class="msv" id="msCur">—</span></div>
        <div class="ms"><span class="msl">rho Mean</span><span class="msv" id="msMean">—</span></div>
        <div class="ms"><span class="msl">Break Days</span><span class="msv" id="msBreak">—</span></div>
        <div class="ms"><span class="msl">Divergence</span><span class="msv" id="msDir">—</span></div>
        <div class="ms"><span class="msl">Status</span><span class="rpill rp-out" id="msStatus">—</span></div>
      </div>
      <button id="mclose" onclick="closeModal()">✕ CLOSE</button>
    </div>
    <div id="mpanels">
      <div class="mpanel"><span class="plbl plo">Outright</span><canvas id="mOut"></canvas></div>
      <div class="mpanel"><span class="plbl pls">Calendar Spread</span><canvas id="mSpr"></canvas></div>
      <div class="mpanel"><span class="plbl plr">rho — Rolling Correlation % Returns</span><canvas id="mRho"></canvas></div>
    </div>
  </div>
</div>
<script>
const API_BASE='https://qh-api.corp.hertshtengroup.com/api/v2/ohlc/';
const TOKEN='Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoyMDg2MTEwMDY3LCJpYXQiOjE3NzA3NTAwNjcsImp0aSI6IjEzNDA5Zjc5MGQ4NjQwNWFiZmEzYWZjMGNkNWRiMjAxIiwidXNlcl9pZCI6MzU5fQ.gZekPwkdpUNT59OzsdyWrum8b45V8kRUmqF1QKnZzQc';
const START_TS=1767225600;
const COUNT=300;
class APIQueue{constructor(b=650,j=250){this._base=b;this._jitter=j;this._chain=Promise.resolve()}enqueue(fn){const p=this._chain.then(()=>new Promise(r=>setTimeout(r,this._base+Math.random()*this._jitter))).then(fn);this._chain=p.catch(()=>{});return p}}
const Q=new APIQueue();
const START_DATE='2026-01-01';
async function fetchOHLC(code){const url=\`\${API_BASE}?instruments=\${encodeURIComponent(code)}&interval=1D&start=\${START_TS}&count=\${COUNT}\`;const resp=await fetch(url,{headers:{Authorization:TOKEN}});if(!resp.ok)throw new Error(\`HTTP \${resp.status}\`);const arr=await resp.json();arr.sort((a,b)=>a.time-b.time);return arr.map(r=>({d:new Date(r.time).toISOString().slice(0,10),c:r.close})).filter(r=>r.d>=START_DATE)}
const PRODS={C:{name:'London Cocoa',outCode:'LCCK26',outLbl:'LCC May26',sprs:[{lbl:'K26-N26',code:'LCCK26-N26'},{lbl:'N26-U26',code:'LCCN26-U26'},{lbl:'U26-Z26',code:'LCCU26-Z26'},{lbl:'Z26-H27',code:'LCCZ26-H27'},{lbl:'H27-K27',code:'LCCH27-K27'},{lbl:'K27-N27',code:'LCCK27-N27'},{lbl:'N27-U27',code:'LCCN27-U27'},{lbl:'U27-Z27',code:'LCCU27-Z27'},{lbl:'Z27-H28',code:'LCCZ27-H28'}]},CC:{name:'NY Cocoa',outCode:'CCK26',outLbl:'CC May26',sprs:[{lbl:'K26-N26',code:'CCK26-N26'},{lbl:'N26-U26',code:'CCN26-U26'},{lbl:'U26-Z26',code:'CCU26-Z26'},{lbl:'Z26-H27',code:'CCZ26-H27'},{lbl:'H27-K27',code:'CCH27-K27'},{lbl:'K27-N27',code:'CCK27-N27'},{lbl:'N27-U27',code:'CCN27-U27'},{lbl:'U27-Z27',code:'CCU27-Z27'},{lbl:'Z27-H28',code:'CCZ27-H28'}]},KC:{name:'KC Arabica',outCode:'KCK26',outLbl:'KC May26',sprs:[{lbl:'K26-N26',code:'KCK26-N26'},{lbl:'N26-U26',code:'KCN26-U26'},{lbl:'U26-Z26',code:'KCU26-Z26'},{lbl:'Z26-H27',code:'KCZ26-H27'},{lbl:'H27-K27',code:'KCH27-K27'},{lbl:'K27-N27',code:'KCK27-N27'},{lbl:'N27-U27',code:'KCN27-U27'},{lbl:'U27-Z27',code:'KCU27-Z27'},{lbl:'Z27-H28',code:'KCZ27-H28'}]},RC:{name:'Robusta Coffee',outCode:'LKCK26',outLbl:'RC May26',sprs:[{lbl:'K26-N26',code:'LKCK26-N26'},{lbl:'N26-U26',code:'LKCN26-U26'},{lbl:'U26-X26',code:'LKCU26-X26'},{lbl:'X26-F27',code:'LKCX26-F27'},{lbl:'F27-H27',code:'LKCF27-H27'},{lbl:'H27-K27',code:'LKCH27-K27'},{lbl:'K27-N27',code:'LKCK27-N27'},{lbl:'N27-U27',code:'LKCN27-U27'},{lbl:'U27-Z27',code:'LKCU27-Z27'}]},CT:{name:'Cotton #2',outCode:'CTK26',outLbl:'CT May26',sprs:[{lbl:'K26-N26',code:'CTK26-N26'},{lbl:'N26-V26',code:'CTN26-V26'},{lbl:'V26-Z26',code:'CTV26-Z26'},{lbl:'Z26-H27',code:'CTZ26-H27'},{lbl:'H27-K27',code:'CTH27-K27'},{lbl:'K27-N27',code:'CTK27-N27'},{lbl:'N27-V27',code:'CTN27-V27'},{lbl:'V27-Z27',code:'CTV27-Z27'},{lbl:'Z27-H28',code:'CTZ27-H28'}]},SB:{name:'Raw Sugar #11',outCode:'SGK26',outLbl:'SB May26',sprs:[{lbl:'K26-N26',code:'SGK26-N26'},{lbl:'N26-V26',code:'SGN26-V26'},{lbl:'V26-H27',code:'SGV26-H27'},{lbl:'H27-K27',code:'SGH27-K27'},{lbl:'K27-N27',code:'SGK27-N27'},{lbl:'N27-V27',code:'SGN27-V27'},{lbl:'V27-H28',code:'SGV27-H28'},{lbl:'H28-K28',code:'SGH28-K28'},{lbl:'K28-N28',code:'SGK28-N28'}]},W:{name:'White Sugar',outCode:'LSGK26',outLbl:'W May26',sprs:[{lbl:'K26-Q26',code:'LSGK26-Q26'},{lbl:'Q26-V26',code:'LSGQ26-V26'},{lbl:'V26-Z26',code:'LSGV26-Z26'},{lbl:'Z26-H27',code:'LSGZ26-H27'},{lbl:'H27-K27',code:'LSGH27-K27'},{lbl:'K27-Q27',code:'LSGK27-Q27'},{lbl:'Q27-V27',code:'LSGQ27-V27'},{lbl:'V27-Z27',code:'LSGV27-Z27'},{lbl:'Z27-H28',code:'LSGZ27-H28'}]}};
const DS={};
function getOut(pk){return DS[\`\${pk}_out\`]??null}
function getSpr(pk,idx){return DS[\`\${pk}_\${idx}\`]??null}
async function fetchProduct(pk,onProgress,forceRefetch=false){const prod=PRODS[pk];const items=[{key:\`\${pk}_out\`,code:prod.outCode},...prod.sprs.map((s,i)=>({key:\`\${pk}_\${i}\`,code:s.code}))];let done=0;const total=items.length;for(const{key,code}of items){if(!forceRefetch&&DS[key]!==undefined){done++;onProgress(done,total);continue}try{const data=await Q.enqueue(()=>fetchOHLC(code));DS[key]=data}catch(e){console.warn(\`[rho] fetch failed: \${code}\`,e.message);DS[key]=[]}done++;onProgress(done,total)}}
let W=15,THR=50,CONF=3,curProd='C';
function pearson(x,y){const pairs=[];for(let i=0;i<x.length;i++){if(x[i]===null||y[i]===null||isNaN(x[i])||isNaN(y[i]))continue;pairs.push([x[i],y[i]])}const n=pairs.length;if(n<2)return NaN;const mx=pairs.reduce((s,p)=>s+p[0],0)/n,my=pairs.reduce((s,p)=>s+p[1],0)/n;let num=0,dx2=0,dy2=0;for(const[a,b]of pairs){const da=a-mx,db=b-my;num+=da*db;dx2+=da*da;dy2+=db*db}return(dx2===0||dy2===0)?0:num/Math.sqrt(dx2*dy2)}
function computeRho(outArr,sprArr){if(!outArr||!sprArr||outArr.length<2||sprArr.length<2)return null;const om={},sm={};outArr.forEach(r=>om[r.d]=r.c);sprArr.forEach(r=>sm[r.d]=r.c);const dates=Object.keys(om).filter(d=>sm[d]!==undefined).sort();if(dates.length<W+2)return null;const oC=dates.map(d=>om[d]),sC=dates.map(d=>sm[d]);const oR=oC.slice(1).map((c,i)=>oC[i]===0?null:((c-oC[i])/oC[i])*100);const sR=sC.slice(1).map((c,i)=>sC[i]===0?null:((c-sC[i])/sC[i])*100);const rDates=dates.slice(1);const rho=[];for(let i=W-1;i<oR.length;i++){const r=pearson(oR.slice(i-W+1,i+1),sR.slice(i-W+1,i+1));rho.push(isNaN(r)?null:r*100)}const rhoDates=rDates.slice(W-1);const flags=rho.map((v,i)=>{if(v===null)return'masked';let c=0;for(let j=i;j>=0;j--){if(rho[j]===null)break;if(rho[j]<THR)c++;else break}return c>=CONF?'break':c>0?'pending':'normal'});const dirs=rho.map((v,i)=>{if(v===null||v>=THR)return null;const d=rhoDates[i];const oi=outArr.findIndex(x=>x.d===d);const si=sprArr.findIndex(x=>x.d===d);if(oi<1||si<1)return null;const ob=Math.abs(outArr[oi-1].c)||1,sb=Math.abs(sprArr[si-1].c)||1;const oc=(outArr[oi].c-outArr[oi-1].c)/ob,sc=(sprArr[si].c-sprArr[si-1].c)/sb;if(sc>=0&&oc<=0.005)return'SPR_LEAD';if(sc<=0&&oc>=-0.005)return'SPR_LAG';return'MIXED'});const valid=rho.filter(v=>v!==null&&!isNaN(v));const cur=valid.length?valid[valid.length-1]:null;let consec=0;for(let i=rho.length-1;i>=0;i--){if(rho[i]===null)break;if(rho[i]<THR)consec++;else break}const lastDir=[...dirs].reverse().find(d=>d!==null)||null;let status='outside';if(cur===null)status='masked';else if(consec>=CONF)status=lastDir==='SPR_LEAD'?'spr_lead':'break';else if(consec>0)status='pending';else if(cur>=75&&cur<=85)status='in_regime';return{dates,oC,sC,rho,rhoDates,flags,dirs,cur,consec,lastDir,status}}
Chart.defaults.color='#7a8799';Chart.defaults.font.family="'IBM Plex Mono',monospace";Chart.defaults.font.size=9;
Chart.register({id:'rhoBands',afterDraw(chart){if(!chart._rho)return;const{ctx,chartArea:ca,scales:{y}}=chart;ctx.save();const y0=y.getPixelForValue(0);ctx.setLineDash([2,4]);ctx.lineWidth=0.5;ctx.strokeStyle='rgba(110,130,150,0.18)';ctx.beginPath();ctx.moveTo(ca.left,y0);ctx.lineTo(ca.right,y0);ctx.stroke();const y85=y.getPixelForValue(85),y75=y.getPixelForValue(75);ctx.setLineDash([]);ctx.fillStyle='rgba(34,196,94,0.055)';ctx.fillRect(ca.left,y85,ca.width,y75-y85);ctx.setLineDash([4,4]);ctx.lineWidth=0.7;ctx.strokeStyle='rgba(34,196,94,0.28)';ctx.beginPath();ctx.moveTo(ca.left,y85);ctx.lineTo(ca.right,y85);ctx.stroke();ctx.beginPath();ctx.moveTo(ca.left,y75);ctx.lineTo(ca.right,y75);ctx.stroke();const yT=y.getPixelForValue(chart._thr);ctx.setLineDash([7,4]);ctx.lineWidth=1;ctx.strokeStyle='rgba(239,64,64,0.48)';ctx.beginPath();ctx.moveTo(ca.left,yT);ctx.lineTo(ca.right,yT);ctx.stroke();ctx.setLineDash([]);ctx.font="500 7.5px 'IBM Plex Mono',monospace";ctx.fillStyle='rgba(192,204,217,0.35)';ctx.textAlign='right';ctx.fillText(\`W=\${chart._w}\`,ca.right-4,ca.top+10);ctx.restore()}});
let miniC=[];
function ptColour(v,flag,dir){if(v===null)return'rgba(0,0,0,0)';if(flag==='break')return dir==='SPR_LEAD'?'#f59e0b':'#ef4040';if(flag==='pending')return'rgba(245,158,11,0.55)';if(v>=75&&v<=85)return'#22c45e';return'#c0ccd9'}
function buildMini(idx,res){if(miniC[idx]){miniC[idx].destroy();miniC[idx]=null}const el=document.getElementById('m'+idx);if(!el)return;const{rhoDates,rho,flags,dirs}=res;const cols=rho.map((v,i)=>ptColour(v,flags[i],dirs[i]));const szs=rho.map((v,i)=>flags[i]==='break'?4:(v===null?0:2.5));miniC[idx]=new Chart(el,{type:'line',data:{labels:rhoDates,datasets:[{data:rho,borderColor:'rgba(170,195,220,0.35)',backgroundColor:'transparent',borderWidth:1,pointRadius:szs,pointBackgroundColor:cols,pointBorderColor:cols,pointHoverRadius:4,fill:false,tension:0,spanGaps:false}]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:120},layout:{padding:{top:4,bottom:2,left:2,right:2}},interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:'#0c1018',borderColor:'#1c2535',borderWidth:1,titleColor:'#7a8799',bodyColor:'#c0ccd9',padding:6,callbacks:{label:i=>i.raw===null?' Roll Masked':' rho '+i.raw.toFixed(1)}}},scales:{x:{display:false},y:{min:-105,max:105,grid:{color:'rgba(28,37,53,0.5)',lineWidth:0.5},border:{display:false},ticks:{display:false}}}}}); miniC[idx]._rho=true;miniC[idx]._thr=THR;miniC[idx]._w=W}
const SL={in_regime:'In Regime',break:'Break',spr_lead:'Spr Lead',pending:'Pending',masked:'Roll Masked',outside:'Outside'};
const SB_CLS={in_regime:'b-in',break:'b-brk',spr_lead:'b-lead',pending:'b-pend',masked:'b-mask',outside:'b-out'};
function buildGrid(){const prod=PRODS[curProd];const grid=document.getElementById('grid');miniC.forEach(c=>c&&c.destroy());miniC=new Array(9).fill(null);[...grid.children].forEach(ch=>{if(ch.id!=='loadOverlay')ch.remove()});const outArr=getOut(curProd);if(outArr&&outArr.length>=2){const last=outArr[outArr.length-1].c,prev=outArr[outArr.length-2].c;const chg=prev!==0?(last-prev)/Math.abs(prev)*100:0;document.getElementById('outLbl').textContent=prod.outLbl;document.getElementById('outPrice').textContent=last.toFixed(2);const ce=document.getElementById('outChg');ce.textContent=(chg>=0?'+':'')+chg.toFixed(2)+'%';ce.className='out-chg '+(chg>=0?'up':'dn')}else{document.getElementById('outLbl').textContent=prod.outLbl;document.getElementById('outPrice').textContent='—';const ce=document.getElementById('outChg');ce.textContent=outArr?'No data':'Loading…';ce.className='out-chg'}
prod.sprs.forEach((spr,idx)=>{const cell=document.createElement('div');const lbl=spr.lbl;const sprData=getSpr(curProd,idx);if(!outArr||outArr.length<2||!sprData||sprData.length<2){const msg=!outArr||!sprData?'Loading…':'Insufficient data';cell.className='cell nd';cell.innerHTML=\`<div class="chdr"><span class="clbl">\${lbl}</span><span class="cbadge b-mask">—</span></div><div class="cbody"><div class="ndmsg"><span>\${msg.toUpperCase()}</span><span>\${spr.code}</span></div></div><div class="cftr"><span class="crho" style="color:var(--dim)">—</span><span class="csub">—</span></div>\`;grid.appendChild(cell);return}const res=computeRho(outArr,sprData);if(!res){cell.className='cell nd';cell.innerHTML=\`<div class="chdr"><span class="clbl">\${lbl}</span><span class="cbadge b-mask">SPARSE</span></div><div class="cbody"><div class="ndmsg"><span>SPARSE DATA</span><span>\${spr.code}</span></div></div><div class="cftr"><span class="crho" style="color:var(--dim)">—</span><span class="csub">—</span></div>\`;grid.appendChild(cell);return}const{status,cur,consec}=res;const sl=SL[status]||'—';const sb=SB_CLS[status]||'b-out';const sc=status==='break'?' sb':status==='spr_lead'?' sl':'';const rc=status==='in_regime'?'var(--green)':status==='break'?'var(--red)':(status==='spr_lead'||status==='pending')?'var(--amber)':'var(--text)';const sub=consec>0?(consec+'d consec'):status==='in_regime'?'stable':'—';cell.className='cell'+sc;cell.dataset.idx=idx;cell.innerHTML=\`<div class="chdr"><span class="clbl">\${lbl}</span><span class="cbadge \${sb}">\${sl}</span></div><div class="cbody"><canvas id="m\${idx}"></canvas></div><div class="cftr"><span class="crho" style="color:\${rc}">rho \${cur!==null?cur.toFixed(1):'—'}</span><span class="csub">\${sub}</span></div>\`;cell.addEventListener('click',()=>openModal(idx));grid.appendChild(cell);setTimeout(()=>buildMini(idx,res),0)})}
let modalC={o:null,s:null,r:null};let activeIdx=null;
function renderModal(idx){const prod=PRODS[curProd];const outArr=getOut(curProd);const sprData=getSpr(curProd,idx);const res=computeRho(outArr,sprData);if(!res)return;Object.values(modalC).forEach(c=>c&&c.destroy());const{dates,oC,sC,rho,rhoDates,flags,dirs,cur,consec,lastDir,status}=res;const GC='rgba(28,37,53,0.65)';const base=(mn,mx)=>({responsive:true,maintainAspectRatio:false,animation:{duration:180},interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:'#0c1018',borderColor:'#1c2535',borderWidth:1,titleColor:'#7a8799',bodyColor:'#c0ccd9',padding:8}},scales:{x:{grid:{color:GC},border:{color:'#1c2535'},ticks:{maxTicksLimit:8,maxRotation:0}},y:{min:mn,max:mx,grid:{color:GC},border:{color:'#1c2535'},ticks:{maxTicksLimit:5}}}});const oo=base(Math.min(...oC)*0.985,Math.max(...oC)*1.008);oo.plugins.tooltip.callbacks={label:i=>' '+i.raw.toFixed(2)};modalC.o=new Chart(document.getElementById('mOut'),{type:'line',data:{labels:dates,datasets:[{data:oC,borderColor:'#e6b45a',backgroundColor:'rgba(230,180,90,0.05)',borderWidth:1.5,pointRadius:0,fill:true,tension:0}]},options:oo});const sMin=Math.min(...sC),sMax=Math.max(...sC);const sPad=(sMax-sMin)*0.08||0.5;const so=base(sMin-sPad,sMax+sPad);so.plugins.tooltip.callbacks={label:i=>' '+i.raw.toFixed(2)};modalC.s=new Chart(document.getElementById('mSpr'),{type:'line',data:{labels:dates,datasets:[{data:sC,borderColor:'#3dcece',backgroundColor:'rgba(61,206,206,0.04)',borderWidth:1.5,pointRadius:0,fill:true,tension:0}]},options:so});const rhoOffset=dates.length-rho.length;const rhoPadded=[...Array(rhoOffset).fill(null),...rho];const cols=rhoPadded.map((v,i)=>{if(i<rhoOffset)return'rgba(0,0,0,0)';return ptColour(v,flags[i-rhoOffset],dirs[i-rhoOffset])});const szs=rhoPadded.map((v,i)=>{if(i<rhoOffset)return 0;const ri=i-rhoOffset;return flags[ri]==='break'?5:(v===null?0:3)});const ro=base(-105,105);ro.plugins.tooltip.callbacks={label:i=>i.raw===null?' Roll Masked':' rho = '+i.raw.toFixed(1)};modalC.r=new Chart(document.getElementById('mRho'),{type:'line',data:{labels:dates,datasets:[{data:rhoPadded,borderColor:'rgba(195,215,230,0.4)',backgroundColor:'transparent',borderWidth:1.5,pointRadius:szs,pointHoverRadius:6,pointBackgroundColor:cols,pointBorderColor:cols,fill:false,tension:0,spanGaps:false}]},options:ro});modalC.r._rho=true;modalC.r._thr=THR;modalC.r._w=W;const valid=rho.filter(v=>v!==null&&!isNaN(v));const mean=valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;const sCur=document.getElementById('msCur');sCur.textContent=cur!==null?cur.toFixed(1):'—';sCur.className='msv '+(cur!==null&&cur>=75&&cur<=85?'g':cur!==null&&cur<THR?'r':'');document.getElementById('msMean').textContent=mean!==null?mean.toFixed(1):'—';const sbk=document.getElementById('msBreak');sbk.textContent=consec>0?consec+'d':'0';sbk.className='msv '+(consec>=CONF?'r':consec>0?'a':'');const dEl=document.getElementById('msDir');if(lastDir==='SPR_LEAD'){dEl.textContent='SPR LEAD';dEl.className='msv a'}else if(lastDir==='SPR_LAG'){dEl.textContent='SPR LAG';dEl.className='msv r'}else{dEl.textContent='—';dEl.className='msv'}const pill=document.getElementById('msStatus');if(consec>=CONF){pill.textContent=lastDir==='SPR_LEAD'?'SPR LEADING':'BREAK';pill.className='rpill '+(lastDir==='SPR_LEAD'?'rp-lead':'rp-brk')}else if(consec>0){pill.textContent='PENDING';pill.className='rpill rp-out'}else if(cur!==null&&cur>=75&&cur<=85){pill.textContent='IN REGIME';pill.className='rpill rp-in'}else{pill.textContent='OUTSIDE';pill.className='rpill rp-out'}}
function openModal(idx){const prod=PRODS[curProd];activeIdx=idx;document.getElementById('mOutLbl').textContent=prod.outLbl;document.getElementById('mSprLbl').textContent=prod.sprs[idx]?.lbl||('Spr '+(idx+1));document.getElementById('modal').classList.remove('hidden');setTimeout(()=>renderModal(idx),10)}
function closeModal(){document.getElementById('modal').classList.add('hidden');Object.values(modalC).forEach(c=>c&&c.destroy());modalC={o:null,s:null,r:null};activeIdx=null}
function buildTabs(){const c=document.getElementById('prodTabs');c.innerHTML='';Object.entries(PRODS).forEach(([k,p])=>{const b=document.createElement('button');b.className='ptab'+(k===curProd?' active':'');b.textContent=k;b.title=p.name;b.onclick=()=>switchProduct(k);c.appendChild(b)})}
async function switchProduct(pk){if(pk===curProd)return;curProd=pk;buildTabs();await loadAndRender()}
function showOverlay(sub='Initialising…'){const ov=document.getElementById('loadOverlay');ov.classList.remove('hidden');document.getElementById('loadSub').textContent=sub;document.getElementById('loadFill').style.width='0%';document.getElementById('loadErr').classList.add('hidden')}
function updateOverlay(done,total){const pct=total?Math.round(done/total*100):0;document.getElementById('loadSub').textContent=\`Fetching \${done} / \${total}…\`;document.getElementById('loadFill').style.width=pct+'%'}
function hideOverlay(){document.getElementById('loadOverlay').classList.add('hidden')}
async function loadAndRender(forceRefetch=false){const prod=PRODS[curProd];const allCached=DS[\`\${curProd}_out\`]!==undefined&&prod.sprs.every((_,i)=>DS[\`\${curProd}_\${i}\`]!==undefined);if(!allCached||forceRefetch){showOverlay(\`Loading \${prod.name}…\`);buildGrid();await fetchProduct(curProd,updateOverlay,forceRefetch);hideOverlay()}buildGrid();if(activeIdx!==null)setTimeout(()=>renderModal(activeIdx),10)}
function updateAll(){buildGrid();if(activeIdx!==null)setTimeout(()=>renderModal(activeIdx),10)}
function doRefresh(){if(confirm(\`Re-fetch all data for \${PRODS[curProd].name}? (~10 API calls)\`)){const prod=PRODS[curProd];delete DS[\`\${curProd}_out\`];prod.sprs.forEach((_,i)=>delete DS[\`\${curProd}_\${i}\`]);loadAndRender(true)}}
document.getElementById('slW').addEventListener('input',e=>{W=+e.target.value;document.getElementById('cvW').textContent=W;updateAll()});
document.getElementById('slT').addEventListener('input',e=>{THR=+e.target.value;document.getElementById('cvT').textContent=THR;updateAll()});
document.getElementById('slC').addEventListener('input',e=>{CONF=+e.target.value;document.getElementById('cvC').textContent=CONF;updateAll()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeIdx!==null)closeModal()});
buildTabs();loadAndRender();
<\/script>
</body>
</html>`;

export default function RollingCorrelationDashboard() {
    const iframeRef = useRef(null);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const blob = new Blob([RHO_HTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        iframe.src = url;

        return () => URL.revokeObjectURL(url);
    }, []);

    return (
        <iframe
            ref={iframeRef}
            style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
                flex: 1,
            }}
            title="rho Monitor — Rolling Correlation"
            sandbox="allow-scripts allow-same-origin"
        />
    );
}
