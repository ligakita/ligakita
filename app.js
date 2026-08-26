import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));

const GROUPS = ["A","B","C","D"];
const DEFAULT_NAMES = Array.from({length:16}, (_,i)=>`Tim ${i+1}`);

/*
  Master data:
    teams16/T1 ... teams16/T16 = nama tim
  Group data:
    groups/A/0 ... groups/A/3 = ID master, mis. T1
  Match data:
    matches/M1 ... matches/M24 = skor/status
*/

function normalizeTeams16(raw) {
  const out = {};
  for (let i=1;i<=16;i++) {
    const id = `T${i}`;
    const v = raw?.[id];
    out[id] = typeof v === "string" ? v : (v?.name || DEFAULT_NAMES[i-1]);
  }
  return out;
}

function normalizeGroups(raw, teams16) {
  const out = {};
  for (const g of GROUPS) {
    let vals = [];
    const source = raw?.[g];
    if (Array.isArray(source)) vals = source;
    else if (source && typeof source === "object") {
      vals = Object.keys(source).sort((a,b)=>Number(a)-Number(b)).map(k=>source[k]);
    }
    vals = vals.map(v => {
      if (typeof v === "string" && /^T\d+$/.test(v)) return v;
      if (typeof v === "string") {
        const found = Object.entries(teams16).find(([,name]) => name === v);
        return found?.[0] || "";
      }
      return v?.id || "";
    });
    while (vals.length < 4) vals.push("");
    out[g] = vals.slice(0,4);
  }

  // Compatibility with the older teams/{T1:{group:"A"}} structure.
  if (!Object.values(out).flat().some(Boolean) && raw?.A === undefined) {
    for (const [id,v] of Object.entries(raw || {})) {
      if (!/^T\d+$/.test(id) || !v?.group) continue;
      const g = v.group;
      if (GROUPS.includes(g)) {
        const pos = Number(v.pos ?? v.position ?? 0);
        const idx = Math.max(0, Math.min(3, pos-1));
        if (!out[g][idx]) out[g][idx] = id;
      }
    }
  }
  return out;
}

const excelDates = [
  ["2026-09-06","16:00"],["2026-09-12","13:30"],["2026-09-13","08:00"],["2026-09-13","10:30"],
  ["2026-09-13","13:30"],["2026-09-13","16:00"],["2026-09-19","13:30"],["2026-09-19","16:00"],
  ["2026-09-19","16:00"],["2026-09-20","08:00"],["2026-09-20","10:30"],["2026-09-20","13:30"],
  ["2026-09-20","16:00"],["2026-09-26","13:30"],["2026-09-26","16:00"],["2026-09-27","08:00"],
  ["2026-09-27","10:30"],["2026-09-27","13:30"],["2026-09-27","16:00"],["2026-10-03","13:30"],
  ["2026-10-03","16:00"],["2026-10-04","08:00"],["2026-10-04","10:30"],["2026-10-04","13:30"]
];

function scheduleTemplate(groups) {
  const pairs = [
    ["A",0,1],["A",2,3],["B",0,1],["B",2,3],["C",0,1],["C",2,3],["D",0,1],["D",2,3],
    ["A",0,2],["A",1,3],["B",0,2],["B",1,3],["C",0,2],["C",1,3],["D",0,2],["D",1,3],
    ["A",0,3],["A",1,2],["B",0,3],["B",1,2],["C",0,3],["C",1,2],["D",0,3],["D",1,2]
  ];
  return pairs.map((p,i)=>({
    id:`M${i+1}`, round:Math.floor(i/8)+1, group:p[0],
    home:groups[p[0]][p[1]] || "", away:groups[p[0]][p[2]] || "",
    date:excelDates[i][0], time:excelDates[i][1],
    homeScore:null, awayScore:null, status:"scheduled"
  }));
}

function teamName(id, teams16) {
  return teams16[id] || id || "Belum ditentukan";
}

function fmtDate(d) {
  if (!d) return "";
  const x = new Date(`${d}T00:00:00`);
  return isNaN(x) ? d : x.toLocaleDateString("id-ID", {
    weekday:"long", day:"2-digit", month:"long", year:"numeric"
  });
}

