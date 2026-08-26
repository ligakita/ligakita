import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,set,update}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{firebaseConfig}from"./firebase-config.js";

const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ADMIN_EMAIL="dendi170898@gmail.com";
const GROUPS=["A","B","C","D"];
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let teams={},matches={};

const defaultTeams={};
for(let i=1;i<=16;i++)defaultTeams["T"+i]={id:"T"+i,name:"Tim "+i,group:String.fromCharCode(65+Math.floor((i-1)/4)),main:0,win:0,draw:0,loss:0,gf:0,ga:0,gd:0,points:0};

const schedule=[
 [1,"A","2026-09-06","16:00",1,2],[1,"A","2026-09-12","13:30",3,4],[1,"B","2026-09-12","16:00",1,2],[1,"B","2026-09-13","08:00",3,4],[1,"C","2026-09-13","10:30",1,2],[1,"C","2026-09-13","13:30",3,4],[1,"D","2026-09-13","16:00",1,2],[1,"D","2026-09-19","13:30",3,4],
 [2,"A","2026-09-19","16:00",1,3],[2,"A","2026-09-20","08:00",2,4],[2,"B","2026-09-20","10:30",1,3],[2,"B","2026-09-20","13:30",2,4],[2,"C","2026-09-20","16:00",1,3],[2,"C","2026-09-26","13:30",2,4],[2,"D","2026-09-26","16:00",1,3],[2,"D","2026-09-27","08:00",2,4],
 [3,"A","2026-09-27","10:30",1,4],[3,"A","2026-09-27","13:30",2,3],[3,"B","2026-09-27","16:00",1,4],[3,"B","2026-10-03","13:30",2,3],[3,"C","2026-10-03","16:00",1,4],[3,"C","2026-10-04","08:00",2,3],[3,"D","2026-10-04","10:30",1,4],[3,"D","2026-10-04","13:30",2,3]
];

function teamId(g,pos){const arr=Object.values(teams).filter(t=>t.group===g).sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));return arr[pos-1]?.id||`T${(GROUPS.indexOf(g)*4)+pos}`}
function makeDefaultMatches(){const out={};schedule.forEach((r,i)=>{const [round,g,date,time,hp,ap]=r;const id="M"+(i+1);out[id]={id,phase:"group",round,group:g,home:teamId(g,hp),away:teamId(g,ap),homeScore:null,awayScore:null,status:"scheduled",date,time,location:""}});return out}

function hide(){$("loginBox").classList.remove("hidden");$("adminBox").classList.add("hidden")}
function show(){$("loginBox").classList.add("hidden");$("adminBox").classList.remove("hidden");$("adminEmail").textContent=auth.currentUser?.email||ADMIN_EMAIL}

async function loadData(){
 try{
  const [ts,ms]=await Promise.all([get(ref(db,"teams")),get(ref(db,"matches"))]);
  teams=ts.exists()?ts.val():{};matches=ms.exists()?ms.val():{};
  if(!Object.keys(teams).length){await set(ref(db,"teams"),defaultTeams);teams=structuredClone(defaultTeams)}
  if(!Object.keys(matches).length){const dm=makeDefaultMatches();await set(ref(db,"matches"),dm);matches=dm}
  render();
 }catch(e){console.error(e);alert("Gagal membaca data Firebase: "+e.message)}
}

onAuthStateChanged(auth,async user=>{if(user&&user.email===ADMIN_EMAIL){show();await loadData()}else hide()});
$("loginBtn").onclick=async()=>{const email=$("username").value.trim(),pass=$("password").value;$("loginMsg").textContent="Memproses login...";if(!email||!pass){$("loginMsg").textContent="Isi email dan password.";return}try{const c=await signInWithEmailAndPassword(auth,email,pass);if(c.user.email!==ADMIN_EMAIL){await signOut(auth);$("loginMsg").textContent="Akun ini bukan akun admin."}}catch(e){$("loginMsg").textContent="Login gagal: "+(e.code||e.message)}};
$("logout").onclick=()=>signOut(auth);

