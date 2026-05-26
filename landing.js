(async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const showError = () => {
    document.getElementById('lp-error').style.display = 'flex';
  };

  if (!id) { showError(); return; }

  try {
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/prospects?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        headers: {
          'apikey': window.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
        }
      }
    );

    if (!res.ok) { showError(); return; }

    const data = await res.json();
    if (!data || data.length === 0) { showError(); return; }

    const prospect = data[0];

    // Inject name
    document.getElementById('lp-greeting').textContent = `Hi, ${prospect.name} 👋`;
    document.title = `OAI — A Personal Note For ${prospect.name}`;

    // Inject company in headline
    document.getElementById('lp-company-inline').textContent = prospect.company_name;

    // Header logo
    const logoArea = document.getElementById('prospect-logo-area');
    if (prospect.logo_url) {
      const img = document.createElement('img');
      img.src = prospect.logo_url;
      img.alt = prospect.company_name;
      img.className = 'lp-prospect-logo';
      img.onerror = () => {
        img.replaceWith(makeFallbackName(prospect.company_name));
      };
      logoArea.appendChild(img);
    } else {
      logoArea.appendChild(makeFallbackName(prospect.company_name));
    }

    // Video
    const videoContainer = document.getElementById('lp-video-container');
    if (prospect.video_url) {
      const embedUrl = resolveEmbedUrl(prospect.video_url);
      if (embedUrl) {
        videoContainer.innerHTML = `<iframe src="${embedUrl}" allowfullscreen allow="autoplay; fullscreen"></iframe>`;
      }
    }

    // CTA (both buttons)
    const calUrl = prospect.calendar_url || 'https://calendly.com/michael-qq8/30-minute-consultation';
    [document.getElementById('lp-cta-btn'), document.getElementById('lp-cta-end-btn')].forEach(btn => {
      if (!btn) return;
      btn.href = calUrl;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
    });

    // Show page
    document.getElementById('lp-main').style.display = 'block';

    // Track visit (fire-and-forget)
    fetch(
      `${window.SUPABASE_URL}/rest/v1/prospects?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': window.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          visit_count: (prospect.visit_count || 0) + 1,
          visited_at: new Date().toISOString(),
        })
      }
    ).catch(() => {});

  } catch (e) {
    showError();
  }

  function makeFallbackName(name) {
    const span = document.createElement('span');
    span.className = 'lp-prospect-name-fallback';
    span.textContent = name;
    return span;
  }

  function resolveEmbedUrl(url) {
    try {
      const u = new URL(url);
      // YouTube
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        let videoId = u.searchParams.get('v');
        if (!videoId && u.hostname === 'youtu.be') videoId = u.pathname.slice(1);
        if (!videoId) {
          const match = u.pathname.match(/embed\/([^/?]+)/);
          if (match) videoId = match[1];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : url;
      }
      // Loom
      if (u.hostname.includes('loom.com')) {
        const match = u.pathname.match(/share\/([^/?]+)/);
        if (match) return `https://www.loom.com/embed/${match[1]}`;
      }
      // Already an embed URL or other
      return url;
    } catch {
      return null;
    }
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

  // Build dots
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
    dotsContainer.querySelectorAll('.lp-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
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
