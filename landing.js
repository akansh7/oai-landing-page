function startDlTimer(firstName) {
  const btn = document.getElementById('lp-download-btn');
  const btnText = document.getElementById('lp-download-btn-text');
  const status = document.getElementById('lp-dl-status');
  const total = Math.floor(Math.random() * 31) + 60; // 60–90 s
  let remaining = total;

  btn.classList.add('lp-download-btn--counting');
  status.className = 'lp-dl-status lp-dl-status--fetching';
  status.innerHTML = 'Fetching your leads from the database.<br>In the meantime, watch the short video above.';

  function tick() {
    const m = Math.floor(remaining / 60);
    const s = String(remaining % 60).padStart(2, '0');
    btnText.textContent = `${m}:${s}`;
    remaining--;
  }

  tick();
  const timer = setInterval(() => {
    if (remaining < 0) {
      clearInterval(timer);
      btnText.textContent = `List for ${firstName || 'You'}`;
      btn.classList.remove('lp-download-btn--counting');
      btn.classList.add('lp-download-btn--ready');
      status.className = 'lp-dl-status lp-dl-status--ready';
      status.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="vertical-align:-3px;margin-right:5px"><circle cx="8" cy="8" r="8" fill="#22C55E"/><path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Your list is ready to download';
    } else {
      tick();
    }
  }, 1000);
}

// ─── List → Excel (.xlsx) ─────────────────────────
const PEOPLE_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'company_name', label: 'Company Name' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'linkedin', label: 'LinkedIn' },
];

const COMPANY_COLS = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'job_type', label: 'Job Type' },
  { key: 'job_description', label: 'Job Description' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'job_url', label: 'Job URL' },
  { key: 'salary_info', label: 'Salary Info' },
  { key: 'skills', label: 'Skills' },
];

function sheetFromRows(rows, cols) {
  const aoa = [cols.map(c => c.label), ...rows.map(r => cols.map(c => r[c.key] ?? ''))];
  return XLSX.utils.aoa_to_sheet(aoa);
}

function buildAndDownloadXlsx(prospect, companies, people) {
  const wb = XLSX.utils.book_new();
  if (companies.length) XLSX.utils.book_append_sheet(wb, sheetFromRows(companies, COMPANY_COLS), 'Companies');
  if (people.length) XLSX.utils.book_append_sheet(wb, sheetFromRows(people, PEOPLE_COLS), 'People');
  const base = (prospect.company_name || prospect.name || 'Your').trim();
  XLSX.writeFile(wb, `${base} - List.xlsx`);
}

function renderPage(prospect, companies = [], people = []) {
  const fullName = prospect.name?.trim();
  const firstName = fullName ? fullName.split(' ')[0] : null;
  const company = prospect.company_name?.trim();

  // Greeting
  document.getElementById('lp-greeting').textContent = firstName ? `Hi, ${firstName} 👋` : 'Hi 👋';
  document.title = firstName ? `OAI — A Personal Note For ${firstName}` : 'Outreach System for Recruiters';

  // Headline company
  document.getElementById('lp-company-inline').textContent = company || 'You';

  // Header logo
  const logoArea = document.getElementById('prospect-logo-area');
  if (prospect.logo_url) {
    const img = document.createElement('img');
    img.src = prospect.logo_url;
    img.alt = company || '';
    img.className = 'lp-prospect-logo';
    img.onerror = () => {
      if (company) img.replaceWith(makeFallbackName(company));
      else document.querySelector('.lp-divider').style.display = 'none';
    };
    logoArea.appendChild(img);
  } else if (company) {
    logoArea.appendChild(makeFallbackName(company));
  } else {
    document.querySelector('.lp-divider').style.display = 'none';
  }

  // Download button
  const dlBtn = document.getElementById('lp-download-btn');
  const calloutWrap = document.querySelector('.lp-download-callout-wrap');
  const hasList = companies.length > 0 || people.length > 0;
  if (dlBtn) {
    if (hasList || prospect.download_url) {
      document.getElementById('lp-download-btn-text').textContent = `List for ${firstName || 'You'}`;
      dlBtn.style.display = '';
      const callout = calloutWrap ? calloutWrap.querySelector('.lp-download-callout') : null;
      if (callout) callout.style.display = '';

      dlBtn.addEventListener('click', e => {
        e.preventDefault();
        if (dlBtn.classList.contains('lp-download-btn--counting')) return;
        if (dlBtn.classList.contains('lp-download-btn--ready')) {
          if (hasList) buildAndDownloadXlsx(prospect, companies, people);
          else if (prospect.download_url) window.open(prospect.download_url, '_blank', 'noopener,noreferrer');
          return;
        }
        startDlTimer(firstName);
      });
    }
  }

  // CTA buttons
  const calUrl = 'https://calendly.com/michael-qq8/30-minute-consultation';
  ['lp-cta-btn', 'lp-cta-end-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.href = calUrl;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
  });

  document.getElementById('lp-main').style.display = 'block';
}

function makeFallbackName(name) {
  const span = document.createElement('span');
  span.className = 'lp-prospect-name-fallback';
  span.textContent = name;
  return span;
}


async function fetchList(table, listId) {
  const res = await fetch(
    `${window.SUPABASE_URL}/rest/v1/${table}?list_id=eq.${encodeURIComponent(listId)}&select=*`,
    { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } }
  );
  return res.ok ? await res.json() : [];
}

(async () => {
  const id = new URLSearchParams(window.location.search).get('id');

  // No ID — show generic page
  if (!id) { renderPage({}); return; }

  try {
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/prospects?id=eq.${encodeURIComponent(id)}&select=*`,
      { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } }
    );

    const data = res.ok ? await res.json() : [];
    const prospect = data?.[0] || {};

    const [companies, people] = prospect.list_id
      ? await Promise.all([fetchList('companies', prospect.list_id), fetchList('people', prospect.list_id)])
      : [[], []];

    renderPage(prospect, companies, people);

    // Track visit only for real prospects
    if (prospect.id) {
      fetch(`${window.SUPABASE_URL}/rest/v1/prospects?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'apikey': window.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ visit_count: (prospect.visit_count || 0) + 1, visited_at: new Date().toISOString() })
      }).catch(() => {});
    }
  } catch {
    renderPage({});
  }
})();

// ─── Proof Slider ─────────────────────────────────
(function () {
  const track = document.getElementById('lp-slider-track');
  const dotsContainer = document.getElementById('lp-dots');
  if (!track) return;

  const slides = track.querySelectorAll('.lp-slide');
  const total = slides.length;
  let current = 0;
  let autoTimer;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'lp-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer.querySelectorAll('.lp-dot').forEach((d, i) => d.classList.toggle('active', i === current));
    resetAuto();
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 4000);
  }

  document.getElementById('lp-prev').addEventListener('click', () => goTo(current - 1));
  document.getElementById('lp-next').addEventListener('click', () => goTo(current + 1));

  resetAuto();
})();