function calcStandings(group, matches, teams16) {
  const rows = {};
  group.forEach(id => {
    if (!id) return;
    rows[id] = {id,name:teamName(id,teams16),mp:0,w:0,d:0,l:0,gm:0,gk:0,pts:0};
  });
  matches.filter(m => m.group && m.group === group._name).forEach(m => {
    const hs = Number.isFinite(m.homeScore) ? m.homeScore : null;
    const as = Number.isFinite(m.awayScore) ? m.awayScore : null;
    if (hs === null || as === null || !rows[m.home] || !rows[m.away]) return;
    const h=rows[m.home], a=rows[m.away];
    h.mp++; a.mp++; h.gm+=hs; h.gk+=as; a.gm+=as; a.gk+=hs;
    if (hs>as) {h.w++;h.pts+=3;a.l++}
    else if (hs<as) {a.w++;a.pts+=3;h.l++}
    else {h.d++;a.d++;h.pts++;a.pts++}
  });
  return Object.values(rows).sort((a,b)=>
    b.pts-a.pts || (b.gm-b.gk)-(a.gm-a.gk) || b.gm-a.gm || a.name.localeCompare(b.name)
  );
}

function renderTables(groups, matches, teams16) {
  const el=$("tables"); if(!el) return;
  el.innerHTML = GROUPS.map(g => {
    const arr = groups[g].slice();
    arr._name = g;
    const standings = calcStandings(arr, matches, teams16);
    return `<div class="card">
      <h3>Grup ${g}</h3>
      <div class="tablewrap"><table>
      <thead><tr><th>#</th><th>Tim</th><th>MAIN</th><th>M</th><th>S</th><th>K</th><th>GM</th><th>GK</th><th>SG</th><th>POIN</th></tr></thead>
      <tbody>${standings.map((t,i)=>`<tr>
        <td>${i+1}</td><td><b>${esc(t.name)}</b></td><td>${t.mp}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td>
        <td>${t.gm}</td><td>${t.gk}</td><td>${t.gm-t.gk}</td><td><b>${t.pts}</b></td>
      </tr>`).join("")}</tbody></table></div>
    </div>`;
  }).join("");
}

function renderTeamList(teams16) {
  const el=$("teamList"); if(!el) return;
  el.innerHTML = Object.entries(teams16).map(([id,name],i)=>
    `<div class="team-row"><span>${i+1}</span><b>${esc(name)}</b></div>`
  ).join("");
}

function renderMatches(matches, teams16) {
  const el=$("matches"); if(!el) return;
  const groupMatches=matches.filter(m=>m.group);
  el.innerHTML = groupMatches.map((m,i)=>`
    <div class="match">
      <div>
        <small>PERTANDINGAN ${i+1} • PUTARAN ${m.round || Math.floor(i/8)+1} • GRUP ${esc(m.group||"")}</small>
        <strong>${esc(teamName(m.home,teams16))} <span class="vs">vs</span> ${esc(teamName(m.away,teams16))}</strong>
        <small>${esc(fmtDate(m.date))}${m.time ? " • "+esc(m.time)+" WIB" : ""}</small>
      </div>
      <div class="score">${m.homeScore ?? "-"} : ${m.awayScore ?? "-"}</div>
      <div class="status ${m.status==="live"?"live":m.status==="finished"?"finished":""}">
        ${m.status==="finished"?"SELESAI":m.status==="live"?"LIVE":"TERJADWAL"}
      </div>
    </div>`).join("");
}

function renderNext(matches, teams16) {
  const el=$("nextMatch"); if(!el) return;
  const next=matches.find(m=>m.status!=="finished" && m.home && m.away) || matches[0];
  if(!next){el.innerHTML="<p class='muted'>Jadwal belum tersedia.</p>";return;}
  el.innerHTML=`<div class="next-card">
    <div class="next-info"><small>GRUP ${esc(next.group||"")} • PUTARAN ${next.round||""}</small></div>
    <div class="next-teams">${esc(teamName(next.home,teams16))}<div class="next-vs">VS</div>${esc(teamName(next.away,teams16))}</div>
    <div class="next-bottom"><span>${esc(fmtDate(next.date))} • ${esc(next.time||"")} WIB</span><span class="status">${next.status==="live"?"LIVE":"TERJADWAL"}</span></div>
  </div>`;
}

