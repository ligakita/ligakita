import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,set,update}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{firebaseConfig}from"./firebase-config.js";

const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ADMIN_EMAIL="dendi170898@gmail.com",GROUPS=["A","B","C","D"],SLOTS=4;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const defaultNames=["ARCAK PUTRA","TIGER","FIT JUNIOR","SUKAMANAH UNITED","FAMILY","Tim 6","Tim 7","Tim 8","Tim 9","Tim 10","Tim 11","Tim 12","Tim 13","Tim 14","Tim 15","Tim 16"];
const teams={};for(let i=1;i<=16;i++)teams["T"+i]={id:"T"+i,name:defaultNames[i-1]};
let groups={A:["T1","T2","T3","T4"],B:["T5","T6","T7","T8"],C:["T9","T10","T11","T12"],D:["T13","T14","T15","T16"]};
let stats={};let matches={};

const schedule=[
["M1","A",0,1,"2026-09-06","16:00"],["M2","A",2,3,"2026-09-13","10:30"],
["M3","B",0,1,"2026-09-12","13:30"],["M4","B",2,3,"2026-09-13","08:00"],
["M5","C",0,1,"2026-09-13","10:30"],["M6","C",2,3,"2026-09-13","13:30"],
["M7","D",0,1,"2026-09-13","16:00"],["M8","D",2,3,"2026-09-19","13:30"],
["M9","A",0,2,"2026-09-19","16:00"],["M10","A",1,3,"2026-09-20","08:00"],
["M11","B",0,2,"2026-09-20","10:30"],["M12","B",1,3,"2026-09-20","13:30"],
["M13","C",0,2,"2026-09-20","16:00"],["M14","C",1,3,"2026-09-26","13:30"],
["M15","D",0,2,"2026-09-26","16:00"],["M16","D",1,3,"2026-09-27","08:00"],
["M17","A",0,3,"2026-09-27","10:30"],["M18","A",1,2,"2026-09-27","13:30"],
["M19","B",0,3,"2026-09-27","16:00"],["M20","B",1,2,"2026-10-03","13:30"],
["M21","C",0,3,"2026-10-03","16:00"],["M22","C",1,2,"2026-10-04","08:00"],
["M23","D",0,3,"2026-10-04","10:30"],["M24","D",1,2,"2026-10-04","13:30"]
];

