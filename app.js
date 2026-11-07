/* Chai Travel Advisors · Airline Directory · v1 (read-only) */
const SUPABASE_URL = 'https://ijidkximugxmbxwbvdcs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wN5ikRMw9-4K8kS1B2_xJw_E1DNjXdv'; // publishable key: safe in the page, RLS enforces access
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById('app');
const hdrRight = document.getElementById('hdr-right');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EMAIL = /[\w][\w.\-+]*@[\w.\-]+\.\w+/g, URLR = /(https?:\/\/[^\s)]+|\bwww\.[\w.\-\/]+[\w\/])/g, PHONE = /(\+?\d[\d .\-()]{7,}\d)/g;
function linkify(t) {
  let s = esc(t);
  s = s.replace(URLR, m => `<a href="${m.startsWith('http') ? m : 'https://' + m}" target="_blank" rel="noopener">${m}</a>`);
  s = s.replace(EMAIL, m => s.includes('href="mailto:' + m) ? m : `<a href="mailto:${m}">${m}</a>`);
  s = s.replace(PHONE, m => { const d = m.replace(/\D/g, ''); return d.length >= 10 && d.length <= 15 && !/^\d{2}[A-Z]{3}\d{2}$/.test(m) ? `<a href="tel:${(d.startsWith('1') || m.startsWith('+')) ? '+' + d : '+1' + d}">${m}</a>` : m; });
  return s;
}
const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const fmtDate = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return dd + MON[+m - 1] + y.slice(2); };

/* ---------- auth ---------- */
let session = null, profile = null;
const SITE = location.origin + location.pathname.replace(/[^/]*$/, '');

function renderLogin(msg) {
  hdrRight.innerHTML = '';
  app.innerHTML = `<div class="login">
    <h2>Sign in</h2>
    <p>${msg ? esc(msg) : 'Use the Google or Microsoft account Chai has on file for you.'}</p>
    <button class="btn" id="g"><svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Sign in with Google</button>
    <button class="btn" id="m"><svg viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>Sign in with Microsoft</button>
    <p class="muted" style="margin-top:28px;font-size:12px">Chai Travel Advisors · internal use</p>
  </div>`;
  document.getElementById('g').onclick = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: SITE } });
  document.getElementById('m').onclick = () => sb.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: SITE, scopes: 'email openid profile' } });
}

function renderNotAuthorized() {
  hdrRight.innerHTML = `<span>${esc(session.user.email)}</span><button id="out">Sign out</button>`;
  document.getElementById('out').onclick = signOut;
  app.innerHTML = `<div class="notice"><h2 style="margin-top:0">Not yet authorized</h2>
    <p>You signed in as <strong>${esc(session.user.email)}</strong>, but that address isn’t on the Chai Travel advisor list for this directory.</p>
    <p>If you’re a Chai advisor, email <a href="mailto:michael@chaitravel.com?subject=Airline%20Directory%20access">michael@chaitravel.com</a> from the address you’d like to use and we’ll add you.</p></div>`;
}

async function signOut() { await sb.auth.signOut(); session = null; profile = null; location.hash = '#/'; renderLogin(); }

async function loadProfile() {
  const { data } = await sb.from('profiles').select('email,full_name,role,is_active').eq('id', session.user.id).maybeSingle();
  profile = data;
}

/* ---------- data ---------- */
let AIRLINES = null;
async function loadAirlines() {
  if (AIRLINES) return AIRLINES;
  const { data, error } = await sb.from('airlines').select('id,code,name,slug,commission_status,f1s_unavailable,is_top').order('name');
  if (error) throw error;
  // sales rep + support desk + contract count for the index
  const [{ data: contacts }, { data: contracts }] = await Promise.all([
    sb.from('contacts').select('airline_id,kind,label,name,phone,email').in('kind', ['sales_rep', 'support_desk']).order('position'),
    sb.from('contracts').select('airline_id')
  ]);
  const byA = {};
  for (const c of contacts || []) { const b = byA[c.airline_id] ||= { rep: null, desk: null, n: 0 }; if (c.kind === 'sales_rep' && !b.rep) b.rep = c; if (c.kind === 'support_desk' && !b.desk) b.desk = c; }
  for (const c of contracts || []) { (byA[c.airline_id] ||= { rep: null, desk: null, n: 0 }).n++; }
  AIRLINES = data.map(a => ({ ...a, ...(byA[a.id] || { rep: null, desk: null, n: 0 }) }));
  return AIRLINES;
}