function renderKnockout(matches, groups, teams16) {
  const el=$("knockout"); if(!el)return;
  const a=groups.A[0]||"",b=groups.B[0]||"",c=groups.C[0]||"",d=groups.D[0]||"";
  const sf1=matches.find(m=>m.id==="SF1")||{}, sf2=matches.find(m=>m.id==="SF2")||{}, f=matches.find(m=>m.id==="F")||{};
  el.innerHTML=`
    <div class="card trophy"><h3>SEMIFINAL 1</h3><p><b>${esc(teamName(a,teams16))}</b> vs <b>${esc(teamName(b,teams16))}</b></p><div class="score">${sf1.homeScore??"-"} : ${sf1.awayScore??"-"}</div></div>
    <div class="card trophy"><h3>SEMIFINAL 2</h3><p><b>${esc(teamName(c,teams16))}</b> vs <b>${esc(teamName(d,teams16))}</b></p><div class="score">${sf2.homeScore??"-"} : ${sf2.awayScore??"-"}</div></div>
    <div class="card trophy"><h3>FINAL</h3><p>Pemenang semifinal</p><div class="score">${f.homeScore??"-"} : ${f.awayScore??"-"}</div></div>`;
}

function renderGallery(gallery) {
  const el=$("gallery"); if(!el)return;
  const arr=Object.values(gallery||{}).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  el.innerHTML=arr.length ? arr.map(x=>`<figure class="gallery-item"><img src="${esc(x.url)}" alt="${esc(x.caption||"Foto Liga Kita")}"><figcaption>${esc(x.caption||"Liga Kita Vol-I")}</figcaption></figure>`).join("") : "<p class='muted'>Belum ada foto.</p>";
}

async function loadPublic() {
  try {
    const [tSnap,gSnap,mSnap,oldSnap,galSnap] = await Promise.all([
      get(ref(db,"teams16")),
      get(ref(db,"groups")),
      get(ref(db,"matches")),
      get(ref(db,"teams")),
      get(ref(db,"gallery"))
    ]);

    const teams16 = normalizeTeams16(tSnap.exists()?tSnap.val():{});
    const groups = normalizeGroups(gSnap.exists()?gSnap.val():{}, teams16);

    // Compatibility: old admin data may still be under /teams.
    if (!tSnap.exists() && oldSnap.exists()) {
      const old=oldSnap.val()||{};
      for (const [id,v] of Object.entries(old)) {
        if (/^T\d+$/.test(id)) teams16[id]=v?.name || teams16[id];
      }
    }

    let stored = mSnap.exists() ? Object.values(mSnap.val()) : [];
    const template=scheduleTemplate(groups);
    const byId=Object.fromEntries(stored.map(m=>[m.id,m]));
    const matches=template.map(t=>({...t,...(byId[t.id]||{}),home:t.home,away:t.away,group:t.group,round:t.round,date:byId[t.id]?.date||t.date,time:byId[t.id]?.time||t.time}));
    ["SF1","SF2","F"].forEach(id=>{if(byId[id])matches.push(byId[id]);});

    renderTables(groups,matches,teams16);
    renderMatches(matches,teams16);
    renderNext(matches,teams16);
    renderKnockout(matches,groups,teams16);
    renderTeamList(teams16);
    renderGallery(galSnap.exists()?galSnap.val():{});
  } catch(e) {
    console.error(e);
    const targets=["tables","matches","teamList","nextMatch"];
    targets.forEach(id=>{if($(id))$(id).innerHTML=`<p class="muted">Data belum dapat dimuat.</p>`;});
  }
}

loadPublic();

try {
  onValue(ref(db,"teams16"), loadPublic);
  onValue(ref(db,"groups"), loadPublic);
  onValue(ref(db,"matches"), loadPublic);
  onValue(ref(db,"gallery"), loadPublic);
} catch(e) {
  console.warn("Realtime listener tidak aktif:",e);
}
