import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,onValue}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{firebaseConfig}from"./firebase-config.js";
const app=initializeApp(firebaseConfig),db=getDatabase(app),$=id=>document.getElementById(id),G=["A","B","C","D"];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
let teams={},groups={A:["T1","T2","T3","T4"],B:["T5","T6","T7","T8"],C:["T9","T10","T11","T12"],D:["T13","T14","T15","T16"]},matches={},stats={};
const schedule=[
["M1","A",0,1,"2026-09-06","16:00",1],["M2","A",2,3,"2026-09-13","10:30",1],["M3","B",0,1,"2026-09-12","13:30",1],["M4","B",2,3,"2026-09-13","13:30",1],["M5","C",0,1,"2026-09-12","16:00",1],["M6","C",2,3,"2026-09-13","16:00",1],["M7","D",0,1,"2026-09-13","08:00",1],["M8","D",2,3,"2026-09-19","13:30",1],
["M9","A",0,2,"2026-09-19","16:00",2],["M10","A",1,3,"2026-09-20","16:00",2],["M11","B",0,2,"2026-09-20","10:30",2],["M12","B",1,3,"2026-09-26","13:30",2],["M13","C",0,2,"2026-09-20","10:30",2],["M14","C",1,3,"2026-09-26","16:00",2],["M15","D",0,2,"2026-09-20","13:30",2],["M16","D",1,3,"2026-09-27","08:00",2],
["M17","A",0,3,"2026-09-27","10:30",3],["M18","A",1,2,"2026-10-03","16:00",3],["M19","B",0,3,"2026-09-27","13:30",3],["M20","B",1,2,"2026-10-04","08:00",3],["M21","C",0,3,"2026-09-27","16:00",3],["M22","C",1,2,"2026-10-04","10:30",3],["M23","D",0,3,"2026-10-03","13:30",3],["M24","D",1,2,"2026-10-04","13:30",3]
];
const tn=id=>teams[id]?.name||id||"Belum dipilih";
function norm(v){const o={A:["","","",""],B:["","","",""],C:["","","",""],D:["","","",""]};for(const g of G){const x=v?.[g];if(Array.isArray(x))o[g]=x.slice(0,4);else if(x)for(let i=0;i<4;i++)o[g][i]=x[i]||""}return o}
function num(v){return Number.isFinite(Number(v))?Number(v):0}
function standings(g){const r={};groups[g].forEach((id,slot)=>{if(id){const s=stats[id]||{};r[id]={id,name:tn(id),slot,mp:num(s.main),w:num(s.win),d:num(s.draw),l:num(s.loss),gm:num(s.gm),gk:num(s.gk),sg:num(s.sg),pt:num(s.points)}}});return Object.values(r).sort((a,b)=>b.pt-a.pt||b.sg-a.sg||b.gm-a.gm||a.slot-b.slot)}
function render(){const tl=$("teamList");if(tl)tl.innerHTML=Array.from({length:16},(_,i)=>`<div class="team-row"><span>${i+1}</span><b>${esc(tn("T"+(i+1)))}</b></div>`).join("");
const tb=$("tables");if(tb)tb.innerHTML=G.map(g=>`<div class="card"><h3>Grup ${g}</h3><div class="tablewrap"><table><thead><tr><th>Pos</th><th>Tim</th><th>Main</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th></tr></thead><tbody>${standings(g).map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.name)}</b></td><td>${x.mp}</td><td>${x.w}</td><td>${x.d}</td><td>${x.l}</td><td>${x.gm}</td><td>${x.gk}</td><td>${x.sg}</td><td><b>${x.pt}</b></td></tr>`).join("")}</tbody></table></div></div>`).join("");
const ml=$("matches");if(ml){const byRound=[1,2,3].map(r=>schedule.filter(x=>x[6]===r));ml.innerHTML=byRound.map((round,ri)=>`<section class="round-block"><h3>Putaran ${ri+1}</h3>${round.map(([id,g,a,b,date,time],j)=>{const m=matches[id]||{};const n=ri*8+j+1;return `<div class="match"><div><small>PERTANDINGAN ${n} • GRUP ${g}</small><strong>${esc(tn(groups[g][a]))} <span class="vs">VS</span> ${esc(tn(groups[g][b]))}</strong><small>${date} • ${time} WIB</small></div><div class="score">${m.homeScore??"-"} : ${m.awayScore??"-"}</div><div class="status ${m.status==="live"?"live":m.status==="finished"?"finished":""}">${m.status==="finished"?"SELESAI":m.status==="live"?"LIVE":"TERJADWAL"}</div></div>`}).join("")}</section>`).join("");}
const n=schedule.find(([id])=>{const m=matches[id]||{};return m.status!=="finished"});if($("nextMatch")&&n)$("nextMatch").innerHTML=`<div class="next-card"><strong>${esc(tn(groups[n[1]][n[2]]))} <span class="vs">VS</span> ${esc(tn(groups[n[1]][n[3]]))}</strong><small>${n[4]} • ${n[5]} WIB • Grup ${n[1]}</small></div>`}
async function loadTeams(){try{const a=await get(ref(db,"teams16"));const tv=a.exists()?a.val():{};teams={};for(let i=1;i<=16;i++)teams["T"+i]={name:tv["T"+i]?.name||tv["T"+i]||"Tim "+i};render()}catch(e){console.error("LOAD TEAMS",e)}}
async function loadGroups(){try{const b=await get(ref(db,"groups"));if(b.exists())groups=norm(b.val());render()}catch(e){console.error("LOAD GROUPS",e)}}
async function loadMatches(){try{const c=await get(ref(db,"matches"));if(c.exists())matches=c.val();render()}catch(e){console.error("LOAD MATCHES",e)}}
async function loadStats(){try{const d=await get(ref(db,"stats"));stats=d.exists()?d.val():{};render()}catch(e){console.error("LOAD STATS",e)}}
loadTeams();loadGroups();loadMatches();loadStats();
onValue(ref(db,"teams16"),snap=>{const tv=snap.exists()?snap.val():{};teams={};for(let i=1;i<=16;i++)teams["T"+i]={name:tv["T"+i]?.name||tv["T"+i]||"Tim "+i};render()});
onValue(ref(db,"groups"),snap=>{if(snap.exists())groups=norm(snap.val());render()});
onValue(ref(db,"matches"),snap=>{matches=snap.exists()?snap.val():{};render()});
onValue(ref(db,"stats"),snap=>{stats=snap.exists()?snap.val():{};render()});

/* Public standings are stacked vertically for easy screenshots */
