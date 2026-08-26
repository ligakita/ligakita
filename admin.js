import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,set,update,remove}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{firebaseConfig}from"./firebase-config.js";

const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ADMIN_EMAIL="dendi170898@gmail.com";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

// 16 slot tetap. Grup mengikuti susunan Excel: 4 tim per grup.
const defaultTeams={};
for(let i=1;i<=16;i++)defaultTeams["T"+i]={id:"T"+i,name:"Tim "+i,group:String.fromCharCode(65+Math.floor((i-1)/4))};

// Jadwal persis mengikuti file Excel JADWAL LIGA KITA VOL 1.
const schedule=[
 [1,1,"A","Minggu","2026-09-06","16:00",1,2],
 [2,1,"A","Sabtu","2026-09-12","13:30",3,4],
 [3,1,"B","Sabtu","2026-09-12","16:00",5,6],
 [4,1,"B","Minggu","2026-09-13","08:00",7,8],
 [5,1,"C","Minggu","2026-09-13","10:30",9,10],
 [6,1,"C","Minggu","2026-09-13","13:30",11,12],
 [7,1,"D","Minggu","2026-09-13","16:00",13,14],
 [8,1,"D","Sabtu","2026-09-19","13:30",15,16],
 [9,2,"A","Sabtu","2026-09-19","16:00",3,1],
 [10,2,"A","Minggu","2026-09-20","08:00",2,4],
 [11,2,"B","Minggu","2026-09-20","10:30",5,7],
 [12,2,"B","Minggu","2026-09-20","13:30",6,8],
 [13,2,"C","Minggu","2026-09-20","16:00",9,11],
 [14,2,"C","Sabtu","2026-09-26","13:30",10,12],
 [15,2,"D","Sabtu","2026-09-26","16:00",13,15],
 [16,2,"D","Minggu","2026-09-27","08:00",14,16],
 [17,3,"A","Minggu","2026-09-27","10:30",1,4],
 [18,3,"A","Minggu","2026-09-27","13:30",2,3],
 [19,3,"B","Minggu","2026-09-27","16:00",5,8],
 [20,3,"B","Sabtu","2026-10-03","13:30",6,7],
 [21,3,"C","Sabtu","2026-10-03","16:00",9,12],
 [22,3,"C","Minggu","2026-10-04","08:00",10,11],
 [23,3,"D","Minggu","2026-10-04","10:30",13,16],
 [24,3,"D","Minggu","2026-10-04","13:30",14,15]
];

const defaultMatches={};
for(const row of schedule){const[n,round,group,day,date,time,a,b]=row;defaultMatches["M"+n]={id:"M"+n,phase:"group",round,group,day,date,time,home:"T"+a,away:"T"+b,homeScore:null,awayScore:null,status:"scheduled",location:""};}
Object.assign(defaultMatches,{SF1:{id:"SF1",phase:"semifinal",round:4,home:"A1",away:"B1",homeScore:null,awayScore:null,status:"scheduled",date:"",time:"",location:""},SF2:{id:"SF2",phase:"semifinal",round:4,home:"C1",away:"D1",homeScore:null,awayScore:null,status:"scheduled",date:"",time:"",location:""},F:{id:"F",phase:"final",round:5,home:"SF1W",away:"SF2W",homeScore:null,awayScore:null,status:"scheduled",date:"",time:"",location:""}});

let teams={},matches={},gallery={};
function hide(){$("loginBox").classList.remove("hidden");$("adminBox").classList.add("hidden")}
function show(){$("loginBox").classList.add("hidden");$("adminBox").classList.remove("hidden");$("adminEmail").textContent=auth.currentUser?.email||ADMIN_EMAIL}
function teamName(id){return teams[id]?.name||defaultTeams[id]?.name||id}
function groupSlot(group,pos){return Object.values(teams).filter(t=>t.group===group).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}))[pos]?.id||defaultTeams[({A:[1,2,3,4],B:[5,6,7,8],C:[9,10,11,12],D:[13,14,15,16]}[group]||[])[pos]]?.id}

