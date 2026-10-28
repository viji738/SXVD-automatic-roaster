const ROSTER_ROLE_FILTERS = ['All Employees','Managers Only','TL Only','Associates Only','Male Associates Only','Female Associates Only','Female Only (Associate + DHH)','DHH Only','PAs Only'];
function matchesRosterRole(e, f) {
  const r=String(e.role||'').trim().toLowerCase(), g=String(e.gender||'').trim().toLowerCase(), a=r==='associate'||r==='associates';
  if(f==='Managers Only') return r==='manager'||r==='managers';
  if(f==='TL Only') return ['tl','team lead','team leader'].includes(r);
  if(f==='Associates Only') return a;
  if(f==='Male Associates Only') return a&&g==='male';
  if(f==='Female Associates Only') return a&&g==='female';
  if(f==='Female Only (Associate + DHH)') return g==='female'&&(a||r==='dhh');
  if(f==='DHH Only') return r==='dhh';
  if(f==='PAs Only') return ['pa','pas','personal assistant','personal assistants'].includes(r);
  return true;
}
/* ===== SXVD AI Roster - all data stored in browser localStorage ===== */
const $ = s => document.querySelector(s);
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = [2026,2027,2028,2029,2030];
const GROUPS = {A:[0,1],B:[1,2],C:[2,3],D:[3,4],E:[4,5],F:[5,6],G:[6,0]};
const GNAME = g => g+' — '+GROUPS[g].map(d=>DAYS[d]).join(' & ');

const DEFAULT = {
  users:[],
  emps:[
    {id:1,name:'Dhanusri',group:'A',role:'Associate',gender:'Female',lc:'FT1'},
    {id:2,name:'Ravi Kumar',group:'B',role:'Associate',gender:'Male',lc:'FT2'},
    {id:3,name:'Priya',group:'C',role:'TL',gender:'Female',lc:'—'},
    {id:4,name:'Arun',group:'D',role:'DHH',gender:'Male',lc:'—'},
    {id:5,name:'Sowmya',group:'E',role:'Associate',gender:'Female',lc:'FT1'},
    {id:6,name:'Karthik',group:'F',role:'Manager',gender:'Male',lc:'—'}],
  settings:{ds:'09:45',de:'19:45',ns:'20:00',ne:'06:00',dayReq:10,nightReq:8},
  cons:{maxDays:5,minOff:2,nightDay:'No',useAvail:'Yes'},
  avail:[], roster:{}, notes:[], rule:'Balanced'
};
let S = JSON.parse(localStorage.getItem('sxvd') || 'null') || DEFAULT;
/* migrate data saved by older versions: 5 working days + 2 OFF per week */
if (S.cons.maxDays === 6 && S.cons.minOff === 1) { S.cons.maxDays = 5; S.cons.minOff = 2; S.roster = {}; }
S.rule = 'Balanced';
const save = () => localStorage.setItem('sxvd', JSON.stringify(S));
let user = null, page = 'dashboard', roleF = 'All Employees', empQ = '', empR = 'All', empG = 'All', empL = 'All';
let month = new Date().toISOString().slice(0,7);
/* keep month inside the 2026 - 2030 range */
if (+month.slice(0,4) < YEARS[0]) month = YEARS[0] + '-01';
if (+month.slice(0,4) > YEARS[YEARS.length-1]) month = YEARS[YEARS.length-1] + '-12';

const dayL = () => `${S.settings.ds}-${S.settings.de}`;
const nightL = () => `${S.settings.ns} - ${S.settings.ne}`;
const OFF = 'OFF';
const cls = v => v===OFF ? 'O' : v===dayL() ? 'D' : 'N';
const notify = (t,m) => { S.notes.unshift({t,m,at:new Date().toLocaleString(),read:false}); save(); if(document.querySelector('#nav')) buildNav(); };