function teamName(id){return teams[id]?.name||id||"Belum dipilih"}
function emptyStats(){return{main:0,win:0,draw:0,loss:0,gm:0,gk:0,sg:0,points:0}}
function normalizeStats(){
 for(const g of GROUPS)for(let i=0;i<4;i++){const id=groups[g][i];if(id&&!stats[id])stats[id]=emptyStats()}
}
function groupStateFromFirebase(v){
 const out={A:["","","",""],B:["","","",""],C:["","","",""],D:["","","",""]};
 if(!v)return out;
 for(const g of GROUPS){
   const src=v[g];
   if(Array.isArray(src))out[g]=src.slice(0,4);
   else if(src&&typeof src==="object")for(let i=0;i<4;i++)out[g][i]=src[i]||"";
 }
 return out;
}
async function load(){
 try{
  const [ts,gs,ss,ms]=await Promise.all([get(ref(db,"teams16")),get(ref(db,"groups")),get(ref(db,"stats")),get(ref(db,"matches"))]);
  const tv=ts.exists()?ts.val():{};
  for(let i=1;i<=16;i++){const id="T"+i;teams[id]={id,name:tv[id]?.name||tv[id]||defaultNames[i-1]}}
  if(gs.exists())groups=groupStateFromFirebase(gs.val());
  if(!Object.values(groups).flat().some(Boolean))groups={A:["T1","T2","T3","T4"],B:["T5","T6","T7","T8"],C:["T9","T10","T11","T12"],D:["T13","T14","T15","T16"]};
  stats=ss.exists()?ss.val():{};matches=ms.exists()?ms.val():{};
  normalizeStats();renderAll();
 }catch(e){console.error(e);alert("Gagal membaca Firebase: "+e.message)}
}
function renderTeams(){
 $("teamsForm").innerHTML=Array.from({length:16},(_,i)=>{const id="T"+(i+1);return `<label>Tim ${i+1}<input id="name_${id}" value="${esc(teams[id].name)}"></label>`}).join("");
}
function selectedIds(exceptGroup){
 const s=new Set();
 for(const g of GROUPS)if(g!==exceptGroup)groups[g].forEach(x=>{if(x)s.add(x)});
 return s;
}
function renderGroups(){
 const usedGlobal=new Set(Object.values(groups).flat().filter(Boolean));
 $("groupsForm").innerHTML=GROUPS.map(g=>{
   const others=selectedIds(g);
   const rows=Array.from({length:4},(_,i)=>{
    const current=groups[g][i]||"";
    const options=Array.from({length:16},(_,n)=>"T"+(n+1)).filter(id=>!others.has(id)||id===current);
    const st=stats[current]||emptyStats();
    return `<tr><td>${i+1}</td><td><select class="team-select" id="grp_${g}_${i}" data-group="${g}" data-slot="${i}">
      <option value="">-- pilih tim --</option>${options.map(id=>`<option value="${id}" ${id===current?"selected":""}>${esc(teamName(id))}</option>`).join("")}</select></td>
      <td><input type="number" min="0" id="st_${g}_${i}_main" value="${st.main??0}"></td>
      <td><input type="number" min="0" id="st_${g}_${i}_win" value="${st.win??0}"></td>
      <td><input type="number" min="0" id="st_${g}_${i}_draw" value="${st.draw??0}"></td>
      <td><input type="number" min="0" id="st_${g}_${i}_loss" value="${st.loss??0}"></td>
      <td><input type="number" min="0" id="st_${g}_${i}_gm" value="${st.gm??0}"></td>
      <td><input type="number" min="0" id="st_${g}_${i}_gk" value="${st.gk??0}"></td>
      <td><input type="number" id="st_${g}_${i}_sg" value="${st.sg??0}"></td>
      <td><input type="number" min="0" id="st_${g}_${i}_points" value="${st.points??0}"></td></tr>`;
   }).join("");
   return `<div class="group-card"><h3>Grup ${g}</h3><table><thead><tr><th>No</th><th>Tim</th><th>Main</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th></tr></thead><tbody>${rows}</tbody></table></div>`
 }).join("");
 document.querySelectorAll(".team-select").forEach(x=>x.addEventListener("change",()=>{
   syncGroupsFromInputs();renderGroups();renderMatches();
 }));
}
function syncGroupsFromInputs(){
 for(const g of GROUPS)for(let i=0;i<4;i++){const el=$(`grp_${g}_${i}`);if(el)groups[g][i]=el.value}
}
function readStats(){
 for(const g of GROUPS)for(let i=0;i<4;i++){const id=groups[g][i];if(!id)continue;
  const num=k=>Number($(`st_${g}_${i}_${k}`)?.value||0);
  stats[id]={main:num("main"),win:num("win"),draw:num("draw"),loss:num("loss"),gm:num("gm"),gk:num("gk"),sg:num("sg"),points:num("points")};
 }
}
$("saveTeams").onclick=async()=>{
 const b=$("saveTeams");b.disabled=true;$("teamsMsg").textContent="Menyimpan...";
 try{
  const updates={};for(let i=1;i<=16;i++){const id="T"+i;const name=$(`name_${id}`).value.trim()||`Tim ${i}`;teams[id].name=name;updates[`teams16/${id}`]={id,name}}
  await update(ref(db),updates);
  await get(ref(db,"teams16"));
  $("teamsMsg").innerHTML="<span class='ok'>✅ 16 Tim tersimpan. Pilihan Grup tidak diubah.</span>";
  renderGroups();renderMatches();
 }catch(e){$("teamsMsg").innerHTML=`<span class='err'>❌ Gagal menyimpan: ${esc(e.message)}</span>`}
 finally{b.disabled=false;$("saveTeams").textContent="💾 Simpan 16 Tim"}
};
$("saveGroups").onclick=async()=>{
 const b=$("saveGroups");b.disabled=true;$("groupsMsg").textContent="Menyimpan...";
 try{
  syncGroupsFromInputs();readStats();
  const all=Object.values(groups).flat().filter(Boolean),unique=new Set(all);
  if(all.length!==unique.size)throw Error("Ada tim yang dipilih lebih dari satu grup.");
  const updates={};
  for(const g of GROUPS)groups[g].forEach((id,i)=>updates[`groups/${g}/${i}`]=id||null);
  for(const [id,st] of Object.entries(stats))updates[`stats/${id}`]=st;
  await update(ref(db),updates);
  const verify=await get(ref(db,"groups"));
  if(!verify.exists())throw Error("Firebase tidak mengembalikan data Grup setelah disimpan.");
  $("groupsMsg").innerHTML="<span class='ok'>✅ Grup tersimpan. Pilihan tidak di-reset.</span>";
  renderGroups();renderMatches();
 }catch(e){$("groupsMsg").innerHTML=`<span class='err'>❌ Gagal menyimpan Grup: ${esc(e.message)}</span>`}
 finally{b.disabled=false;$("saveGroups").textContent="💾 Simpan Semua Grup"}
};
window.saveMatch=async id=>{
 try{
  const old=matches[id]||{};
  const saved={...old,id,homeScore:$(`h_${id}`).value===""?null:Number($(`h_${id}`).value),awayScore:$(`a_${id}`).value===""?null:Number($(`a_${id}`).value),status:$(`s_${id}`).value};
  await set(ref(db,"matches/"+id),saved);matches[id]=saved;
  $("matchesMsg").innerHTML="<span class='ok'>✅ Hasil pertandingan tersimpan.</span>";renderMatches();
 }catch(e){$("matchesMsg").innerHTML=`<span class='err'>❌ ${esc(e.message)}</span>`}
};
function renderMatches(){
 const arr=schedule.map(([id,g,a,b,date,time],idx)=>{const m=matches[id]||{};return {id,g,home:groups[g][a],away:groups[g][b],date,time,round:Math.floor(idx/8)+1,...m}})
 $("adminMatches").innerHTML=arr.map((m,i)=>`<div class="admin-match"><div><b>${i+1}</b><small class="small">Ronde ${m.round} • Grup ${m.g}</small></div>
 <div><b>${esc(teamName(m.home))}</b> <span class="small">vs</span> <b>${esc(teamName(m.away))}</b><small class="small">${m.date} • ${m.time} WIB</small></div>
 <select id="s_${m.id}"><option value="scheduled" ${m.status!=="finished"&&m.status!=="live"?"selected":""}>Terjadwal</option><option value="live" ${m.status==="live"?"selected":""}>LIVE</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select>
 <input id="h_${m.id}" type="number" min="0" value="${m.homeScore??""}" placeholder="Gol">
 <span>:</span><input id="a_${m.id}" type="number" min="0" value="${m.awayScore??""}" placeholder="Gol">
 <button type="button" onclick="saveMatch('${m.id}')">Simpan Hasil</button></div>`).join("");
 const k=[
  {id:"SF1",label:"Semifinal 1",home:"Juara Grup A",away:"Juara Grup B"},
  {id:"SF2",label:"Semifinal 2",home:"Juara Grup C",away:"Juara Grup D"},
  {id:"F",label:"Final",home:"Pemenang SF1",away:"Pemenang SF2"}];
 $("knockoutMatches").innerHTML=k.map(m=>{const x=matches[m.id]||{};return `<div class="admin-match"><div><b>${m.label}</b></div><div><b>${esc(m.home)}</b> vs <b>${esc(m.away)}</b></div><select id="s_${m.id}"><option value="scheduled" ${x.status!=="finished"&&x.status!=="live"?"selected":""}>Terjadwal</option><option value="live" ${x.status==="live"?"selected":""}>LIVE</option><option value="finished" ${x.status==="finished"?"selected":""}>Selesai</option></select><input id="h_${m.id}" type="number" min="0" value="${x.homeScore??""}"><span>:</span><input id="a_${m.id}" type="number" min="0" value="${x.awayScore??""}"><button type="button" onclick="saveMatch('${m.id}')">Simpan Hasil</button></div>`}).join("");
}
function renderAll(){renderTeams();renderGroups();renderMatches()}
$("loginBtn").onclick=async()=>{const email=$("username").value.trim(),pass=$("password").value;$("loginMsg").textContent="Memproses...";try{const c=await signInWithEmailAndPassword(auth,email,pass);if(c.user.email!==ADMIN_EMAIL){await signOut(auth);throw Error("Akun ini bukan akun admin.")}}catch(e){$("loginMsg").textContent="Login gagal: "+(e.code||e.message)}};
$("logout").onclick=()=>signOut(auth);
onAuthStateChanged(auth,async user=>{if(user&&user.email===ADMIN_EMAIL){$("loginBox").classList.add("hidden");$("adminBox").classList.remove("hidden");await load()}else{$("loginBox").classList.remove("hidden");$("adminBox").classList.add("hidden")}});