async function ensureSchedule(){
  const updates={};
  for(const row of schedule){const[n,round,group,day,date,time,a,b]=row;const id="M"+n;const old=matches[id]||{};updates["matches/"+id]={...defaultMatches[id],...old,id,phase:"group",round,group,day,date:old.date||date,time:old.time||time,home:"T"+a,away:"T"+b,status:old.status||"scheduled",homeScore:old.homeScore??null,awayScore:old.awayScore??null,location:old.location||""};}
  updates["matches/SF1"]={...defaultMatches.SF1,...(matches.SF1||{})};updates["matches/SF2"]={...defaultMatches.SF2,...(matches.SF2||{})};updates["matches/F"]={...defaultMatches.F,...(matches.F||{})};
  await update(ref(db),updates);
  matches={...matches};for(const id of Object.keys(defaultMatches))matches[id]={...defaultMatches[id],...(matches[id]||{})};
}

async function loadData(){try{
 const[ts,ms,gs]=await Promise.all([get(ref(db,"teams")),get(ref(db,"matches")),get(ref(db,"gallery"))]);
 teams=ts.exists()?ts.val():{};matches=ms.exists()?ms.val():{};gallery=gs.exists()?gs.val():{};
 if(!Object.keys(teams).length){await update(ref(db,"teams"),defaultTeams);teams={...defaultTeams}}
 await ensureSchedule();render();
}catch(e){console.error(e);alert("Gagal membaca data Firebase: "+e.message)}}

onAuthStateChanged(auth,async user=>{if(user&&user.email===ADMIN_EMAIL){show();await loadData()}else hide()});
$("loginBtn").onclick=async()=>{const email=$("username").value.trim(),pass=$("password").value;$("loginMsg").textContent="Memproses login...";if(!email||!pass){$("loginMsg").textContent="Isi email dan password.";return}try{const cred=await signInWithEmailAndPassword(auth,email,pass);if(cred.user.email!==ADMIN_EMAIL){await signOut(auth);$("loginMsg").textContent="Akun ini bukan akun admin."}}catch(e){console.error(e);$("loginMsg").textContent="Login gagal: "+(e.code||e.message)}};
$("logout").onclick=()=>signOut(auth);

function render(){
 const list=Object.values(defaultTeams).map(t=>({...t,...(teams[t.id]||{})}));
 $("teamsForm").innerHTML=list.map((t,i)=>`<div class="excel-team-row"><span class="team-number">${i+1}</span><input id="t${t.id}" value="${esc(t.name)}"><span class="group-tag">GRUP ${t.group}</span></div>`).join("");
 const ms=schedule.map(r=>matches["M"+r[0]]||defaultMatches["M"+r[0]]);
 $("scheduleBody").innerHTML=ms.map(m=>{const original=schedule.find(r=>r[0]===+m.id.slice(1));return `<tr>
 <td><b>${original[0]}</b></td><td>${original[1]}</td><td><b>${original[2]}</b></td><td>${original[3]}</td>
 <td><input id="d${m.id}" type="date" value="${esc(m.date||original[4])}"></td><td><input id="time${m.id}" type="time" value="${esc(m.time||original[5])}"></td>
 <td class="team-cell">${esc(teamName(m.home))}</td>
 <td><div class="score-input"><input id="h${m.id}" type="number" min="0" value="${m.homeScore??""}"><span>:</span><input id="a${m.id}" type="number" min="0" value="${m.awayScore??""}></div></td>
 <td class="team-cell">${esc(teamName(m.away))}</td>
 <td><select id="s${m.id}"><option value="scheduled" ${m.status==="scheduled"?"selected":""}>Terjadwal</option><option value="live" ${m.status==="live"?"selected":""}>LIVE</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select></td>
 <td><input id="loc${m.id}" type="text" placeholder="Lokasi" value="${esc(m.location||"")}"></td><td><button class="small-save" type="button" onclick="saveMatch('${m.id}')">Simpan</button></td></tr>`}).join("");
 renderKnockout();renderGallery();
}

