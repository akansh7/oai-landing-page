function renderPage(prospect) {
  const fullName = prospect.name?.trim();
  const firstName = fullName ? fullName.split(' ')[0] : null;
  const company = prospect.company_name?.trim();

  // Greeting
  document.getElementById('lp-greeting').textContent = firstName ? `Hi, ${firstName} 👋` : 'Hi 👋';
  document.title = firstName ? `OAI — A Personal Note For ${firstName}` : 'OAI — A Personal Note For You';

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
    renderPage(prospect);

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
