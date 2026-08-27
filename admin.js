import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,update,set}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{firebaseConfig}from"./firebase-config.js";
const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ADMIN_EMAIL="dendi170898@gmail.com",GROUPS=["A","B","C","D"],$=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const defaults=["ARCAK PUTRA","TIGER","FIT JUNIOR","SUKAMANAH UNITED","FAMILY","Tim 6","Tim 7","Tim 8","Tim 9","Tim 10","Tim 11","Tim 12","Tim 13","Tim 14","Tim 15","Tim 16"];
let teams={},groups={A:["T1","T2","T3","T4"],B:["T5","T6","T7","T8"],C:["T9","T10","T11","T12"],D:["T13","T14","T15","T16"]},matches={},stats={};

const schedule=[
["M1","A",0,1,"2026-09-06","16:00",1],["M2","A",2,3,"2026-09-13","10:30",1],["M3","B",0,1,"2026-09-12","13:30",1],["M4","B",2,3,"2026-09-13","13:30",1],["M5","C",0,1,"2026-09-12","16:00",1],["M6","C",2,3,"2026-09-13","16:00",1],["M7","D",0,1,"2026-09-13","08:00",1],["M8","D",2,3,"2026-09-19","13:30",1],
["M9","A",0,2,"2026-09-19","16:00",2],["M10","A",1,3,"2026-09-20","16:00",2],["M11","B",0,2,"2026-09-20","10:30",2],["M12","B",1,3,"2026-09-26","13:30",2],["M13","C",0,2,"2026-09-20","10:30",2],["M14","C",1,3,"2026-09-26","16:00",2],["M15","D",0,2,"2026-09-20","13:30",2],["M16","D",1,3,"2026-09-27","08:00",2],
["M17","A",0,3,"2026-09-27","10:30",3],["M18","A",1,2,"2026-10-03","16:00",3],["M19","B",0,3,"2026-09-27","13:30",3],["M20","B",1,2,"2026-10-04","08:00",3],["M21","C",0,3,"2026-09-27","16:00",3],["M22","C",1,2,"2026-10-04","10:30",3],["M23","D",0,3,"2026-10-03","13:30",3],["M24","D",1,2,"2026-10-04","13:30",3]
];

