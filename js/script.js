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
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a[data-page]').forEach(link => {
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
    // Close when a nav link is clicked (mobile UX)
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
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
      'NCR':  { name: 'NCR - National Capital Region',          href: 'contact.html' },
      'I':    { name: 'Region I - Ilocos Region',               href: 'contact.html' },
      'CAR':  { name: 'CAR - Cordillera Administrative Region', href: 'contact.html' },
      'II':   { name: 'Region II - Cagayan Valley',             href: 'contact.html' },
      'III':  { name: 'Region III - Central Luzon',             href: 'contact.html' },
      'IVA':  { name: 'Region IV-A - CALABARZON',               href: 'contact.html' },
      'IVB':  { name: 'Region IV-B - MIMAROPA',                 href: 'contact.html' },
      'V':    { name: 'Region V - Bicol Region',                href: 'contact.html' },
      'VI':   { name: 'Region VI - Western Visayas',            href: 'contact.html' },
      'VII':  { name: 'Region VII - Central Visayas',           href: 'contact.html' },
      'VIII': { name: 'Region VIII - Eastern Visayas',          href: 'contact.html' },
      'IX':   { name: 'Region IX - Zamboanga Peninsula',        href: 'contact.html' },
      'X':    { name: 'Region X - Northern Mindanao',           href: 'contact.html' },
      'XI':   { name: 'Region XI - Davao Region',               href: 'contact.html' },
      'XII':  { name: 'Region XII - SOCCSKSARGEN',              href: 'contact.html' },
      'XIII': { name: 'Region XIII - CARAGA',                   href: 'contact.html' },
      'ARMM': { name: 'BARMM - Bangsamoro',                     href: 'contact.html' },
      'NIR':  { name: 'NIR - Negros Island Region',             href: 'contact.html' },
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

    phMap.querySelectorAll('path[id]').forEach(path => {
      const id = path.id;
      const data = regionData[id];
      if (data) path.setAttribute('title', data.name);

      path.addEventListener('mouseenter', () => {
        tooltip.textContent = (data ? data.name : id) + ' — click to view';
        highlightLegend(id);
      });
      path.addEventListener('mouseleave', clearHighlight);
      path.addEventListener('click', () => {
        if (data && data.href) window.location.href = data.href;
      });
    });

    legendList.querySelectorAll('li[data-region]').forEach(li => {
      li.addEventListener('mouseenter', () => {
        const id = li.dataset.region;
        const path = phMap.querySelector('#' + CSS.escape(id));
        if (path) path.classList.add('map-active');
        const data = regionData[id];
        tooltip.textContent = (data ? data.name : id) + ' — click to view';
        li.classList.add('active');
      });
      li.addEventListener('mouseleave', clearHighlight);
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
