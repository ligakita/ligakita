import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,set,update}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{firebaseConfig}from"./firebase-config.js";

const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ADMIN_EMAIL="dendi170898@gmail.com";
const GROUPS=["A","B","C","D"];
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

let teams={};
let matches={};

function emptyTeam(id,i){return{id,name:`Tim ${i}`,group:"",main:0,win:0,draw:0,loss:0,gf:0,ga:0,gd:0,points:0}}
const defaultTeams={};
for(let i=1;i<=16;i++)defaultTeams[`T${i}`]=emptyTeam(`T${i}`,i);

// 8 pertandingan per putaran: setiap 16 tim bermain tepat 1 kali.
// Dalam tiap grup (4 tim), pola 3 putaran adalah:
// R1: 1-2, 3-4 | R2: 1-3, 2-4 | R3: 1-4, 2-3
const pairings={1:[[1,2],[3,4]],2:[[1,3],[2,4]],3:[[1,4],[2,3]]};
const dates=[
 ["2026-09-06","16:00"],["2026-09-12","13:30"],["2026-09-12","16:00"],["2026-09-13","08:00"],["2026-09-13","10:30"],["2026-09-13","13:30"],["2026-09-13","16:00"],["2026-09-19","13:30"],
 ["2026-09-19","16:00"],["2026-09-20","08:00"],["2026-09-20","10:30"],["2026-09-20","13:30"],["2026-09-20","16:00"],["2026-09-26","13:30"],["2026-09-26","16:00"],["2026-09-27","08:00"],
 ["2026-09-27","10:30"],["2026-09-27","13:30"],["2026-09-27","16:00"],["2026-10-03","13:30"],["2026-10-03","16:00"],["2026-10-04","08:00"],["2026-10-04","10:30"],["2026-10-04","13:30"]
];

function masterTeamList(){return Array.from({length:16},(_,i)=>teams[`T${i+1}`]||defaultTeams[`T${i+1}`])}
function groupMembers(g){
 const ids=Object.keys(teams).filter(id=>teams[id]?.group===g).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 return ids.slice(0,4);
}
function teamIdForSlot(g,pos){return groupMembers(g)[pos-1]||""}
function buildMatches(existing={}){
 const out={};let n=1;
 for(let round=1;round<=3;round++){
  for(const g of GROUPS){
   for(const [hp,ap] of pairings[round]){
    const id=`M${n}`;const old=existing[id]||{};const [date,time]=dates[n-1]||["",""];
    out[id]={id,phase:"group",round,group:g,home:teamIdForSlot(g,hp),away:teamIdForSlot(g,ap),homeScore:old.homeScore??null,awayScore:old.awayScore??null,status:old.status||"scheduled",date:old.date||date,time:old.time||time,location:old.location||""};
    n++;
   }
  }
 }
 return out;
}

function showLogin(){ $("loginBox").classList.remove("hidden"); $("adminBox").classList.add("hidden"); }
function showAdmin(){ $("loginBox").classList.add("hidden"); $("adminBox").classList.remove("hidden"); $("adminEmail").textContent=auth.currentUser?.email||ADMIN_EMAIL; }
function message(id,text){const el=$(id);if(el)el.textContent=text}

async function loadData(){
 try{
  const [ts,ms]=await Promise.all([get(ref(db,"teams")),get(ref(db,"matches"))]);
  teams=ts.exists()?ts.val():{};
  matches=ms.exists()?ms.val():{};
  if(!Object.keys(teams).length){teams=structuredClone(defaultTeams);await set(ref(db,"teams"),teams)}
  // Jangan mengganti hasil yang sudah ada; hanya buat pertandingan yang belum ada.
  const generated=buildMatches(matches);
  let changed=false;
  for(const id of Object.keys(generated))if(!matches[id]){matches[id]=generated[id];changed=true}
  if(changed)await update(ref(db,"matches"),matches);
  renderAll();
 }catch(e){console.error(e);alert("Gagal membaca data Firebase: "+e.message)}
}

function renderAll(){renderTeams16();renderGroups();renderMatches()}

