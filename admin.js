import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,set,update,remove}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{firebaseConfig}from"./firebase-config.js";

const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app);
const ADMIN_EMAIL="dendi170898@gmail.com";
let teams={},matches={},gallery={};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

const defaultTeams={};
for(let i=1;i<=16;i++)defaultTeams["T"+i]={id:"T"+i,name:"Tim "+i,group:String.fromCharCode(65+Math.floor((i-1)/4))};

const defaultMatches={};let n=1;
for(const g of["A","B","C","D"]){const t=Object.values(defaultTeams).filter(x=>x.group===g);for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const id="M"+n++;defaultMatches[id]={id,phase:"group",group:g,home:t[i].id,away:t[j].id,homeScore:null,awayScore:null,status:"scheduled",date:"",time:"",location:""}}}
Object.assign(defaultMatches,{SF1:{id:"SF1",phase:"semifinal",home:"A1",away:"B1",homeScore:null,awayScore:null,status:"scheduled",date:"",time:"",location:""},SF2:{id:"SF2",phase:"semifinal",home:"C1",away:"D1",homeScore:null,awayScore:null,status:"scheduled",date:"",time:"",location:""},F:{id:"F",phase:"final",home:"SF1W",away:"SF2W",homeScore:null,awayScore:null,status:"scheduled",date:"",time:"",location:""}});

function hide(){ $("loginBox").classList.remove("hidden"); $("adminBox").classList.add("hidden"); }
function show(){ $("loginBox").classList.add("hidden"); $("adminBox").classList.remove("hidden"); $("adminEmail").textContent=auth.currentUser?.email||ADMIN_EMAIL; }

async function loadData(){
  try{
    const [ts,ms,gs]=await Promise.all([get(ref(db,"teams")),get(ref(db,"matches")),get(ref(db,"gallery"))]);
    teams=ts.exists()?ts.val():{};
    matches=ms.exists()?ms.val():{};
    gallery=gs.exists()?gs.val():{};
    if(!Object.keys(teams).length){
      await update(ref(db,"teams"),defaultTeams); teams={...defaultTeams};
    }
    if(!Object.keys(matches).length){
      await update(ref(db,"matches"),defaultMatches); matches={...defaultMatches};
    }
    render();
  }catch(e){
    console.error(e);
    alert("Gagal membaca data Firebase: "+e.message);
  }
}

onAuthStateChanged(auth,async user=>{
  if(user&&user.email===ADMIN_EMAIL){
    show();
    await loadData();
  }else hide();
});

$("loginBtn").onclick=async()=>{
  const email=$("username").value.trim(),pass=$("password").value;
  $("loginMsg").textContent="Memproses login...";
  if(!email||!pass){$("loginMsg").textContent="Isi email dan password.";return}
  try{
    const cred=await signInWithEmailAndPassword(auth,email,pass);
    if(cred.user.email!==ADMIN_EMAIL){await signOut(auth);$("loginMsg").textContent="Akun ini bukan akun admin."}
  }catch(e){console.error(e);$("loginMsg").textContent="Login gagal: "+(e.code||e.message)}
};
$("logout").onclick=()=>signOut(auth);

