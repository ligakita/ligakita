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
let groups={A:[],B:[],C:[],D:[]};
let matches={};

function defaultTeam(i){return{id:`T${i}`,name:`Tim ${i}`,group:"",main:0,win:0,draw:0,loss:0,gf:0,ga:0,gd:0,points:0}}
function ensure16(raw){
 const out={};
 for(let i=1;i<=16;i++){
  const id=`T${i}`,x=raw?.[id]||{};
  out[id]={...defaultTeam(i),...x,id,name:String(x.name||`Tim ${i}`)};
 }
 return out;
}
function defaultGroups(){return{A:["T1","T2","T3","T4"],B:["T5","T6","T7","T8"],C:["T9","T10","T11","T12"],D:["T13","T14","T15","T16"]}}
function normalizeGroups(raw){
 const base=defaultGroups();
 let out={A:[],B:[],C:[],D:[]};
 for(const g of GROUPS){
  const v=Array.isArray(raw?.[g])?raw[g]:[];
  out[g]=v.filter(id=>/^T([1-9]|1[0-6])$/.test(id)).slice(0,4);
 }
 const used=new Set(Object.values(out).flat());
 // If there are no valid saved groups, start with T1-T4 / T5-T8 / T9-T12 / T13-T16.
 if(used.size===0)return base;
 // Fill missing slots from the 16 master teams in order, without duplicating.
 const remaining=Array.from({length:16},(_,i)=>`T${i+1}`).filter(id=>!used.has(id));
 for(const g of GROUPS)while(out[g].length<4)out[g].push(remaining.shift());
 return out;
}
function syncTeamGroupFlags(){
 for(const id of Object.keys(teams))teams[id].group="";
 for(const g of GROUPS)for(const id of groups[g]||[])if(teams[id])teams[id].group=g;
}

// 3 putaran dalam setiap grup: 1-2/3-4, lalu 1-3/2-4, lalu 1-4/2-3.
const pairings={1:[[0,1],[2,3]],2:[[0,2],[1,3]],3:[[0,3],[1,2]]};
const dates=[
 ["2026-09-06","16:00"],["2026-09-12","13:30"],["2026-09-12","16:00"],["2026-09-13","08:00"],["2026-09-13","10:30"],["2026-09-13","13:30"],["2026-09-13","16:00"],["2026-09-19","13:30"],
 ["2026-09-19","16:00"],["2026-09-20","08:00"],["2026-09-20","10:30"],["2026-09-20","13:30"],["2026-09-20","16:00"],["2026-09-26","13:30"],["2026-09-26","16:00"],["2026-09-27","08:00"],
 ["2026-09-27","10:30"],["2026-09-27","13:30"],["2026-09-27","16:00"],["2026-10-03","13:30"],["2026-10-03","16:00"],["2026-10-04","08:00"],["2026-10-04","10:30"],["2026-10-04","13:30"]
];
function buildMatches(existing={}){
 const out={};let n=1;
 for(let round=1;round<=3;round++)for(const g of GROUPS){
  const members=groups[g]||[];
  for(const [a,b] of pairings[round]){
   const id=`M${n}`,old=existing[id]||{},[date,time]=dates[n-1]||["",""];
   out[id]={id,phase:"group",round,group:g,home:members[a]||"",away:members[b]||"",homeScore:old.homeScore??null,awayScore:old.awayScore??null,status:old.status||"scheduled",date:old.date||date,time:old.time||time,location:old.location||""};
   n++;
  }
 }
 return out;
}
function showLogin(){ $("loginBox").classList.remove("hidden");$("adminBox").classList.add("hidden"); }
function showAdmin(){ $("loginBox").classList.add("hidden");$("adminBox").classList.remove("hidden");$("adminEmail").textContent=auth.currentUser?.email||ADMIN_EMAIL; }
function message(id,text){const el=$(id);if(el)el.textContent=text}

async function loadData(){
 try{
  const [ts,gs,ms]=await Promise.all([get(ref(db,"teams")),get(ref(db,"groups")),get(ref(db,"matches"))]);
  teams=ensure16(ts.exists()?ts.val():{});
  groups=normalizeGroups(gs.exists()?gs.val():null);
  syncTeamGroupFlags();
  matches=ms.exists()?ms.val():{};
  // Pastikan master 16 tim dan pembagian grup dasar tersimpan.
  await set(ref(db,"teams"),teams);
  await set(ref(db,"groups"),groups);
  const generated=buildMatches(matches);
  matches={...matches,...generated};
  await update(ref(db,"matches"),generated);
  renderAll();
 }catch(e){console.error(e);alert("Gagal membaca data Firebase: "+e.message)}
}
function renderAll(){renderTeams16();renderGroups();renderMatches()}

