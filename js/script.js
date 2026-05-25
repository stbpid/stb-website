/* ============================================
   STB-DSWD WEBSITE — VANILLA JS
   ============================================ */

/* ------------------------------------------
   COMPONENT LOADER
   Fetches header.html and footer.html and
   injects them into every page.
------------------------------------------ */
async function loadComponent(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    el.innerHTML = await res.text();
  } catch (e) {
    console.warn(`Component load failed: ${url}`, e);
  }
}

async function initComponents() {
  await Promise.all([
    loadComponent('#site-header-mount', 'components/header.html'),
    loadComponent('#site-footer-mount', 'components/footer.html'),
  ]);
  // Run everything that depends on header/footer being in the DOM
  initPage();
}

/* ------------------------------------------
   MAIN INIT — called after components load
------------------------------------------ */
function initPage() {

  /* ── FIXED HEADER: hide top bar on scroll, keep nav always visible ── */
  const siteHeader = document.querySelector('.site-header');
  const headerTop  = document.querySelector('.header-top');

  if (siteHeader && headerTop) {
    const THRESHOLD = 10;

    function onScroll() {
      const scrolled = window.scrollY > THRESHOLD;
      headerTop.classList.toggle('hidden', scrolled);
      siteHeader.classList.toggle('scrolled', scrolled);
      /* adjust body padding so content isn't hidden under the fixed header */
      document.body.classList.toggle('header-collapsed', scrolled);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); /* apply correct state on page load */
  }

  /* ── ACTIVE NAV LINK ── */
  const currentPage = location.pathname.split('/').filter(Boolean).pop() || 'index';
  document.querySelectorAll('.main-nav a[data-page], .main-nav .nav-label[data-page]').forEach(link => {
    if (link.dataset.page === currentPage) {
      link.classList.add('active');
    }
  });

  /* ── HAMBURGER / MOBILE MENU ── */
  const hamburger = document.querySelector('.hamburger');
  const mainNav   = document.querySelector('.main-nav');
  if (hamburger && mainNav) {
    hamburger.addEventListener('click', () => {
      const open = mainNav.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open);
    });
    // Close when clicking outside
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !mainNav.contains(e.target)) {
        mainNav.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', false);
      }
    });
    // Mobile accordion: toggle dropdown on has-dropdown link/label click
    mainNav.querySelectorAll('li.has-dropdown > a, li.has-dropdown > .nav-label').forEach(link => {
      link.addEventListener('click', e => {
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) return;
        e.preventDefault();
        const li = link.closest('li.has-dropdown');
        const wasOpen = li.classList.contains('open');
        // Close siblings
        li.parentElement.querySelectorAll(':scope > li.has-dropdown.open').forEach(sib => {
          if (sib !== li) sib.classList.remove('open');
        });
        li.classList.toggle('open', !wasOpen);
      });
    });
    // Close nav when a leaf link (no dropdown) is clicked on mobile
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', e => {
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) return;
        const parentLi = link.closest('li');
        if (parentLi && parentLi.classList.contains('has-dropdown')) return;
        mainNav.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', false);
      });
    });
  }

  /* ── HERO SLIDER ── */
  const heroSlider = document.querySelector('.hero-slider');
  if (heroSlider) {
    const slides = heroSlider.querySelectorAll('.hero-slide');
    const dots   = heroSlider.querySelectorAll('.hero-dot');
    let current = 0;
    let autoTimer;

    function goTo(n) {
      slides[current].classList.remove('active');
      dots[current]?.classList.remove('active');
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current]?.classList.add('active');
    }

    function startAuto() { autoTimer = setInterval(() => goTo(current + 1), 5000); }
    function resetAuto()  { clearInterval(autoTimer); startAuto(); }

    dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAuto(); }));

    /* ── Mouse drag to navigate ── */
    let dragStartX = 0;
    let isDragging = false;

    heroSlider.addEventListener('mousedown', e => {
      dragStartX = e.clientX;
      isDragging = true;
      heroSlider.classList.add('dragging');
      clearInterval(autoTimer);
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
    });

    window.addEventListener('mouseup', e => {
      if (!isDragging) return;
      isDragging = false;
      heroSlider.classList.remove('dragging');
      const diff = e.clientX - dragStartX;
      if (Math.abs(diff) > 50) {
        goTo(diff < 0 ? current + 1 : current - 1);
      }
      startAuto();
    });

    /* ── Touch swipe to navigate ── */
    let touchStartX = 0;
    heroSlider.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      clearInterval(autoTimer);
    }, { passive: true });

    heroSlider.addEventListener('touchend', e => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 40) {
        goTo(diff < 0 ? current + 1 : current - 1);
      }
      startAuto();
    }, { passive: true });

    goTo(0);
    startAuto();
  }

  /* ── FLAGSHIP CAROUSEL (infinite loop, peek 1/3 on sides) ── */
  const flagshipWrapper = document.querySelector('.flagship-carousel-wrapper');
  if (flagshipWrapper) {
    const track        = flagshipWrapper.querySelector('.flagship-track');
    const origCards    = Array.from(track.querySelectorAll('.flagship-card'));
    const PEEK_RATIO   = 1 / 3; // fraction of card width shown on each side
    const GAP          = 20;

    /* Clone first + last card for seamless infinite loop */
    const cloneFirst = origCards[0].cloneNode(true);
    const cloneLast  = origCards[origCards.length - 1].cloneNode(true);
    track.appendChild(cloneFirst);
    track.insertBefore(cloneLast, origCards[0]);

    /* All cards including clones */
    const allCards = () => Array.from(track.querySelectorAll('.flagship-card'));

    /* Real index in the extended list: cloneLast is at 0, origCards start at 1 */
    let curIdx = 1; // start at first real card

    function cardWidth() {
      return allCards()[0].offsetWidth + GAP;
    }

    function peekOffset() {
      /* Center the active card within the wrapper */
      const wrapperWidth = flagshipWrapper.offsetWidth;
      const cw = allCards()[0].offsetWidth;
      return (wrapperWidth - cw) / 2;
    }

    function updateActiveClass() {
      allCards().forEach((c, i) => c.classList.toggle('active-card', i === curIdx));
    }

    function getTranslate(idx) {
      return -(idx * cardWidth() - peekOffset());
    }

    function slideTo(idx, animate = true) {
      curIdx = idx;
      track.style.transition = animate ? 'transform 0.45s ease' : 'none';
      track.style.transform  = `translateX(${getTranslate(curIdx)}px)`;
      updateActiveClass();
      updateFlagshipDots();
    }

    function updateFlagshipDots() {
      const flagshipDots = document.querySelectorAll('.flagship-dot');
      const realIdx = ((curIdx - 1) + origCards.length) % origCards.length;
      flagshipDots.forEach((d, i) => d.classList.toggle('active', i === realIdx));
    }

    /* After transition ends, silently jump when hitting a clone */
    track.addEventListener('transitionend', () => {
      const cards = allCards();
      if (curIdx === 0) {
        /* Landed on cloneLast → jump to real last */
        slideTo(cards.length - 2, false);
      } else if (curIdx === cards.length - 1) {
        /* Landed on cloneFirst → jump to real first */
        slideTo(1, false);
      }
    });

    /* Mouse drag */
    let fDragStart = 0;
    let fDragging  = false;

    flagshipWrapper.addEventListener('mousedown', e => {
      fDragStart = e.clientX;
      fDragging  = true;
      flagshipWrapper.classList.add('dragging');
      track.style.transition = 'none';
    });

    window.addEventListener('mousemove', e => {
      if (!fDragging) return;
      const diff = e.clientX - fDragStart;
      track.style.transform = `translateX(${getTranslate(curIdx) + diff}px)`;
    });

    window.addEventListener('mouseup', e => {
      if (!fDragging) return;
      fDragging = false;
      flagshipWrapper.classList.remove('dragging');
      const diff = e.clientX - fDragStart;
      if (Math.abs(diff) > 60) {
        slideTo(diff < 0 ? curIdx + 1 : curIdx - 1);
      } else {
        slideTo(curIdx);
      }
    });

    /* Touch swipe */
    let fTouchStart = 0;
    flagshipWrapper.addEventListener('touchstart', e => {
      fTouchStart = e.touches[0].clientX;
      track.style.transition = 'none';
    }, { passive: true });

    flagshipWrapper.addEventListener('touchmove', e => {
      const diff = e.touches[0].clientX - fTouchStart;
      track.style.transform = `translateX(${getTranslate(curIdx) + diff}px)`;
    }, { passive: true });

    flagshipWrapper.addEventListener('touchend', e => {
      const diff = e.changedTouches[0].clientX - fTouchStart;
      if (Math.abs(diff) > 50) {
        slideTo(diff < 0 ? curIdx + 1 : curIdx - 1);
      } else {
        slideTo(curIdx);
      }
    }, { passive: true });

    document.querySelector('.flagship-nav .prev')?.addEventListener('click', () => slideTo(curIdx - 1));
    document.querySelector('.flagship-nav .next')?.addEventListener('click', () => slideTo(curIdx + 1));

    /* Flagship pagination dots click */
    document.querySelectorAll('.flagship-dot').forEach((dot, i) => {
      dot.addEventListener('click', () => slideTo(i + 1));
    });

    /* Init */
    slideTo(1, false);
    window.addEventListener('resize', () => slideTo(curIdx, false));
  }

  /* ── STAT COUNTER ANIMATION ── */
  document.querySelectorAll('.stat-number[data-target]').forEach(el => {
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      const target   = parseInt(el.dataset.target, 10);
      const duration = 1600;
      const start    = performance.now();
      function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
      observer.unobserve(el);
    }, { threshold: 0.4 });
    observer.observe(el);
  });

  /* ── GENERIC TABS ── */
  function initTabs(containerSel, btnSel, contentSel) {
    document.querySelectorAll(containerSel).forEach(container => {
      const btns     = container.querySelectorAll(btnSel);
      const contents = container.querySelectorAll(contentSel);
      btns.forEach((btn, i) => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          contents.forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
          const target = container.querySelector(`[data-content="${btn.dataset.tab}"]`);
          (target || contents[i])?.classList.add('active');
        });
      });
    });
  }

  initTabs('.resources-tabs-section', '.resource-tab-btn', '.resource-tab-content');
  initTabs('.regional-stu-section',   '.tab-btn',          '.tab-content');
  initTabs('.org-chart-section',      '.tab-btn',          '.tab-content');

  /* ── SCROLL REVEAL ── */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const ro = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => ro.observe(el));
  }

  /* ── PHILIPPINE MAP HOVER + CLICK INTERACTION ── */
  const phMap      = document.getElementById('ph-map');
  const tooltip    = document.getElementById('ph-map-tooltip');
  const legendList = document.getElementById('stats-legend-list');

  if (phMap && tooltip && legendList) {
    const regionData = {
      'NCR':  { name: 'NCR - National Capital Region',          count: 18,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'I':    { name: 'Region I - Ilocos Region',               count: 27,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'CAR':  { name: 'CAR - Cordillera Administrative Region', count: 53,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'II':   { name: 'Region II - Cagayan Valley',             count: 32,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'III':  { name: 'Region III - Central Luzon',             count: 11,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'IVA':  { name: 'Region IV-A - CALABARZON',               count: 49,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'IVB':  { name: 'Region IV-B - MIMAROPA',                 count: 16,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'V':    { name: 'Region V - Bicol Region',                count: 90,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'VI':   { name: 'Region VI - Western Visayas',            count: 54,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'VII':  { name: 'Region VII - Central Visayas',           count: 41,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'VIII': { name: 'Region VIII - Eastern Visayas',          count: 34,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'IX':   { name: 'Region IX - Zamboanga Peninsula',        count: 91,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'X':    { name: 'Region X - Northern Mindanao',           count: 166, href: 'https://stbip-staging.dswd.gov.ph/main' },
      'XI':   { name: 'Region XI - Davao Region',               count: 5,   href: 'https://stbip-staging.dswd.gov.ph/main' },
      'XII':  { name: 'Region XII - SOCCSKSARGEN',              count: 12,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'XIII': { name: 'Region XIII - CARAGA',                   count: 24,  href: 'https://stbip-staging.dswd.gov.ph/main' },
      'ARMM': { name: 'BARMM - Bangsamoro',                     count: 8,   href: 'https://stbip-staging.dswd.gov.ph/main' },
      'NIR':  { name: 'NIR - Negros Island Region',             count: 0,   href: 'https://stbip-staging.dswd.gov.ph/main' },
    };

    function highlightLegend(regionId) {
      legendList.querySelectorAll('li').forEach(li => {
        li.classList.toggle('active', li.dataset.region === regionId);
      });
      const active = legendList.querySelector('li.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function clearHighlight() {
      legendList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
      phMap.querySelectorAll('path.map-active').forEach(p => p.classList.remove('map-active'));
      tooltip.textContent = 'Hover a region on the map';
    }

    /* floating badge that follows the mouse */
    const badge = document.createElement('div');
    badge.id = 'map-hover-badge';
    badge.style.cssText = 'position:fixed;display:none;background:#003087;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;pointer-events:none;z-index:999;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);';
    document.body.appendChild(badge);

    function showBadge(e, text) {
      badge.textContent = text;
      badge.style.display = 'block';
      moveBadge(e);
    }
    function moveBadge(e) {
      badge.style.left = (e.clientX + 14) + 'px';
      badge.style.top  = (e.clientY - 28) + 'px';
    }
    function hideBadge() { badge.style.display = 'none'; }

    phMap.querySelectorAll('path[id]').forEach(path => {
      const id = path.id;
      const data = regionData[id];

      path.addEventListener('mouseenter', (e) => {
        const label = data ? data.name + (data.count ? '  •  ' + data.count + ' ST' : '') : id;
        showBadge(e, label);
        highlightLegend(id);
      });
      path.addEventListener('mousemove', moveBadge);
      path.addEventListener('mouseleave', () => { hideBadge(); clearHighlight(); });
      path.addEventListener('click', () => {
        if (data && data.href) window.location.href = data.href;
      });
    });

    legendList.querySelectorAll('li[data-region]').forEach(li => {
      li.addEventListener('mouseenter', () => {
        const id = li.dataset.region;
        const path = phMap.querySelector('#' + CSS.escape(id));
        if (path) path.classList.add('map-active');
        li.classList.add('active');
      });
      li.addEventListener('mouseleave', () => {
        phMap.querySelectorAll('path.map-active').forEach(p => p.classList.remove('map-active'));
        li.classList.remove('active');
      });
      li.addEventListener('click', () => {
        const href = li.dataset.href;
        if (href) window.location.href = href;
      });
    });
  }

  /* ── VIDEO PLAY BUTTON (placeholder) ── */
  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      alert('Video player not connected yet. Please link an actual video source.');
    });
  });

  /* ── PARALLAX: hero slider images + director photo ── */
  const heroParallaxImgs = document.querySelectorAll('.hero-parallax-img');
  const directorPhoto    = document.querySelector('.director-corner-photo img');

  function applyParallax() {
    heroParallaxImgs.forEach(img => {
      const rect   = img.closest('.hero-slide').getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * 0.2;
      img.style.transform = `translateY(${offset}px) scale(1.2)`;
    });

    if (directorPhoto) {
      const rect   = directorPhoto.closest('.director-corner-photo').getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * 0.2;
      directorPhoto.style.transform = `translateY(${offset}px) scale(1.2)`;
    }
  }

  window.addEventListener('scroll', applyParallax, { passive: true });
  applyParallax();
}

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', initComponents);

/* ============================================
   GLOBAL MODAL — STB Ticketing + Survey
   Works on every page via injected overlay
   ============================================ */
(function () {
  const MODALS = {
    ticketing: {
      label: 'Support',
      title: 'Social Technology Bureau Ticketing System',
      img: 'images/tech-support-photo.webp',
      imgAlt: 'Ticketing System',
      body: '<p>Submit and track your technical requests with ease. Our ticketing system ensures your concerns are addressed promptly by the right team.</p><p>Whether you need technical assistance, program guidance, or administrative support, our ticketing system connects you directly with the right specialist at the Social Technology Bureau.</p>',
      btnText: 'CREATE NEW REQUEST',
      btnHref: '#'
    },
    survey: {
      label: 'Feedback',
      title: 'Customer Satisfaction Survey',
      img: 'images/survey-icon-photo.webp',
      imgAlt: 'Customer Satisfaction Survey',
      body: '<p>Your feedback matters. Help us improve our services by sharing your experience with the Social Technology Bureau.</p><p>Your honest feedback allows us to identify areas for improvement and ensure we continue to deliver quality services to every Filipino we serve.</p>',
      btnText: 'ACCESS SURVEY FORM',
      btnHref: '#'
    }
  };

  function injectModal() {
    if (document.getElementById('g-modal-overlay')) return;

    const style = document.createElement('style');
    style.textContent = `
      #g-modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:9999; align-items:center; justify-content:center; padding:20px; }
      #g-modal-overlay.active { display:flex; }
      #g-modal-box { background:#fff; border-radius:16px; max-width:640px; width:100%; max-height:90vh; overflow-y:auto; position:relative; box-shadow:0 20px 60px rgba(0,0,0,0.3); animation:gModalIn 0.22s ease; }
      @keyframes gModalIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
      #g-modal-close { position:absolute; top:14px; right:16px; background:none; border:none; font-size:20px; cursor:pointer; color:#6b7280; line-height:1; z-index:2; }
      #g-modal-close:hover { color:#111; }
      .gm-inner { padding:32px 32px 36px; }
      .gm-img-wrap { text-align:center; margin-bottom:24px; }
      .gm-img-wrap img { width:auto; max-width:100%; height:200px; object-fit:contain; border-radius:10px; display:inline-block; }
      .gm-label { font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#ac0b08; display:block; margin-bottom:8px; }
      .gm-title { font-size:22px; font-weight:800; color:#1a1a1a; margin-bottom:10px; line-height:1.3; }
      .gm-divider { width:48px; height:4px; background:#003087; border-radius:2px; margin-bottom:18px; }
      .gm-body p { font-size:14px; color:#282828; line-height:1.8; margin-bottom:12px; }
      .gm-btn { display:inline-flex; align-items:center; gap:8px; margin-top:8px; background:#003087; color:#fff; padding:12px 24px; border-radius:8px; font-size:13px; font-weight:700; text-decoration:none; letter-spacing:0.5px; transition:background 0.2s; }
      .gm-btn:hover { background:#00246b; }
      @media (max-width: 768px) {
        #g-modal-overlay { padding:0; align-items:flex-end; }
        #g-modal-box { border-radius:16px 16px 0 0; max-height:85vh; width:100%; }
        .gm-inner { padding:24px 20px 32px; }
        .gm-img-wrap img { height:150px; }
        .gm-title { font-size:18px; }
        .gm-btn { width:100%; justify-content:center; }
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'g-modal-overlay';
    overlay.innerHTML = `
      <div id="g-modal-box">
        <button id="g-modal-close" aria-label="Close">&#10005;</button>
        <div class="gm-inner" id="g-modal-content"></div>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('g-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  function openModal(key) {
    injectModal();
    const m = MODALS[key];
    document.getElementById('g-modal-content').innerHTML =
      `<div class="gm-img-wrap"><img src="${m.img}" alt="${m.imgAlt}" /></div>` +
      `<span class="gm-label">${m.label}</span>` +
      `<div class="gm-title">${m.title}</div>` +
      `<div class="gm-divider"></div>` +
      `<div class="gm-body">${m.body}</div>` +
      `<a href="${m.btnHref}" class="gm-btn">${m.btnText} <i class="fas fa-arrow-right"></i></a>`;
    document.getElementById('g-modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const overlay = document.getElementById('g-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;
    const href = (link.getAttribute('href') || '').toLowerCase();
    const text = link.textContent.trim().toLowerCase();
    if (href.includes('ticketing') || text === 'stb ticketing system') {
      e.preventDefault(); openModal('ticketing');
    } else if (href.includes('survey') || text === 'satisfaction survey') {
      e.preventDefault(); openModal('survey');
    }
  });
})();