function renderTeams16(){
 const list=masterTeamList();
 $("teams16Admin").innerHTML=list.map((t,i)=>`<tr><td>${i+1}</td><td><input id="team16_${t.id}" value="${esc(t.name)}" placeholder="Nama Tim ${i+1}"></td></tr>`).join("");
}

function renderGroups(){
 const options=masterTeamList();
 $("groupsAdmin").innerHTML=GROUPS.map(g=>{
  const members=groupMembers(g);
  return `<div class="group"><h3>Grup ${g}</h3><div class="tablewrap"><table><thead><tr><th>No</th><th class="name">Nama Tim</th><th>Main</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th></tr></thead><tbody>${Array.from({length:4},(_,i)=>{
   const id=members[i]||"";const t=id?(teams[id]||defaultTeams[id]):{};const val=k=>Number.isFinite(+t[k])?+t[k]:0;
   return `<tr><td>${i+1}</td><td class="name"><select id="gteam_${g}_${i}"><option value="">-- Pilih dari 16 Tim --</option>${options.map(o=>`<option value="${o.id}" ${o.id===id?"selected":""}>${esc(o.name)}</option>`).join("")}</select></td><td><input id="gm_${g}_${i}" type="number" min="0" value="${val("main")}"></td><td><input id="gw_${g}_${i}" type="number" min="0" value="${val("win")}"></td><td><input id="gdr_${g}_${i}" type="number" min="0" value="${val("draw")}"></td><td><input id="gl_${g}_${i}" type="number" min="0" value="${val("loss")}"></td><td><input id="gf_${g}_${i}" type="number" min="0" value="${val("gf")}"></td><td><input id="ga_${g}_${i}" type="number" min="0" value="${val("ga")}"></td><td><input id="gg_${g}_${i}" type="number" value="${val("gd")}"></td><td><input id="gp_${g}_${i}" type="number" min="0" value="${val("points")}"></td></tr>`;
  }).join("")}</tbody></table></div></div>`;
 }).join("");
}

function renderMatches(){
 const list=Object.values(matches).filter(m=>m.phase==="group").sort((a,b)=>a.round-b.round||a.id.localeCompare(b.id,undefined,{numeric:true}));
 const name=id=>id&&teams[id]?.name?teams[id].name:"-";
 $("adminMatches").innerHTML=list.map((m,i)=>`<div class="match"><div><b>${i+1}</b></div><div><b>Putaran ${m.round}</b><small>Grup ${esc(m.group)}</small></div><div><b>${esc(name(m.home))}</b><small>${esc(m.home||"-")}</small></div><div>VS</div><div><b>${esc(name(m.away))}</b><small>${esc(m.away||"-")}</small></div><input id="h${m.id}" type="number" min="0" placeholder="Skor" value="${m.homeScore??""}"><input id="a${m.id}" type="number" min="0" placeholder="Skor" value="${m.awayScore??""}"><input id="d${m.id}" type="date" value="${esc(m.date||"")}"><input id="tm${m.id}" type="time" value="${esc(m.time||"")}"><select id="s${m.id}"><option value="scheduled" ${m.status!=="finished"?"selected":""}>Terjadwal</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select><button type="button" data-match="${m.id}">Simpan</button></div>`).join("");
 document.querySelectorAll("[data-match]").forEach(b=>b.addEventListener("click",()=>saveMatch(b.dataset.match)));
}

async function saveTeams16(){
 try{
  const updates={};
  for(let i=1;i<=16;i++){
   const id=`T${i}`,old=teams[id]||defaultTeams[id];
   updates[id]={...old,id,name:$("team16_"+id).value.trim()||`Tim ${i}`};
  }
  await update(ref(db,"teams"),updates);teams={...teams,...updates};
  renderGroups();renderMatches();message("teams16Msg","16 tim berhasil disimpan. Grup tetap mengacu ke ID 16 tim tersebut.");
 }catch(e){console.error(e);alert("Gagal menyimpan 16 tim: "+e.message)}
}