function renderTeams16(){
 const list=Array.from({length:16},(_,i)=>teams[`T${i+1}`]);
 $("teams16Admin").innerHTML=list.map((t,i)=>`<tr><td>${i+1}</td><td><input id="team16_T${i+1}" value="${esc(t.name)}" placeholder="Nama Tim ${i+1}"></td></tr>`).join("");
}
function renderGroups(){
 const options=Array.from({length:16},(_,i)=>teams[`T${i+1}`]);
 $("groupsAdmin").innerHTML=GROUPS.map(g=>`<div class="group"><h3>Grup ${g}</h3><div class="tablewrap"><table><thead><tr><th>No</th><th class="name">Nama Tim</th><th>Main</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th></tr></thead><tbody>${Array.from({length:4},(_,i)=>{
   const id=(groups[g]||[])[i]||`T${GROUPS.indexOf(g)*4+i+1}`;
   const t=teams[id]||defaultTeam(Number(id.slice(1)));
   const val=k=>Number.isFinite(+t[k])?+t[k]:0;
   return `<tr><td>${i+1}</td><td class="name"><select id="gteam_${g}_${i}">${options.map(o=>`<option value="${o.id}" ${o.id===id?"selected":""}>${esc(o.name)}</option>`).join("")}</select></td><td><input id="gm_${g}_${i}" type="number" min="0" value="${val("main")}"></td><td><input id="gw_${g}_${i}" type="number" min="0" value="${val("win")}"></td><td><input id="gdr_${g}_${i}" type="number" min="0" value="${val("draw")}"></td><td><input id="gl_${g}_${i}" type="number" min="0" value="${val("loss")}"></td><td><input id="gf_${g}_${i}" type="number" min="0" value="${val("gf")}"></td><td><input id="ga_${g}_${i}" type="number" min="0" value="${val("ga")}"></td><td><input id="gg_${g}_${i}" type="number" value="${val("gd")}"></td><td><input id="gp_${g}_${i}" type="number" min="0" value="${val("points")}"></td></tr>`;
  }).join("")}</tbody></table></div></div>`).join("");
}
function renderMatches(){
 const list=Object.values(matches).filter(m=>m.phase==="group").sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
 const name=id=>id&&teams[id]?.name?teams[id].name:"-";
 $("adminMatches").innerHTML=list.map((m,i)=>`<div class="match"><div><b>${i+1}</b><small>Putaran ${m.round}</small></div><div><b>Grup ${esc(m.group)}</b></div><div><b>${esc(name(m.home))}</b><small>${esc(m.home||"-")}</small></div><div>VS</div><div><b>${esc(name(m.away))}</b><small>${esc(m.away||"-")}</small></div><input id="h${m.id}" type="number" min="0" placeholder="Skor" value="${m.homeScore??""}"><input id="a${m.id}" type="number" min="0" placeholder="Skor" value="${m.awayScore??""}"><input id="d${m.id}" type="date" value="${esc(m.date||"")}"><input id="tm${m.id}" type="time" value="${esc(m.time||"")}"><select id="s${m.id}"><option value="scheduled" ${m.status!=="finished"?"selected":""}>Terjadwal</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select><button type="button" data-match="${m.id}">Simpan</button></div>`).join("");
 document.querySelectorAll("[data-match]").forEach(b=>b.addEventListener("click",()=>saveMatch(b.dataset.match)));
}

async function saveTeams16(){
 try{
  const updates={};
  for(let i=1;i<=16;i++){const id=`T${i}`,old=teams[id]||defaultTeam(i);updates[id]={...old,id,name:$("team16_"+id).value.trim()||`Tim ${i}`};}
  await update(ref(db,"teams"),updates);teams={...teams,...updates};
  renderTeams16();renderGroups();renderMatches();message("teams16Msg","✅ 16 tim berhasil disimpan. Grup tetap mengacu ke Tim 1–16.");
 }catch(e){console.error(e);alert("Gagal menyimpan 16 tim: "+e.message)}
}

