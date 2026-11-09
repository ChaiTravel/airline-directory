/* Chai Travel Advisors · Airline Directory · editor + admin (admins only) */

/* ---------- generic modal form ---------- */
function modalForm(title, fields, values = {}) {
  return new Promise(resolve => {
    const wrap = document.createElement('div'); wrap.className = 'modal-bg';
    const inp = f => {
      const v = values[f.key] ?? f.default ?? '';
      if (f.type === 'select') return `<select name="${f.key}">${f.options.map(o => `<option value="${esc(o[0])}" ${o[0] === v ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
      if (f.type === 'textarea') return `<textarea name="${f.key}" rows="${f.rows || 6}">${esc(v)}</textarea>`;
      if (f.type === 'checkbox') return `<input type="checkbox" name="${f.key}" ${v ? 'checked' : ''}>`;
      if (f.type === 'file') return `<input type="file" name="${f.key}" accept="${f.accept || ''}">`;
      return `<input type="${f.type || 'text'}" name="${f.key}" value="${esc(v)}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}>`;
    };
    wrap.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><form>${fields.map(f => `<label class="fld ${f.type === 'checkbox' ? 'chk' : ''}"><span>${esc(f.label)}${f.hint ? ` <small>${esc(f.hint)}</small>` : ''}</span>${inp(f)}</label>`).join('')}
      <div class="modal-actions"><button type="button" class="btn2" data-x>Cancel</button><button type="submit" class="btn2 primary">Save</button></div></form></div>`;
    document.body.appendChild(wrap);
    const close = v => { wrap.remove(); resolve(v); };
    wrap.querySelector('[data-x]').onclick = () => close(null);
    wrap.onclick = e => { if (e.target === wrap) close(null); };
    wrap.querySelector('form').onsubmit = e => {
      e.preventDefault(); const out = {};
      for (const f of fields) {
        const el = e.target.elements[f.key];
        if (f.type === 'checkbox') out[f.key] = el.checked;
        else if (f.type === 'file') out[f.key] = el.files[0] || null;
        else out[f.key] = el.value.trim() === '' ? null : el.value.trim();
      }
      close(out);
    };
    const first = wrap.querySelector('input,textarea,select'); if (first) first.focus();
  });
}
const confirmBox = msg => Promise.resolve(window.confirm(msg));
function toast(msg, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
async function run(p, okMsg) { const { error } = await p; if (error) { toast(error.message, true); return false; } if (okMsg) toast(okMsg); AIRLINES = null; return true; }

/* ---------- field specs ---------- */
const KINDS = [['sales_rep', 'Sales rep'], ['support_desk', 'Support desk'], ['groups', 'Groups'], ['frequent_flyer', 'Frequent flyer'], ['rates', 'Rates'], ['refunds', 'Refunds'], ['other', 'Other']];
const F = {
  airline: [
    { key: 'name', label: 'Airline name' }, { key: 'code', label: 'Code' },
    { key: 'commission_status', label: 'Commission status', type: 'select', options: [['commission', 'Commission'], ['none', 'No commission'], ['unknown', 'Unknown']] },
    { key: 'is_top', label: 'Show in Top carriers', type: 'checkbox' },
    { key: 'is_archived', label: 'Archived (hidden from advisors)', type: 'checkbox', hint: 'for carriers that have ceased operations or merged' },
    { key: 'notes', label: 'Chai notes', type: 'textarea', rows: 3, hint: 'shown at the top of the page' }
  ],
  contact: [
    { key: 'kind', label: 'Type', type: 'select', options: KINDS }, { key: 'label', label: 'Label', placeholder: 'e.g. Agency Desk (24/7)' },
    { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone (desk)', placeholder: '800.555.1212' }, { key: 'phone_mobile', label: 'Mobile', placeholder: 'reps only' }, { key: 'email', label: 'Email', type: 'email' },
    { key: 'queue', label: 'GDS queue', placeholder: 'e.g. QP/QBA10/4', hint: 'Sabre queue for rate desks' }, { key: 'hours', label: 'Hours' }, { key: 'notes', label: 'Notes', hint: 'shown under the contact' }
  ],
  contract: [
    { key: 'title', label: 'Program title' }, { key: 'tour_code', label: 'Tour code' },
    { key: 'valid_from', label: 'Valid from', type: 'date' }, { key: 'valid_to', label: 'Valid to', type: 'date', hint: 'blank = until further notice' },
    { key: 'status', label: 'Status', type: 'select', options: [['unreviewed', 'Unreviewed'], ['active', 'Active'], ['expired', 'Expired'], ['superseded', 'Superseded']] },
    { key: 'summary', label: 'Summary / notes', type: 'textarea', rows: 4 },
    { key: 'file', label: 'Upload PDF', type: 'file', accept: '.pdf', hint: 'replaces the document' }
  ],
  section: [{ key: 'heading', label: 'Heading' }, { key: 'body', label: 'Text', type: 'textarea', rows: 10, hint: 'one paragraph per line' }],
  link: [{ key: 'label', label: 'Label' }, { key: 'url', label: 'URL', type: 'url' }, { key: 'is_pdf', label: 'Is a PDF', type: 'checkbox' }],
  user: [
    { key: 'email', label: 'Email', type: 'email' }, { key: 'full_name', label: 'Name' },
    { key: 'role', label: 'Role', type: 'select', options: [['user', 'User'], ['admin', 'Admin']] },
    { key: 'advisor_type', label: 'Type', type: 'select', options: [['ic', 'IC'], ['house', 'House'], ['staff', 'Staff']] },
    { key: 'notes', label: 'Notes' }
  ]
};
const strip = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => keys.includes(k)));

/* ---------- carrier page: edit mode ---------- */
async function renderAirlineEdit(a, d) {
  const { sections, contacts, contracts, links } = d;
  const row = (html, actions) => `<div class="erow"><div class="etext">${html}</div><div class="eact">${actions}</div></div>`;
  const act = (t, id, extra = '') => `<button class="mini" data-t="${t}" data-id="${id}" ${extra}>${t === 'del' ? 'Delete' : t === 'up' ? '↑' : t === 'down' ? '↓' : 'Edit'}</button>`;
  app.innerHTML = `<a class="back" href="#/airline/${esc(a.slug)}">← Done editing</a>
  <div class="ahead"><span class="big">${esc(a.code)}</span><h2>${esc(a.name)}</h2><span class="chip warn">EDITING</span>
    <span class="src"><button class="mini" data-t="airline">Edit carrier</button> <button class="mini" data-t="verify">Mark verified</button> <button class="mini" data-t="history">History</button></span></div>
  ${a.notes ? `<p class="chai-note">${linkify(a.notes)}</p>` : ''}
  <section class="s"><h3>Contacts <button class="mini" data-t="add-contact">+ Add</button></h3>
    ${contacts.map(c => row(`<b>${esc(c.label || c.kind)}</b> · ${esc([c.name, c.phone, c.phone_mobile, c.queue, c.email, c.hours].filter(Boolean).join(' · '))}`, act('contact', c.id) + act('del', c.id, 'data-tbl="contacts"'))).join('') || '<p class="empty">none</p>'}</section>
  <section class="s"><h3>Contracts <button class="mini" data-t="add-contract">+ Add</button></h3>
    ${contracts.map(c => row(`<b>${esc(c.title)}</b> · ${esc(c.tour_code || '—')} · ${fmtDate(c.valid_from)}–${c.valid_to ? fmtDate(c.valid_to) : 'UFN'} · ${esc(c.status)}${c.chai_file_path ? ' · <span class="muted">PDF in Chai library</span>' : c.f1s_pdf_url ? ' · <span class="muted">F1S link only</span>' : ' · <span class="muted">no document</span>'}`, act('contract', c.id) + act('del', c.id, 'data-tbl="contracts"'))).join('') || '<p class="empty">none</p>'}</section>
  <section class="s"><h3>Sections <button class="mini" data-t="add-section">+ Add</button></h3>
    ${sections.map((s, i) => row(`<b>${esc(s.heading)}</b><br><span class="muted">${esc(s.body.slice(0, 160))}${s.body.length > 160 ? '…' : ''}</span>`, (i ? act('up', s.id) : '') + (i < sections.length - 1 ? act('down', s.id) : '') + act('section', s.id) + act('del', s.id, 'data-tbl="airline_sections"'))).join('') || '<p class="empty">none</p>'}</section>
  <section class="s"><h3>Links <button class="mini" data-t="add-link">+ Add</button></h3>
    ${links.map(l => row(`${esc(l.label)} <span class="muted">${esc(l.url)}</span>`, act('link', l.id) + act('del', l.id, 'data-tbl="links"'))).join('') || '<p class="empty">none</p>'}</section>
  <div id="history"></div>`;
  const by = (list, id) => list.find(x => x.id === id);
  const refresh = () => renderAirline(a.slug, () => true, true);
  app.querySelectorAll('button[data-t]').forEach(b => b.onclick = async () => {
    const t = b.dataset.t, id = b.dataset.id; let v;
    switch (t) {
      case 'airline': v = await modalForm('Edit carrier', F.airline, a); if (v) await run(sb.from('airlines').update(v).eq('id', a.id), 'Saved') && refresh(); break;
      case 'verify': if (await confirmBox('Mark this carrier as verified by you, today?')) await run(sb.from('airlines').update({ verified_at: new Date().toISOString(), verified_by: profile.full_name || profile.email }).eq('id', a.id), 'Marked verified') && refresh(); break;
      case 'history': await renderHistory(a.id); break;
      case 'add-contact': v = await modalForm('Add contact', F.contact); if (v) await run(sb.from('contacts').insert({ ...v, airline_id: a.id, position: contacts.length, source: 'chai' }), 'Added') && refresh(); break;
      case 'contact': v = await modalForm('Edit contact', F.contact, by(contacts, id)); if (v) await run(sb.from('contacts').update(v).eq('id', id), 'Saved') && refresh(); break;
      case 'add-contract': v = await modalForm('Add contract', F.contract); if (v) { const file = v.file; delete v.file; const { data: ins, error } = await sb.from('contracts').insert({ ...v, airline_id: a.id, position: contracts.length, source: 'chai' }).select().single(); if (error) { toast(error.message, true); break; } if (file) await uploadContractFile(ins.id, a, file); toast('Added'); AIRLINES = null; refresh(); } break;
      case 'contract': { const c = by(contracts, id); v = await modalForm('Edit contract', F.contract, c); if (v) { const file = v.file; delete v.file; if (await run(sb.from('contracts').update(v).eq('id', id), 'Saved')) { if (file) await uploadContractFile(id, a, file); refresh(); } } break; }
      case 'add-section': v = await modalForm('Add section', F.section); if (v) await run(sb.from('airline_sections').insert({ ...v, airline_id: a.id, position: sections.length, source: 'chai' }), 'Added') && refresh(); break;
      case 'section': v = await modalForm('Edit section', F.section, by(sections, id)); if (v) await run(sb.from('airline_sections').update(v).eq('id', id), 'Saved') && refresh(); break;
      case 'up': case 'down': { const i = sections.findIndex(s => s.id === id), j = t === 'up' ? i - 1 : i + 1; const A = sections[i], B = sections[j]; await sb.from('airline_sections').update({ position: B.position }).eq('id', A.id); await sb.from('airline_sections').update({ position: A.position }).eq('id', B.id); refresh(); break; }
      case 'add-link': v = await modalForm('Add link', F.link); if (v) await run(sb.from('links').insert({ ...v, airline_id: a.id, position: links.length, source: 'chai' }), 'Added') && refresh(); break;
      case 'link': v = await modalForm('Edit link', F.link, by(links, id)); if (v) await run(sb.from('links').update(v).eq('id', id), 'Saved') && refresh(); break;
      case 'del': if (await confirmBox('Delete this item? It stays in the change history.')) await run(sb.from(b.dataset.tbl).delete().eq('id', id), 'Deleted') && refresh(); break;
    }
  });
}

async function uploadContractFile(contractId, a, file) {
  const path = `chai/${a.code.toLowerCase()}/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]+/g, '_')}`;
  const { error } = await sb.storage.from('contracts').upload(path, file, { contentType: 'application/pdf' });
  if (error) { toast('Upload failed: ' + error.message, true); return; }
  await sb.from('contracts').update({ chai_file_path: path }).eq('id', contractId);
  toast('Document uploaded');
}

async function renderHistory(airlineId) {
  const box = document.getElementById('history');
  const { data } = await sb.from('change_log').select('table_name,action,old_row,new_row,changed_by,source,changed_at').eq('airline_id', airlineId).order('changed_at', { ascending: false }).limit(60);
  const { data: people } = await sb.from('profiles').select('id,full_name,email');
  const who = id => { const p = (people || []).find(x => x.id === id); return p ? (p.full_name || p.email) : '—'; };
  const diff = r => {
    if (r.action === 'insert') return 'added ' + esc(r.new_row.title || r.new_row.label || r.new_row.heading || r.new_row.name || '');
    if (r.action === 'delete') return 'deleted ' + esc(r.old_row.title || r.old_row.label || r.old_row.heading || r.old_row.name || '');
    const ch = Object.keys(r.new_row).filter(k => !['updated_at', 'updated_by'].includes(k) && JSON.stringify(r.new_row[k]) !== JSON.stringify(r.old_row[k]));
    return ch.map(k => `<b>${esc(k)}</b>: <s>${esc(String(r.old_row[k] ?? '')).slice(0, 80)}</s> → ${esc(String(r.new_row[k] ?? '')).slice(0, 80)}`).join('; ') || 'no field changes';
  };
  box.innerHTML = `<section class="s"><h3>Change history</h3>${(data || []).map(r => `<p class="hist"><span class="muted">${new Date(r.changed_at).toLocaleString()} · ${esc(r.source)} · ${esc(who(r.changed_by))} · ${esc(r.table_name)}</span><br>${diff(r)}</p>`).join('') || '<p class="empty">No changes recorded.</p>'}</section>`;
  box.scrollIntoView({ behavior: 'smooth' });
}

/* ---------- report a problem (any user) ---------- */
async function reportProblem(a) {
  const v = await modalForm(`Report a problem · ${a.code} ${a.name}`, [{ key: 'message', label: 'What’s wrong or out of date?', type: 'textarea', rows: 5 }]);
  if (!v || !v.message) return;
  await run(sb.from('reports').insert({ airline_id: a.id, reported_by: session.user.id, message: v.message }), 'Thanks — sent to the admins.');
}

/* ---------- admin page ---------- */
let adminQ = '';
async function renderAdmin() {
  if (!profile || profile.role !== 'admin') { app.innerHTML = '<p class="empty">Admins only.</p>'; return; }
  const air = await loadAirlines();
  const [{ data: list }, { data: profs }, { data: reports }] = await Promise.all([
    sb.from('allowlist').select('*').order('email'),
    sb.from('profiles').select('id,email,full_name,is_active,role,last_seen_at,created_at').order('created_at', { ascending: false }),
    sb.from('reports').select('id,message,created_at,resolved_at,airline_id,reported_by,airlines(code,name),profiles!reports_reported_by_fkey(full_name,email)').is('resolved_at', null).order('created_at', { ascending: false })
  ]);
  const unmatched = (profs || []).filter(p => !p.is_active && !(list || []).some(l => l.email === p.email));
  const rows = (list || []).filter(u => !adminQ || (u.email + ' ' + (u.full_name || '')).toLowerCase().includes(adminQ.toLowerCase()));
  const seen = e => { const p = (profs || []).find(x => x.email === e); return p?.last_seen_at ? new Date(p.last_seen_at).toLocaleDateString() : '<span class="empty">never</span>'; };
  app.innerHTML = `<a class="back" href="#/">← All airlines</a>
  <div class="ahead"><h2>Admin</h2><span class="src">${(list || []).length} on the access list · ${(list || []).filter(u => u.role === 'admin').length} admins</span></div>
  ${reports?.length ? `<section class="s"><h3>Open problem reports (${reports.length})</h3>${reports.map(r => `<div class="erow"><div class="etext"><b><a href="#/airline/${esc(air.find(x => x.id === r.airline_id)?.slug || '')}">${esc(r.airlines?.code || '')} ${esc(r.airlines?.name || '')}</a></b> · <span class="muted">${esc(r.profiles?.full_name || r.profiles?.email || '')} · ${new Date(r.created_at).toLocaleString()}</span><br>${esc(r.message)}</div><div class="eact"><button class="mini" data-resolve="${r.id}">Resolve</button></div></div>`).join('')}</section>` : ''}
  ${unmatched.length ? `<section class="s"><h3>Signed in but not on the list (${unmatched.length})</h3><p class="muted">These people authenticated with Google/Microsoft but their address isn’t on the access list. Approve to add them as users.</p>${unmatched.map(p => `<div class="erow"><div class="etext">${esc(p.full_name || '')} <span class="muted">${esc(p.email)} · ${new Date(p.created_at).toLocaleString()}</span></div><div class="eact"><button class="mini" data-approve="${esc(p.email)}" data-name="${esc(p.full_name || '')}">Approve</button></div></div>`).join('')}</section>` : ''}
  <section class="s"><h3>Access list <button class="mini" data-add-user>+ Add person</button> <button class="mini" data-import>Import CSV</button></h3>
  <div class="tools"><input type="search" id="aq" placeholder="Search name or email" value="${esc(adminQ)}"></div>
  <div class="wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Type</th><th>Active</th><th>Last sign-in</th><th></th></tr></thead><tbody>
  ${rows.map(u => `<tr><td>${esc(u.full_name || '')}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.advisor_type)}</td><td>${u.is_active ? 'yes' : '<span class="exp">no</span>'}</td><td>${seen(u.email)}</td><td class="eact"><button class="mini" data-edit-user="${esc(u.email)}">Edit</button><button class="mini" data-toggle="${esc(u.email)}">${u.is_active ? 'Deactivate' : 'Activate'}</button><button class="mini" data-remove="${esc(u.email)}">Remove</button></td></tr>`).join('')}
  </tbody></table></div></section>`;
  const aq = document.getElementById('aq'); aq.oninput = e => { adminQ = e.target.value; const pos = aq.selectionStart; renderAdmin().then(() => { const n = document.getElementById('aq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); };
  const byEmail = e => (list || []).find(u => u.email === e);
  app.querySelector('[data-add-user]').onclick = async () => { const v = await modalForm('Add person', F.user); if (v && v.email) await run(sb.from('allowlist').insert({ ...v, email: v.email.toLowerCase(), added_by: profile.email }), 'Added') && renderAdmin(); };
  app.querySelector('[data-import]').onclick = async () => {
    const v = await modalForm('Import people', [{ key: 'csv', label: 'Paste rows', type: 'textarea', rows: 10, hint: 'one per line: email, name (optional), admin/user (optional)' }]);
    if (!v?.csv) return;
    const rowsIn = v.csv.split('\n').map(l => l.split(',').map(x => x.trim())).filter(r => r[0] && r[0].includes('@'));
    const payload = rowsIn.map(r => ({ email: r[0].toLowerCase(), full_name: r[1] || null, role: r[2] === 'admin' ? 'admin' : 'user', advisor_type: 'ic', added_by: profile.email }));
    await run(sb.from('allowlist').upsert(payload, { onConflict: 'email' }), `Imported ${payload.length}`) && renderAdmin();
  };
  app.querySelectorAll('[data-edit-user]').forEach(b => b.onclick = async () => { const u = byEmail(b.dataset.editUser); const v = await modalForm('Edit person', F.user, u); if (v) { delete v.email; await run(sb.from('allowlist').update(v).eq('email', u.email), 'Saved') && renderAdmin(); } });
  app.querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => { const u = byEmail(b.dataset.toggle); if (u.email === profile.email) return toast('You can’t deactivate yourself.', true); await run(sb.from('allowlist').update({ is_active: !u.is_active }).eq('email', u.email), u.is_active ? 'Deactivated' : 'Activated') && renderAdmin(); });
  app.querySelectorAll('[data-remove]').forEach(b => b.onclick = async () => { const e = b.dataset.remove; if (e === profile.email) return toast('You can’t remove yourself.', true); if (await confirmBox(`Remove ${e} from the access list?`)) await run(sb.from('allowlist').delete().eq('email', e), 'Removed') && renderAdmin(); });
  app.querySelectorAll('[data-approve]').forEach(b => b.onclick = async () => { await run(sb.from('allowlist').insert({ email: b.dataset.approve, full_name: b.dataset.name || null, role: 'user', advisor_type: 'ic', added_by: profile.email }), 'Approved') && renderAdmin(); });
  app.querySelectorAll('[data-resolve]').forEach(b => b.onclick = async () => { await run(sb.from('reports').update({ resolved_at: new Date().toISOString(), resolved_by: session.user.id }).eq('id', b.dataset.resolve), 'Resolved') && renderAdmin(); });
}
