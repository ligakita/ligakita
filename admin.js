import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,set,update,remove}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{firebaseConfig}from"./firebase-config.js";

const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ADMIN_EMAIL="dendi170898@gmail.com";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let groups={},matches={},gallery={};

const groupNames=["A","B","C","D"];
const excelSchedule=[
["M1","A",0,1,"2026-09-06","16:00"],["M2","A",2,3,"2026-09-13","10:30"],
["M3","A",0,2,"2026-09-19","16:00"],["M4","A",1,3,"2026-09-20","16:00"],
["M5","A",0,3,"2026-09-27","10:30"],["M6","A",1,2,"2026-10-03","16:00"],
["M7","B",0,1,"2026-09-12","13:30"],["M8","B",2,3,"2026-09-13","13:30"],
["M9","B",0,2,"2026-09-20","10:30"],["M10","B",1,3,"2026-09-26","13:30"],
["M11","B",0,3,"2026-09-27","13:30"],["M12","B",1,2,"2026-10-04","08:00"],
["M13","C",0,1,"2026-09-12","16:00"],["M14","C",2,3,"2026-09-13","16:00"],
["M15","C",0,2,"2026-09-20","10:30"],["M16","C",1,3,"2026-09-26","16:00"],
["M17","C",0,3,"2026-09-27","16:00"],["M18","C",1,2,"2026-10-04","10:30"],
["M19","D",0,1,"2026-09-13","08:00"],["M20","D",2,3,"2026-09-19","13:30"],
["M21","D",0,2,"2026-09-20","13:30"],["M22","D",1,3,"2026-09-27","08:00"],
["M23","D",0,3,"2026-10-03","13:30"],["M24","D",1,2,"2026-10-04","13:30"]
];

const defaults={
 A:["ARCAK PUTRA","TIGER","FIT JUNIOR","SUKAMANAH UNITED"],
 B:["FAMILY","Tim 6","Tim 7","Tim 8"],
 C:["Tim 9","Tim 10","Tim 11","Tim 12"],
 D:["Tim 13","Tim 14","Tim 15","Tim 16"]
};

function emptyRow(name,id,group){
 return{id,name,group,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,gd:0,points:0};
}
function makeDefaults(){
 const out={};
 for(const g of groupNames){
  out[g]={};
  for(let i=0;i<4;i++){
   const id=`${g}${i+1}`;
   out[g][id]=emptyRow(defaults[g][i],id,g);
  }
 }
 return out;
}
function normalizeGroups(raw){
 const out=makeDefaults();
 for(const g of groupNames){
  const source=raw?.[g]||{};
  const vals=Object.values(source);
  for(let i=0;i<4;i++){
   const d=Object.values(out[g])[i], v=source[d.id]||vals[i]||{};
   out[g][d.id]={...d,...v,id:d.id,group:g,name:String(v.name??d.name)};
   for(const k of ["played","wins","draws","losses","gf","ga","gd","points"])out[g][d.id][k]=Number(v[k]??d[k]??0);
  }
 }
 return out;
}
function teamById(id){
 for(const g of groupNames)if(groups[g]?.[id])return groups[g][id];
 return null;
}
function teamName(id){
 const t=teamById(id);
 if(t)return t.name;
 return({A1:"Juara Grup A",B1:"Juara Grup B",C1:"Juara Grup C",D1:"Juara Grup D",SF1W:"Pemenang SF1",SF2W:"Pemenang SF2"})[id]||id;
}
function defaultMatches(){
 const out={};
 for(const [id,g,h,a,date,time] of excelSchedule){
  const home=`${g}${h+1}`,away=`${g}${a+1}`;
  out[id]={id,phase:"group",group:g,home,away,date,time,homeScore:null,awayScore:null,status:"scheduled",location:""};
 }
 Object.assign(out,{
  SF1:{id:"SF1",phase:"semifinal",home:"A1",away:"B1",date:"2026-10-04",time:"16:00",homeScore:null,awayScore:null,status:"scheduled",location:""},
  SF2:{id:"SF2",phase:"semifinal",home:"C1",away:"D1",date:"2026-10-10",time:"13:30",homeScore:null,awayScore:null,status:"scheduled",location:""},
  F:{id:"F",phase:"final",home:"SF1W",away:"SF2W",date:"2026-10-10",time:"16:00",homeScore:null,awayScore:null,status:"scheduled",location:""}
 });
 return out;
}
const fallbackMatches=defaultMatches();