const chip = a => a.f1s_unavailable ? '<span class="chip warn">page unavailable</span>' : a.commission_status === 'commission' ? '<span class="chip ok">Commission</span>' : '<span class="chip no">No commission</span>';
const contactLine = c => c ? esc([c.name, c.phone, c.email].filter(Boolean).join(' · ') || c.label || '') : '';

/* ---------- index ---------- */
let filter = 'all', q = '', sortKey = 'name', sortDir = 1;
async function renderIndex(alive = () => true) {
  const list = await loadAirlines();
  if (!alive()) return;
  const rows = list.filter(a => {
    if (filter === 'comm' && a.commission_status !== 'commission') return false;
    if (filter === 'nocomm' && a.commission_status === 'commission') return false;
    if (!q) return true;
    const h = [a.code, a.name, a.rep?.name, a.rep?.email, a.desk?.label, a.desk?.email, a.desk?.phone].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(w => h.includes(w));
  }).sort((x, y) => {
    const v = k => k === 'rep' ? (x.rep?.name || '') : k === 'desk' ? (x.desk?.label || '') : (x[k] || '');
    const w = k => k === 'rep' ? (y.rep?.name || '') : k === 'desk' ? (y.desk?.label || '') : (y[k] || '');
    const a = String(v(sortKey)).toLowerCase(), b = String(w(sortKey)).toLowerCase();
    return a < b ? -sortDir : a > b ? sortDir : 0;
  });
  const rowHtml = a => `<tr class="row" data-slug="${esc(a.slug)}"><td>${esc(a.name)}</td><td class="code">${esc(a.code)}</td><td>${chip(a)}</td><td>${contactLine(a.rep) || '<span class="empty">—</span>'}</td><td>${a.desk ? esc([a.desk.label, a.desk.phone].filter(Boolean).join(': ')) : '<span class="empty">—</span>'}</td></tr>`;
  const head = `<thead><tr><th data-k="name">Airline</th><th data-k="code">Code</th><th data-k="commission_status">Status</th><th data-k="rep">Sales contact</th><th data-k="desk">Support desk</th></tr></thead>`;
  const top = rows.filter(a => a.is_top), rest = rows.filter(a => !a.is_top);
  const group = (title, list) => list.length ? `<h3 class="grp">${title} <span class="muted">(${list.length})</span></h3><div class="wrap"><table>${head}<tbody>${list.map(rowHtml).join('')}</tbody></table></div>` : '';
  app.innerHTML = `
  <div class="tools"><input type="search" id="q" placeholder="Search carrier, code, rep, desk, email…" value="${esc(q)}">
  <div class="seg"><button data-f="all" class="${filter === 'all' ? 'on' : ''}">All</button><button data-f="comm" class="${filter === 'comm' ? 'on' : ''}">Commission</button><button data-f="nocomm" class="${filter === 'nocomm' ? 'on' : ''}">No commission</button></div></div>
  <p class="count">${rows.length} of ${list.length} carriers</p>
  ${group('Top carriers', top)}
  ${group('All other carriers', rest)}
  <p class="note">Source: First in Service partnership pages, US point of sale. Contract documents open from Chai’s own library (a few still link to the F1S SharePoint). Contract terms are an index, not verified commission rules.</p>`;
  const qi = document.getElementById('q');
  qi.oninput = e => { q = e.target.value; const pos = qi.selectionStart; renderIndex().then(() => { const n = document.getElementById('q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); };
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { filter = b.dataset.f; renderIndex(); });
  document.querySelectorAll('th[data-k]').forEach(t => t.onclick = () => { if (sortKey === t.dataset.k) sortDir = -sortDir; else { sortKey = t.dataset.k; sortDir = 1; } renderIndex(); });
  document.querySelectorAll('tr.row').forEach(r => r.onclick = () => { location.hash = '#/airline/' + r.dataset.slug; });
}

/* ---------- carrier page ---------- */
async function renderAirline(slug, alive = () => true) {
  app.innerHTML = '<p class="muted">Loading…</p>';
  const { data: a } = await sb.from('airlines').select('*').eq('slug', slug).maybeSingle();
  if (!alive()) return;
  if (!a) { app.innerHTML = '<p class="empty">Carrier not found.</p>'; return; }
  const [{ data: sections }, { data: contacts }, { data: contracts }, { data: links }] = await Promise.all([
    sb.from('airline_sections').select('*').eq('airline_id', a.id).order('position'),
    sb.from('contacts').select('*').eq('airline_id', a.id).order('position'),
    sb.from('contracts').select('*').eq('airline_id', a.id).order('position'),
    sb.from('links').select('*').eq('airline_id', a.id).order('position')
  ]);
  if (!alive()) return;
  const used = new Set();
  function lineHtml(l) {
    const hits = [];
    for (const k of [...links].sort((x, y) => (y.label || '').length - (x.label || '').length)) {
      if (!k.label || k.label.length < 3) continue;
      const i = l.indexOf(k.label); if (i < 0) continue;
      const before = l[i - 1] || ' ', after = l[i + k.label.length] || ' ';
      if (/[\w\/.]/.test(before) || /[\w\/]/.test(after)) continue;
      if (hits.some(h => i < h.end && i + k.label.length > h.start)) continue;
      hits.push({ start: i, end: i + k.label.length, k }); used.add(k.id);
    }
    if (!hits.length) return linkify(l);
    hits.sort((p, r) => p.start - r.start); let out = '', pos = 0;
    for (const h of hits) { out += linkify(l.slice(pos, h.start)) + `<a class="${h.k.is_pdf ? 'pdf' : ''}" href="${esc(h.k.url)}" target="_blank" rel="noopener">${esc(l.slice(h.start, h.end))}</a>`; pos = h.end; }
    return out + linkify(l.slice(pos));
  }
  const kindName = { sales_rep: 'Sales', support_desk: 'Support', groups: 'Groups', frequent_flyer: 'Frequent flyer', rates: 'Rates', refunds: 'Refunds', other: 'Other' };
  const cards = [];
  if (contacts.length) cards.push(`<div class="card"><h3>Contacts</h3>${contacts.map(c => `<p class="contact"><span class="lab">${esc(c.label || kindName[c.kind])}</span><br>${c.name ? `<span class="name">${esc(c.name)}</span> ` : ''}${c.phone ? linkify(c.phone) + ' ' : ''}${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}${c.hours ? `<br><span class="muted">${esc(c.hours)}</span>` : ''}</p>`).join('')}</div>`);
  const today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  if (contracts.length) {
    // Notes from the page text: the remainder of any line that starts with a contract title (minus the "(CODE)")
    const cLines = sections.filter(s => s.heading === 'Contracts & commission').flatMap(s => s.body.split('\n'));
    const notes = {}, leftover = [];
    for (const l of cLines) {
      const hit = contracts.filter(c => l.startsWith(c.title)).sort((x, y) => y.title.length - x.title.length)[0];
      if (!hit) { leftover.push(l); continue; }
      let rest = l.slice(hit.title.length).trim();
      if (hit.tour_code) rest = rest.replace(new RegExp('^\\(\\s*' + hit.tour_code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\)\\s*'), '');
      rest = rest.replace(/^\(\s*[A-Z0-9/# ]{3,20}\s*\)\s*/, '');
      for (const o of contracts) if (o.id !== hit.id && rest.includes(o.title)) rest = rest.replace(o.title, '').replace(/\(\s*[A-Z0-9/# ]{3,20}\s*\)/, '').trim();
      if (rest) notes[hit.id] = (notes[hit.id] ? notes[hit.id] + ' ' : '') + rest;
    }
    cards.push(`<div class="card wide"><h3>Contracts &amp; commission (${contracts.length})</h3><table class="ctab"><thead><tr><th>Program</th><th>Tour code</th><th>Valid</th></tr></thead><tbody>${contracts.map(c => {
      const to = c.valid_to ? fmtDate(c.valid_to) : (c.valid_from ? 'UFN' : '');
      const cls = c.valid_to && c.valid_to < today ? 'exp' : c.valid_to && c.valid_to <= soon ? 'soon' : '';
      const doc = c.chai_file_path
        ? `<a class="pdf" href="#" data-doc="${esc(c.chai_file_path)}">${esc(c.title)}</a>`
        : c.f1s_pdf_url ? `<a class="pdf" href="${esc(c.f1s_pdf_url)}" target="_blank" rel="noopener" title="Opens on the F1S SharePoint (F1S login required)">${esc(c.title)}</a>` : esc(c.title);
      return `<tr><td>${doc}${notes[c.id] ? `<div class="cnote">${lineHtml(notes[c.id])}</div>` : ''}</td><td>${esc(c.tour_code || '')}</td><td class="${cls}">${c.valid_from ? fmtDate(c.valid_from) + ' – ' : ''}${to}${cls === 'exp' ? ' (expired)' : ''}</td></tr>`;
    }).join('')}${leftover.map(l => `<tr class="extra"><td colspan="3">${lineHtml(l)}</td></tr>`).join('')}</tbody></table></div>`);
  }
  const secs = sections.filter(s => s.heading !== 'Contracts & commission').map(s => `<section class="s"><h3>${lineHtml(s.heading)}</h3>${s.body.split('\n').map(l => `<p>${lineHtml(l)}</p>`).join('')}</section>`).join('');
  const other = links.filter(k => !used.has(k.id) && !contracts.some(c => c.f1s_pdf_url === k.url));
  app.innerHTML = `<a class="back" href="#/">← All airlines</a>
  <div class="ahead"><span class="big">${esc(a.code)}</span><h2>${esc(a.name)}</h2>${chip(a)}<span class="src"><a href="${esc(a.f1s_source_url)}" target="_blank" rel="noopener">F1S source page</a></span></div>
  ${a.f1s_unavailable ? '<p class="empty">The F1S page for this carrier did not load during capture.</p>' : ''}
  <div class="cards">${cards.join('')}</div>
  ${secs}
  ${other.length ? `<section class="s"><h3>Other links</h3>${other.map(k => `<p><a class="${k.is_pdf ? 'pdf' : ''}" href="${esc(k.url)}" target="_blank" rel="noopener">${esc(k.label || k.url)}</a></p>`).join('')}</section>` : ''}
  <p class="note">Captured from the F1S page “${esc(a.f1s_page_title || a.name)}” on ${new Date(a.f1s_captured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Not yet verified by Chai.</p>`;
  // contract documents served from Chai's own storage via short-lived signed links
  document.querySelectorAll('a[data-doc]').forEach(a => a.onclick = async ev => {
    ev.preventDefault();
    const w = window.open('', '_blank');
    const { data, error } = await sb.storage.from('contracts').createSignedUrl(a.dataset.doc, 600);
    if (error || !data) { if (w) w.close(); alert('Could not open the document: ' + (error?.message || 'unknown error')); return; }
    if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
  });
  window.scrollTo(0, 0);
}

/* ---------- routing ---------- */
let routeSeq = 0;
async function route() {
  const seq = ++routeSeq;            // only the latest navigation may paint
  if (!session) return renderLogin();
  if (!profile) await loadProfile();
  if (seq !== routeSeq) return;
  if (!profile || !profile.is_active) return renderNotAuthorized();
  hdrRight.innerHTML = `<span>${esc(profile.full_name || profile.email)}${profile.role !== 'viewer' ? ' · ' + esc(profile.role) : ''}</span><button id="out">Sign out</button>`;
  document.getElementById('out').onclick = signOut;
  const m = location.hash.match(/^#\/airline\/([a-z0-9\-]+)/);
  try {
    const work = m ? renderAirline(m[1], () => seq === routeSeq) : renderIndex(() => seq === routeSeq);
    await Promise.race([work, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))]);
  } catch (e) {
    if (seq !== routeSeq) return;
    app.innerHTML = `<p class="empty">Couldn’t load data (${esc(e.message || e)}). <a href="#" id="retry">Try again</a></p>`;
    document.getElementById('retry').onclick = ev => { ev.preventDefault(); AIRLINES = null; route(); };
  }
}
window.addEventListener('hashchange', route);

(async () => {
  const { data } = await sb.auth.getSession();
  session = data.session;
  // Never await Supabase calls inside this callback (it holds the auth lock); defer instead.
  sb.auth.onAuthStateChange((ev, s) => {
    session = s;
    if (ev === 'SIGNED_OUT') { profile = null; setTimeout(route, 0); }
    else if (ev === 'SIGNED_IN') { profile = null; setTimeout(route, 0); }
  });
  if (location.hash.includes('access_token=')) history.replaceState(null, '', location.pathname + '#/');
  route();
})();