$("saveTeams").onclick=async()=>{const btn=$("saveTeams");btn.disabled=true;btn.textContent="Menyimpan...";try{const updates={};for(let i=1;i<=16;i++){const id="T"+i;const old=teams[id]||defaultTeams[id];updates["teams/"+id]={id,name:$("t"+id).value.trim()||old.name,group:defaultTeams[id].group}}await update(ref(db),updates);await loadData();alert("Nama 16 tim berhasil disimpan. Jadwal pertandingan otomatis memakai nama terbaru.")}catch(e){alert("Gagal menyimpan nama tim: "+e.message)}finally{btn.disabled=false;btn.textContent="💾 Simpan Nama Tim"}};

window.saveMatch=async id=>{const old=matches[id]||defaultMatches[id];try{const saved={...old,date:$("d"+id).value,time:$("time"+id).value,homeScore:$("h"+id).value===""?null:+$("h"+id).value,awayScore:$("a"+id).value===""?null:+$("a"+id).value,status:$("s"+id).value,location:$("loc"+id).value.trim()};await set(ref(db,"matches/"+id),saved);matches[id]=saved;const b=document.querySelector(`button[onclick="saveMatch('${id}')"]`);if(b){b.textContent="Tersimpan ✓";setTimeout(()=>b.textContent="Simpan",1200)}}catch(e){alert("Gagal menyimpan pertandingan: "+e.message)}};

function renderKnockout(){const labels={SF1:["SEMIFINAL 1","Juara Grup A","Juara Grup B"],SF2:["SEMIFINAL 2","Juara Grup C","Juara Grup D"],F:["FINAL","Pemenang SF1","Pemenang SF2"]};$("knockoutAdmin").innerHTML=Object.entries(labels).map(([id,l])=>{const m=matches[id]||defaultMatches[id];return `<div class="knock-card"><b>${l[0]}</b><span>${l[1]} <strong>VS</strong> ${l[2]}</span><div><input id="kd${id}" type="date" value="${esc(m.date||"")}"><input id="kt${id}" type="time" value="${esc(m.time||"")}"><input id="kh${id}" type="number" min="0" placeholder="Skor 1" value="${m.homeScore??""}"><span>:</span><input id="ka${id}" type="number" min="0" placeholder="Skor 2" value="${m.awayScore??""}"><select id="ks${id}"><option value="scheduled" ${m.status==="scheduled"?"selected":""}>Terjadwal</option><option value="live" ${m.status==="live"?"selected":""}>LIVE</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select><button type="button" onclick="saveKnock('${id}')">Simpan</button></div></div>`}).join("")}
window.saveKnock=async id=>{const old=matches[id]||defaultMatches[id];const saved={...old,date:$("kd"+id).value,time:$("kt"+id).value,homeScore:$("kh"+id).value===""?null:+$("kh"+id).value,awayScore:$("ka"+id).value===""?null:+$("ka"+id).value,status:$("ks"+id).value};await set(ref(db,"matches/"+id),saved);matches[id]=saved;alert("Fase gugur tersimpan.")};

$("uploadPhoto").onclick=async()=>alert("Upload foto belum diaktifkan karena Firebase Storage pada project ini belum tersedia.");
function renderGallery(){if(!$("adminGallery"))return;const arr=Object.entries(gallery).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));$("adminGallery").innerHTML=arr.length?arr.map(([id,x])=>`<figure class="gallery-item admin-gallery-item"><img src="${esc(x.url)}" alt="${esc(x.caption||"Foto")}"><figcaption>${esc(x.caption||"Liga Kita Vol-I")}<button class="danger" onclick="deletePhoto('${esc(id)}')">Hapus</button></figcaption></figure>`).join(""):"<p class='muted'>Belum ada foto.</p>"}
window.deletePhoto=async id=>{if(!confirm("Hapus foto ini?"))return;await remove(ref(db,"gallery/"+id));await loadData()};
