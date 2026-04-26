/* ============================================
   STB-DSWD WEBSITE — VANILLA JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------
     ACTIVE NAV LINK
  ------------------------------------------ */
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ------------------------------------------
     HAMBURGER / MOBILE MENU
  ------------------------------------------ */
  const hamburger = document.querySelector('.hamburger');
  const mainNav = document.querySelector('.main-nav');
  if (hamburger && mainNav) {
    hamburger.addEventListener('click', () => {
      mainNav.classList.toggle('open');
      const isOpen = mainNav.classList.contains('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !mainNav.contains(e.target)) {
        mainNav.classList.remove('open');
      }
    });
  }

  /* ------------------------------------------
     HERO SLIDER
  ------------------------------------------ */
  const heroSlider = document.querySelector('.hero-slider');
  if (heroSlider) {
    const slides = heroSlider.querySelectorAll('.hero-slide');
    const dots = heroSlider.querySelectorAll('.hero-dot');
    let current = 0;
    let autoTimer;

    function goTo(n) {
      slides[current].classList.remove('active');
      dots[current]?.classList.remove('active');
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current]?.classList.add('active');
    }

    function startAuto() {
      autoTimer = setInterval(() => goTo(current + 1), 5000);
    }

    function resetAuto() {
      clearInterval(autoTimer);
      startAuto();
    }

    heroSlider.querySelector('.hero-arrow.next')?.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
    heroSlider.querySelector('.hero-arrow.prev')?.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAuto(); }));

    goTo(0);
    startAuto();
  }

  /* ------------------------------------------
     FLAGSHIP CAROUSEL
  ------------------------------------------ */
  const flagshipCarousel = document.querySelector('.flagship-carousel-wrapper');
  if (flagshipCarousel) {
    const track = flagshipCarousel.querySelector('.flagship-track');
    const cards = track.querySelectorAll('.flagship-card');
    let visibleCount = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
    let flagshipCurrent = 0;
    const maxIndex = Math.max(0, cards.length - visibleCount);

    function slideTo(n) {
      flagshipCurrent = Math.max(0, Math.min(n, maxIndex));
      const cardWidth = cards[0].offsetWidth + 24;
      track.style.transform = `translateX(-${flagshipCurrent * cardWidth}px)`;
    }

    document.querySelector('.flagship-nav .prev')?.addEventListener('click', () => slideTo(flagshipCurrent - 1));
    document.querySelector('.flagship-nav .next')?.addEventListener('click', () => slideTo(flagshipCurrent + 1));

    window.addEventListener('resize', () => {
      visibleCount = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
      slideTo(0);
    });
  }

  /* ------------------------------------------
     STAT COUNTER ANIMATION
  ------------------------------------------ */
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (statNumbers.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target, 10);
          const duration = 1600;
          const start = performance.now();

          function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
          }

          requestAnimationFrame(update);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.4 });

    statNumbers.forEach(n => observer.observe(n));
  }

  /* ------------------------------------------
     GENERIC TABS (Resources, Contact Regional)
  ------------------------------------------ */
  function initTabs(containerSelector, btnSelector, contentSelector) {
    const containers = document.querySelectorAll(containerSelector);
    containers.forEach(container => {
      const btns = container.querySelectorAll(btnSelector);
      const contents = container.querySelectorAll(contentSelector);

      btns.forEach((btn, i) => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          contents.forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
          const target = btn.dataset.tab;
          const targetContent = container.querySelector(`[data-content="${target}"]`);
          if (targetContent) targetContent.classList.add('active');
          else if (contents[i]) contents[i].classList.add('active');
        });
      });
    });
  }

  initTabs('.resources-tabs-section', '.resource-tab-btn', '.resource-tab-content');
  initTabs('.regional-stu-section', '.tab-btn', '.tab-content');

  /* ------------------------------------------
     SCROLL REVEAL (lightweight)
  ------------------------------------------ */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* ------------------------------------------
     VIDEO PLAY BUTTON (placeholder behavior)
  ------------------------------------------ */
  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      alert('Video player not connected yet. Please link an actual video source.');
    });
  });

});