function render(){renderTeams16();renderGroups();renderMatches()}

function renderTeams16(){
 const list=Array.from({length:16},(_,i)=>teams["T"+(i+1)]||defaultTeams["T"+(i+1)]);
 $("teams16Admin").innerHTML=list.map((t,i)=>`<tr><td>${i+1}</td><td><input id="team16_${t.id}" value="${esc(t.name)}" placeholder="Nama Tim ${i+1}"></td></tr>`).join("");
}

function renderGroups(){
 const list=Object.values(teams).length?Object.values(teams):Object.values(defaultTeams);
 const options=list.sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
 $("groupsAdmin").innerHTML=GROUPS.map(g=>{
  const members=options.filter(t=>t.group===g).slice(0,4);
  while(members.length<4)members.push({id:"",name:"",group:g,main:0,win:0,draw:0,loss:0,gf:0,ga:0,gd:0,points:0});
  return `<div class="group"><h3>Grup ${g}</h3><div class="tablewrap"><table><thead><tr><th>No</th><th class="name">Nama Tim</th><th>Main</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th></tr></thead><tbody>${members.map((t,i)=>{
    const tid=t.id||`slot_${g}_${i}`;
    const stat=(k,d=0)=>Number.isFinite(+t[k])?+t[k]:d;
    return `<tr><td>${i+1}</td><td class="name"><select id="gteam_${g}_${i}">${options.map(o=>`<option value="${esc(o.id)}" ${o.id===t.id?"selected":""}>${esc(o.name)}</option>`).join("")}</select></td><td><input id="gm_${g}_${i}" type="number" min="0" value="${stat("main")}"></td><td><input id="gw_${g}_${i}" type="number" min="0" value="${stat("win")}"></td><td><input id="gd_${g}_${i}" type="number" min="0" value="${stat("draw")}"></td><td><input id="gl_${g}_${i}" type="number" min="0" value="${stat("loss")}"></td><td><input id="gf_${g}_${i}" type="number" min="0" value="${stat("gf")}"></td><td><input id="ga_${g}_${i}" type="number" min="0" value="${stat("ga")}"></td><td><input id="gg_${g}_${i}" type="number" value="${stat("gd")}"></td><td><input id="gp_${g}_${i}" type="number" min="0" value="${stat("points")}"></td></tr>`
  }).join("")}</tbody></table></div></div>`;
 }).join("");
}

function renderMatches(){
 const ms=Object.values(matches).filter(m=>m.phase==="group").sort((a,b)=>(a.round-b.round)||(a.id.localeCompare(b.id,undefined,{numeric:true})));
 const name=id=>teams[id]?.name||id;
 $("adminMatches").innerHTML=ms.map((m,i)=>`<div class="match" style="grid-template-columns:55px 70px minmax(180px,1fr) 40px minmax(180px,1fr) 95px 95px 100px 150px 90px;min-width:1150px"><div><b>${i+1}</b></div><div><b>Putaran ${m.round}</b><small>Grup ${esc(m.group)}</small></div><div><b>${esc(name(m.home))}</b><small>${esc(m.home)}</small></div><div>VS</div><div><b>${esc(name(m.away))}</b><small>${esc(m.away)}</small></div><input id="h${m.id}" type="number" min="0" placeholder="Skor" value="${m.homeScore??""}"><input id="a${m.id}" type="number" min="0" placeholder="Skor" value="${m.awayScore??""}"><input id="d${m.id}" type="date" value="${esc(m.date||"")}"><input id="tm${m.id}" type="time" value="${esc(m.time||"")}"><select id="s${m.id}"><option value="scheduled" ${m.status==="scheduled"?"selected":""}>Terjadwal</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select><button type="button" onclick="saveMatch('${m.id}')">Simpan</button></div>`).join("");
}

