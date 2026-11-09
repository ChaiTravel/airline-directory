/* Chai Travel Advisors · Airline Directory · v2 */
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
const logo = (code, w, h) => `<span class="lgbox"><img src="https://pics.avs.io/${w}/${h}/${encodeURIComponent(code)}.png" width="${w}" height="${h}" alt="" loading="lazy" onerror="this.parentNode.classList.add('nologo')"><span class="fb">${esc(code)}</span></span>`;
const ICON_SEARCH = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5E5B5C" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>';
const ICON_INFO = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5M12 16h.01"></path></svg>';
const ICON_LINK = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B4C7E" stroke-width="2" stroke-linecap="round"><path d="M10 14a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1"></path><path d="M14 10a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"></path></svg>';
const initials = n => String(n || '?').trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const isAdmin = () => profile?.role === 'admin';
const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const fmtDate = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return dd + MON[+m - 1] + y.slice(2); };

/* ---------- auth ---------- */
let session = null, profile = null;
const SITE = location.origin + location.pathname.replace(/[^/]*$/, '');

function renderLogin(msg) {
  hdrRight.innerHTML = '';
  app.className = '';
  app.innerHTML = `<div class="login">
    <img src="chai-logo.png" alt="Chai Travel Advisors">
    <div><h2>Airline Directory</h2><p style="margin-top:10px">Every carrier. One <em>resource.</em></p></div>
    <div class="btns">
    <button class="btn" id="g"><svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg><span>Continue with Google</span></button>
    <button class="btn" id="m"><svg viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg><span>Continue with Microsoft</span></button>
    </div>
    <p class="fine">${msg ? esc(msg) : 'Access is by invitation. Not on the list? <a href="mailto:michael@chaitravel.com?subject=Airline%20Directory%20access">Ask an administrator</a>.'}</p>
    <p class="foot">Chai Travel Advisors · internal use</p>
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

const chip = a => (a.f1s_unavailable && isAdmin()) ? '<span class="chip warn">page unavailable</span>' : a.commission_status === 'commission' ? '<span class="chip ok">Commission</span>' : '<span class="chip no">No commission</span>';
const contactLine = c => c ? esc([c.name, c.phone, c.email].filter(Boolean).join(' · ') || c.label || '') : '';

/* ---------- index ---------- */
let filter = 'all', q = '', showRest = false;
async function renderIndex(alive = () => true) {
  const list = await loadAirlines();
  if (!alive()) return;
  app.className = '';
  const rows = list.filter(a => {
    if (filter === 'comm' && a.commission_status !== 'commission') return false;
    if (filter === 'nocomm' && a.commission_status === 'commission') return false;
    if (!q) return true;
    const h = [a.code, a.name, a.rep?.name, a.rep?.email, a.desk?.label, a.desk?.email, a.desk?.phone].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(w => h.includes(w));
  });
  const tile = a => `<a class="tile" href="#/airline/${esc(a.slug)}" title="${esc(a.name)}"><span class="top">${logo(a.code, 320, 160)}</span><span class="txt"><span class="codeline"><span class="code">${esc(a.code)}</span>${chip(a)}</span><span class="nm">${esc(a.name)}</span></span></a>`;
  const top = rows.filter(a => a.is_top), rest = rows.filter(a => !a.is_top);
  const searching = !!q || filter !== 'all';
  const expanded = searching || showRest;
  const group = (title, items) => items.length ? `<div class="grp"><h3>${title}<small>${items.length}</small></h3></div><div class="grid">${items.map(tile).join('')}</div>` : '';
  app.innerHTML = `
  <section class="hero"><div class="wrap-in">
    <p class="kicker">US point of sale · ${list.length} carriers</p>
    <h1>Find a carrier.</h1>
    <p class="sub">Sales contacts, support desks and commission contracts.</p>
    <div class="tools"><label class="search"><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search carriers</span>${ICON_SEARCH}<input type="search" id="q" placeholder="Carrier, code, rep, desk, email…" value="${esc(q)}" autocomplete="off"><button type="button" class="clear ${q ? 'show' : ''}" id="qx" aria-label="Clear search">✕</button></label></div>
  </div></section>
  <div class="wrap-in index-body">
    <div class="filters"><div class="seg"><button data-f="all" class="${filter === 'all' ? 'on' : ''}">All carriers</button><button data-f="comm" class="${filter === 'comm' ? 'on' : ''}">Commission</button><button data-f="nocomm" class="${filter === 'nocomm' ? 'on' : ''}">No commission</button></div><p class="count">${searching ? `${rows.length} of ${list.length} carriers` : ''}</p></div>
    ${rows.length ? '' : `<p class="nores">No carriers match “${esc(q)}”. Try the two-letter code or part of the name.</p>`}
    ${group('Top carriers', top)}
    ${expanded ? group(searching ? 'Other carriers' : 'All other carriers', rest) : (rest.length ? `<div class="more"><button id="more">Show all other carriers (${rest.length})</button></div>` : '')}
  </div>
  <footer class="site"><div class="wrap-in"><p class="note">Contract terms are an index of the documents on file, not verified commission rules.</p><p class="note">Source: airline partnership pages, US point of sale.</p></div></footer>`;
  const qi = document.getElementById('q');
  qi.oninput = e => { q = e.target.value; const pos = qi.selectionStart; renderIndex().then(() => { const n = document.getElementById('q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); };
  document.getElementById('qx').onclick = () => { q = ''; renderIndex().then(() => document.getElementById('q')?.focus()); };
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { filter = b.dataset.f; renderIndex(); });
  const more = document.getElementById('more'); if (more) more.onclick = () => { showRest = true; renderIndex(); };
}

/* ---------- carrier page ---------- */
async function renderAirline(slug, alive = () => true, editMode = false) {
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
  if (editMode) return renderAirlineEdit(a, { sections, contacts, contracts, links });
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
  app.className = '';
  const kindName = { sales_rep: 'Sales', support_desk: 'Support', groups: 'Groups', frequent_flyer: 'Frequent flyer', rates: 'Rates', refunds: 'Refunds', other: 'Other' };
  const admin = isAdmin();
  const today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  const main = [];
  // sales contacts: people cards
  const people = contacts.filter(c => c.kind === 'sales_rep' || (c.name && c.kind !== 'support_desk'));
  const desks = contacts.filter(c => !people.includes(c));
  const phones = [...desks.filter(c => c.phone), ...people.filter(c => c.phone)].slice(0, 5);
  const tel = p => { const d = p.replace(/\D/g, ''); return (d.startsWith('1') || p.startsWith('+')) ? '+' + d : '+1' + d; };
  const peopleCard = people.length ? `<div class="card people">${people.map(c => `<div class="contact">
      <span class="lab">${esc(c.label || kindName[c.kind] || '')}</span>
      ${c.name ? `<span class="name">${esc(c.name)}</span>` : ''}
      ${c.phone ? `<span class="tel">${linkify(c.phone)}${c.phone_mobile ? '<span class="tlab">desk</span>' : ''}</span>` : ''}
      ${c.phone_mobile ? `<span class="tel">${linkify(c.phone_mobile)}<span class="tlab">mobile</span></span>` : ''}
      ${c.email ? `<span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></span>` : ''}
      ${c.hours ? `<span class="muted" style="font-size:13px">${esc(c.hours)}</span>` : ''}
      ${c.notes ? `<span class="muted" style="font-size:13px">${linkify(c.notes)}</span>` : ''}</div>`).join('')}</div>` : '<div class="card people"><p class="empty">No sales contact on file.</p></div>';
  const quickCard = phones.length ? `<div class="quick">${phones.map(c => `<a href="tel:${tel(c.phone)}"><span class="lab">${esc(c.label || c.name || kindName[c.kind] || '')}</span><span class="tel">${esc(c.phone)}</span></a>`).join('')}</div>` : '<div class="quick empty-q"><p>No phone numbers on file.</p></div>';
  main.push(`<div class="toprow">
    <div class="sec"><h3>Sales contacts</h3>${peopleCard}</div>
    <div class="sec"><h3>Quick dial<small>Tap to call</small></h3>${quickCard}</div>
  </div>`);
  if (desks.length) main.push(`<div class="sec"><h3>Support desks</h3><div class="desks">${desks.map(c => `<div class="desk">
      <span><b>${esc(c.label || kindName[c.kind] || '')}</b>${c.name ? `<br><span class="muted" style="font-size:13px">${esc(c.name)}</span>` : ''}</span>
      <span class="tel">${c.phone ? linkify(c.phone) : c.queue ? `<span class="queue" title="Sabre queue">${esc(c.queue)}</span>` : c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '<span class="empty">—</span>'}</span>
      <span class="hrs">${[c.hours ? esc(c.hours) : '', (c.phone || c.queue) && c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '', c.phone && c.queue ? `<span class="queue">${esc(c.queue)}</span>` : '', c.notes ? linkify(c.notes) : ''].filter(Boolean).join(' · ')}</span></div>`).join('')}</div></div>`);
  if (contracts.length) {
    // Notes from the page text: the remainder of any line that starts with a contract title (minus the "(CODE)")
    const cLines = sections.filter(s => s.heading === 'Contracts & commission').flatMap(s => s.body.split('\n'));
    const cnotes = {}, leftover = [];
    for (const l of cLines) {
      const hit = contracts.filter(c => l.startsWith(c.title)).sort((x, y) => y.title.length - x.title.length)[0];
      if (!hit) { leftover.push(l); continue; }
      let rest = l.slice(hit.title.length).trim();
      if (hit.tour_code) rest = rest.replace(new RegExp('^\\(\\s*' + hit.tour_code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\)\\s*'), '');
      rest = rest.replace(/^\(\s*[A-Z0-9/# ]{3,20}\s*\)\s*/, '');
      for (const o of contracts) if (o.id !== hit.id && rest.includes(o.title)) rest = rest.replace(o.title, '').replace(/\(\s*[A-Z0-9/# ]{3,20}\s*\)/, '').trim();
      if (rest) cnotes[hit.id] = (cnotes[hit.id] ? cnotes[hit.id] + ' ' : '') + rest;
    }
    main.push(`<div class="sec"><h3>Contracts &amp; commission<small>An index of the documents on file, not verified commission rules</small></h3><div class="tbl"><table class="ctab"><thead><tr><th>Program</th><th>Tour code</th><th>Valid</th></tr></thead><tbody>${contracts.map(c => {
      const to = c.valid_to ? fmtDate(c.valid_to) : (c.valid_from ? 'UFN' : '');
      const cls = c.valid_to && c.valid_to < today ? 'exp' : c.valid_to && c.valid_to <= soon ? 'soon' : '';
      const doc = c.chai_file_path
        ? `<a class="pdf" href="#" data-doc="${esc(c.chai_file_path)}">${esc(c.title)}</a>`
        : c.f1s_pdf_url ? `<a class="pdf" href="${esc(c.f1s_pdf_url)}" target="_blank" rel="noopener" title="Opens on the partner SharePoint (separate login required)">${esc(c.title)}</a>` : esc(c.title);
      const valid = (c.valid_from || to) ? `<span class="dot"></span>${c.valid_from ? fmtDate(c.valid_from) + ' – ' : ''}${to}${cls === 'exp' ? ' · expired' : cls === 'soon' ? ' · expires soon' : ''}` : '<span class="empty">—</span>';
      return `<tr><td>${doc}${cnotes[c.id] ? `<div class="cnote">${lineHtml(cnotes[c.id])}</div>` : ''}</td><td class="tcode">${esc(c.tour_code || '')}</td><td class="${cls}">${valid}</td></tr>`;
    }).join('')}${leftover.map(l => `<tr class="extra"><td colspan="3">${lineHtml(l)}</td></tr>`).join('')}</tbody></table></div></div>`);
  }
  const secs = sections.filter(s => s.heading !== 'Contracts & commission').map(s => `<section class="s"><h3>${lineHtml(s.heading)}</h3>${s.body.split('\n').map(l => `<p>${lineHtml(l)}</p>`).join('')}</section>`).join('');
  const other = links.filter(k => !used.has(k.id) && !contracts.some(c => c.f1s_pdf_url === k.url));
  const otherSec = other.length ? `<div class="sec"><h3>Other links</h3><div class="card links">${other.map(k => k.chai_file_path
    ? `<a class="pdf" href="#" data-doc="${esc(k.chai_file_path)}"><span>${esc(k.label || k.chai_file_path.split('/').pop())}</span></a>`
    : `<a class="${k.is_pdf ? 'pdf' : ''}" href="${esc(k.url)}" target="_blank" rel="noopener">${k.is_pdf ? '' : ICON_LINK}<span>${esc(k.label || k.url)}</span></a>`).join('')}</div></div>` : '';
  const adminNote = admin ? `<p class="note">Last captured ${a.f1s_captured_at ? new Date(a.f1s_captured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}.${a.verified_at ? '' : ' Not yet verified by Chai.'}</p>` : '';
  app.innerHTML = `
  <div class="ahead-wrap"><div class="wrap-in">
    <nav class="crumb" aria-label="Breadcrumb"><a href="#/">Airlines</a><span aria-hidden="true">/</span><b>${esc(a.name)}</b></nav>
    <div class="ahead">${logo(a.code, 352, 176)}
      <div class="ttl">
        <div class="row1"><h2>${esc(a.name)}</h2>${chip(a)}</div>
        <p class="meta"><span class="big">${esc(a.code)}</span>${a.is_top ? '<span>Top carrier</span>' : ''}<span>US point of sale</span></p>
      </div>
      <span class="src"><button class="mini" id="rep">Report a problem</button>${admin ? `<a class="mini dark" href="#/airline/${esc(a.slug)}/edit">Edit</a>` : ''}</span>
    </div>
  </div></div>
  <div class="body"><div class="wrap-in">
    <div class="mainc">
      ${a.notes ? `<p class="chai-note">${ICON_INFO}<span><strong>Chai note.</strong> ${linkify(a.notes)}</span></p>` : ''}
      ${admin && a.f1s_unavailable ? `<p class="chai-note admin">${ICON_INFO}<span><strong>Admin note · hidden from advisors.</strong> The partner page for this carrier did not load during capture.</span></p>` : ''}
      ${main.join('')}
      ${secs}
      ${otherSec}
      ${adminNote}
    </div>
  </div></div>`;
  document.getElementById('rep').onclick = () => reportProblem(a);
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
  const onAdmin = location.hash.startsWith('#/admin');
  hdrRight.innerHTML = `<a href="#/" class="${onAdmin ? '' : 'on'}">Airlines</a>${profile.role === 'admin' ? `<a href="#/admin" class="${onAdmin ? 'on' : ''}">Admin</a>` : ''}<span class="who">${esc(profile.full_name || profile.email)}${profile.role === 'admin' ? ' · admin' : ''}</span><span class="avatar" aria-hidden="true">${esc(initials(profile.full_name || profile.email))}</span><button id="out">Sign out</button>`;
  document.getElementById('out').onclick = signOut;
  const m = location.hash.match(/^#\/airline\/([a-z0-9\-]+)(\/edit)?/);
  app.className = (onAdmin || (m && m[2])) ? 'epage' : '';
  try {
    const work = location.hash.startsWith('#/admin') ? renderAdmin() : m ? renderAirline(m[1], () => seq === routeSeq, !!m[2] && profile.role === 'admin') : renderIndex(() => seq === routeSeq);
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
