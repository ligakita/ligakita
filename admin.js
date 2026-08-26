import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,set,update,remove}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{firebaseConfig}from"./firebase-config.js";

const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ADMIN_EMAIL="dendi170898@gmail.com";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let teams={},matches={},gallery={};

const defaultNames=["ARCAK PUTRA","TIGER","FIT JUNIOR","SUKAMANAH UNITED","FAMILY","Tim 6","Tim 7","Tim 8","Tim 9","Tim 10","Tim 11","Tim 12","Tim 13","Tim 14","Tim 15","Tim 16"];
const defaultTeams={};
for(let i=1;i<=16;i++)defaultTeams["T"+i]={id:"T"+i,name:defaultNames[i-1],group:String.fromCharCode(65+Math.floor((i-1)/4))};

const excelSchedule=[['M1', 'A', 'T1', 'T2', '2026-09-06', '16:00'], ['M2', 'A', 'T3', 'T4', '2026-09-12', '13:30'], ['M3', 'B', 'T5', 'T6', '2026-09-12', '16:00'], ['M4', 'B', 'T7', 'T8', '2026-09-13', '08:00'], ['M5', 'C', 'T9', 'T10', '2026-09-13', '10:30'], ['M6', 'C', 'T11', 'T12', '2026-09-13', '13:30'], ['M7', 'D', 'T13', 'T14', '2026-09-13', '16:00'], ['M8', 'D', 'T15', 'T16', '2026-09-19', '13:30'], ['M9', 'A', 'T1', 'T3', '2026-09-19', '16:00'], ['M10', 'A', 'T2', 'T4', '2026-09-20', '08:00'], ['M11', 'B', 'T5', 'T7', '2026-09-20', '10:30'], ['M12', 'B', 'T6', 'T8', '2026-09-20', '13:30'], ['M13', 'C', 'T9', 'T11', '2026-09-20', '16:00'], ['M14', 'C', 'T10', 'T12', '2026-09-26', '13:30'], ['M15', 'D', 'T13', 'T15', '2026-09-26', '16:00'], ['M16', 'D', 'T14', 'T16', '2026-09-27', '08:00'], ['M17', 'A', 'T1', 'T4', '2026-09-27', '10:30'], ['M18', 'A', 'T2', 'T3', '2026-09-27', '13:30'], ['M19', 'B', 'T5', 'T8', '2026-09-27', '16:00'], ['M20', 'B', 'T6', 'T7', '2026-10-03', '13:30'], ['M21', 'C', 'T9', 'T12', '2026-10-03', '16:00'], ['M22', 'C', 'T10', 'T11', '2026-10-04', '08:00'], ['M23', 'D', 'T13', 'T16', '2026-10-04', '10:30'], ['M24', 'D', 'T14', 'T15', '2026-10-04', '13:30']];
const defaultMatches={};
excelSchedule.forEach(([id,group,home,away,date,time])=>defaultMatches[id]={id,phase:"group",group,home,away,homeScore:null,awayScore:null,status:"scheduled",date,time,location:""});
Object.assign(defaultMatches,{
 SF1:{id:"SF1",phase:"semifinal",home:"A1",away:"B1",homeScore:null,awayScore:null,status:"scheduled",date:"2026-10-04",time:"16:00",location:""},
 SF2:{id:"SF2",phase:"semifinal",home:"C1",away:"D1",homeScore:null,awayScore:null,status:"scheduled",date:"2026-10-10",time:"13:30",location:""},
 F:{id:"F",phase:"final",home:"SF1W",away:"SF2W",homeScore:null,awayScore:null,status:"scheduled",date:"2026-10-10",time:"16:00",location:""}
});

function hide(){$("loginBox").classList.remove("hidden");$("adminBox").classList.add("hidden")}
function show(){$("loginBox").classList.add("hidden");$("adminBox").classList.remove("hidden");$("adminEmail").textContent=auth.currentUser?.email||ADMIN_EMAIL}