async function saveGroups(){
 try{
  const chosen=new Set(),updates={};
  for(const g of GROUPS){
   for(let i=0;i<4;i++){
    const id=$("gteam_"+g+"_"+i).value;
    if(!id)throw new Error(`Grup ${g} baris ${i+1} belum memilih tim dari 16 Tim.`);
    if(chosen.has(id))throw new Error(`${teams[id]?.name||id} dipilih lebih dari satu kali. Satu tim hanya boleh berada di satu grup.`);
    chosen.add(id);
    const old=teams[id]||defaultTeams[id];
    updates[id]={...old,id,group:g,main:+$("gm_"+g+"_"+i).value||0,win:+$("gw_"+g+"_"+i).value||0,draw:+$("gdr_"+g+"_"+i).value||0,loss:+$("gl_"+g+"_"+i).value||0,gf:+$("gf_"+g+"_"+i).value||0,ga:+$("ga_"+g+"_"+i).value||0,gd:+$("gg_"+g+"_"+i).value||0,points:+$("gp_"+g+"_"+i).value||0};
   }
  }
  // Semua 16 harus terpakai tepat sekali.
  if(chosen.size!==16)throw new Error("Semua 16 tim harus masuk Grup A, B, C, atau D tepat satu kali.");
  await update(ref(db,"teams"),updates);teams={...teams,...updates};
  matches=buildMatches(matches);await update(ref(db,"matches"),matches);
  renderGroups();renderMatches();message("groupsMsg","Grup tersimpan. Jadwal otomatis mengikuti 16 Tim yang sekarang berada di Grup A–D.");
 }catch(e){console.error(e);alert("Gagal menyimpan grup: "+e.message)}
}

async function calcStandings(){
 try{
  const stats={};masterTeamList().forEach(t=>stats[t.id]={main:0,win:0,draw:0,loss:0,gf:0,ga:0,gd:0,points:0});
  Object.values(matches).filter(m=>m.phase==="group"&&m.status==="finished"&&m.home&&m.away&&m.homeScore!==null&&m.awayScore!==null).forEach(m=>{const h=stats[m.home],a=stats[m.away];if(!h||!a)return;const hs=+m.homeScore,as=+m.awayScore;h.main++;a.main++;h.gf+=hs;h.ga+=as;a.gf+=as;a.ga+=hs;if(hs>as){h.win++;a.loss++;h.points+=3}else if(hs<as){a.win++;h.loss++;a.points+=3}else{h.draw++;a.draw++;h.points++;a.points++}h.gd=h.gf-h.ga;a.gd=a.gf-a.ga});
  const updates={};for(const t of masterTeamList())updates[t.id]={...t,...stats[t.id]};
  await update(ref(db,"teams"),updates);teams=updates;renderGroups();message("groupsMsg","Klasemen berhasil dihitung dari hasil pertandingan.");
 }catch(e){console.error(e);alert("Gagal menghitung klasemen: "+e.message)}
}

async function saveMatch(id){
 try{const old=matches[id]||{};const hs=$("h"+id).value,as=$("a"+id).value;const saved={...old,homeScore:hs===""?null:+hs,awayScore:as===""?null:+as,status:$("s"+id).value,date:$("d"+id).value,time:$("tm"+id).value};await set(ref(db,"matches/"+id),saved);matches[id]=saved;message("matchesMsg",`Pertandingan ${id} tersimpan.`)}catch(e){console.error(e);alert("Gagal menyimpan pertandingan: "+e.message)}
}

$("loginBtn").addEventListener("click",async()=>{const email=$("username").value.trim(),pass=$("password").value;message("loginMsg","Memproses login...");if(!email||!pass){message("loginMsg","Isi email dan password.");return}try{const c=await signInWithEmailAndPassword(auth,email,pass);if(c.user.email!==ADMIN_EMAIL){await signOut(auth);message("loginMsg","Akun ini bukan akun admin.")}}catch(e){message("loginMsg","Login gagal: "+(e.code||e.message))}});
$("logout").addEventListener("click",()=>signOut(auth));
$("saveTeams16").addEventListener("click",saveTeams16);
$("saveGroups").addEventListener("click",saveGroups);
$("calcStandings").addEventListener("click",calcStandings);
onAuthStateChanged(auth,async user=>{if(user&&user.email===ADMIN_EMAIL){showAdmin();await loadData()}else showLogin()});
