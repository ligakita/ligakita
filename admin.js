import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getDatabase,ref,get,set,update}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{firebaseConfig}from"./firebase-config.js";
const app=initializeApp(firebaseConfig),db=getDatabase(app),auth=getAuth(app),ADMIN_EMAIL="dendi170898@gmail.com",GROUPS=["A","B","C","D"];
const $=id=>document.getElementById(id);const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let teams={},groups={A:[],B:[],C:[],D:[]},matches={};
const defaultTeam=i=>({id:`T${i}`,name:`Tim ${i}`,group:"",main:0,win:0,draw:0,loss:0,gf:0,ga:0,gd:0,points:0});
function ensure16(raw){const out={};for(let i=1;i<=16;i++){const id=`T${i}`,x=raw?.[id]||{};out[id]={...defaultTeam(i),...x,id,name:String(x.name||`Tim ${i}`)}}return out}
function emptyGroups(){return{A:["","","",""],B:["","","",""],C:["","","",""],D:["","","",""]}}
function defaultGroups(){return{A:["T1","T2","T3","T4"],B:["T5","T6","T7","T8"],C:["T9","T10","T11","T12"],D:["T13","T14","T15","T16"]}}
function normalizeGroups(raw){
  const out=emptyGroups();
  const used=new Set();
  for(const g of GROUPS){
    const v=Array.isArray(raw?.[g])?raw[g]:[];
    for(let i=0;i<4;i++){
      const id=v[i];
      if(/^T([1-9]|1[0-6])$/.test(id) && !used.has(id)){out[g][i]=id;used.add(id);}
    }
  }
  return out;
}
function readGroupDraftFromDOM(){
  const selected={A:[],B:[],C:[],D:[]};
  for(const g of GROUPS) for(let i=0;i<4;i++){
    const el=$(`gteam_${g}_${i}`);
    selected[g].push(el?.value || groups[g]?.[i] || "");
  }
  return selected;
}
function setGroupDraft(next){
  groups=normalizeGroups(next);
  localStorage.setItem('ligakita_groups_draft',JSON.stringify(groups));
}
const pairings={1:[[0,1],[2,3]],2:[[0,2],[1,3]],3:[[0,3],[1,2]]};
const dates=[["2026-09-06","16:00"],["2026-09-12","13:30"],["2026-09-12","16:00"],["2026-09-13","08:00"],["2026-09-13","10:30"],["2026-09-13","13:30"],["2026-09-13","16:00"],["2026-09-19","13:30"],["2026-09-19","16:00"],["2026-09-20","08:00"],["2026-09-20","10:30"],["2026-09-20","13:30"],["2026-09-20","16:00"],["2026-09-26","13:30"],["2026-09-26","16:00"],["2026-09-27","08:00"],["2026-09-27","10:30"],["2026-09-27","13:30"],["2026-09-27","16:00"],["2026-10-03","13:30"],["2026-10-03","16:00"],["2026-10-04","08:00"],["2026-10-04","10:30"],["2026-10-04","13:30"]];
function buildMatches(existing={}){const out={};let n=1;for(let round=1;round<=3;round++)for(const g of GROUPS){const m=groups[g]||[];for(const [a,b] of pairings[round]){const id=`M${n}`,old=existing[id]||{},[date,time]=dates[n-1]||["",""];out[id]={id,phase:"group",round,group:g,home:m[a]||"",away:m[b]||"",homeScore:old.homeScore??null,awayScore:old.awayScore??null,status:old.status||"scheduled",date:old.date||date,time:old.time||time,location:old.location||""};n++}}return out}
function setMsg(id,text,error=false){const e=$(id);if(e){e.textContent=text;e.className=`msg ${error?"err":"saveok"}`}}
function showLogin(){$("loginBox").classList.remove("hidden");$("adminBox").classList.add("hidden")}
function showAdmin(){ $("loginBox").classList.add("hidden");$("adminBox").classList.remove("hidden");$("adminEmail").textContent=auth.currentUser?.email||"" }
function syncFlags(){for(let i=1;i<=16;i++)teams[`T${i}`].group="";for(const g of GROUPS)for(const id of groups[g]||[])if(teams[id])teams[id].group=g}
function renderTeams16(){const body=$("teams16Admin");if(!body)return;body.innerHTML=Array.from({length:16},(_,i)=>{const t=teams[`T${i+1}`]||defaultTeam(i+1);return `<tr><td>${i+1}</td><td><input id="team16_T${i+1}" value="${esc(t.name)}" placeholder="Nama Tim ${i+1}"></td></tr>`}).join("")}
function refreshGroupSelectOptions(){
  const root=$('groupsAdmin');
  if(!root)return;
  const current={};
  root.querySelectorAll('select[data-group]').forEach(el=>{current[`${el.dataset.group}_${el.dataset.slot}`]=el.value||'';});
  const selectedElsewhere=new Set(Object.values(current).filter(Boolean));
  const options=Array.from({length:16},(_,i)=>teams[`T${i+1}`]||defaultTeam(i+1));
  root.querySelectorAll('select[data-group]').forEach(el=>{
    const own=el.value||'';
    el.innerHTML=`<option value="">— Pilih Tim —</option>`+options.filter(o=>o.id===own || !selectedElsewhere.has(o.id)).map(o=>`<option value="${o.id}" ${o.id===own?'selected':''}>${esc(o.name)}</option>`).join('');
    el.value=own;
  });
}
function renderGroups(){
  const root=$('groupsAdmin');
  if(!root)return;
  const options=Array.from({length:16},(_,i)=>teams[`T${i+1}`]||defaultTeam(i+1));
  root.innerHTML=GROUPS.map(g=>`<div class="group"><h3>Grup ${g}</h3><div class="tablewrap"><table><thead><tr><th>No</th><th class="name">Nama Tim</th><th>Main</th><th>Menang</th><th>Seri</th><th>Kalah</th><th>GM</th><th>GK</th><th>SG</th><th>Poin</th></tr></thead><tbody>${Array.from({length:4},(_,i)=>{
    const id=groups[g]?.[i] || "";
    const t=teams[id]||defaultTeam(Number(String(id).slice(1)));
    const v=k=>Number.isFinite(+t[k])?+t[k]:0;
    return `<tr><td>${i+1}</td><td class="name"><select id="gteam_${g}_${i}" data-group="${g}" data-slot="${i}"><option value="">— Pilih Tim —</option>${options.map(o=>`<option value="${o.id}" ${o.id===id?'selected':''}>${esc(o.name)}</option>`).join('')}</select></td><td><input id="gm_${g}_${i}" type="number" min="0" value="${v('main')}"></td><td><input id="gw_${g}_${i}" type="number" min="0" value="${v('win')}"></td><td><input id="gdr_${g}_${i}" type="number" min="0" value="${v('draw')}"></td><td><input id="gl_${g}_${i}" type="number" min="0" value="${v('loss')}"></td><td><input id="gf_${g}_${i}" type="number" min="0" value="${v('gf')}"></td><td><input id="ga_${g}_${i}" type="number" min="0" value="${v('ga')}"></td><td><input id="gd_${g}_${i}" type="number" value="${v('gd')}"></td><td><input id="gp_${g}_${i}" type="number" min="0" value="${v('points')}"></td></tr>`;
  }).join('')}</tbody></table></div></div>`).join('');

  refreshGroupSelectOptions();
  root.querySelectorAll('select[data-group]').forEach(el=>el.addEventListener('change',()=>{
    const draft=readGroupDraftFromDOM();
    const counts={};
    for(const g of GROUPS) for(const tid of draft[g]) if(tid) counts[tid]=(counts[tid]||0)+1;
    if(counts[el.value]>1){
      setMsg('groupsMsg','❌ Tim yang sama tidak boleh dipilih dua kali.',true);
      el.value=groups[el.dataset.group]?.[+el.dataset.slot] || "";
      refreshGroupSelectOptions();
      return;
    }
    setGroupDraft(draft);
    refreshGroupSelectOptions();
    setMsg('groupsMsg','✏️ Tim yang sudah dipilih otomatis dihapus dari pilihan grup lain. Klik Simpan Semua Grup.');
  }));
}
function renderMatches(){const root=$("adminMatches");if(!root)return;const list=Object.values(matches).filter(m=>m.phase==="group").sort((a,b)=>(+a.id.slice(1))-(+b.id.slice(1)));const name=id=>teams[id]?.name||"-";root.innerHTML=list.map((m,i)=>`<div class="match"><div><b>${i+1}</b><small>Putaran ${m.round}</small></div><div><b>Grup ${esc(m.group)}</b></div><div><b>${esc(name(m.home))}</b></div><div>VS</div><div><b>${esc(name(m.away))}</b></div><input id="h${m.id}" type="number" min="0" placeholder="Skor" value="${m.homeScore??""}"><input id="a${m.id}" type="number" min="0" placeholder="Skor" value="${m.awayScore??""}"><input id="d${m.id}" type="date" value="${esc(m.date||"")}"><input id="tm${m.id}" type="time" value="${esc(m.time||"")}"><select id="s${m.id}"><option value="scheduled" ${m.status!=="finished"?"selected":""}>Terjadwal</option><option value="finished" ${m.status==="finished"?"selected":""}>Selesai</option></select><button type="button" data-match="${m.id}">Simpan</button></div>`).join("");root.querySelectorAll("[data-match]").forEach(b=>b.addEventListener("click",()=>saveMatch(b.dataset.match)))}
function renderAll(){renderTeams16();renderGroups();renderMatches()}
async function loadData(){
  try{
    const [ts,gs,ms]=await Promise.all([get(ref(db,'teams')),get(ref(db,'groups')),get(ref(db,'matches'))]);
    teams=ensure16(ts.exists()?ts.val():{});
    const savedGroups=gs.exists()?gs.val():null;
    const draftRaw=localStorage.getItem('ligakita_groups_draft');
    let draft=null;
    try{draft=draftRaw?JSON.parse(draftRaw):null}catch{}
    groups=normalizeGroups(savedGroups || draft || emptyGroups());
    if(savedGroups) localStorage.setItem('ligakita_groups_draft',JSON.stringify(groups));
    syncFlags();
    matches=ms.exists()?ms.val():{};
    matches={...matches,...buildMatches(matches)};
    renderAll();
  }catch(e){
    console.error(e);
    setMsg('teams16Msg','Gagal membaca Firebase: '+e.message,true);
  }
}
async function saveTeams16(){
  const b=$('saveTeams16');
  if(!auth.currentUser){setMsg('teams16Msg','Sesi login sudah habis. Login lagi.',true);return;}
  const groupDraft=readGroupDraftFromDOM();
  b.disabled=true;
  setMsg('teams16Msg','Menyimpan 16 Tim...');
  try{
    const next=ensure16(teams);
    for(let i=1;i<=16;i++){const id=`T${i}`,input=$('team16_'+id);next[id].name=(input?.value||'').trim()||`Tim ${i}`;}
    await set(ref(db,'teams'),next);
    const verify=await get(ref(db,'teams'));
    if(!verify.exists())throw new Error('Firebase tidak mengembalikan data setelah disimpan.');
    teams=ensure16(verify.val());
    // Jangan reset pilihan grup yang sedang diedit.
    groups=normalizeGroups(groupDraft);
    localStorage.setItem('ligakita_groups_draft',JSON.stringify(groups));
    syncFlags();
    renderTeams16();
    renderGroups();
    renderMatches();
    setMsg('teams16Msg','✅ TERSIMPAN. 16 Tim tersimpan dan pilihan Grup tetap dipertahankan.');
  }catch(e){
    console.error(e);
    setMsg('teams16Msg','❌ Gagal menyimpan: '+e.message,true);
  }finally{b.disabled=false;}
}
async function saveGroups(){
  const b=$('saveGroups');
  b.disabled=true;
  setMsg('groupsMsg','Menyimpan Grup...');
  try{
    const selected=readGroupDraftFromDOM();
    const chosen=new Set();
    const updates={};
    for(const g of GROUPS) for(let i=0;i<4;i++){
      const id=selected[g][i];
      if(!id)throw new Error(`Grup ${g} baris ${i+1} belum memilih tim.`);
      if(chosen.has(id))throw new Error(`${teams[id]?.name||id} dipilih lebih dari satu kali.`);
      chosen.add(id);
      const old=teams[id]||defaultTeam(+id.slice(1));
      updates[id]={...old,group:g,main:+$(`gm_${g}_${i}`).value||0,win:+$(`gw_${g}_${i}`).value||0,draw:+$(`gdr_${g}_${i}`).value||0,loss:+$(`gl_${g}_${i}`).value||0,gf:+$(`gf_${g}_${i}`).value||0,ga:+$(`ga_${g}_${i}`).value||0,gd:+$(`gd_${g}_${i}`).value||0,points:+$(`gp_${g}_${i}`).value||0};
    }
    if(chosen.size!==16)throw new Error('Semua 16 tim harus dipakai tepat satu kali.');
    for(let i=1;i<=16;i++){const id=`T${i}`;if(!chosen.has(id))updates[id]={...(teams[id]||defaultTeam(i)),group:''};}
    const nextTeams={...ensure16(teams),...updates};
    await set(ref(db,'teams'),nextTeams);
    await set(ref(db,'groups'),selected);
    const [tv,gv]=await Promise.all([get(ref(db,'teams')),get(ref(db,'groups'))]);
    if(!tv.exists()||!gv.exists())throw new Error('Data belum terbaca setelah penyimpanan.');
    teams=ensure16(tv.val());
    groups=normalizeGroups(gv.val());
    localStorage.setItem('ligakita_groups_draft',JSON.stringify(groups));
    syncFlags();
    const generated=buildMatches(matches);
    matches={...matches,...generated};
    await update(ref(db,'matches'),generated);
    renderAll();
    setMsg('groupsMsg','✅ GRUP TERSIMPAN. Pilihan Tim tidak dihapus dan Jadwal sudah diperbarui.');
  }catch(e){
    console.error(e);
    setMsg('groupsMsg','❌ Gagal menyimpan grup: '+e.message,true);
  }finally{b.disabled=false;}
}
async function saveMatch(id){try{const old=matches[id]||{};const saved={...old,homeScore:$("h"+id).value===""?null:+$("h"+id).value,awayScore:$("a"+id).value===""?null:+$("a"+id).value,status:$("s"+id).value,date:$("d"+id).value,time:$("tm"+id).value};await set(ref(db,"matches/"+id),saved);matches[id]=saved;setMsg("matchesMsg",`✅ ${id} tersimpan.`)}catch(e){setMsg("matchesMsg","❌ Gagal menyimpan: "+e.message,true)}}
async function calcStandings(){try{const stats={};for(let i=1;i<=16;i++)stats[`T${i}`]={main:0,win:0,draw:0,loss:0,gf:0,ga:0,gd:0,points:0};Object.values(matches).filter(m=>m.phase==="group"&&m.status==="finished"&&m.home&&m.away&&m.homeScore!=null&&m.awayScore!=null).forEach(m=>{const h=stats[m.home],a=stats[m.away];if(!h||!a)return;const hs=+m.homeScore,as=+m.awayScore;h.main++;a.main++;h.gf+=hs;h.ga+=as;a.gf+=as;a.ga+=hs;if(hs>as){h.win++;a.loss++;h.points+=3}else if(hs<as){a.win++;h.loss++;a.points+=3}else{h.draw++;a.draw++;h.points++;a.points++}h.gd=h.gf-h.ga;a.gd=a.gf-a.ga});const next=ensure16(teams);for(let i=1;i<=16;i++){const id=`T${i}`;next[id]={...next[id],...stats[id]}}await set(ref(db,"teams"),next);teams=next;renderTeams16();renderGroups();setMsg("groupsMsg","✅ Klasemen dihitung dan tersimpan.")}catch(e){setMsg("groupsMsg","❌ Gagal menghitung: "+e.message,true)}}
$("loginBtn").addEventListener("click",async()=>{const email=$("username").value.trim(),pass=$("password").value;setMsg("loginMsg","Memproses login...");try{if(!email||!pass)throw new Error("Isi email dan password.");const c=await signInWithEmailAndPassword(auth,email,pass);if(c.user.email!==ADMIN_EMAIL){await signOut(auth);throw new Error("Akun ini bukan akun admin.")} }catch(e){setMsg("loginMsg","❌ Login gagal: "+(e.code||e.message),true)}});
$("logout").addEventListener("click",()=>signOut(auth));$("saveTeams16").addEventListener("click",saveTeams16);$("saveGroups").addEventListener("click",saveGroups);$("calcStandings").addEventListener("click",calcStandings);onAuthStateChanged(auth,async user=>{if(user&&user.email===ADMIN_EMAIL){showAdmin();await loadData()}else showLogin()});