/* ===== CUSTOM ICON SET + LOGO (inline SVG, no emoji) ===== */
const ic = p => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const ICONS = {
  dashboard: ic('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  employees: ic('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.4.2 4 2.1 4 4.8"/>'),
  roster:    ic('<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8 14h2M14 14h2M8 17.5h2"/>'),
  shift:     ic('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>'),
  cons:      ic('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>'),
  reports:   ic('<path d="M5 20v-8M11 20V5M17 20v-5M3 21h18"/>'),
  avail:     ic('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>'),
  ai:        ic('<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  notes:     ic('<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>'),
  users:     ic('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>'),
  dl:        ic('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4 20h16"/>')
};
/* SXVD logo: a mini roster grid (Day / Night / Off cells) + spark */
const LOGO = id => '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f7cff"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>'+
  '<rect width="48" height="48" rx="14" fill="url(#lg'+id+')"/>'+
  [['1','.55','.22'],['.55','.22','1'],['.22','1','.55']].map((row,r)=>row.map((o,c)=>'<rect x="'+(12+c*9)+'" y="'+(12+r*9)+'" width="6" height="6" rx="1.8" fill="#fff" fill-opacity="'+o+'"/>').join('')).join('')+
  '<path d="M40 3.5L41.3 6.7 44.5 8 41.3 9.3 40 12.5 38.7 9.3 35.5 8 38.7 6.7Z" fill="#fff"/></svg>';

document.querySelector('.logo').innerHTML = LOGO('a');
document.querySelector('.brand span').innerHTML = LOGO('b');

/* ===== AUTH ===== */
let signup = false;
$('#authSwitch').onclick = e => {
  e.preventDefault(); signup = !signup;
  $('#p2').classList.toggle('hide', !signup);
  $('#authTitle').textContent = signup ? 'Create your account' : 'Login to continue';
  $('#authBtn').textContent = signup ? '➕ Create Account' : '🔐 Login';
  $('#authSwitch').textContent = signup ? 'Back to Login' : 'Create Account';
  $('#authMsg').textContent = '';
};
$('#authBtn').onclick = () => {
  const u = $('#u').value.trim(), p = $('#p').value, r = $('#r').value, m = $('#authMsg');
  if (!u || !p) return m.textContent = 'Enter username and password.';
  if (signup) {
    if (p !== $('#p2').value) return m.textContent = 'Passwords do not match.';
    if (S.users.find(x => x.u.toLowerCase() === u.toLowerCase())) return m.textContent = 'Username already exists.';
    S.users.push({u,p,r}); save(); $('#authSwitch').click();
    m.style.color = '#4ade80'; m.textContent = 'Account created. Please login.';
  } else {
    const f = S.users.find(x => x.u === u && x.p === p && x.r === r);
    if (!f) return m.textContent = 'Invalid username, password or role.';
    user = f; notify('Login Successful', 'Welcome '+f.u+'.');
    $('#auth').classList.add('hide'); $('#app').classList.remove('hide');
    $('#who').textContent = `👤 ${f.u} (${f.r})`; buildNav(); go('dashboard');
  }
};
$('#logout').onclick = () => location.reload();

/* ===== NAV ===== */
const NAV = [
  ['dashboard','Dashboard'],['employees','Employees'],['roster','Monthly Roster'],
  ['PLANNING'],['shift','Shift Settings'],['cons','Constraints'],['reports','Reports'],
  ['EMPLOYEES'],['avail','Availability'],
  ['SMART TOOLS'],['ai','AI Roster Assistant'],['notes','Notifications'],
  ['ADMINISTRATION'],['users','Users']];
function buildNav() {
  const unread=S.notes.filter(n=>!n.read).length;
  $('#nav').innerHTML=NAV.map(n=>n.length===1
    ? '<small>'+n[0]+'</small>'
    : '<button data-p="'+n[0]+'" class="'+(n[0]===page?'active':'')+'"><span class="ni">'+ICONS[n[0]]+'</span><span class="nl">'+n[1]+'</span>'+(n[0]==='notes'&&unread?'<span class="nav-badge">'+unread+'</span>':'')+'</button>'
  ).join('');
  document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.p));
}
function go(p) {
  page = p; buildNav();
  $('#who').classList.toggle('hide', p !== 'dashboard');
  const t = NAV.find(n => n[0]===p)[1];
  $('#pageTitle').innerHTML = '<span class="ttl-ic">'+ICONS[p]+'</span>'+t;
  ({dashboard,employees,roster,shift,cons,reports,avail,ai,notes,users})[p]();
}

/* ===== ROSTER ENGINE =====
   Rules:
   1. 2 weeks DAY, then 2 weeks NIGHT (4-block cycle).
   2. Every work block = exactly 5 working days followed by the employee's 2 compulsory OFF days.
   3. A shift only changes right after the 2 OFF days, so NIGHT is never followed by DAY on the next day.
   Each employee's block starts the day after their week-off pair (their group) ends. */
const daysIn = m => new Date(+m.slice(0,4), +m.slice(5), 0).getDate();
const BASE = new Date(2025, 11, 28);   /* Sunday, 28 Dec 2025 */
function blockNo(dt, startDay) {
  const diff = Math.round((dt - BASE) / 86400000) - startDay;   /* blocks begin on weekday startDay */
  return Math.floor(diff / 7);
}