async function saveGroups(){
 try{
  const selected={A:[],B:[],C:[],D:[]},chosen=new Set(),teamUpdates={};
  for(const g of GROUPS){
   for(let i=0;i<4;i++){
    const id=$("gteam_"+g+"_"+i).value;
    if(!id)throw new Error(`Grup ${g} baris ${i+1} belum memilih tim.`);
    if(chosen.has(id))throw new Error(`${teams[id]?.name||id} dipilih lebih dari satu kali.`);
    chosen.add(id);selected[g].push(id);
    const old=teams[id]||defaultTeam(Number(id.slice(1)));
    teamUpdates[id]={...old,group:g,main:+$("gm_"+g+"_"+i).value||0,win:+$("gw_"+g+"_"+i).value||0,draw:+$("gdr_"+g+"_"+i).value||0,loss:+$("gl_"+g+"_"+i).value||0,gf:+$("gf_"+g+"_"+i).value||0,ga:+$("ga_"+g+"_"+i).value||0,gd:+$("gg_"+g+"_"+i).value||0,points:+$("gp_"+g+"_"+i).value||0};
   }
  }
  if(chosen.size!==16)throw new Error("Semua 16 tim harus masuk grup tepat satu kali.");
  // Tim yang tidak terpilih tidak boleh menyimpan grup lama.
  for(let i=1;i<=16;i++){const id=`T${i}`;if(!chosen.has(id))teamUpdates[id]={...(teams[id]||defaultTeam(i)),group:""};}
  await update(ref(db,"teams"),teamUpdates);
  await set(ref(db,"groups"),selected);
  teams={...teams,...teamUpdates};groups=selected;syncTeamGroupFlags();
  const regenerated=buildMatches(matches);matches={...matches,...regenerated};await update(ref(db,"matches"),regenerated);
  renderGroups();renderMatches();message("groupsMsg","✅ Grup berhasil disimpan. Jadwal otomatis mengikuti Tim 1–16 yang dipilih di Grup.");
 }catch(e){console.error(e);alert("Gagal menyimpan grup: "+e.message)}
}

async function calcStandings(){
 try{
  const stats={};for(let i=1;i<=16;i++)stats[`T${i}`]={main:0,win:0,draw:0,loss:0,gf:0,ga:0,gd:0,points:0};
  Object.values(matches).filter(m=>m.phase==="group"&&m.status==="finished"&&m.home&&m.away&&m.homeScore!==null&&m.awayScore!==null).forEach(m=>{const h=stats[m.home],a=stats[m.away];if(!h||!a)return;const hs=+m.homeScore,as=+m.awayScore;h.main++;a.main++;h.gf+=hs;h.ga+=as;a.gf+=as;a.ga+=hs;if(hs>as){h.win++;a.loss++;h.points+=3}else if(hs<as){a.win++;h.loss++;a.points+=3}else{h.draw++;a.draw++;h.points++;a.points++}h.gd=h.gf-h.ga;a.gd=a.gf-a.ga});
  const updates={};for(let i=1;i<=16;i++){const id=`T${i}`;updates[id]={...(teams[id]||defaultTeam(i)),...stats[id]};}await update(ref(db,"teams"),updates);teams={...teams,...updates};renderGroups();message("groupsMsg","✅ Klasemen berhasil dihitung dari hasil pertandingan.");
 }catch(e){console.error(e);alert("Gagal menghitung klasemen: "+e.message)}
}
async function saveMatch(id){
 try{const old=matches[id]||{},hs=$("h"+id).value,as=$("a"+id).value,saved={...old,homeScore:hs===""?null:+hs,awayScore:as===""?null:+as,status:$("s"+id).value,date:$("d"+id).value,time:$("tm"+id).value};await set(ref(db,"matches/"+id),saved);matches[id]=saved;message("matchesMsg",`✅ Pertandingan ${id} tersimpan.`);}catch(e){console.error(e);alert("Gagal menyimpan pertandingan: "+e.message)}
}

$("loginBtn").addEventListener("click",async()=>{const email=$("username").value.trim(),pass=$("password").value;message("loginMsg","Memproses login...");if(!email||!pass){message("loginMsg","Isi email dan password.");return}try{const c=await signInWithEmailAndPassword(auth,email,pass);if(c.user.email!==ADMIN_EMAIL){await signOut(auth);message("loginMsg","Akun ini bukan akun admin.")}}catch(e){message("loginMsg","Login gagal: "+(e.code||e.message))}});
$("logout").addEventListener("click",()=>signOut(auth));
$("saveTeams16").addEventListener("click",saveTeams16);
$("saveGroups").addEventListener("click",saveGroups);
$("calcStandings").addEventListener("click",calcStandings);
onAuthStateChanged(auth,async user=>{if(user&&user.email===ADMIN_EMAIL){showAdmin();await loadData()}else showLogin()});
