import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,onValue}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{firebaseConfig}from"./firebase-config.js";
const app=initializeApp(firebaseConfig),db=getDatabase(app),$=id=>document.getElementById(id);
const GROUPS=["A","B","C","D"],DEFAULT=Array.from({length:16},(_,i)=>`Tim ${i+1}`);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let teams={},groups={A:["T1","T2","T3","T4"],B:["T5","T6","T7","T8"],C:["T9","T10","T11","T12"],D:["T13","T14","T15","T16"]},stats={},matches={};
const schedule=[
["M1","A",0,1,"2026-09-06","16:00"],["M2","A",2,3,"2026-09-13","10:30"],["M3","B",0,1,"2026-09-12","13:30"],["M4","B",2,3,"2026-09-13","08:00"],["M5","C",0,1,"2026-09-13","10:30"],["M6","C",2,3,"2026-09-13","13:30"],["M7","D",0,1,"2026-09-13","16:00"],["M8","D",2,3,"2026-09-19","13:30"],
["M9","A",0,2,"2026-09-19","16:00"],["M10","A",1,3,"2026-09-20","08:00"],["M11","B",0,2,"2026-09-20","10:30"],["M12","B",1,3,"2026-09-20","13:30"],["M13","C",0,2,"2026-09-20","16:00"],["M14","C",1,3,"2026-09-26","13:30"],["M15","D",0,2,"2026-09-26","16:00"],["M16","D",1,3,"2026-09-27","08:00"],
["M17","A",0,3,"2026-09-27","10:30"],["M18","A",1,2,"2026-09-27","13:30"],["M19","B",0,3,"2026-09-27","16:00"],["M20","B",1,2,"2026-10-03","13:30"],["M21","C",0,3,"2026-10-03","16:00"],["M22","C",1,2,"2026-10-04","08:00"],["M23","D",0,3,"2026-10-04","10:30"],["M24","D",1,2,"2026-10-04","13:30"]];
function tname(id){return teams[id]?.name||id||"Belum dipilih"}
function normalize(v){const o={A:["","","",""],B:["","","",""],C:["","","",""],D:["","","",""]};for(const g of GROUPS){const s=v?.[g];if(Array.isArray(s))o[g]=s.slice(0,4);else if(s)for(let i=0;i<4;i++)o[g][i]=s[i]||""}return o}
function calc(g){
 const r={};groups[g].forEach(id=>{if(id)r[id]={id,name:tname(id),mp:0,w:0,d:0,l:0,gm:0,gk:0,pts:0}});
 schedule.forEach(([id,gg,a,b])=>{if(gg!==g)return;const m=matches[id]||{},hs=Number(m.homeScore),as=Number(m.awayScore);const h=groups[gg][a],x=groups[gg][b];if(!Number.isFinite(hs)||!Number.isFinite(as)||!r[h]||!r[x])return;r[h].mp++;r[x].mp++;r[h].gm+=hs;r[h].gk+=as;r[x].gm+=as;r[x].gk+=hs;if(hs>as){r[h].w++;r[x].l++;r[h].pts+=3}else if(hs<as){r[x].w++;r[h].l++;r[x].pts+=3}else{r[h].d++;r[x].d++;r[h].pts++;r[x].pts++}});
 return Object.values(r).sort((a,b)=>b.pts-a.pts||(b.gm-b.gk)-(a.gm-a.gk)||b.gm-a.gm)
}
function render(){
 const tl=$("teamList");if(tl)tl.innerHTML=Array.from({length:16},(_,i)=>`<div class="team">${i+1}. ${esc(tname("T"+(i+1)))}</div>`).join("");
 const tab=$("tables");if(tab)tab.innerHTML=GROUPS.map(g=>{const rows=calc(g);return `<div class="card"><h3>Grup ${g}</h3><div class="tablewrap"><table><thead><tr><th>Pos</th><th>Tim</th><th>Main</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.name)}</b></td><td>${r.mp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gm}</td><td>${r.gk}</td><td>${r.gm-r.gk}</td><td><b>${r.pts}</b></td></tr>`).join("")}</tbody></table></div></div>`}).join("");
 const mm=schedule.map(([id,g,a,b,date,time],i)=>({...matches[id],id,g,round:Math.floor(i/8)+1,home:groups[g][a],away:groups[g][b],date,time}));
 const list=$("matches");if(list)list.innerHTML=mm.map((m,i)=>`<div class="match"><div><div class="date">PERTANDINGAN ${i+1} • PUTARAN ${m.round} • GRUP ${m.g}</div><div class="teamscore">${esc(tname(m.home))} <b>vs</b> ${esc(tname(m.away))}</div><div class="date">${esc(m.date)} • ${esc(m.time)} WIB</div></div><div><b>${m.homeScore??"-"} : ${m.awayScore??"-"}</b><div class="label">${m.status==="finished"?"SELESAI":m.status==="live"?"LIVE":"TERJADWAL"}</div></div></div>`).join("");
 const next=mm.find(m=>m.status!=="finished"&&m.home&&m.away)||mm[0],nm=$("nextMatch");if(nm&&next)nm.innerHTML=`<div class="card"><div class="teamscore">${esc(tname(next.home))} <b>vs</b> ${esc(tname(next.away))}</div><div class="date">Grup ${next.g} • ${next.date} • ${next.time} WIB</div></div>`;
}
async function load(){
 const [ts,gs,ss,ms]=await Promise.all([get(ref(db,"teams16")),get(ref(db,"groups")),get(ref(db,"stats")),get(ref(db,"matches"))]);
 const tv=ts.exists()?ts.val():{};teams={};for(let i=1;i<=16;i++){const id="T"+i;teams[id]={name:tv[id]?.name||tv[id]||DEFAULT[i-1]}}
 if(gs.exists()){
   const saved=normalize(gs.val());
   // Firebase adalah sumber utama. Jangan pernah menyusun ulang menjadi T1-T4/T5-T8 dst.
   groups=saved;
  }
  stats=ss.exists()?ss.val():{};matches=ms.exists()?ms.val():{};render()
}
load();onValue(ref(db,"teams16"),load);onValue(ref(db,"groups"),load);onValue(ref(db,"matches"),load);