function render(){
  const list=Object.values(teams).length?Object.values(teams):Object.values(defaultTeams);
  list.sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
  $("teamsForm").innerHTML=list.map((t,i)=>`<label><span class="team-number">${i+1}</span><input id="t${esc(t.id)}" value="${esc(t.name)}"></label>`).join("");

  const opts=list;
  const special=[['A1','Juara Grup A'],['B1','Juara Grup B'],['C1','Juara Grup C'],['D1','Juara Grup D'],['SF1W','Pemenang SF1'],['SF2W','Pemenang SF2']];
  const ms=Object.values(matches).length?Object.values(matches):Object.values(defaultMatches);
  ms.sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
  $("adminMatches").innerHTML=ms.map(m=>`<div class="adminmatch">
    <div><b>${esc(m.id)} • ${esc(m.phase)}</b><small>${m.group?"Grup "+esc(m.group):"Knockout"}</small></div>
    <select id="home${esc(m.id)}">${opts.map(t=>`<option value="${esc(t.id)}" ${m.home===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}${special.map(([v,l])=>`<option value="${v}" ${m.home===v?"selected":""}>${l}</option>`).join("")}</select>
    <span>VS</span>
    <select id="away${esc(m.id)}">${opts.map(t=>`<option value="${esc(t.id)}" ${m.away===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}${special.map(([v,l])=>`<option value="${v}" ${m.away===v?"selected":""}>${l}</option>`).join("")}</select>
    <input id="h${esc(m.id)}" type="number" min="0" placeholder="Skor" value="${m.homeScore??""}"><span>:</span><input id="a${esc(m.id)}" type="number" min="0" placeholder="Skor" value="${m.awayScore??""}">
    <select id="s${esc(m.id)}"><option value="scheduled" ${m.status==="scheduled"?"selected":""}>Terjadwal</option><option value="live" ${m.status==="live"?"selected":""}>LIVE</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select>
    <div class="schedule"><input id="d${esc(m.id)}" type="date" value="${esc(m.date||"")}"><input id="time${esc(m.id)}" type="time" value="${esc(m.time||"")}"><input id="loc${esc(m.id)}" type="text" placeholder="Lokasi" value="${esc(m.location||"")}"></div>
    <button type="button" onclick="saveMatch('${esc(m.id)}')">Simpan</button>
  </div>`).join("");
  renderGallery();
}

$("saveTeams").onclick=async()=>{
  const button=$("saveTeams");button.disabled=true;button.textContent="Menyimpan...";
  try{
    const current={...teams};
    for(const t of Object.values(defaultTeams)){
      const el=$("t"+t.id);const old=current[t.id]||t;
      const name=el?el.value.trim():old.name||t.name;
      const value={id:t.id,group:old.group||t.group,name:name||old.name||t.name};
      await set(ref(db,"teams/"+t.id),value);
      current[t.id]=value;
    }
    teams=current;
    alert("Berhasil disimpan. Sekarang kalau Admin dibuka/edit lagi, nama tim akan mengambil data terakhir dari Firebase.");
    await loadData();
  }catch(e){console.error(e);alert("Gagal menyimpan nama tim: "+e.message)}
  finally{button.disabled=false;button.textContent="Simpan Nama Tim";}
};

window.saveMatch=async id=>{
  const current=matches[id]||defaultMatches[id]||{};
  const home=$("home"+id).value,away=$("away"+id).value;
  if(home===away)return alert("Tim kandang dan tandang tidak boleh sama.");
  try{
    const saved={...current,home,away,homeScore:$("h"+id).value===""?null:+$("h"+id).value,awayScore:$("a"+id).value===""?null:+$("a"+id).value,status:$("s"+id).value,date:$("d"+id).value,time:$("time"+id).value,location:$("loc"+id).value.trim()};
    await set(ref(db,"matches/"+id),saved);
    matches[id]=saved;
    alert("Pertandingan tersimpan permanen di Firebase.");
    await loadData();
  }catch(e){console.error(e);alert("Gagal menyimpan pertandingan: "+e.message)}
};

$("uploadPhoto").onclick=async()=>alert("Upload foto belum diaktifkan karena Firebase Storage pada project ini belum tersedia.");
function renderGallery(){if(!$("adminGallery"))return;const arr=Object.entries(gallery).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));$("adminGallery").innerHTML=arr.length?arr.map(([id,x])=>`<figure class="gallery-item admin-gallery-item"><img src="${esc(x.url)}" alt="${esc(x.caption||"Foto")}"><figcaption>${esc(x.caption||"Liga Kita Vol-I")}<button class="danger" onclick="deletePhoto('${esc(id)}')">Hapus</button></figcaption></figure>`).join(""):"<p class='muted'>Belum ada foto.</p>"}
window.deletePhoto=async id=>{if(!confirm("Hapus foto ini?"))return;await remove(ref(db,"gallery/"+id));await loadData()};