function hide(){$("loginBox").classList.remove("hidden");$("adminBox").classList.add("hidden")}
function show(){$("loginBox").classList.add("hidden");$("adminBox").classList.remove("hidden");$("adminEmail").textContent=auth.currentUser?.email||ADMIN_EMAIL}

async function loadData(){
 try{
  const [gs,ms,gals]=await Promise.all([get(ref(db,"groups")),get(ref(db,"matches")),get(ref(db,"gallery"))]);
  groups=normalizeGroups(gs.exists()?gs.val():{});
  matches=ms.exists()?ms.val():{};
  gallery=gals.exists()?gals.val():{};
  if(!gs.exists())await set(ref(db,"groups"),groups);
  if(!ms.exists())await set(ref(db,"matches"),fallbackMatches);
  if(!ms.exists())matches={...fallbackMatches};
  await syncTeamsCompatibility(false);
  render();
 }catch(e){console.error(e);alert("Gagal membaca data Firebase: "+e.message)}
}

async function syncTeamsCompatibility(){
 const teams={};
 for(const g of groupNames)for(const id of Object.keys(groups[g]))teams[id]={id,name:groups[g][id].name,group:g};
 await set(ref(db,"teams"),teams);
}

function render(){
 renderGroups();
 renderMatches();
 if($("adminGallery"))renderGallery();
}

function renderGroups(){
 $("groupsAdmin").innerHTML=groupNames.map(g=>{
  const rows=Object.values(groups[g]);
  return `<div class="group">
   <h3>GRUP ${g}</h3>
   <div class="tablewrap"><table>
    <thead><tr><th>No</th><th class="name">Nama Tim</th><th>Main</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th></tr></thead>
    <tbody>${rows.map((t,i)=>`
     <tr>
      <td>${i+1}</td>
      <td class="name"><input id="name-${t.id}" value="${esc(t.name)}" aria-label="Nama tim ${i+1} Grup ${g}"></td>
      ${["played","wins","draws","losses","gf","ga","gd","points"].map(k=>`<td><input id="${k}-${t.id}" type="number" min="0" value="${Number(t[k]||0)}" aria-label="${k} ${t.name}"></td>`).join("")}
     </tr>`).join("")}</tbody>
   </table></div>
  </div>`;
 }).join("");
}

$("saveGroups").onclick=async()=>{
 const btn=$("saveGroups");btn.disabled=true;btn.textContent="💾 Menyimpan...";
 try{
  const next=normalizeGroups(groups);
  for(const g of groupNames){
   for(const t of Object.values(next[g])){
    t.name=$(`name-${t.id}`).value.trim()||t.name;
    for(const k of ["played","wins","draws","losses","gf","ga","gd","points"]){
     t[k]=Math.max(0,Number($(`${k}-${t.id}`).value||0));
    }
   }
  }
  groups=next;
  await set(ref(db,"groups"),groups);
  await syncTeamsCompatibility();
  render();
  $("groupsMsg").textContent="✓ Grup A, B, C, D berhasil disimpan. Nama grup otomatis dipakai di jadwal.";
 }catch(e){$("groupsMsg").textContent="Gagal menyimpan: "+e.message}
 finally{btn.disabled=false;btn.textContent="💾 Simpan Semua Grup"}
};

$("calcStandings").onclick=async()=>{
 try{
  const calc=calculateFromMatches();
  for(const g of groupNames)for(const id of Object.keys(groups[g]))groups[g][id]={...groups[g][id],...calc[g][id]};
  await set(ref(db,"groups"),groups);await syncTeamsCompatibility();render();
  $("groupsMsg").textContent="✓ Main, Menang, Seri, Kalah, GM, GK, SG dan Poin dihitung dari hasil pertandingan.";
 }catch(e){$("groupsMsg").textContent="Gagal menghitung: "+e.message}
};