function generate(m = month) {
  const n = daysIn(m), out = {};
  S.emps.forEach((e, i) => {
    out[e.id] = [];
    const offs = GROUPS[e.group] || [0,1];
    const startDay = (offs[1] + 1) % 7;   /* work block starts the day after the 2nd OFF day */
    const phase = i % 4;                  /* spread staff over the cycle to balance DAY / NIGHT */
    for (let d = 1; d <= n; d++) {
      const dt = new Date(+m.slice(0,4), +m.slice(5)-1, d), wd = dt.getDay();
      const iso = `${m}-${String(d).padStart(2,'0')}`;
      let v;
      if (offs.includes(wd)) v = OFF;
      else if (S.cons.useAvail==='Yes' && S.avail.find(a => a.emp==e.id && a.date===iso && a.status!=='Available')) v = OFF;
      else {
        const pos = (((blockNo(dt, startDay) + phase) % 4) + 4) % 4;   /* 0,1 = DAY | 2,3 = NIGHT */
        v = pos < 2 ? dayL() : nightL();
      }
      out[e.id].push(v);
    }
  });
  S.roster[m] = out; save(); return out;
}
const getRoster = (m = month) => S.roster[m] || generate(m);

/* Headcount table (used by Dashboard + Reports) */
function hcTable(from, to) {
  const r = getRoster(), n = daysIn(month), idx = [];
  for (let d = from; d <= Math.min(to,n); d++) idx.push(d-1);
  const head = idx.map(i => { const dt = new Date(+month.slice(0,4), +month.slice(5)-1, i+1);
    return `<th>${DAYS[dt.getDay()]}<br>${String(i+1).padStart(2,'0')}/${month.slice(5)}</th>`; }).join('');
  let h = `<div class="scroll"><table><tr><th>Shift / HC</th>${head}</tr>`;
  const sh = [[dayL(),'Day'],[nightL(),'Night']];
  sh.forEach(([lab]) => {
    h += `<tr class="hd"><td colspan="${idx.length+1}">${lab} Shift — FT1 / FT2 Balanced</td></tr>`;
    const rows = [['Male',e=>e.gender==='Male'],['FT1',e=>e.lc==='FT1'],['FT2',e=>e.lc==='FT2'],['DHH',e=>e.role==='DHH']];
    rows.forEach(([name,f]) => {
      h += `<tr><td>${name}</td>` + idx.map(i => S.emps.filter(e => f(e) && r[e.id] && r[e.id][i]===lab).length).map(c=>`<td>${c}</td>`).join('') + '</tr>';
    });
    h += `<tr class="tot"><td>Total HC</td>` + idx.map(i => S.emps.filter(e => r[e.id] && r[e.id][i]===lab).length).map(c=>`<td>${c}</td>`).join('') + '</tr>';
  });
  h += `<tr class="yl"><td>Total Working HC</td>` + idx.map(i => S.emps.filter(e => r[e.id] && r[e.id][i]!==OFF).length).map(c=>`<td>${c}</td>`).join('') + '</tr></table></div>';
  return h;
}

