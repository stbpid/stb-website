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

  /* ── SCROLL: HIDE HEADER-TOP ── */
  const headerTop = document.querySelector('.header-top');
  if (headerTop) {
    const THRESHOLD = 60;
    window.addEventListener('scroll', () => {
      if (window.scrollY > THRESHOLD) {
        headerTop.classList.add('hidden');
      } else {
        headerTop.classList.remove('hidden');
      }
    }, { passive: true });
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

  /* ── FLAGSHIP CAROUSEL ── */
  const flagshipWrapper = document.querySelector('.flagship-carousel-wrapper');
  if (flagshipWrapper) {
    const track  = flagshipWrapper.querySelector('.flagship-track');
    const cards  = track.querySelectorAll('.flagship-card');
    let flagIdx  = 0;

    function visibleCount() {
      return window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
    }

    function slideTo(n) {
      const max = Math.max(0, cards.length - visibleCount());
      flagIdx = Math.max(0, Math.min(n, max));
      const cardW = cards[0].offsetWidth + 24;
      track.style.transform = `translateX(-${flagIdx * cardW}px)`;
    }

    document.querySelector('.flagship-nav .prev')?.addEventListener('click', () => slideTo(flagIdx - 1));
    document.querySelector('.flagship-nav .next')?.addEventListener('click', () => slideTo(flagIdx + 1));
    window.addEventListener('resize', () => slideTo(0));
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

  /* ── VIDEO PLAY BUTTON (placeholder) ── */
  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      alert('Video player not connected yet. Please link an actual video source.');
    });
  });
}

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', initComponents);