$("saveTeams16").onclick=async()=>{
 const button=$("saveTeams16");button.disabled=true;try{
  const changes={};for(let i=1;i<=16;i++){const id="T"+i;const old=teams[id]||defaultTeams[id];const name=$("team16_"+id)?.value.trim()||`Tim ${i}`;changes[id]={...old,id,name,group:old.group||String.fromCharCode(65+Math.floor((i-1)/4))}}
  await update(ref(db,"teams"),changes);teams={...teams,...changes};renderGroups();renderMatches();$("teams16Msg").textContent="16 nama tim berhasil disimpan.";
 }catch(e){console.error(e);alert("Gagal menyimpan 16 tim: "+e.message)}finally{button.disabled=false}
};

$("saveGroups").onclick=async()=>{
 try{
  const selected=[];const updates={};
  for(const g of GROUPS)for(let i=0;i<4;i++){
   const id=$("gteam_${g}_${i}").value;if(!id)throw new Error(`Grup ${g} baris ${i+1} belum memilih tim.`);if(selected.includes(id))throw new Error(`Tim ${teams[id]?.name||id} dipilih lebih dari satu kali.`);selected.push(id);
   const old=teams[id]||defaultTeams[id];const v={...old,id,group:g,name:old.name,main:+$("gm_${g}_${i}").value||0,win:+$("gw_${g}_${i}").value||0,draw:+$("gd_${g}_${i}").value||0,loss:+$("gl_${g}_${i}").value||0,gf:+$("gf_${g}_${i}").value||0,ga:+$("ga_${g}_${i}").value||0,gd:+$("gg_${g}_${i}").value||0,points:+$("gp_${g}_${i}").value||0};updates[id]=v;
  }
  await update(ref(db,"teams"),updates);teams={...teams,...updates};
  const mm=makeDefaultMatches();for(const id of Object.keys(mm)){const old=matches[id]||{};mm[id]={...mm[id],...old,home:teamId(mm[id].group, schedule[Number(id.slice(1))-1][4]),away:teamId(mm[id].group,schedule[Number(id.slice(1))-1][5])};}
  await update(ref(db,"matches"),mm);matches={...matches,...mm};
  renderGroups();renderMatches();$("groupsMsg").textContent="Grup tersimpan. Jadwal otomatis mengikuti nama tim di Grup A–D.";
 }catch(e){console.error(e);alert("Gagal menyimpan grup: "+e.message)}
};

$("calcStandings").onclick=async()=>{
 try{
  const stats={};Object.keys(teams).forEach(id=>stats[id]={main:0,win:0,draw:0,loss:0,gf:0,ga:0,gd:0,points:0});
  Object.values(matches).filter(m=>m.phase==="group"&&m.status==="finished"&&m.homeScore!==null&&m.awayScore!==null).forEach(m=>{const h=stats[m.home],a=stats[m.away];if(!h||!a)return;const hs=+m.homeScore,as=+m.awayScore;h.main++;a.main++;h.gf+=hs;h.ga+=as;a.gf+=as;a.ga+=hs;if(hs>as){h.win++;h.points+=3;a.loss++}else if(hs<as){a.win++;a.points+=3;h.loss++}else{h.draw++;a.draw++;h.points++;a.points++}});
  await Promise.all(Object.entries(stats).map(([id,s])=>update(ref(db,"teams/"+id),s)));teams=Object.fromEntries(Object.entries(teams).map(([id,t])=>[id,{...t,...stats[id]}]));renderGroups();$("groupsMsg").textContent="Klasemen dihitung dari hasil pertandingan dan tersimpan.";
 }catch(e){alert("Gagal menghitung klasemen: "+e.message)}
};

window.saveMatch=async id=>{try{const m=matches[id];const hs=$("h"+id).value,as=$("a"+id).value;const saved={...m,homeScore:hs===""?null:+hs,awayScore:as===""?null:+as,status:$("s"+id).value,date:$("d"+id).value,time:$("tm"+id).value};await set(ref(db,"matches/"+id),saved);matches[id]=saved;$("matchesMsg").textContent=`Pertandingan ${id} tersimpan.`}catch(e){alert("Gagal menyimpan pertandingan: "+e.message)}};