/* ===== PAGES ===== */
function dashboard() {
  $('#view').innerHTML = `
  <div class="card"><h3>📊 Weekly Operations Overview <span class="tag" style="float:right">LIVE</span></h3>
  <p class="sub">Automatically recalculated whenever the roster or employee profile changes.</p>${hcTable(1,7)}</div>
  <div class="card"><h3>📅 Week-Off Planning <span class="tag" style="float:right">7 GROUPS</span></h3>
  <p class="sub">Weekly off groups used by the roster generator.</p><div class="grid">
  ${Object.keys(GROUPS).map(g => `<div class="grp"><h4>Group ${g}</h4><b>📅 ${GROUPS[g].map(d=>DAYS[d]).join('-')}</b>
  <p class="sub">Employees: ${S.emps.filter(e=>e.group===g).length}</p></div>`).join('')}</div></div>
  <div class="card"><h3>🔔 Latest Notifications</h3>${S.notes.slice(0,5).map(noteHTML).join('') || '<p class="sub">No notifications.</p>'}</div>`;
}
const noteHTML = n => '<div class="note '+(n.read?'read':'unread')+'"><b>'+n.t+'</b><br>'+n.m+'<br><small>'+n.at+'</small></div>';
function employees() {
  const list = S.emps.filter(e => (empR==='All'||e.role===empR) && (empG==='All'||e.gender===empG) && (empL==='All'||e.lc===empL) && (e.name.toLowerCase().includes(empQ.toLowerCase()) || String(e.id)===empQ));
  $('#view').innerHTML = `
  <div class="bar"><button class="btn" id="addE">➕ Add Employee</button></div>
  <div class="card"><div class="row f4"><div><label>🔎 Search Employee</label><input id="q" placeholder="Search by name or ID" value="${empQ}"></div>
  <div><label>🎯 Filter Role</label><select id="fr">${['All','Manager','TL','Associate','DHH','PA'].map(r=>`<option ${r===empR?'selected':''}>${r}</option>`).join('')}</select></div>
  <div><label>⚧ Gender</label><select id="fg">${['All','Male','Female'].map(g=>`<option ${g===empG?'selected':''}>${g}</option>`).join('')}</select></div>
  <div><label>📈 LC Curve</label><select id="fl">${[['All','All'],['FT1','FT1'],['FT2','FT2'],['—','None (—)']].map(([v,t])=>`<option value="${v}" ${v===empL?'selected':''}>${t}</option>`).join('')}</select></div></div></div>
  <div class="card scroll"><table><tr><th>ID</th><th>Employee Name</th><th>Group</th><th>Role</th><th>Gender</th><th>LC Curve</th><th>Actions</th></tr>
  ${list.map(e => `<tr><td>#${e.id}</td><td><b>${e.name}</b></td><td><span class="tag">Group ${e.group}</span></td>
  <td><span class="tag ${e.role}">${e.role}</span></td><td>${e.gender}</td><td>${e.lc}</td>
  <td><button class="btn" onclick="empForm(${e.id})">Edit</button> <button class="btn" onclick="delEmp(${e.id})">Delete</button></td></tr>`).join('')}</table></div>
  <dialog id="dlg"></dialog>`;
  $('#addE').onclick = () => empForm();
  $('#q').oninput = e => { empQ = e.target.value; employees(); $('#q').focus(); };
  $('#fr').onchange = e => { empR = e.target.value; employees(); };
  $('#fg').onchange = e => { empG = e.target.value; employees(); };
  $('#fl').onchange = e => { empL = e.target.value; employees(); };
}
function empForm(id) {
  const e = S.emps.find(x => x.id===id) || {name:'',group:'A',role:'Associate',gender:'Male',lc:'FT1'};
  const opt = (a,v) => a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
  $('#dlg').innerHTML = `<h3>${id?'Edit':'Add'} Employee</h3>
  <label>Name</label><input id="en" value="${e.name}">
  <label>Role</label><select id="er">${opt(['Manager','TL','Associate','DHH','PA'],e.role)}</select>
  <label>Gender</label><select id="eg">${opt(['Male','Female'],e.gender)}</select>
  <label>LC Curve</label><select id="el">${opt(['FT1','FT2','—'],e.lc)}</select>
  <label>Group (Week Off)</label><select id="ew">${Object.keys(GROUPS).map(g=>`<option value="${g}" ${g===e.group?'selected':''}>${GNAME(g)}</option>`).join('')}</select>
  <div class="bar" style="margin-top:16px"><button class="btn green" id="sv">💾 Save</button><button class="btn ghost" id="cn">Cancel</button></div>`;
  $('#dlg').showModal();
  $('#cn').onclick = () => $('#dlg').close();
  $('#sv').onclick = () => {
    if (!$('#en').value.trim()) return alert('Enter a name');
    const d = {name:$('#en').value.trim(),role:$('#er').value,gender:$('#eg').value,lc:$('#el').value,group:$('#ew').value};
    if (id) Object.assign(S.emps.find(x=>x.id===id), d);
    else S.emps.push({id:Math.max(0,...S.emps.map(x=>x.id))+1,...d});
    S.roster = {}; notify('Employee saved', d.name+' updated.'); save(); employees();
  };
}
function delEmp(id) {
  if (!confirm('Delete this employee?')) return;
  S.emps = S.emps.filter(e => e.id!==id); S.roster = {}; save(); employees();
}