function calculateFromMatches(){
 const result=makeDefaults();
 for(const g of groupNames)for(const id of Object.keys(result[g]))result[g][id].name=groups[g][id].name;
 for(const [id,g,hidx,aidx] of excelSchedule){
  const m=matches[id];if(!m)continue;
  if(m.homeScore===null||m.homeScore===undefined||m.awayScore===null||m.awayScore===undefined||m.homeScore===""||m.awayScore==="")continue;
  const h=`${g}${hidx+1}`,a=`${g}${aidx+1}`,hs=Number(m.homeScore),as=Number(m.awayScore);
  const H=result[g][h],A=result[g][a];if(!H||!A)continue;
  H.played++;A.played++;H.gf+=hs;H.ga+=as;A.gf+=as;A.ga+=hs;
  if(hs>as){H.wins++;H.points+=3;A.losses++}
  else if(hs<as){A.wins++;A.points+=3;H.losses++}
  else{H.draws++;A.draws++;H.points++;A.points++}
 }
 for(const g of groupNames)for(const t of Object.values(result[g]))t.gd=t.gf-t.ga;
 return result;
}

function formatSchedule(date,time){
 if(!date&&!time)return"Belum dijadwalkan";
 const d=date?new Date(date+"T00:00:00"):null;
 const ds=d&&!isNaN(d)?d.toLocaleDateString("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}):date;
 return[ds,time?time+" WIB":""].filter(Boolean).join(" • ");
}

function renderMatches(){
 const list=excelSchedule.map(([id])=>matches[id]||fallbackMatches[id]);
 $("adminMatches").innerHTML=list.map((m,i)=>`
  <div class="match">
   <div><b>${i+1}</b></div>
   <div><b>${esc(teamName(m.home))}</b> <span class="muted">VS</span> <b>${esc(teamName(m.away))}</b><small>Grup ${esc(m.group)} • ${esc(formatSchedule(m.date,m.time))}</small></div>
   <div><b>Hasil: ${m.homeScore??"-"} : ${m.awayScore??"-"}</b></div>
   <select id="s-${m.id}"><option value="scheduled" ${m.status==="scheduled"?"selected":""}>Terjadwal</option><option value="live" ${m.status==="live"?"selected":""}>LIVE</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select>
   <input id="h-${m.id}" type="number" min="0" placeholder="Skor 1" value="${m.homeScore??""}">
   <input id="a-${m.id}" type="number" min="0" placeholder="Skor 2" value="${m.awayScore??""}">
   <button type="button" onclick="saveScore('${m.id}')">Simpan</button>
  </div>`).join("");
}

window.saveScore=async id=>{
 const m=matches[id]||fallbackMatches[id];
 const hs=$(`h-${id}`).value,as=$(`a-${id}`).value;
 const saved={...m,homeScore:hs===""?null:Number(hs),awayScore:as===""?null:Number(as),status:$(`s-${id}`).value};
 try{
  await set(ref(db,"matches/"+id),saved);matches[id]=saved;renderMatches();
  $("matchesMsg").textContent=`✓ Hasil ${id} tersimpan. Jika ingin memperbarui klasemen otomatis, klik "Hitung dari Hasil".`;
 }catch(e){$("matchesMsg").textContent="Gagal menyimpan hasil: "+e.message}
};

function renderGallery(){
 const el=$("adminGallery");if(!el)return;
 const arr=Object.entries(gallery).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
 el.innerHTML=arr.length?arr.map(([id,x])=>`<figure class="gallery-item admin-gallery-item"><img src="${esc(x.url)}" alt="${esc(x.caption||"Foto")}"><figcaption>${esc(x.caption||"Liga Kita Vol-I")} <button class="danger" onclick="deletePhoto('${esc(id)}')">Hapus</button></figcaption></figure>`).join(""):"<p class='muted'>Belum ada foto.</p>";
}
window.deletePhoto=async id=>{if(!confirm("Hapus foto ini?"))return;await remove(ref(db,"gallery/"+id));await loadData()};

onAuthStateChanged(auth,async user=>{
 if(user&&user.email===ADMIN_EMAIL){show();await loadData()}else hide();
});
$("loginBtn").onclick=async()=>{
 const email=$("username").value.trim(),pass=$("password").value;
 $("loginMsg").textContent="Memproses login...";
 if(!email||!pass){$("loginMsg").textContent="Isi email dan password.";return}
 try{
  const cred=await signInWithEmailAndPassword(auth,email,pass);
  if(cred.user.email!==ADMIN_EMAIL){await signOut(auth);$("loginMsg").textContent="Akun ini bukan akun admin."}
 }catch(e){$("loginMsg").textContent="Login gagal: "+(e.code||e.message)}
};
$("logout").onclick=()=>signOut(auth);