async function loadData(){
 try{
  const [ts,ms,gs]=await Promise.all([get(ref(db,"teams")),get(ref(db,"matches")),get(ref(db,"gallery"))]);
  teams=ts.exists()?ts.val():{};matches=ms.exists()?ms.val():{};gallery=gs.exists()?gs.val():{};
  if(!Object.keys(teams).length){await update(ref(db,"teams"),defaultTeams);teams={...defaultTeams}}
  if(!Object.keys(matches).length){await update(ref(db,"matches"),defaultMatches);matches={...defaultMatches}}
  render();
 }catch(e){console.error(e);alert("Gagal membaca data Firebase: "+e.message)}
}

async function syncExcelSchedule(showMessage=true){
 const updates={};
 for(const [id,group,home,away,date,time] of excelSchedule){
  const old=matches[id]||defaultMatches[id]||{};
  updates["matches/"+id]={...old,id,phase:"group",group,home,away,date,time,status:old.status||"scheduled",homeScore:old.homeScore??null,awayScore:old.awayScore??null,location:old.location||""};
 }
 await update(ref(db),updates);
 for(const [id,group,home,away,date,time] of excelSchedule)matches[id]={...matches[id],id,phase:"group",group,home,away,date,time};
 if(showMessage){$("syncMsg").textContent="Jadwal Excel berhasil diterapkan.";setTimeout(()=>$("syncMsg").textContent="",3000)}
 renderMatches();
}

onAuthStateChanged(auth,async user=>{if(user&&user.email===ADMIN_EMAIL){show();await loadData()}else hide()});

$("loginBtn").onclick=async()=>{
 const email=$("username").value.trim(),pass=$("password").value;$("loginMsg").textContent="Memproses login...";
 if(!email||!pass){$("loginMsg").textContent="Isi email dan password.";return}
 try{const cred=await signInWithEmailAndPassword(auth,email,pass);if(cred.user.email!==ADMIN_EMAIL){await signOut(auth);$("loginMsg").textContent="Akun ini bukan akun admin."}}
 catch(e){$("loginMsg").textContent="Login gagal: "+(e.code||e.message)}
};
$("logout").onclick=()=>signOut(auth);
$("syncSchedule").onclick=async()=>{const b=$("syncSchedule");b.disabled=true;b.textContent="Menerapkan...";try{await syncExcelSchedule(true)}catch(e){alert("Gagal menerapkan jadwal: "+e.message)}finally{b.disabled=false;b.textContent="🔄 Terapkan Jadwal Excel"}};

function render(){
 const list=Object.values(teams).length?Object.values(teams):Object.values(defaultTeams);
 list.sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
 $("groupsForm").innerHTML=["A","B","C","D"].map(g=>`<div class="group-card"><h3>Grup ${g}</h3>${list.filter(t=>t.group===g).map((t,i)=>`<label>Tim ${i+1}<input id="t${esc(t.id)}" value="${esc(t.name)}"></label>`).join("")}</div>`).join("");
 renderMatches();renderKnockout();renderGallery();
}

$("saveGroups").onclick=async()=>{
 const b=$("saveGroups");b.disabled=true;b.textContent="Menyimpan...";
 try{
  const updates={};
  for(const t of Object.values(defaultTeams)){
   const el=$("t"+t.id),old=teams[t.id]||t,name=el?.value.trim()||old.name||t.name;
   updates["teams/"+t.id]={id:t.id,group:t.group,name};
  }
  await update(ref(db),updates);
  teams={...teams};for(const t of Object.values(defaultTeams))teams[t.id]={id:t.id,group:t.group,name:$("t"+t.id).value.trim()||t.name};
  alert("Nama tim tiap grup berhasil disimpan. Jadwal otomatis memakai nama terbaru.");
  render();
 }catch(e){alert("Gagal menyimpan nama grup: "+e.message)}finally{b.disabled=false;b.textContent="💾 Simpan Nama Grup"}
};

function teamName(id){
 const t=teams[id];if(t)return t.name;
 return {A1:"Juara Grup A",B1:"Juara Grup B",C1:"Juara Grup C",D1:"Juara Grup D",SF1W:"Pemenang SF1",SF2W:"Pemenang SF2"}[id]||id;
}