function roster() {
  const r = getRoster(), n = daysIn(month);
  const list = S.emps.filter(e => matchesRosterRole(e, roleF));
  const curM = month.slice(5), curY = +month.slice(0,4);
  const heads = Array.from({length:n}, (_,i) => { const dt = new Date(+month.slice(0,4), +month.slice(5)-1, i+1);
    return `<th>${DAYS[dt.getDay()]}<br>${String(i+1).padStart(2,'0')}/${month.slice(5)}</th>`; }).join('');
  $('#view').innerHTML = `
  <div class="bar"><button class="btn" id="gen">${ICONS.ai}Generate Roster</button><button class="btn green" id="csv">${ICONS.dl}Export Excel</button>
  <button class="btn ghost" id="pm">◀ Prev</button><button class="btn ghost" id="nm">Next ▶</button></div>
  <div class="card ov"><div class="row"><div><label>Month & Year</label><div class="mp" id="mp"><button type="button" class="mp-btn" id="mpb"><span>${ICONS.roster}${MONTHS[+curM-1]} ${curY}</span><i>▾</i></button><div class="mp-pop hide" id="mpp"></div></div></div>
  <div><label>Roster Rule</label><select id="ru"><option value="Balanced" selected>2 Weeks DAY + 2 Weeks NIGHT (5 days work, 2 OFF)</option></select></div>
  <div><label>View Roster By Role</label><select id="rf">${ROSTER_ROLE_FILTERS.map(x=>'<option value="'+x+'" '+(x===roleF?'selected':'')+'>'+x+'</option>').join('')}</select></div></div>
  <div class="legend" style="margin-top:14px"><span class="D">${dayL()}</span><span class="N">${nightL()}</span><span class="O">🔴 OFF</span></div></div>
  <div class="card scroll"><table><tr><th>Employee</th><th>Role</th><th>Group</th><th>LC</th>${heads}</tr>
  ${list.map(e => `<tr><td><b>${e.name}</b></td><td><span class="tag ${e.role}">${e.role}</span></td><td>${e.group}</td><td>${e.lc}</td>
  ${(r[e.id]||[]).map((v,i)=>`<td style="padding:0"><select class="sh ${cls(v)}" onchange="setShift(${e.id},${i},this.value)">
  ${[dayL(),nightL(),OFF].map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</table></div>`;

  /* custom month + year picker */
  const pop = $('#mpp');
  let pickY = curY;
  const clampM = m => +m.slice(0,4) < YEARS[0] ? YEARS[0]+'-01' : +m.slice(0,4) > YEARS[YEARS.length-1] ? YEARS[YEARS.length-1]+'-12' : m;
  const drawPop = () => {
    const t = new Date(), tm = t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0');
    pop.innerHTML =
      '<div class="mp-years">'+YEARS.map(y=>'<button type="button" class="mp-y'+(y===pickY?' on':'')+'" data-y="'+y+'">'+y+'</button>').join('')+'</div>'+
      '<div class="mp-grid">'+MONTHS.map((m,i)=>{const v=pickY+'-'+String(i+1).padStart(2,'0');return '<button type="button" class="mp-m'+(v===month?' on':'')+(v===tm?' now':'')+'" data-m="'+v+'">'+m+'</button>';}).join('')+'</div>'+
      '<div class="mp-foot"><button type="button" class="mp-today" id="mpt">This Month</button></div>';
    pop.querySelectorAll('.mp-y').forEach(b=>b.onclick=e=>{ e.stopPropagation(); pickY=+b.dataset.y; drawPop(); });
    pop.querySelectorAll('.mp-m').forEach(b=>b.onclick=()=>{ month=b.dataset.m; roster(); });
    $('#mpt').onclick=()=>{ month=clampM(tm); roster(); };
  };
  $('#mpb').onclick = e => { e.stopPropagation(); pop.classList.toggle('hide'); if(!pop.classList.contains('hide')){ pickY=curY; drawPop(); } };
  const shiftMonth = k => {
    const d = new Date(+month.slice(0,4), +month.slice(5)-1+k, 1);
    const y = d.getFullYear();
    if (y < YEARS[0] || y > YEARS[YEARS.length-1]) return alert('Roster is available only for '+YEARS[0]+' to '+YEARS[YEARS.length-1]);
    month = y + '-' + String(d.getMonth()+1).padStart(2,'0'); roster();
  };
  $('#pm').onclick = () => shiftMonth(-1);
  $('#nm').onclick = () => shiftMonth(1);
  $('#ru').onchange = () => { generate(); roster(); };
  $('#rf').onchange = e => { roleF = e.target.value; roster(); };
  $('#gen').onclick = () => { generate(); notify('Roster generated', 'Roster for '+month+' generated.'); roster(); };
  $('#csv').onclick = exportExcel;
}
function setShift(id, i, v) { S.roster[month][id][i] = v; save(); roster(); }

/* ===== COLORED EXCEL EXPORT (DAY = yellow, NIGHT = blue, WEEK OFF = red) ===== */
function exportCSV() { exportExcel(); }   /* keeps old button calls working */
function exportExcel() {
  const r = getRoster(), n = daysIn(month);
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cell = (v, st) => '<Cell ss:StyleID="'+st+'"><Data ss:Type="String">'+esc(v)+'</Data></Cell>';
  const border = '<Borders>'+['Left','Right','Top','Bottom'].map(p=>'<Border ss:Position="'+p+'" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AA5C8"/>').join('')+'</Borders>';
  const style = (id, bg, fg, bold, align) =>
    '<Style ss:ID="'+id+'"><Alignment ss:Horizontal="'+(align||'Center')+'" ss:Vertical="Center" ss:WrapText="1"/>'+
    '<Font ss:FontName="Calibri" ss:Size="11" ss:Color="'+fg+'"'+(bold?' ss:Bold="1"':'')+'/>'+
    (bg?'<Interior ss:Color="'+bg+'" ss:Pattern="Solid"/>':'')+border+'</Style>';
  const styles =
    style('H','#1D3A8A','#FFFFFF',true)+            /* header */
    style('T','#FFFFFF','#000000',true,'Left')+     /* employee name */
    style('P','#FFFFFF','#000000',false)+           /* plain cells */
    style('D','#FFE699','#7A5A00',true)+            /* DAY shift   - yellow */
    style('N','#BDD7FF','#1D3FA8',true)+            /* NIGHT shift - blue   */
    style('O','#FFC7CE','#B00020',true);            /* WEEK OFF    - red    */
  const widths = '<Column ss:Width="120"/><Column ss:Width="70"/><Column ss:Width="55"/><Column ss:Width="45"/>'+
                 Array.from({length:n},()=>'<Column ss:Width="85"/>').join('');
  let rows = '<Row ss:Height="34">' + ['Employee','Role','Group','LC'].map(h=>cell(h,'H')).join('') +
    Array.from({length:n},(_,i)=>{
      const dt = new Date(+month.slice(0,4), +month.slice(5)-1, i+1);
      return cell(DAYS[dt.getDay()]+'\n'+String(i+1).padStart(2,'0')+'/'+month.slice(5),'H');
    }).join('') + '</Row>';
  S.emps.forEach(e => {
    rows += '<Row ss:Height="24">' + cell(e.name,'T') + cell(e.role,'P') + cell(e.group,'P') + cell(e.lc,'P') +
      (r[e.id]||[]).map(v => cell(v === OFF ? 'WEEK OFF' : v, cls(v))).join('') + '</Row>';
  });
  rows += '<Row/><Row>'+cell('Legend','T')+cell(dayL(),'D')+cell(nightL(),'N')+cell('WEEK OFF','O')+'</Row>';
  const xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'+
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
    '<Styles>'+styles+'</Styles>'+
    '<Worksheet ss:Name="Roster '+month+'"><Table>'+widths+rows+'</Table>'+
    '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><SplitVertical>4</SplitVertical><TopRowBottomPane>1</TopRowBottomPane><LeftColumnRightPane>4</LeftColumnRightPane><ActivePane>0</ActivePane></WorksheetOptions>'+
    '</Worksheet></Workbook>';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([xml], {type:'application/vnd.ms-excel'}));
  a.download = 'roster-' + month + '.xls';
  a.click();
}

function shift() {
  const s = S.settings, f = (id,l,v,t='time') => `<div><label>${l}</label><input id="${id}" type="${t}" value="${v}"></div>`;
  $('#view').innerHTML = `<div class="card"><div class="row">
  ${f('ds',dayL()+' Start',s.ds)}${f('de',dayL()+' End',s.de)}${f('ns',nightL()+' Start',s.ns)}${f('ne',nightL()+' End',s.ne)}
  ${f('dr','DAY Required',s.dayReq,'number')}${f('nr','NIGHT Required',s.nightReq,'number')}</div>
  <button class="btn green" id="sv" style="margin-top:16px">💾 Save Settings</button></div>`;
  $('#sv').onclick = () => {
    Object.assign(S.settings, {ds:$('#ds').value,de:$('#de').value,ns:$('#ns').value,ne:$('#ne').value,dayReq:+$('#dr').value,nightReq:+$('#nr').value});
    S.roster = {}; save(); alert('Settings saved'); shift();
  };
}
function cons() {
  const c = S.cons, yn = v => ['Yes','No'].map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
  $('#view').innerHTML = `<div class="card"><div class="row">
  <div><label>Maximum Consecutive Work Days</label><input id="c1" type="number" value="${c.maxDays}"></div>
  <div><label>Minimum Weekly OFF Days</label><input id="c2" type="number" value="${c.minOff}"></div>
  <div><label>Allow NIGHT → DAY Next Day</label><select id="c3">${yn(c.nightDay)}</select></div>
  <div><label>Use Availability in Roster</label><select id="c4">${yn(c.useAvail)}</select></div></div>
  <button class="btn green" id="sv" style="margin-top:16px">💾 Save Constraints</button></div>`;
  $('#sv').onclick = () => { S.cons = {maxDays:+$('#c1').value,minOff:+$('#c2').value,nightDay:$('#c3').value,useAvail:$('#c4').value}; S.roster = {}; save(); alert('Constraints saved'); };
}
function reports() {
  $('#view').innerHTML = `<div class="bar"><button class="btn" onclick="reports()">🔄 Refresh</button><button class="btn green" onclick="exportExcel()">📤 Download Monthly Excel</button></div>
  <div class="card"><h3>📈 Monthly Operations Overview</h3><p class="sub">Shows the full selected month. Updated ${new Date().toLocaleTimeString()}</p>${hcTable(1,31)}</div>`;
}

function avail() {
  const patterns=['1 Week DAY + 1 Week NIGHT','2 Weeks '+dayL()+' Shift','2 Weeks '+nightL()+' Shift','3 Weeks '+dayL()+' Shift','3 Weeks '+nightL()+' Shift','Customized'];
  $('#view').innerHTML='<div class="card"><div class="row">'+
    '<div><label>Employee</label><select id="ae">'+S.emps.map(e=>'<option value="'+e.id+'">'+e.name+' — '+e.role+'</option>').join('')+'</select></div>'+
    '<div><label>Date</label><input type="date" id="ad"></div>'+
    '<div><label>Status</label><select id="as"><option>Available</option><option>Leave</option><option>Sick</option></select></div>'+
    '<div><label>Shift Availability Pattern</label><select id="ap">'+patterns.map(p=>'<option>'+p+'</option>').join('')+'</select></div>'+
    '<div><label>Reason</label><input id="arn" placeholder="Optional"></div></div>'+
    '<button class="btn green" id="sv" style="margin-top:16px">💾 Save Availability</button></div>'+
    '<div class="card scroll"><table><tr><th>Employee</th><th>Date</th><th>Shift Pattern</th><th>Reason</th><th>Action</th></tr>'+
    (S.avail.map((a,i)=>'<tr><td>'+((S.emps.find(e=>e.id==a.emp)||{}).name||'?')+'</td><td>'+a.date+'</td><td>'+(a.pattern||a.status||'-')+'</td><td>'+(a.reason||'-')+'</td><td><button class="btn" onclick="delAv('+i+')">Delete</button></td></tr>').join('')||'<tr><td colspan="5">🟢 No availability records.</td></tr>')+
    '</table></div>';
  $('#sv').onclick=()=>{
    if(!$('#ad').value)return alert('Pick a date');
    S.avail.push({emp:$('#ae').value,date:$('#ad').value,status:$('#as').value,pattern:$('#ap').value,reason:$('#arn').value});
    S.roster={};save();avail();
  };
}
function delAv(i) { S.avail.splice(i,1); S.roster = {}; save(); avail(); }

/* Rule-based "AI" analysis of the roster */
function ai() {
  $('#view').innerHTML='<div class="bar" style="justify-content:flex-end"><button class="btn" id="an">✨ Analyze Roster</button></div>'+
    '<div class="ai-layout"><div class="card"><h3>Smart Analysis</h3><div id="out" class="chk"></div></div><div class="card"><h3>AI Checks</h3><div id="checks"></div></div></div>';
  $('#an').onclick=analyzeRoster; analyzeRoster();
}
function analyzeRoster() {
  const r=getRoster(), n=daysIn(month), s=S.settings, warnings=[];
  let dtot=0,ntot=0,off=0,covered=0,availOK=true,weeklyOK=true,consecOK=true,nightDayOK=true;
  for(let i=0;i<n;i++){
    const dc=S.emps.filter(e=>r[e.id]&&r[e.id][i]===dayL()).length,nc=S.emps.filter(e=>r[e.id]&&r[e.id][i]===nightL()).length;
    const date=month+'-'+String(i+1).padStart(2,'0'),d=new Date(+month.slice(0,4),+month.slice(5)-1,i+1),label=DAYS[d.getDay()]+' '+(i+1);
    dtot+=dc;ntot+=nc;off+=S.emps.filter(e=>r[e.id]&&r[e.id][i]===OFF).length;
    if(dc>=s.dayReq&&nc>=s.nightReq)covered++;
    if(dc<s.dayReq)warnings.push(label+': DAY coverage is '+dc+'/'+s.dayReq+'.');
    if(nc<s.nightReq)warnings.push(label+': NIGHT coverage is '+nc+'/'+s.nightReq+'.');
    S.avail.filter(a=>a.date===date&&['Leave','Sick'].includes(a.status)).forEach(a=>{if(r[a.emp]&&r[a.emp][i]!==OFF){availOK=false;warnings.push(label+': '+((S.emps.find(e=>e.id==a.emp)||{}).name||'Employee')+' is rostered during '+a.status+'.');}});
  }
  /* rule checks: max 5 work days, 2 OFF in every 7 days, no NIGHT -> DAY next day */
  const nd = S.cons.nightDay==='No';
  S.emps.forEach(e=>{
    const row=r[e.id]||[]; let run=0;
    const name=e.name;
    row.forEach((v,i)=>{
      run=v===OFF?0:run+1; if(run>S.cons.maxDays) consecOK=false;
      if(nd && i>0 && row[i-1]===nightL() && v===dayL()){
        nightDayOK=false;
        warnings.push(name+': NIGHT on day '+i+' followed by DAY on day '+(i+1)+' (no OFF in between).');
      }
      if(i>=6){
        const w=row.slice(i-6,i+1), offs=w.filter(x=>x===OFF).length;
        if(offs<S.cons.minOff || 7-offs>7-S.cons.minOff) weeklyOK=false;
      }
    });
  });
  const comp=n?Math.round(100*covered/n):0,balanced=Math.abs(dtot-ntot)<=Math.max(5,Math.round((dtot+ntot)*.2));
  const checks=[['DAY / NIGHT balance',balanced],['Employee availability',availOK],['Weekly OFF coverage',weeklyOK],['Consecutive work days',consecOK],['No NIGHT → DAY next day',nightDayOK],['Understaffing warnings',warnings.length===0]];
  let action='No understaffing warnings. Review the checks and generate the roster when ready.';
  if(warnings.length && S.emps.length < s.dayReq+s.nightReq) {
    action='Current roster has '+S.emps.length+' employees, while the daily targets total '+(s.dayReq+s.nightReq)+' shifts ('+s.dayReq+' DAY + '+s.nightReq+' NIGHT). Add staff or lower the shift requirements in Shift Settings, then generate the roster again.';
  } else if(warnings.length) {
    action='Review DAY/NIGHT requirements and employee shift assignments. Correct the affected staffing data, then generate the roster again.';
  }
  const warningHTML=warnings.length
    ? '<p class="warn">⚠️ '+warnings.length+' coverage warnings found: '+warnings.filter(x=>x.includes('DAY coverage')).length+' DAY and '+warnings.filter(x=>x.includes('NIGHT coverage')).length+' NIGHT.</p><details><summary>Show all '+warnings.length+' warnings</summary>'+warnings.map(x=>'<div class="warn">⚠️ '+x+'</div>').join('')+'</details>'
    : '<p>✅ No coverage warnings.</p>';
  $('#out').innerHTML='<h3>🤖 AI Roster Assistant Analysis</h3><p class="sub">Updated '+new Date().toLocaleString()+'</p>'+
    '<div class="chk"><b>Overall Compliance: '+comp+'%</b><br>Employees: '+S.emps.length+' | Male: '+S.emps.filter(e=>e.gender==='Male').length+' | Female: '+S.emps.filter(e=>e.gender==='Female').length+' | FT1: '+S.emps.filter(e=>e.lc==='FT1').length+' | FT2: '+S.emps.filter(e=>e.lc==='FT2').length+'</div>'+
    '<div class="chk"><b>First '+n+' Days:</b><br>'+dayL()+': '+dtot+' | '+nightL()+': '+ntot+' | 🔴 OFF: '+off+'<br>⚖️ FT1/FT2: Balanced</div>'+
    '<div class="chk"><b>AI Checks</b>'+warningHTML+'</div>'+
    '<div class="chk"><b>Recommended action</b><br>'+action+'</div>';
  $('#checks').innerHTML=checks.map(x=>'<div class="chk">'+(x[1]?'✅':'⚠️')+' '+x[0]+'</div>').join('');
}
function notes() {
  $('#view').innerHTML='<div class="bar" style="justify-content:flex-end"><button class="btn" id="markAllRead">✓ Mark All Read</button></div>'+
    '<div class="card">'+(S.notes.map(noteHTML).join('')||'<p class="sub">No notifications.</p>')+'</div>';
  $('#markAllRead').onclick=()=>{
    S.notes=[];            /* messages disappear once marked as read */
    save(); buildNav(); notes();
  };
}
function users() {
  const accounts=S.users.filter(u=>u.u.toLowerCase()!=='admin');
  $('#view').innerHTML='<div class="card scroll"><table><tr><th>Username</th><th>Role</th><th>Action</th></tr>'+
    '<tr><td>admin</td><td><span class="tag Manager">Manager</span></td><td>Default Admin</td></tr>'+
    accounts.map(u=>'<tr><td>'+u.u+'</td><td><span class="tag '+u.r+'">'+u.r+'</span></td><td><button class="btn" data-delete-user="'+encodeURIComponent(u.u)+'">Delete</button></td></tr>').join('')+
    '</table></div>';
  document.querySelectorAll('[data-delete-user]').forEach(b=>b.onclick=()=>deleteUser(decodeURIComponent(b.dataset.deleteUser)));
}
function deleteUser(username) {
  if(!confirm('Delete user "'+username+'"?'))return;
  const deletingCurrent=user&&user.u===username;
  S.users=S.users.filter(u=>u.u!==username);save();
  if(deletingCurrent){location.reload();return;}
  users();
}

/* close month-year picker on outside click or Esc */
document.addEventListener('click', e => { const p=$('#mpp'); if(p && !e.target.closest('#mp')) p.classList.add('hide'); });
document.addEventListener('keydown', e => { if(e.key==='Escape'){ const p=$('#mpp'); if(p) p.classList.add('hide'); } });