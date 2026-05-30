const PASSCODE = 'oai2024';

// ─── Auth ──────────────────────────────────────────

function checkAuth() {
  const val = document.getElementById('adm-passcode').value;
  if (val === PASSCODE) {
    localStorage.setItem('oai_auth', '1');
    showDashboard();
  } else {
    document.getElementById('adm-auth-error').style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('oai_auth');
  location.reload();
}

document.getElementById('adm-passcode').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkAuth();
});

if (localStorage.getItem('oai_auth') === '1') {
  showDashboard();
}

function showDashboard() {
  document.getElementById('adm-auth').style.display = 'none';
  document.getElementById('adm-dashboard').style.display = 'block';
  loadProspects();
  renderCurlBlock();
}

function renderCurlBlock() {
  const base = window.location.origin;
  document.getElementById('adm-base-url').textContent = base + '/';
  const cmd = `curl -X POST '${window.SUPABASE_URL}/rest/v1/prospects' \\
  -H 'apikey: ${window.SUPABASE_ANON_KEY}' \\
  -H 'Authorization: Bearer ${window.SUPABASE_ANON_KEY}' \\
  -H 'Content-Type: application/json' \\
  -H 'Prefer: return=representation' \\
  -d '{
    "name": "Sarah Johnson",
    "company_name": "Acme Corp",
    "logo_url": null
  }'`;
  document.getElementById('adm-curl-block').textContent = cmd;
}

function copyCurl() {
  const text = document.getElementById('adm-curl-block').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('adm-copy-curl');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
}

// ─── Supabase helpers ─────────────────────────────

function headers() {
  return {
    'apikey': window.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${window.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── Load & render ────────────────────────────────

let prospects = [];

async function loadProspects() {
  try {
    prospects = await sbFetch('prospects?select=*&order=created_at.desc');
    renderTable();
    renderStats();
  } catch (e) {
    console.error('Failed to load prospects:', e);
  }
}

function renderStats() {
  document.getElementById('stat-total').textContent = prospects.length;
  const totalVisits = prospects.reduce((s, p) => s + (p.visit_count || 0), 0);
  document.getElementById('stat-visits').textContent = totalVisits;
  const viewed = prospects.filter(p => p.visit_count > 0).length;
  document.getElementById('stat-viewed').textContent = viewed;
}

function renderTable() {
  const tbody = document.getElementById('adm-table-body');
  if (prospects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="adm-empty">No prospects yet. Create your first one →</td></tr>`;
    return;
  }

  tbody.innerHTML = prospects.map(p => {
    const link = `${window.location.origin}/?id=${p.id}`;
    const lastVisit = p.visited_at
      ? new Date(p.visited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';
    return `
      <tr>
        <td class="adm-td-name">${esc(p.name)}</td>
        <td class="adm-td-company">${esc(p.company_name)}</td>
        <td>
          <button class="adm-copy-btn" id="copy-${p.id}" onclick="copyLink('${p.id}', '${esc(link)}')">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="5" width="9" height="9" rx="1.5"/>
              <path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2"/>
            </svg>
            Copy Link
          </button>
        </td>
        <td>${p.visit_count || 0}</td>
        <td>${lastVisit}</td>
        <td>
          <div class="adm-actions">
            <button class="adm-action-btn" onclick="openModal('${p.id}')">Edit</button>
            <button class="adm-action-btn delete" onclick="deleteProspect('${p.id}', '${esc(p.name)}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function copyLink(id, link) {
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.getElementById(`copy-${id}`);
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2"/></svg> Copy Link`;
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ─── CRUD ─────────────────────────────────────────

function openModal(id = null) {
  const modal = document.getElementById('adm-modal-overlay');
  const title = document.getElementById('adm-modal-title');

  document.getElementById('form-id').value = '';
  document.getElementById('form-name').value = '';
  document.getElementById('form-company').value = '';
  document.getElementById('form-logo').value = '';
  document.getElementById('form-download-url').value = '';

  if (id) {
    const p = prospects.find(x => x.id === id);
    if (!p) return;
    title.textContent = 'Edit Prospect';
    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name || '';
    document.getElementById('form-company').value = p.company_name || '';
    document.getElementById('form-logo').value = p.logo_url || '';
    document.getElementById('form-download-url').value = p.download_url || '';
  } else {
    title.textContent = 'New Prospect';
  }

  modal.classList.add('open');
  setTimeout(() => document.getElementById('form-name').focus(), 50);
}

function closeModal() {
  document.getElementById('adm-modal-overlay').classList.remove('open');
}

document.getElementById('adm-modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

async function saveProspect() {
  const id = document.getElementById('form-id').value;
  const name = document.getElementById('form-name').value.trim();
  const company_name = document.getElementById('form-company').value.trim();
  const logo_url = document.getElementById('form-logo').value.trim() || null;
  const download_url = document.getElementById('form-download-url').value.trim() || null;

  if (!name && !company_name && !logo_url) {
    alert('Please fill in at least one field.');
    return;
  }

  const saveBtn = document.getElementById('adm-save-btn');
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;

  try {
    const payload = { name, company_name, logo_url, download_url };

    if (id) {
      await sbFetch(`prospects?id=eq.${id}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload),
      });
    } else {
      await sbFetch('prospects', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload),
      });
    }

    closeModal();
    await loadProspects();
  } catch (e) {
    alert('Failed to save: ' + e.message);
  } finally {
    saveBtn.textContent = 'Save Prospect';
    saveBtn.disabled = false;
  }
}

async function deleteProspect(id, name) {
  if (!confirm(`Delete prospect "${name}"? This cannot be undone.`)) return;
  try {
    await sbFetch(`prospects?id=eq.${id}`, { method: 'DELETE' });
    await loadProspects();
  } catch (e) {
    alert('Failed to delete: ' + e.message);
  }
}