function renderMatches(){
 const ms=excelSchedule.map(([id])=>matches[id]||defaultMatches[id]);
 $("adminMatches").innerHTML=ms.map((m,i)=>`<div class="adminmatch">
 <div><b>${i+1}. ${esc(m.id)} • Grup ${esc(m.group)}</b><small>${esc(formatSchedule(m.date,m.time))}</small></div>
 <div><b>${esc(teamName(m.home))}</b><br><span class="muted">VS</span><br><b>${esc(teamName(m.away))}</b></div>
 <span class="score">${m.homeScore??"-"} : ${m.awayScore??"-"}</span>
 <select id="s${esc(m.id)}"><option value="scheduled" ${m.status==="scheduled"?"selected":""}>Terjadwal</option><option value="live" ${m.status==="live"?"selected":""}>LIVE</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select>
 <input id="h${esc(m.id)}" type="number" min="0" placeholder="Gol ${esc(teamName(m.home))}" value="${m.homeScore??""}">
 <span>:</span>
 <input id="a${esc(m.id)}" type="number" min="0" placeholder="Gol ${esc(teamName(m.away))}" value="${m.awayScore??""}">
 <input id="loc${esc(m.id)}" type="text" placeholder="Lokasi" value="${esc(m.location||"")}">
 <button type="button" onclick="saveScore('${esc(m.id)}')">Simpan Hasil</button>
 </div>`).join("");
}

function renderKnockout(){
 const ms=["SF1","SF2","F"].map(id=>matches[id]||defaultMatches[id]);
 $("knockoutMatches").innerHTML=ms.map(m=>`<div class="adminmatch">
 <div><b>${esc(m.id)} • ${esc(m.phase)}</b><small>${esc(formatSchedule(m.date,m.time))}</small></div>
 <div><b>${esc(teamName(m.home))}</b><br><span class="muted">VS</span><br><b>${esc(teamName(m.away))}</b></div>
 <span class="score">${m.homeScore??"-"} : ${m.awayScore??"-"}</span>
 <select id="s${esc(m.id)}"><option value="scheduled" ${m.status==="scheduled"?"selected":""}>Terjadwal</option><option value="live" ${m.status==="live"?"selected":""}>LIVE</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select>
 <input id="h${esc(m.id)}" type="number" min="0" placeholder="Gol" value="${m.homeScore??""}">
 <span>:</span><input id="a${esc(m.id)}" type="number" min="0" placeholder="Gol" value="${m.awayScore??""}">
 <button type="button" onclick="saveScore('${esc(m.id)}')">Simpan Hasil</button>
 </div>`).join("");
}

window.saveScore=async id=>{
 const current=matches[id]||defaultMatches[id]||{};
 const saved={...current,homeScore:$("h"+id).value===""?null:+$("h"+id).value,awayScore:$("a"+id).value===""?null:+$("a"+id).value,status:$("s"+id).value};
 try{await set(ref(db,"matches/"+id),saved);matches[id]=saved;renderMatches();renderKnockout();alert("Hasil pertandingan tersimpan.")}
 catch(e){alert("Gagal menyimpan hasil: "+e.message)}
};

function formatSchedule(date,time){
 if(!date&&!time)return"Belum dijadwalkan";
 const d=date?new Date(date+"T00:00:00"):null;
 const ds=d&&!isNaN(d)?d.toLocaleDateString("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}):date;
 return[ds,time?time+" WIB":""].filter(Boolean).join(" • ");
}

$("uploadPhoto").onclick=async()=>alert("Upload foto belum diaktifkan karena Firebase Storage pada project ini belum tersedia.");
function renderGallery(){
 if(!$("adminGallery"))return;
 const arr=Object.entries(gallery).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
 $("adminGallery").innerHTML=arr.length?arr.map(([id,x])=>`<figure class="gallery-item admin-gallery-item"><img src="${esc(x.url)}" alt="${esc(x.caption||"Foto")}"><figcaption>${esc(x.caption||"Liga Kita Vol-I")}<button class="danger" onclick="deletePhoto('${esc(id)}')">Hapus</button></figcaption></figure>`).join(""):"<p class='muted'>Belum ada foto.</p>";
}
window.deletePhoto=async id=>{if(!confirm("Hapus foto ini?"))return;await remove(ref(db,"gallery/"+id));await loadData()};