const emptyStats=()=>({main:0,win:0,draw:0,loss:0,gm:0,gk:0,sg:0,points:0});
const id=i=>"T"+i;
function initTeams(v){
 teams={};for(let i=1;i<=16;i++){const x=v?.["T"+i];teams["T"+i]={id:"T"+i,name:x?.name||x||defaults[i-1]}}
}
function normalizeGroups(v){
 const o={A:["","","",""],B:["","","",""],C:["","","",""],D:["","","",""]};
 if(!v)return o;
 for(const g of GROUPS){const s=v[g];if(Array.isArray(s))o[g]=s.slice(0,4);else if(s)for(let i=0;i<4;i++)o[g][i]=s[i]||""}
 return o;
}
async function load(){
 try{
  const [t1,t2,g,s,m]=await Promise.all([get(ref(db,"teams16")),get(ref(db,"teams")),get(ref(db,"groups")),get(ref(db,"stats")),get(ref(db,"matches"))]);
  initTeams(t1.exists()?t1.val():(t2.exists()?t2.val():{}));
  if(g.exists())groups=normalizeGroups(g.val());else{
   for(const gg of GROUPS)for(let i=0;i<4;i++){const x=Object.values(teams).find(t=>t.group===gg&&Number(t.id.slice(1))===i+1);if(x)groups[gg][i]=x.id}
  }
  if(!Object.values(groups).flat().some(Boolean))groups={A:["T1","T2","T3","T4"],B:["T5","T6","T7","T8"],C:["T9","T10","T11","T12"],D:["T13","T14","T15","T16"]};
  stats=s.exists()?s.val():{};matches=m.exists()?m.val():{};renderAll();
 }catch(e){show($("groupsMsg"),"❌ Gagal membaca Firebase: "+e.message,true)}
}
function show(el,msg,error=false){if(el){el.textContent=msg;el.className=error?"err":"ok"}}
function withTimeout(promise,ms=12000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error("Firebase tidak merespons dalam 12 detik. Cek koneksi internet atau Firebase Rules.")),ms))])}
function teamName(x){return teams[x]?.name||x||"Belum dipilih"}
function renderTeams(){
 $("teamsForm").innerHTML=Array.from({length:16},(_,i)=>`<label>Tim ${i+1}<input id="name_T${i+1}" value="${esc(teamName("T"+(i+1)))}"></label>`).join("");
}
function syncNamesFromInputs(){
 for(let i=1;i<=16;i++){const v=$("name_T"+i)?.value.trim()||"Tim "+i;teams["T"+i].name=v}
}
function otherSelected(g){
 const s=new Set();for(const x of GROUPS)if(x!==g)groups[x].forEach(v=>{if(v)s.add(v)});return s;
}
function renderGroups(){
 $("groupsForm").innerHTML=GROUPS.map(g=>{
  const other=otherSelected(g);
  let rows="";
  for(let i=0;i<4;i++){
   const cur=groups[g][i]||"",st=stats[cur]||emptyStats();
   const opts=Array.from({length:16},(_,n)=>"T"+(n+1)).filter(x=>!other.has(x)||x===cur);
   rows+=`<tr><td>${i+1}</td><td><select id="grp_${g}_${i}"><option value="">-- pilih tim --</option>${opts.map(x=>`<option value="${x}" ${x===cur?"selected":""}>${esc(teamName(x))}</option>`).join("")}</select></td>
<td><input id="st_${g}_${i}_main" type="number" min="0" value="${st.main??0}"></td><td><input id="st_${g}_${i}_win" type="number" min="0" value="${st.win??0}"></td><td><input id="st_${g}_${i}_draw" type="number" min="0" value="${st.draw??0}"></td><td><input id="st_${g}_${i}_loss" type="number" min="0" value="${st.loss??0}"></td><td><input id="st_${g}_${i}_gm" type="number" min="0" value="${st.gm??0}"></td><td><input id="st_${g}_${i}_gk" type="number" min="0" value="${st.gk??0}"></td><td><input id="st_${g}_${i}_sg" type="number" value="${st.sg??0}"></td><td><input id="st_${g}_${i}_points" type="number" min="0" value="${st.points??0}"></td></tr>`;
  }
  return `<div class="group-card"><h3>Grup ${g}</h3><table><thead><tr><th>No</th><th>Tim</th><th>Main</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th></tr></thead><tbody>${rows}</tbody></table></div>`
 }).join("");
 document.querySelectorAll("[id^=grp_]").forEach(el=>el.addEventListener("change",()=>{readGroupsAndStats();renderMatches()}));
}
function readGroupsAndStats(){
 for(const g of GROUPS)for(let i=0;i<4;i++){const e=$("grp_"+g+"_"+i);if(e)groups[g][i]=e.value}
 for(const g of GROUPS)for(let i=0;i<4;i++){const tid=groups[g][i];if(!tid)continue;const n=k=>Number($("st_"+g+"_"+i+"_"+k)?.value||0);stats[tid]={main:n("main"),win:n("win"),draw:n("draw"),loss:n("loss"),gm:n("gm"),gk:n("gk"),sg:n("sg"),points:n("points")}}
}
$("saveTeams").onclick=async()=>{
 const b=$("saveTeams");b.disabled=true;syncNamesFromInputs();show($("teamsMsg"),"Menyimpan 16 tim...");
 try{
  const u={};for(let i=1;i<=16;i++){const tid="T"+i;u["teams16/"+tid]={id:tid,name:teams[tid].name};u["teams/"+tid]={id:tid,name:teams[tid].name}}
  await withTimeout(update(ref(db),u));const v=await withTimeout(get(ref(db,"teams16")));if(!v.exists())throw Error("Verifikasi Firebase gagal.");
  show($("teamsMsg"),"✅ 16 Tim tersimpan.");
  renderGroups();renderMatches();
 }catch(e){console.error("SAVE TEAMS",e);show($("teamsMsg"),"❌ SAVE GAGAL: "+e.message,true)}finally{b.disabled=false}
};
$("saveGroups").onclick=async()=>{
 const b=$("saveGroups");b.disabled=true;readGroupsAndStats();show($("groupsMsg"),"Menyimpan Grup + statistik + jadwal...");
 try{
  const chosen=GROUPS.flatMap(g=>groups[g].filter(Boolean));
  if(new Set(chosen).size!==chosen.length)throw Error("Ada tim yang dipilih lebih dari satu grup.");
  if(chosen.length!==16)throw Error("Pastikan semua 16 slot Grup A–D sudah terisi.");
  const u={};
  for(let i=1;i<=16;i++){const tid="T"+i;u["teams16/"+tid]={id:tid,name:teams[tid].name};u["teams/"+tid]={id:tid,name:teams[tid].name}}
  for(const g of GROUPS)for(let i=0;i<4;i++)u["groups/"+g+"/"+i]=groups[g][i]||null;
  for(const tid of Object.keys(teams)){const st=stats[tid]||emptyStats();u["stats/"+tid]={main:Number(st.main)||0,win:Number(st.win)||0,draw:Number(st.draw)||0,loss:Number(st.loss)||0,gm:Number(st.gm)||0,gk:Number(st.gk)||0,sg:Number(st.sg)||0,points:Number(st.points)||0}}
  for(const [mid,g,a,b,date,time] of schedule){const old=matches[mid]||{};u["matches/"+mid]={...old,id:mid,phase:"group",group:g,home:groups[g][a]||null,away:groups[g][b]||null,date,time,status:old.status||"scheduled",homeScore:old.homeScore??null,awayScore:old.awayScore??null}}
  await withTimeout(update(ref(db),u));
  const [gv,mv,sv,tv]=await Promise.all([withTimeout(get(ref(db,"groups"))),withTimeout(get(ref(db,"matches"))),withTimeout(get(ref(db,"stats"))),withTimeout(get(ref(db,"teams16")))]);
  if(!gv.exists()||!mv.exists()||!sv.exists()||!tv.exists())throw Error("Verifikasi Firebase setelah Save gagal.");
  const savedGroups=normalizeGroups(gv.val()),savedStats=sv.val()||{};
  for(const g of GROUPS)for(let i=0;i<4;i++)if((savedGroups[g][i]||"")!==(groups[g][i]||""))throw Error("Verifikasi Grup "+g+" gagal pada slot "+(i+1)+".");
  for(const tid of chosen){const a=stats[tid]||emptyStats(),z=savedStats[tid]||{};for(const k of ["main","win","draw","loss","gm","gk","sg","points"])if(Number(z[k]??0)!==Number(a[k]??0))throw Error("Verifikasi statistik "+teamName(tid)+" gagal pada kolom "+k.toUpperCase()+".")}
  groups=savedGroups;matches=mv.val();stats=savedStats;show($("groupsMsg"),"✅ TERSIMPAN & TERVERIFIKASI. Web publik akan ikut realtime.");renderAll();
 }catch(e){console.error("SAVE GROUPS",e);show($("groupsMsg"),"❌ SAVE GAGAL: "+e.message,true)}finally{b.disabled=false}
};
window.saveMatch=async mid=>{
 const old=matches[mid]||{};const h=$("h_"+mid),a=$("a_"+mid),s=$("s_"+mid);
 try{const saved={...old,homeScore:h.value===""?null:Number(h.value),awayScore:a.value===""?null:Number(a.value),status:s.value};await withTimeout(set(ref(db,"matches/"+mid),saved));matches[mid]=saved;show($("matchesMsg"),"✅ Hasil tersimpan.");renderMatches()}catch(e){show($("matchesMsg"),"❌ "+e.message,true)}
};
function renderMatches(){
 const byRound=[1,2,3].map(r=>schedule.filter(x=>x[6]===r));
 $("adminMatches").innerHTML=byRound.map((round,ri)=>`<section class="round-block"><h3>Putaran ${ri+1}</h3>${round.map(([mid,g,a,b,date,time],j)=>{const m=matches[mid]||{};const n=ri*8+j+1;return `<div class="adminmatch"><div><b>${n}. Grup ${g}</b><small>${date} • ${time} WIB</small></div><div><b>${esc(teamName(groups[g][a]))}</b> <span class="muted">vs</span> <b>${esc(teamName(groups[g][b]))}</b></div><select id="s_${mid}"><option value="scheduled" ${m.status!=="live"&&m.status!=="finished"?"selected":""}>Terjadwal</option><option value="live" ${m.status==="live"?"selected":""}>LIVE</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select><input id="h_${mid}" type="number" min="0" value="${m.homeScore??""}" placeholder="Gol"><span>:</span><input id="a_${mid}" type="number" min="0" value="${m.awayScore??""}" placeholder="Gol"><button type="button" onclick="saveMatch('${mid}')">Simpan Hasil</button></div>`}).join("")}</section>`).join("");
}
function renderAll(){renderTeams();renderGroups();renderMatches()}
$("loginBtn").onclick=async()=>{const e=$("username").value.trim(),p=$("password").value;$("loginMsg").textContent="Memproses...";try{const c=await signInWithEmailAndPassword(auth,e,p);if(c.user.email!==ADMIN_EMAIL){await signOut(auth);throw Error("Akun bukan admin.")}}catch(x){$("loginMsg").textContent="Login gagal: "+(x.code||x.message)}};
$("logout").onclick=()=>signOut(auth);
onAuthStateChanged(auth,async u=>{if(u&&u.email===ADMIN_EMAIL){$("loginBox").classList.add("hidden");$("adminBox").classList.remove("hidden");await load()}else{$("loginBox").classList.remove("hidden");$("adminBox").classList.add("hidden")}});
